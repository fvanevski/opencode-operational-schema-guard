"""Issue #92: pass a live canonical EX flock into a direct Node subprocess.

Caller owns all post-exit harness/quiet/scheduler/unresolved observations and
must already hold canonical LOCK_EX. This module never acquires the lock.
"""
import os
import re
import stat
import subprocess


def _held_parent_flock(fd: int, lock_path: str) -> bool:
    """Read-only proof that THIS process holds flock on the supplied OFD."""
    if not isinstance(fd, int) or fd < 3 or fd > 1024:
        return False
    try:
        own, target = os.fstat(fd), os.stat(lock_path)
        if (own.st_dev, own.st_ino) != (target.st_dev, target.st_ino):
            return False
        if not stat.S_ISREG(own.st_mode):
            return False
        with open(f"/proc/self/fdinfo/{fd}", encoding="ascii") as stream:
            info = stream.read()
    except (OSError, UnicodeError):
        return False
    for pid, inode in re.findall(
        r"^lock:\s*\d+:\s+FLOCK\s+ADVISORY\s+WRITE\s+(\d+)\s+"
        r"[0-9a-fA-F]+:[0-9a-fA-F]+:(\d+)\s+0\s+EOF\s*$",
        info, flags=re.MULTILINE,
    ):
        if int(pid) == os.getpid() and int(inode) == own.st_ino:
            return True
    return False


def run_admitted_node(command, *, lock_fd: int, env=None, cwd=None, timeout=None):
    """Spawn direct Node child with authenticated, still-held EX flock fd.

    Raises before spawn when descriptor proof is absent. The child independently
    verifies inherited fdinfo at each sensitive boundary. No shell intermediary.
    """
    canonical = f"/run/user/{os.getuid()}/openviking-agent.lock"
    if os.name != "posix" or not os.path.exists("/proc/self/fdinfo"):
        raise RuntimeError("EX_BRIDGE_REQUIRES_LINUX")
    if not _held_parent_flock(lock_fd, canonical):
        raise RuntimeError("EX_BRIDGE_PARENT_FLOCK_UNVERIFIED")
    if (not isinstance(command, (tuple, list)) or not command
            or not all(isinstance(x, str) and x for x in command)
            or os.path.basename(command[0]) not in ("node", "nodejs")):
        raise ValueError("EX_BRIDGE_REQUIRES_DIRECT_NODE_COMMAND")
    child_env = dict(os.environ if env is None else env)
    child_env["GHDEV_MEMORY_POST_EXIT_LEASE"] = "admitted"
    child_env["GHDEV_MEMORY_POST_EXIT_LOCK_FD"] = str(lock_fd)
    return subprocess.run(list(command), cwd=cwd, env=child_env,
                          pass_fds=(lock_fd,), timeout=timeout,
                          check=False, stdin=subprocess.DEVNULL)
