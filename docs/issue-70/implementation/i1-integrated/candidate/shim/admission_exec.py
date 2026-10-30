"""Executed only by the existing flock parent while its SH lease is held."""
import argparse
import os
from pathlib import Path
import sqlite3
import sys

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--database",required=True)
    parser.add_argument("--legacy-compatible",action="store_true")
    parser.add_argument("--required",action="store_true")
    parser.add_argument("command",nargs=argparse.REMAINDER)
    args=parser.parse_args()
    blocked=False
    try:
        path=Path(args.database).resolve()
        if not path.exists() and args.legacy_compatible and not args.required:
            legacy=True
        else:
            uri=path.as_uri()+"?mode=ro"
            with sqlite3.connect(uri,uri=True,timeout=2) as db:
                db.execute("BEGIN")
                tables={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
                contract=db.execute("SELECT required FROM admission_contract WHERE version=1").fetchone() if 'admission_contract' in tables else None
                legacy=not args.required and args.legacy_compatible and (contract is None or contract[0]==0)
                if not legacy:
                    if contract is None: raise RuntimeError("admission schema unavailable")
                    blocked=db.execute("SELECT 1 FROM intents WHERE state IN ('unknown','inflight') LIMIT 1").fetchone()
                    blocked=blocked or db.execute("SELECT 1 FROM commit_attempts WHERE resolved=0 LIMIT 1").fetchone()
                    if 'memory_work' in tables:
                        blocked=blocked or db.execute("SELECT 1 FROM memory_work WHERE status IN ('admitted','processing','blocked_reconcile') LIMIT 1").fetchone()
        if blocked:
            print("OPENVIKING_ADMISSION=blocked_reconcile",file=sys.stderr);return 75
    except Exception:
        print("OPENVIKING_ADMISSION=unavailable",file=sys.stderr);return 75
    command=args.command[1:] if args.command and args.command[0]=='--' else args.command
    if not command: return 64
    os.execv(command[0],command)

if __name__=='__main__': sys.exit(main())
