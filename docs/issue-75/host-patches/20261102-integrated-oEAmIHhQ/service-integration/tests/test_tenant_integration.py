"""Real API-key resolver + SessionService + actual gate, disposable only."""
import sys,unittest,threading,http.client,json
from test_i1_service import I1Service,HEADERS,gate
from pathlib import Path
class TenantIntegration(I1Service):
 def test_authenticated_binding_before_any_latch(self):
  self.start('binding')
  key=self.http('GET','/test/credentials')[1]['user_key']
  self.assertEqual(self.http('GET','/api/v1/admin/commit_receipts/binding/s',headers=HEADERS)[0],200)
  user_headers={'Authorization':'Bearer '+key}
  status,binding=self.http('GET','/api/v1/admin/commit_receipts/binding/s',headers=user_headers)
  self.assertEqual(status,200);self.assertEqual(binding['result']['account'],'a');self.assertEqual(binding['result']['user_id'],'u')
  server=gate.GateServer(self.cfg,self.db,self.worker);th=threading.Thread(target=server.serve_forever,daemon=True);th.start()
  def post(headers,session='s'):
   conn=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=5)
   try:
    conn.putrequest('POST','/api/v1/sessions/'+session+'/commit');conn.putheader('Content-Type','application/json');conn.putheader('Content-Length','2')
    for k,v in headers:conn.putheader(k,v)
    conn.endheaders(b'{}');r=conn.getresponse();return r.status,json.loads(r.read())
   finally:conn.close()
  try:
   auth=[('Authorization','Bearer '+key)]
   invalid=[[],auth+[('X-OpenViking-Account','spoof')],auth+[('X-OpenViking-User','other')],auth+[('X-OpenViking-Account','a'),('X-OpenViking-Account','a')],auth+[('Authorization','Bearer '+key)],auth+[('X-OpenViking-Actor-Peer','p,p')],auth+[('X-OpenViking-User','u ')], [('Authorization','Bearer invalid')],auth+[('X-API-Key',key)],auth+[('X-OpenViking-Account','')]]
   for headers in invalid:
    with self.subTest(headers=[k for k,v in headers]):
     self.assertEqual(post(headers)[0],400)
     with self.db.connect() as c:self.assertEqual(c.execute('SELECT count(*) FROM intents').fetchone()[0],0);self.assertEqual(c.execute('SELECT count(*) FROM commit_attempts').fetchone()[0],0)
   self.assertEqual(post(auth,session='stale-session')[0],400)
   self.assertEqual(post(auth+[('X-OpenViking-Actor-Peer','p')])[0],200)
   row=self.db.list_rows()[0];self.assertEqual((row['account'],row['user_id'],row['actor_peer']),('a','u','p'))
   with self.db.connect() as c:self.assertEqual(c.execute('SELECT count(*) FROM commit_attempts').fetchone()[0],0)
   # ROOT pins to configured service owner; missing pin must not fall back.
   self.assertEqual(post(list(HEADERS.items()))[0],200)
   self.http('POST','/test/unpin')
   self.assertEqual(post(list(HEADERS.items()))[0],400)
   with self.db.connect() as c:self.assertEqual(c.execute('SELECT count(*) FROM commit_attempts').fetchone()[0],0)
  finally:server.shutdown();server.server_close();th.join(3)
if __name__=='__main__':unittest.main()
