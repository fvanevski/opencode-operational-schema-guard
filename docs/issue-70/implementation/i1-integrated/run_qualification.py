"""Pinned CPU-only qualification: actual backend uses disposable native storage."""
import concurrent.futures,hashlib,json,os,re,shutil,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
OLD=Path(os.environ['ISSUE70_PHASE1_CANDIDATE'])
PY=shutil.which('python3');NODE=shutil.which('node')
commands=[
 ('gate',ROOT/'candidate/gate',['/usr/bin/python3','-m','unittest','discover','-s','tests','-v'],48),
 ('central-receipt',ROOT/'candidate/gate',['/usr/bin/python3','-m','unittest','test_receipt_protocol','-v'],7),
 ('capture',ROOT/'candidate/openviking-v2',[NODE,'--test','tests/candidate-capture.test.mjs','tests/capture-isolation.test.mjs','tests/central-authentication-regressions.test.mjs'],14),
 ('legacy-openviking',OLD/'openviking-context-v4',[NODE,'--test','tests/memory-session.test.mjs','tests/r3b-manager-integration.test.mjs','tests/hybrid-recall.test.mjs'],24),
 ('compaction',OLD/'operational-schema-v2',[NODE,'--test','tests/compaction-adapter.test.mjs'],7),
 ('validator-offline',OLD/'validator',[os.environ['ISSUE70_VALIDATOR_PYTHON'],'tests/test_validator.py','--no-live'],6),
 ('launcher',ROOT,['/usr/bin/python3','tests/test_launcher_admission.py','-v'],5),
 ('actual-backend',ROOT,['/usr/bin/python3','tests/test_i1_service.py','-v'],9),
]
def run(item):
 name,cwd,args,count=item
 argv=['bwrap','--ro-bind','/','/','--proc','/proc','--dev','/dev','--tmpfs','/tmp','--unshare-net','--die-with-parent','--chdir',str(cwd),*args]
 result=subprocess.run(argv,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'},capture_output=True,text=True,timeout=180)
 output=result.stdout+result.stderr
 (ROOT/'evidence'/(name+'.private.log')).write_text(output)
 parsed=re.findall(r'(?:Ran (\d+) tests|ℹ tests (\d+)|(\d+)/\d+ passed)',output)
 observed=int(next(x for x in parsed[-1] if x)) if parsed else None
 lines=[line for line in output.splitlines() if line.startswith(('I1_PUBLICATION_TIMELINE ','MIXED_TIMELINE ','RECOVERY_SERVICE ','QUIESCENCE_GAP_SERVICE '))]
 return {'suite':name,'exit_code':result.returncode,'expected_checks':count,'observed_checks':observed,'command':args,'cwd':str(cwd),'isolation':'read-only root, private /tmp and network, no GPU devices','output_sha256':hashlib.sha256(output.encode()).hexdigest(),'sanitized_traces':lines}
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  rows=list(pool.map(run,commands))
 (ROOT/'evidence/qualification.json').write_text(json.dumps(rows,indent=2)+'\n')
 print(json.dumps(rows,indent=2))
 for row in rows:
  if row['exit_code'] or row['observed_checks']!=row['expected_checks']:
   print((ROOT/'evidence'/(row['suite']+'.private.log')).read_text()[-7000:])
 sys.exit(any(row['exit_code'] or row['observed_checks']!=row['expected_checks'] for row in rows))
