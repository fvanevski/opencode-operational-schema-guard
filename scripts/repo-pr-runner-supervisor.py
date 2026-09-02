#!/usr/bin/env python3
"""Linux supervisor for one admitted repository-assessment runner phase.

The parent gateway passes the already-open runner as fd 3.  This helper:
- becomes a child subreaper so daemonized/double-fork descendants cannot escape;
- optionally applies a Landlock write allowlist before the runner starts;
- optionally watches admitted control files/directories with inotify;
- executes the admitted runner descriptor rather than resolving its pathname; and
- fails closed if descendants survive or watched control authority changes.
"""

from __future__ import annotations

import argparse
import ctypes
import errno
import json
import os
import signal
import struct
import sys
import time
from pathlib import Path
from typing import Iterable

PR_SET_CHILD_SUBREAPER = 36
PR_SET_NO_NEW_PRIVS = 38
PR_SET_PTRACER = 0x59616D61
REPO_ROOT_TOKEN = "__OPENCODE_REPOSITORY_ROOT_CAPABILITY__"

LANDLOCK_CREATE_RULESET_VERSION = 1
LANDLOCK_RULE_PATH_BENEATH = 1
SYS_LANDLOCK_CREATE_RULESET = 444
SYS_LANDLOCK_ADD_RULE = 445
SYS_LANDLOCK_RESTRICT_SELF = 446

LANDLOCK_ACCESS_FS_WRITE_FILE = 1 << 1
LANDLOCK_ACCESS_FS_REMOVE_DIR = 1 << 4
LANDLOCK_ACCESS_FS_REMOVE_FILE = 1 << 5
LANDLOCK_ACCESS_FS_MAKE_CHAR = 1 << 6
LANDLOCK_ACCESS_FS_MAKE_DIR = 1 << 7
LANDLOCK_ACCESS_FS_MAKE_REG = 1 << 8
LANDLOCK_ACCESS_FS_MAKE_SOCK = 1 << 9
LANDLOCK_ACCESS_FS_MAKE_FIFO = 1 << 10
LANDLOCK_ACCESS_FS_MAKE_BLOCK = 1 << 11
LANDLOCK_ACCESS_FS_MAKE_SYM = 1 << 12
LANDLOCK_ACCESS_FS_REFER = 1 << 13
LANDLOCK_ACCESS_FS_TRUNCATE = 1 << 14

IN_MODIFY = 0x00000002
IN_ATTRIB = 0x00000004
IN_CLOSE_WRITE = 0x00000008
IN_MOVED_FROM = 0x00000040
IN_MOVED_TO = 0x00000080
IN_CREATE = 0x00000100
IN_DELETE = 0x00000200
IN_DELETE_SELF = 0x00000400
IN_MOVE_SELF = 0x00000800
IN_Q_OVERFLOW = 0x00004000
IN_IGNORED = 0x00008000

SUPERVISOR_DESCENDANTS = 240
SUPERVISOR_CONTROL_MUTATION = 241
SUPERVISOR_SETUP_ERROR = 242
SUPERVISOR_REAP_ERROR = 243
DESCENDANT_REAP_TIMEOUT_SECONDS = 5.0
DESCENDANT_REAP_POLL_SECONDS = 0.01

libc = ctypes.CDLL(None, use_errno=True)


class LandlockRulesetAttr(ctypes.Structure):
    _fields_ = [("handled_access_fs", ctypes.c_uint64)]


class LandlockPathBeneathAttr(ctypes.Structure):
    _fields_ = [
        ("allowed_access", ctypes.c_uint64),
        ("parent_fd", ctypes.c_int32),
    ]


def fail(message: str) -> "NoReturn":
    print(f"repo-pr-runner-supervisor: {message}", file=sys.stderr)
    raise SystemExit(SUPERVISOR_SETUP_ERROR)


def _syscall(number: int, *args: object) -> int:
    result = int(libc.syscall(number, *args))
    if result < 0:
        code = ctypes.get_errno()
        raise OSError(code, os.strerror(code))
    return result


def _prctl(option: int, value: int) -> None:
    result = int(libc.prctl(option, value, 0, 0, 0))
    if result != 0:
        code = ctypes.get_errno()
        raise OSError(code, os.strerror(code))


def _allow_ptracer_tree(supervisor_pid: int) -> None:
    result = int(
        libc.prctl(
            ctypes.c_int(PR_SET_PTRACER),
            ctypes.c_ulong(supervisor_pid),
            ctypes.c_ulong(0),
            ctypes.c_ulong(0),
            ctypes.c_ulong(0),
        )
    )
    if result != 0:
        code = ctypes.get_errno()
        if code not in {errno.EINVAL, errno.ENOSYS}:
            raise OSError(code, os.strerror(code))


def _landlock_write_rights(abi: int) -> int:
    rights = (
        LANDLOCK_ACCESS_FS_WRITE_FILE
        | LANDLOCK_ACCESS_FS_REMOVE_DIR
        | LANDLOCK_ACCESS_FS_REMOVE_FILE
        | LANDLOCK_ACCESS_FS_MAKE_CHAR
        | LANDLOCK_ACCESS_FS_MAKE_DIR
        | LANDLOCK_ACCESS_FS_MAKE_REG
        | LANDLOCK_ACCESS_FS_MAKE_SOCK
        | LANDLOCK_ACCESS_FS_MAKE_FIFO
        | LANDLOCK_ACCESS_FS_MAKE_BLOCK
        | LANDLOCK_ACCESS_FS_MAKE_SYM
    )
    if abi >= 2:
        rights |= LANDLOCK_ACCESS_FS_REFER
    if abi >= 3:
        rights |= LANDLOCK_ACCESS_FS_TRUNCATE
    return rights


def apply_landlock(write_roots: Iterable[str]) -> None:
    roots = tuple(dict.fromkeys(os.path.realpath(path) for path in write_roots))
    if not roots:
        return
    try:
        abi = _syscall(
            SYS_LANDLOCK_CREATE_RULESET,
            ctypes.c_void_p(),
            ctypes.c_size_t(0),
            ctypes.c_uint32(LANDLOCK_CREATE_RULESET_VERSION),
        )
    except OSError as exc:
        fail(f"Landlock ABI query failed ({exc.errno}: {exc.strerror})")
    if abi < 1:
        fail("Landlock is unavailable")
    handled = _landlock_write_rights(abi)
    ruleset_attr = LandlockRulesetAttr(handled)
    try:
        ruleset_fd = _syscall(
            SYS_LANDLOCK_CREATE_RULESET,
            ctypes.byref(ruleset_attr),
            ctypes.c_size_t(ctypes.sizeof(ruleset_attr)),
            ctypes.c_uint32(0),
        )
    except OSError as exc:
        fail(f"Landlock ruleset creation failed ({exc.errno}: {exc.strerror})")
    try:
        for root in roots:
            if os.path.isdir(root):
                allowed = handled
            elif os.path.exists(root):
                allowed = handled & (
                    LANDLOCK_ACCESS_FS_WRITE_FILE | LANDLOCK_ACCESS_FS_TRUNCATE
                )
                if not allowed:
                    fail(f"Landlock writable object has no supported access rights: {root}")
            else:
                fail(f"Landlock writable path does not exist: {root}")
            path_fd = os.open(root, os.O_PATH | os.O_CLOEXEC)
            try:
                rule = LandlockPathBeneathAttr(allowed, path_fd)
                _syscall(
                    SYS_LANDLOCK_ADD_RULE,
                    ctypes.c_int(ruleset_fd),
                    ctypes.c_int(LANDLOCK_RULE_PATH_BENEATH),
                    ctypes.byref(rule),
                    ctypes.c_uint32(0),
                )
            finally:
                os.close(path_fd)
        _prctl(PR_SET_NO_NEW_PRIVS, 1)
        _syscall(
            SYS_LANDLOCK_RESTRICT_SELF,
            ctypes.c_int(ruleset_fd),
            ctypes.c_uint32(0),
        )
    except OSError as exc:
        fail(f"Landlock restriction failed ({exc.errno}: {exc.strerror})")
    finally:
        os.close(ruleset_fd)


def _inotify_add_watch(fd: int, path: str, mask: int) -> None:
    result = int(libc.inotify_add_watch(fd, os.fsencode(path), ctypes.c_uint32(mask)))
    if result < 0:
        code = ctypes.get_errno()
        raise OSError(code, os.strerror(code), path)


def configure_inotify(watch_root: str | None, watch_paths: Iterable[str]) -> int | None:
    raw_paths = tuple(dict.fromkeys(watch_paths))
    if watch_root is None and not raw_paths:
        return None
    if watch_root is None:
        fail("control watches require --watch-root")
    root_source = watch_root
    root = os.path.realpath(root_source)
    paths = tuple(
        dict.fromkeys(
            os.path.realpath(path if os.path.isabs(path) else os.path.join(root_source, path))
            for path in raw_paths
        )
    )
    if not os.path.isdir(root):
        fail(f"watch root is not a directory: {root}")
    fd = int(libc.inotify_init1(os.O_NONBLOCK | os.O_CLOEXEC))
    if fd < 0:
        code = ctypes.get_errno()
        fail(f"inotify initialization failed ({code}: {os.strerror(code)})")
    file_mask = IN_MODIFY | IN_ATTRIB | IN_CLOSE_WRITE | IN_DELETE_SELF | IN_MOVE_SELF | IN_IGNORED
    dir_mask = (
        IN_ATTRIB
        | IN_CLOSE_WRITE
        | IN_MOVED_FROM
        | IN_MOVED_TO
        | IN_CREATE
        | IN_DELETE
        | IN_DELETE_SELF
        | IN_MOVE_SELF
        | IN_IGNORED
    )
    directories = {root}
    try:
        for path in paths:
            if os.path.commonpath((root, path)) != root:
                fail(f"watched control path escaped root: {path}")
            if not os.path.isfile(path) or os.path.islink(path):
                fail(f"watched control path is not a regular file: {path}")
            _inotify_add_watch(fd, path, file_mask)
            current = os.path.dirname(path)
            while True:
                directories.add(current)
                if current == root:
                    break
                parent = os.path.dirname(current)
                if parent == current or os.path.commonpath((root, parent)) != root:
                    fail(f"watched control parent escaped root: {path}")
                current = parent
        for directory in sorted(directories):
            _inotify_add_watch(fd, directory, dir_mask)
    except OSError as exc:
        os.close(fd)
        fail(f"inotify watch setup failed ({exc.errno}: {exc.strerror})")
    return fd


def inotify_changed(fd: int | None) -> bool:
    if fd is None:
        return False
    changed = False
    while True:
        try:
            payload = os.read(fd, 65536)
        except BlockingIOError:
            break
        except OSError as exc:
            if exc.errno == errno.EAGAIN:
                break
            fail(f"inotify read failed ({exc.errno}: {exc.strerror})")
        if not payload:
            break
        offset = 0
        while offset + 16 <= len(payload):
            _, mask, _, name_len = struct.unpack_from("iIII", payload, offset)
            offset += 16 + name_len
            if mask & IN_Q_OVERFLOW:
                return True
            changed = True
    return changed


def descendant_processes(root_pid: int | None = None) -> tuple[int, ...]:
    """Return the current procfs parent-graph descendants of the supervisor.

    A child subreaper may adopt daemonized descendants that are waitable even when a
    task-local ``children`` view is transiently incomplete.  Reconstructing the live
    PPid graph from /proc covers both direct children and still-nested descendants;
    the caller repeats the scan until the bounded reap boundary is empty.
    """
    root = os.getpid() if root_pid is None else root_pid
    parents: dict[int, int] = {}
    try:
        entries = tuple(Path("/proc").iterdir())
    except OSError as exc:
        print(
            f"repo-pr-runner-supervisor: procfs descendant scan failed ({exc.errno}: {exc.strerror})",
            file=sys.stderr,
        )
        raise SystemExit(SUPERVISOR_REAP_ERROR) from exc

    for entry in entries:
        if not entry.name.isdigit():
            continue
        pid = int(entry.name)
        if pid == root:
            continue
        try:
            status = (entry / "status").read_bytes()
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            continue
        except OSError as exc:
            if exc.errno in {errno.ENOENT, errno.ESRCH}:
                continue
            print(
                f"repo-pr-runner-supervisor: could not inspect descendant candidate {pid} ({exc.errno}: {exc.strerror})",
                file=sys.stderr,
            )
            raise SystemExit(SUPERVISOR_REAP_ERROR) from exc
        for line in status.splitlines():
            if not line.startswith(b"PPid:"):
                continue
            fields = line.split()
            if len(fields) == 2:
                try:
                    parents[pid] = int(fields[1])
                except ValueError:
                    pass
            break

    descendants: set[int] = set()
    frontier = {root}
    while frontier:
        next_frontier = {
            pid
            for pid, parent in parents.items()
            if parent in frontier and pid not in descendants and pid != root
        }
        if not next_frontier:
            break
        descendants.update(next_frontier)
        frontier = next_frontier
    return tuple(sorted(descendants))


def contain_descendants() -> bool:
    found = False
    deadline = time.monotonic() + DESCENDANT_REAP_TIMEOUT_SECONDS
    while True:
        descendants = descendant_processes()
        if descendants:
            found = True
            for pid in descendants:
                try:
                    os.kill(pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                except OSError as exc:
                    print(
                        f"repo-pr-runner-supervisor: could not terminate descendant {pid} ({exc.errno}: {exc.strerror})",
                        file=sys.stderr,
                    )
                    raise SystemExit(SUPERVISOR_REAP_ERROR)
        try:
            while True:
                pid, _ = os.waitpid(-1, os.WNOHANG)
                if pid == 0:
                    break
                found = True
        except ChildProcessError:
            if not descendant_processes():
                return found
        if not descendant_processes():
            try:
                pid, _ = os.waitpid(-1, os.WNOHANG)
                if pid > 0:
                    found = True
                    continue
            except ChildProcessError:
                return found
        if time.monotonic() >= deadline:
            print("repo-pr-runner-supervisor: runner descendants could not be fully reaped before the bounded deadline", file=sys.stderr)
            raise SystemExit(SUPERVISOR_REAP_ERROR)
        time.sleep(DESCENDANT_REAP_POLL_SECONDS)


def _close_holder_fds(keep: set[int]) -> None:
    for entry in os.listdir("/proc/self/fd"):
        try:
            fd = int(entry)
        except ValueError:
            continue
        if fd > 2 and fd not in keep:
            try:
                os.close(fd)
            except OSError:
                pass


def start_control_capability_holder(cwd_fd: int) -> tuple[int, int]:
    ready_read, ready_write = os.pipe2(os.O_CLOEXEC)
    lifetime_read, lifetime_write = os.pipe2(os.O_CLOEXEC)
    supervisor_pid = os.getpid()
    pid = os.fork()
    if pid == 0:
        os.close(ready_read)
        os.close(lifetime_write)
        try:
            os.fchdir(cwd_fd)
            _close_holder_fds({ready_write, lifetime_read})
            _allow_ptracer_tree(supervisor_pid)
            os.write(ready_write, b"1")
            os.close(ready_write)
            while os.read(lifetime_read, 1):
                pass
            os.close(lifetime_read)
            os._exit(0)
        except BaseException as exc:  # noqa: BLE001 - isolated holder can only report setup failure
            try:
                os.write(ready_write, f"0{type(exc).__name__}:{exc}".encode("utf-8")[:512])
            except OSError:
                pass
            os._exit(SUPERVISOR_SETUP_ERROR)
    os.close(ready_write)
    os.close(lifetime_read)
    try:
        ready = os.read(ready_read, 513)
    finally:
        os.close(ready_read)
    if ready != b"1":
        os.close(lifetime_write)
        try:
            os.waitpid(pid, 0)
        except ChildProcessError:
            pass
        detail = ready[1:].decode("utf-8", errors="replace") if ready.startswith(b"0") else "holder exited before readiness"
        fail(f"control-root capability holder setup failed ({detail})")
    return pid, lifetime_write


def execute_runner(argv: list[str], cwd: str | None, cwd_fd: int | None) -> tuple[str, int]:
    if not argv:
        fail("runner argv is empty")
    try:
        _prctl(PR_SET_CHILD_SUBREAPER, 1)
    except OSError as exc:
        fail(f"subreaper setup failed ({exc.errno}: {exc.strerror})")
    holder_pid: int | None = None
    holder_lifetime: int | None = None
    effective_argv = list(argv)
    if cwd_fd is not None and any(REPO_ROOT_TOKEN in arg for arg in effective_argv):
        holder_pid, holder_lifetime = start_control_capability_holder(cwd_fd)
        capability_path = f"/proc/{holder_pid}/cwd"
        effective_argv = [arg.replace(REPO_ROOT_TOKEN, capability_path) for arg in effective_argv]
    elif any(REPO_ROOT_TOKEN in arg for arg in effective_argv):
        fail("repository-root capability token requires a descriptor-bound cwd")
    exec_read, exec_write = os.pipe2(os.O_CLOEXEC)
    try:
        pid = os.fork()
    except OSError as exc:
        os.close(exec_read)
        os.close(exec_write)
        if holder_lifetime is not None:
            os.close(holder_lifetime)
        if holder_pid is not None:
            try:
                os.waitpid(holder_pid, 0)
            except ChildProcessError:
                pass
        fail(f"runner fork failed ({exc.errno}: {exc.strerror})")
    if pid == 0:
        os.close(exec_read)
        try:
            if cwd_fd is not None:
                os.fchdir(cwd_fd)
            elif cwd is not None:
                os.chdir(cwd)
            else:
                raise RuntimeError("runner cwd authority is unavailable")
            os.execve("/proc/self/fd/3", ["/proc/self/fd/3", *effective_argv], dict(os.environ))
        except BaseException as exc:  # noqa: BLE001 - child can only report then exit
            detail = f"{type(exc).__name__}:{exc}".encode("utf-8", errors="replace")[:512]
            try:
                os.write(exec_write, detail)
            except OSError:
                pass
            os._exit(SUPERVISOR_SETUP_ERROR)
    os.close(exec_write)
    try:
        _, status = os.waitpid(pid, 0)
    except OSError as exc:
        os.close(exec_read)
        fail(f"runner wait failed ({exc.errno}: {exc.strerror})")
    try:
        exec_failure = os.read(exec_read, 513)
    finally:
        os.close(exec_read)
    holder_status: int | None = None
    if holder_lifetime is not None:
        os.close(holder_lifetime)
        holder_lifetime = None
    if holder_pid is not None:
        try:
            _, holder_status = os.waitpid(holder_pid, 0)
        except OSError as exc:
            fail(f"control-root capability holder wait failed ({exc.errno}: {exc.strerror})")
    descendants = contain_descendants()
    if descendants:
        return ("descendants", SUPERVISOR_DESCENDANTS)
    if holder_status is not None and (not os.WIFEXITED(holder_status) or os.WEXITSTATUS(holder_status) != 0):
        fail("control-root capability holder did not terminate cleanly")
    if exec_failure:
        detail = exec_failure.decode("utf-8", errors="replace")
        fail(f"runner exec failed ({detail})")
    if os.WIFEXITED(status):
        return ("runner", os.WEXITSTATUS(status))
    if os.WIFSIGNALED(status):
        return ("runner-signal", os.WTERMSIG(status))
    fail("runner wait status was neither exited nor signaled")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    cwd_group = parser.add_mutually_exclusive_group(required=True)
    cwd_group.add_argument("--cwd")
    cwd_group.add_argument("--cwd-fd", type=int)
    parser.add_argument("--status-fd", required=True, type=int)
    parser.add_argument("--write-root", action="append", default=[])
    parser.add_argument("--watch-root")
    parser.add_argument("--watch", action="append", default=[])
    parser.add_argument("runner_argv", nargs=argparse.REMAINDER)
    return parser


def _write_status(fd: int, kind: str, **fields: object) -> None:
    payload = json.dumps({"version": 1, "kind": kind, **fields}, separators=(",", ":")) + "\n"
    os.write(fd, payload.encode("utf-8"))


def main() -> int:
    args = build_parser().parse_args()
    try:
        os.fstat(args.status_fd)
        os.set_inheritable(args.status_fd, False)
    except OSError as exc:
        print(f"repo-pr-runner-supervisor: status descriptor is unavailable ({exc.errno}: {exc.strerror})", file=sys.stderr)
        return SUPERVISOR_SETUP_ERROR
    watch_fd: int | None = None
    try:
        runner_argv = list(args.runner_argv)
        if runner_argv and runner_argv[0] == "--":
            runner_argv = runner_argv[1:]
        cwd = os.path.realpath(args.cwd) if args.cwd is not None else None
        if cwd is not None and not os.path.isdir(cwd):
            fail(f"runner cwd is not a directory: {cwd}")
        if args.cwd_fd is not None:
            try:
                os.fstat(args.cwd_fd)
            except OSError as exc:
                fail(f"runner cwd descriptor is unavailable ({exc.errno}: {exc.strerror})")
            if not os.path.isdir(f"/proc/self/fd/{args.cwd_fd}"):
                fail("runner cwd descriptor is not a directory")
        watch_fd = configure_inotify(args.watch_root, args.watch)
        apply_landlock(args.write_root)
        kind, value = execute_runner(runner_argv, cwd, args.cwd_fd)
        if kind == "descendants":
            _write_status(args.status_fd, "descendants")
            return SUPERVISOR_DESCENDANTS
        if inotify_changed(watch_fd):
            _write_status(args.status_fd, "control-mutation")
            return SUPERVISOR_CONTROL_MUTATION
        if kind == "runner-signal":
            _write_status(args.status_fd, "runner-signal", signal=value)
            signal.signal(value, signal.SIG_DFL)
            os.kill(os.getpid(), value)
            return 128 + value
        _write_status(args.status_fd, "runner", code=value)
        return value
    except SystemExit as exc:
        code = int(exc.code) if isinstance(exc.code, int) else SUPERVISOR_SETUP_ERROR
        _write_status(args.status_fd, "reap-error" if code == SUPERVISOR_REAP_ERROR else "setup-error")
        return code
    except BaseException as exc:  # noqa: BLE001 - supervisor must fail closed with typed status
        print(f"repo-pr-runner-supervisor: unexpected supervisor failure: {type(exc).__name__}: {exc}", file=sys.stderr)
        try:
            _write_status(args.status_fd, "reap-error")
        except OSError:
            pass
        return SUPERVISOR_REAP_ERROR
    finally:
        if watch_fd is not None:
            os.close(watch_fd)


if __name__ == "__main__":
    raise SystemExit(main())
