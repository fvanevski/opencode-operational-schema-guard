#!/usr/bin/python3
import hashlib
import json
import os
import stat
import sys

SCHEMA = "opencode-untracked-quarantine-fs-v1"
O_DIRECTORY = getattr(os, "O_DIRECTORY", 0)
O_NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)
O_CLOEXEC = getattr(os, "O_CLOEXEC", 0)
DIR_FLAGS = os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC
FILE_FLAGS = os.O_RDONLY | O_NOFOLLOW | O_CLOEXEC
EMPTY_SHA256 = hashlib.sha256(b"").hexdigest()


class Blocked(Exception):
    pass


def blocked(message):
    raise Blocked(message)


def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def valid_name(name):
    if not isinstance(name, str) or not name or name in {".", ".."} or "/" in name or "\\" in name:
        blocked(f"unsupported filesystem entry name: {name!r}")
    try:
        name.encode("utf-8", "strict")
    except UnicodeEncodeError:
        blocked("filesystem entry name is not strict UTF-8")
    return name


def normalize_repo_path(value):
    if not isinstance(value, str) or not value or value.startswith("/") or "\\" in value or "\x00" in value:
        blocked("repo_path must be canonical repository-relative UTF-8")
    parts = value.split("/")
    if any(not part or part in {".", ".."} for part in parts) or parts[0] == ".git":
        blocked("repo_path is ambiguous, escaping, or Git-control state")
    for part in parts:
        valid_name(part)
    return value, parts


def open_abs_dir(path):
    if not isinstance(path, str) or not path.startswith("/") or "\x00" in path:
        blocked("absolute directory path is invalid")
    fd = os.open("/", DIR_FLAGS)
    try:
        for part in [part for part in path.split("/") if part]:
            valid_name(part)
            next_fd = os.open(part, DIR_FLAGS, dir_fd=fd)
            os.close(fd)
            fd = next_fd
        return fd
    except Exception:
        os.close(fd)
        raise


def ensure_abs_dir(path):
    if not isinstance(path, str) or not path.startswith("/") or "\x00" in path:
        blocked("absolute directory path is invalid")
    fd = os.open("/", DIR_FLAGS)
    try:
        for part in [part for part in path.split("/") if part]:
            valid_name(part)
            try:
                next_fd = os.open(part, DIR_FLAGS, dir_fd=fd)
            except FileNotFoundError:
                os.mkdir(part, 0o700, dir_fd=fd)
                next_fd = os.open(part, DIR_FLAGS, dir_fd=fd)
            os.close(fd)
            fd = next_fd
        return fd
    except Exception:
        os.close(fd)
        raise


def open_relative_parent(root_fd, parts, create=False):
    fd = os.dup(root_fd)
    try:
        for part in parts[:-1]:
            valid_name(part)
            try:
                next_fd = os.open(part, DIR_FLAGS, dir_fd=fd)
            except FileNotFoundError:
                if not create:
                    raise
                os.mkdir(part, 0o700, dir_fd=fd)
                next_fd = os.open(part, DIR_FLAGS, dir_fd=fd)
            os.close(fd)
            fd = next_fd
        return fd, parts[-1]
    except Exception:
        os.close(fd)
        raise


def lexists_at(parent_fd, name):
    try:
        os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
        return True
    except FileNotFoundError:
        return False


def hash_file_fd(fd):
    digest = hashlib.sha256()
    size = 0
    while True:
        chunk = os.read(fd, 65536)
        if not chunk:
            break
        size += len(chunk)
        digest.update(chunk)
    return size, digest.hexdigest()


def inventory_one(parent_fd, name, repo_path):
    valid_name(name)
    before = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    mode = stat.S_IMODE(before.st_mode)
    if stat.S_ISREG(before.st_mode):
        fd = os.open(name, FILE_FLAGS, dir_fd=parent_fd)
        try:
            opened = os.fstat(fd)
            if (opened.st_dev, opened.st_ino, stat.S_IFMT(opened.st_mode)) != (
                before.st_dev,
                before.st_ino,
                stat.S_IFMT(before.st_mode),
            ):
                blocked(f"filesystem object changed while opening {repo_path}")
            size, digest = hash_file_fd(fd)
            after = os.fstat(fd)
            if (after.st_dev, after.st_ino, stat.S_IFMT(after.st_mode), after.st_size) != (
                opened.st_dev,
                opened.st_ino,
                stat.S_IFMT(opened.st_mode),
                opened.st_size,
            ):
                blocked(f"filesystem object changed while hashing {repo_path}")
            if size != after.st_size:
                blocked(f"filesystem object changed length while hashing {repo_path}")
            return [{"path": repo_path, "type": "file", "mode": mode, "size": size, "sha256": digest}]
        finally:
            os.close(fd)
    if stat.S_ISLNK(before.st_mode):
        target = os.readlink(name, dir_fd=parent_fd)
        target_bytes = os.fsencode(target)
        return [
            {
                "path": repo_path,
                "type": "symlink",
                "mode": mode,
                "size": len(target_bytes),
                "sha256": sha256_bytes(target_bytes),
            }
        ]
    if not stat.S_ISDIR(before.st_mode):
        blocked(f"unsupported special filesystem object at {repo_path}")
    child_fd = os.open(name, DIR_FLAGS, dir_fd=parent_fd)
    try:
        opened = os.fstat(child_fd)
        if (opened.st_dev, opened.st_ino) != (before.st_dev, before.st_ino):
            blocked(f"directory changed while opening {repo_path}")
        result = [{"path": repo_path, "type": "directory", "mode": mode, "size": 0, "sha256": EMPTY_SHA256}]
        names = os.listdir(child_fd)
        for child in names:
            valid_name(child)
        names.sort(key=lambda value: value.encode("utf-8", "strict"))
        for child in names:
            result.extend(inventory_one(child_fd, child, f"{repo_path}/{child}"))
        return result
    finally:
        os.close(child_fd)


def validate_expected(entries, repo_path):
    if not isinstance(entries, list) or not entries:
        blocked("expected_entries must be a non-empty inventory list")
    seen = set()
    for entry in entries:
        if not isinstance(entry, dict) or set(entry) != {"path", "type", "mode", "size", "sha256"}:
            blocked("expected inventory entry shape is invalid")
        path = entry.get("path")
        normalize_repo_path(path)
        if path in seen or not (path == repo_path or path.startswith(repo_path + "/")):
            blocked("expected inventory escapes or duplicates the requested subtree")
        seen.add(path)
        if entry.get("type") not in {"file", "directory", "symlink"}:
            blocked("expected inventory type is invalid")
        if not isinstance(entry.get("mode"), int) or not 0 <= entry["mode"] <= 0o7777:
            blocked("expected inventory mode is invalid")
        if not isinstance(entry.get("size"), int) or entry["size"] < 0:
            blocked("expected inventory size is invalid")
        digest = entry.get("sha256")
        if not isinstance(digest, str) or len(digest) != 64 or any(ch not in "0123456789abcdef" for ch in digest):
            blocked("expected inventory digest is invalid")
    return entries


def expected_for_path(request):
    repo_path, _ = normalize_repo_path(request.get("repo_path"))
    return repo_path, validate_expected(request.get("expected_entries"), repo_path)


def validate_workspace_fd(fd, request):
    info = os.fstat(fd)
    if str(info.st_dev) != str(request.get("workspace_dev")) or str(info.st_ino) != str(request.get("workspace_ino")):
        blocked("workspace root device/inode no longer matches the admitted identity")
    return info


def capture_is_disjoint(path, workspace_root):
    candidate = os.path.abspath(path)
    workspace = os.path.abspath(workspace_root)
    try:
        common = os.path.commonpath([candidate, workspace])
    except ValueError:
        return True
    return common not in {candidate, workspace}


def capture_candidate(request, workspace_info):
    operation_root = request.get("operation_root")
    operation_fd = open_abs_dir(operation_root)
    try:
        operation_candidate = os.path.join(operation_root, "capture")
        if os.fstat(operation_fd).st_dev == workspace_info.st_dev and capture_is_disjoint(operation_candidate, request.get("workspace_root")):
            return operation_candidate
    finally:
        os.close(operation_fd)
    workspace_root = request.get("workspace_root")
    parent = os.path.dirname(workspace_root)
    parent_fd = open_abs_dir(parent)
    try:
        if os.fstat(parent_fd).st_dev == workspace_info.st_dev:
            key = hashlib.sha256(workspace_root.encode("utf-8")).hexdigest()[:16]
            parent_candidate = os.path.join(parent, f".opencode-untracked-quarantine-{key}", request["operation_id"])
            if capture_is_disjoint(parent_candidate, workspace_root):
                return parent_candidate
    finally:
        os.close(parent_fd)
    git_dir = request.get("git_dir")
    git_fd = open_abs_dir(git_dir)
    try:
        if os.fstat(git_fd).st_dev == workspace_info.st_dev:
            git_candidate = os.path.join(git_dir, "opencode-untracked-quarantine-capture", request["operation_id"])
            if capture_is_disjoint(git_candidate, workspace_root):
                return git_candidate
    finally:
        os.close(git_fd)
    blocked("no hardened out-of-workspace capture root exists on the workspace filesystem")


def prepare_capture(request):
    workspace_fd = open_abs_dir(request.get("workspace_root"))
    try:
        workspace_info = validate_workspace_fd(workspace_fd, request)
        path = capture_candidate(request, workspace_info)
        capture_fd = ensure_abs_dir(path)
        try:
            if os.fstat(capture_fd).st_dev != workspace_info.st_dev:
                blocked("capture root is not on the workspace filesystem")
        finally:
            os.close(capture_fd)
        return {"result": "PASS", "action": "prepare", "capture_root": path}
    finally:
        os.close(workspace_fd)


def open_capture(request, workspace_info):
    capture_root = request.get("capture_root")
    if not capture_is_disjoint(capture_root, request.get("workspace_root")):
        blocked("capture root overlaps the governed workspace")
    fd = ensure_abs_dir(capture_root)
    if os.fstat(fd).st_dev != workspace_info.st_dev:
        os.close(fd)
        blocked("capture root is not on the workspace filesystem")
    return fd


def open_repo_parent(root_fd, repo_path, create=False):
    _, parts = normalize_repo_path(repo_path)
    return parts, open_relative_parent(root_fd, parts, create=create)


def capture_path(request):
    repo_path, expected = expected_for_path(request)
    _, parts = normalize_repo_path(repo_path)
    workspace_fd = open_abs_dir(request.get("workspace_root"))
    try:
        workspace_info = validate_workspace_fd(workspace_fd, request)
        capture_fd = open_capture(request, workspace_info)
        try:
            src_parent, src_name = open_relative_parent(workspace_fd, parts)
            cap_parent, cap_name = open_relative_parent(capture_fd, parts, create=True)
            try:
                source_exists = lexists_at(src_parent, src_name)
                captured_exists = lexists_at(cap_parent, cap_name)
                if source_exists and captured_exists:
                    blocked("both workspace source and capture destination exist; refusing ambiguous quarantine resume")
                if captured_exists:
                    if inventory_one(cap_parent, cap_name, repo_path) != expected:
                        blocked("existing captured source differs from receipt inventory")
                    return {"result": "PASS", "action": "capture", "status": "already_captured"}
                if not source_exists:
                    return {"result": "PASS", "action": "capture", "status": "already_absent"}
                os.rename(src_name, cap_name, src_dir_fd=src_parent, dst_dir_fd=cap_parent)
                if inventory_one(cap_parent, cap_name, repo_path) != expected:
                    if not lexists_at(src_parent, src_name):
                        try:
                            os.rename(cap_name, src_name, src_dir_fd=cap_parent, dst_dir_fd=src_parent)
                        except OSError:
                            pass
                    blocked("captured source differs from receipt inventory; unverified data was preserved rather than deleted")
                return {"result": "PASS", "action": "capture", "status": "captured"}
            finally:
                os.close(src_parent)
                os.close(cap_parent)
        finally:
            os.close(capture_fd)
    finally:
        os.close(workspace_fd)


def write_all(fd, data):
    view = memoryview(data)
    while view:
        written = os.write(fd, view)
        if written <= 0:
            blocked("short write while restoring file")
        view = view[written:]


def copy_entry(src_parent, src_name, dst_parent, dst_name):
    before = os.stat(src_name, dir_fd=src_parent, follow_symlinks=False)
    mode = stat.S_IMODE(before.st_mode)
    if stat.S_ISREG(before.st_mode):
        src_fd = os.open(src_name, FILE_FLAGS, dir_fd=src_parent)
        try:
            opened = os.fstat(src_fd)
            if (opened.st_dev, opened.st_ino, stat.S_IFMT(opened.st_mode)) != (
                before.st_dev,
                before.st_ino,
                stat.S_IFMT(before.st_mode),
            ):
                blocked("quarantine source changed while opening")
            dst_fd = os.open(
                dst_name,
                os.O_WRONLY | os.O_CREAT | os.O_EXCL | O_NOFOLLOW | O_CLOEXEC,
                0o600,
                dir_fd=dst_parent,
            )
            try:
                while True:
                    chunk = os.read(src_fd, 65536)
                    if not chunk:
                        break
                    write_all(dst_fd, chunk)
                os.fchmod(dst_fd, mode)
                os.fsync(dst_fd)
            finally:
                os.close(dst_fd)
        finally:
            os.close(src_fd)
        return
    if stat.S_ISLNK(before.st_mode):
        os.symlink(os.readlink(src_name, dir_fd=src_parent), dst_name, dir_fd=dst_parent)
        return
    if not stat.S_ISDIR(before.st_mode):
        blocked("unsupported quarantine source type")
    os.mkdir(dst_name, 0o700, dir_fd=dst_parent)
    src_fd = os.open(src_name, DIR_FLAGS, dir_fd=src_parent)
    dst_fd = os.open(dst_name, DIR_FLAGS, dir_fd=dst_parent)
    try:
        names = os.listdir(src_fd)
        for child in names:
            valid_name(child)
        names.sort(key=lambda value: value.encode("utf-8", "strict"))
        for child in names:
            copy_entry(src_fd, child, dst_fd, child)
        os.fchmod(dst_fd, mode)
    finally:
        os.close(src_fd)
        os.close(dst_fd)


def remove_helper_staging(parent_fd, name):
    info = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    if stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode):
        os.unlink(name, dir_fd=parent_fd)
        return
    if not stat.S_ISDIR(info.st_mode):
        blocked("helper-owned restore staging changed to an unsupported special object")
    child_fd = os.open(name, DIR_FLAGS, dir_fd=parent_fd)
    try:
        names = os.listdir(child_fd)
        for child in names:
            valid_name(child)
        for child in sorted(names, key=lambda value: value.encode("utf-8", "strict")):
            remove_helper_staging(child_fd, child)
    finally:
        os.close(child_fd)
    os.rmdir(name, dir_fd=parent_fd)


def restore_marker(operation_fd, digest, operation_id, repo_path, temp_name):
    marker_dir_name = ".restore-staging"
    try:
        marker_dir = os.open(marker_dir_name, DIR_FLAGS, dir_fd=operation_fd)
    except FileNotFoundError:
        os.mkdir(marker_dir_name, 0o700, dir_fd=operation_fd)
        marker_dir = os.open(marker_dir_name, DIR_FLAGS, dir_fd=operation_fd)
    marker_name = f"{digest}.owned"
    expected = (operation_id + "\0" + repo_path + "\0" + temp_name + "\n").encode("utf-8")
    try:
        marker_fd = os.open(marker_name, FILE_FLAGS, dir_fd=marker_dir)
    except FileNotFoundError:
        marker_fd = os.open(
            marker_name,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | O_NOFOLLOW | O_CLOEXEC,
            0o600,
            dir_fd=marker_dir,
        )
        try:
            write_all(marker_fd, expected)
            os.fsync(marker_fd)
        finally:
            os.close(marker_fd)
        marker_fd = os.open(marker_name, FILE_FLAGS, dir_fd=marker_dir)
    try:
        info = os.fstat(marker_fd)
        content = os.read(marker_fd, len(expected) + 1)
        if not stat.S_ISREG(info.st_mode) or content != expected:
            blocked("restore staging ownership marker is invalid")
    finally:
        os.close(marker_fd)
    return marker_dir, marker_name


def clear_restore_marker(marker_dir, marker_name):
    try:
        os.unlink(marker_name, dir_fd=marker_dir)
    except FileNotFoundError:
        pass


def cleanup_empty_capture_parents(capture_fd, parts):
    for depth in range(len(parts) - 1, 0, -1):
        parent_parts = parts[:depth]
        try:
            ancestor_fd, name = open_relative_parent(capture_fd, parent_parts)
        except OSError:
            return
        try:
            try:
                os.rmdir(name, dir_fd=ancestor_fd)
            except OSError:
                return
        finally:
            os.close(ancestor_fd)


def restore_path(request):
    repo_path, expected = expected_for_path(request)
    _, parts = normalize_repo_path(repo_path)
    workspace_fd = open_abs_dir(request.get("workspace_root"))
    try:
        workspace_info = validate_workspace_fd(workspace_fd, request)
        capture_fd = open_capture(request, workspace_info)
        quarantine_fd = open_abs_dir(request.get("quarantine_root"))
        operation_fd = open_abs_dir(request.get("operation_root"))
        try:
            dst_parent, dst_name = open_relative_parent(workspace_fd, parts)
            cap_parent, cap_name = open_relative_parent(capture_fd, parts, create=True)
            src_parent, src_name = open_relative_parent(quarantine_fd, parts)
            digest = hashlib.sha256((request["operation_id"] + "\0" + repo_path).encode("utf-8")).hexdigest()[:24]
            temp_name = f".opencode-uq-restore-{digest}"
            try:
                destination_exists = lexists_at(dst_parent, dst_name)
                captured_exists = lexists_at(cap_parent, cap_name)
                if destination_exists:
                    if inventory_one(dst_parent, dst_name, repo_path) != expected:
                        blocked("restore refuses to overwrite existing destination content")
                    if captured_exists:
                        blocked("both restored destination and capture source exist; refusing ambiguous restore state")
                    if lexists_at(dst_parent, temp_name):
                        blocked("unattributed restore staging exists beside an already-restored destination")
                    return {"result": "PASS", "action": "restore", "status": "already_restored"}
                if captured_exists:
                    if inventory_one(cap_parent, cap_name, repo_path) != expected:
                        blocked("capture source differs from receipt inventory")
                    os.rename(cap_name, dst_name, src_dir_fd=cap_parent, dst_dir_fd=dst_parent)
                    if inventory_one(dst_parent, dst_name, repo_path) != expected:
                        blocked("descriptor-anchored restored destination differs from receipt inventory")
                    cleanup_empty_capture_parents(capture_fd, parts)
                    return {"result": "PASS", "action": "restore", "status": "renamed"}
                if not lexists_at(src_parent, src_name):
                    blocked("receipt-backed quarantine source is missing")

                marker_exists = False
                marker_dir = None
                marker_name = None
                marker_dir_name = ".restore-staging"
                try:
                    marker_dir = os.open(marker_dir_name, DIR_FLAGS, dir_fd=operation_fd)
                    marker_name = f"{digest}.owned"
                    marker_exists = lexists_at(marker_dir, marker_name)
                except FileNotFoundError:
                    pass
                finally:
                    if marker_dir is not None:
                        os.close(marker_dir)

                if lexists_at(dst_parent, temp_name) and not marker_exists:
                    blocked("existing restore staging is not authenticated as helper-owned recovery state")

                marker_dir, marker_name = restore_marker(operation_fd, digest, request["operation_id"], repo_path, temp_name)
                try:
                    if lexists_at(dst_parent, temp_name):
                        if inventory_one(dst_parent, temp_name, repo_path) != expected:
                            remove_helper_staging(dst_parent, temp_name)
                    if not lexists_at(dst_parent, temp_name):
                        copy_entry(src_parent, src_name, dst_parent, temp_name)
                    if inventory_one(dst_parent, temp_name, repo_path) != expected:
                        blocked("descriptor-anchored restore staging copy differs from receipt inventory")
                    if lexists_at(dst_parent, dst_name):
                        blocked("restore destination appeared before atomic publication")
                    os.rename(temp_name, dst_name, src_dir_fd=dst_parent, dst_dir_fd=dst_parent)
                    if inventory_one(dst_parent, dst_name, repo_path) != expected:
                        blocked("descriptor-anchored restored destination differs from receipt inventory")
                    clear_restore_marker(marker_dir, marker_name)
                finally:
                    os.close(marker_dir)
                return {"result": "PASS", "action": "restore", "status": "copied"}
            finally:
                os.close(dst_parent)
                os.close(cap_parent)
                os.close(src_parent)
        finally:
            os.close(capture_fd)
            os.close(quarantine_fd)
            os.close(operation_fd)
    finally:
        os.close(workspace_fd)


def main():
    try:
        request = json.load(sys.stdin)
        if not isinstance(request, dict) or request.get("schema_version") != SCHEMA:
            blocked("request schema is invalid")
        operation_id = request.get("operation_id")
        allowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-"
        if (
            not isinstance(operation_id, str)
            or not operation_id
            or len(operation_id) > 80
            or any(ch not in allowed for ch in operation_id)
        ):
            blocked("operation_id is invalid")
        action = request.get("action")
        if action == "prepare":
            result = prepare_capture(request)
        elif action == "capture":
            result = capture_path(request)
        elif action == "restore":
            result = restore_path(request)
        else:
            blocked("action is invalid")
        sys.stdout.write(json.dumps(result, separators=(",", ":")) + "\n")
        return 0
    except Blocked as error:
        sys.stdout.write(json.dumps({"result": "BLOCKED", "reason": str(error)}, separators=(",", ":")) + "\n")
        return 2
    except Exception as error:
        reason = f"filesystem helper error: {type(error).__name__}: {error}"
        sys.stdout.write(json.dumps({"result": "BLOCKED", "reason": reason}, separators=(",", ":")) + "\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
