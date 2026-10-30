"""Authenticate installed bases and assemble a NEW disposable test tree only."""
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
HERE=Path(__file__).resolve().parent

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--source-package',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if args.output.exists():raise SystemExit('output must be a new, collision-free directory')
    manifest=json.loads((HERE/'source-base-manifest.json').read_text())
    for row in manifest['files']:
        if row['component']!='backend':continue
        path=args.source_package/Path(row['path']).relative_to('openviking')
        actual=hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
        if actual!=row['source_base_sha256']:raise SystemExit('source mismatch: '+row['path'])
    args.output.mkdir(parents=True)
    shutil.copytree(args.source_package,args.output/'backend/openviking',ignore=shutil.ignore_patterns('__pycache__'))
    subprocess.run(['patch','--batch','-p1','-i',str(HERE/'patches/backend.patch')],cwd=args.output/'backend',check=True)
    for row in manifest['files']:
        if row['component']=='backend':
            data=(args.output/'backend'/row['path']).read_bytes()
            assert hashlib.sha256(data).hexdigest()==row['candidate_sha256'],row['path']
    for name in ('candidate','tests'):shutil.copytree(HERE/name,args.output/name)
    shutil.copy2(HERE/'run_qualification.py',args.output/'run_qualification.py')
    (args.output/'evidence').mkdir()
    print('Authenticated source-bound disposable backend assembled at '+str(args.output))

if __name__=='__main__':main()
