"""Reconstruct only in a newly-created disposable tree; no live writes."""
import argparse,hashlib,json,pathlib,shutil,subprocess,tempfile
p=argparse.ArgumentParser();p.add_argument('--backend',required=True);p.add_argument('--gate',required=True);a=p.parse_args();here=pathlib.Path(__file__).resolve().parent
roots={'openviking':pathlib.Path(a.backend).resolve(),'gate':pathlib.Path(a.gate).resolve()}
for item in json.loads((here/'SOURCE_PINS.json').read_text())['files']:
 kind,rel=item['path'].split('/',1);f=roots[kind]/rel
 if item['base_sha256'] is None: assert not f.exists(),f
 else: assert hashlib.sha256(f.read_bytes()).hexdigest()==item['base_sha256'],f
out=pathlib.Path(tempfile.mkdtemp(prefix='issue75-reproduce-'));candidate=out/'host-candidate'
for kind,root in roots.items():shutil.copytree(root,candidate/kind,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
subprocess.run(['patch','-p1','-i',str(here/'SOURCE.diff')],cwd=candidate,check=True)
shutil.copytree(here/'tests',out/'tests');shutil.copytree(here/'service-integration',out/'service-integration')
(out/'service-integration/backend').symlink_to(candidate,target_is_directory=True);(out/'service-integration/candidate').mkdir();(out/'service-integration/candidate/gate').symlink_to(candidate/'gate',target_is_directory=True)
print(out)
