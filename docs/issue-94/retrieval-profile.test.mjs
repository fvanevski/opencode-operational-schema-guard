import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {distribution,inventory,makeSyntheticReviews,profileQueries,
  profileSynthetic,main} from './retrieval-profile.mjs';

test('nearest-rank p95 includes every observation, including slow outliers',()=>{
  assert.equal(distribution([]),null);
  assert.deepEqual(distribution([1,2,3,10]),
    {n:4,p50_ms:2,p95_ms:10,max_ms:10});
});

test('disposable atomic-fact reviews profile without exporting source or UUID',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'issue94-profile-test-'));
  try{
    const f=await makeSyntheticReviews(root,12);
    const snap=await inventory(root,f.group);
    assert.equal(snap.review_files,12);
    assert.equal(snap.persisted_nonatomic_review_records,0);
    assert.equal(snap.persisted_missing_uuid,0);
    assert.equal(snap.reviews_above_4096,false);
    assert.ok(snap.max_persisted_facts_per_origin>=2,
      'one origin cluster can hold multiple independently persisted atomic facts');
    const obs=await profileQueries({...f,rounds:2,cases:[
      {id:'synthetic-target',query:'Which PostgreSQL database stores durable archive state?'},
      {id:'secret-negative',query:'Use api_key=synthetic-not-a-secret for archive storage'}]});
    assert.equal(obs[0].status,'READ_ONLY_LOCAL_PROFILE');
    assert.ok(obs[0].source_qualified_shortlist_counts[0]>=1);
    assert.equal(obs[0].remote_membership_proven,false);
    assert.equal(obs[1].status,'REJECTED_BY_QUERY_FENCE');
    const clean=JSON.stringify(obs);
    assert.ok(!clean.includes('PostgreSQL database stores'));
    assert.ok(!clean.includes(f.targetUuid));
  }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('disposable growth is local-index-only and never asserts remote proof',async()=>{
  const out=await profileSynthetic([8,17],1);
  assert.deepEqual(out.map(x=>x.review_count),[8,17]);
  assert.ok(out.every(x=>x.source_only_not_remote_proof));
  assert.ok(out.every(x=>x.expected_target_persisted));
});

test('CLI creates exclusive private metadata-only output, without live Graphiti',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'issue94-cli-test-'));
  try{
    const output=path.join(root,'report.json');
    await main(['--mode','synthetic','--sizes','10','--rounds','1','--output',output]);
    const snap=JSON.parse(await fs.readFile(output,'utf8'));
    assert.equal(snap.no_graphiti_mutations,true);
    assert.equal(snap.remote_episode_authority_not_measured,true);
    assert.equal((await fs.stat(output)).mode & 0o777,0o600);
    await assert.rejects(main(['--mode','synthetic','--sizes','10',
      '--rounds','1','--output',output]),{code:'EEXIST'});
  }finally{await fs.rm(root,{recursive:true,force:true});}
});