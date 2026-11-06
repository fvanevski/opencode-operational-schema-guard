import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureGroupName,parseFixtureGroup,isFixtureGroup,
 permittedQualificationGroup,fixtureUnitName,validRecoveryBinding,
 describeFixtureGroup,LEGACY_FIXTURE_CATALOG} from './fixture-groups.mjs';

test('descriptive canonical fixture identities require domain, function and logical run',()=>{
 assert.equal(fixtureGroupName('cron','holdout',1),'graphiti-cron-holdout-r01');
 assert.equal(fixtureGroupName('webvtt','diagnostic',12),'graphiti-webvtt-diagnostic-r12');
 assert.deepEqual(parseFixtureGroup('graphiti-curator-recovery-r01'),{
  group_id:'graphiti-curator-recovery-r01',domain:'curator',purpose:'recovery',run:1});
 for(const invalid of ['graphiti-cron-holdout-r00','graphiti-issue81-holdout-r01',
  'graphiti-cc5349fc-holdout-r01','graphiti-cron-holdout-cc5349fc',
  'cur81_holdout_cc5349fc','ghdev_gh_mcp','graphiti-cron-bogus-r01'])
   assert.equal(parseFixtureGroup(invalid),null);
 assert.throws(()=>fixtureGroupName('issue81','holdout',1),/DESCRIPTIVE_FIXTURE_ID_REQUIRED/);
 assert.throws(()=>fixtureGroupName('cron','holdout',0),/DESCRIPTIVE_FIXTURE_ID_REQUIRED/);
});
test('named qualification rebinds preserve purpose and domain fences',()=>{
 assert.equal(permittedQualificationGroup('graphiti-cron-development-r01',
  'graphiti-cron-holdout-r01','holdout'),true);
 assert.equal(permittedQualificationGroup('graphiti-cron-capture-r01',
  'graphiti-cron-holdout-r02','holdout'),true);
 assert.equal(permittedQualificationGroup('graphiti-cron-development-r01',
  'graphiti-webvtt-holdout-r01','holdout'),false);
 assert.equal(permittedQualificationGroup('graphiti-cron-holdout-r01',
  'graphiti-cron-development-r01','holdout'),false);
 assert.equal(permittedQualificationGroup('ghdev_gh_mcp',
  'graphiti-cron-holdout-r01','holdout'),false);
});
test('known legacy identities are display mappings, not group redirects',()=>{
 assert.ok(isFixtureGroup('cur81_holdout_cc5349fc','holdout',{allowLegacy:true}));
 assert.ok(isFixtureGroup('cur81_dev_ce555621','efficiency',{allowLegacy:true}));
 assert.ok(isFixtureGroup('cur80_qual01','recovery',{allowLegacy:true}));
 assert.equal(isFixtureGroup('cur81_holdout_cc5349fc','holdout'),false);
 assert.equal(permittedQualificationGroup('cur81_dev',
  'cur81_holdout_cc5349fc','holdout'),true);
 assert.equal(permittedQualificationGroup('cur81_dev',
  'graphiti-cron-holdout-r01','holdout'),true);
 assert.equal(permittedQualificationGroup('cur81_dev','ghdev_gh_mcp','holdout'),false);
 const historic=describeFixtureGroup('cur81_holdout_cc5349fc');
 assert.equal(historic.kind,'legacy_fixture');
 assert.equal(historic.immutable_group_id,'cur81_holdout_cc5349fc');
 assert.equal(describeFixtureGroup('cur81_unknown').kind,'not_a_known_fixture');
 assert.ok(LEGACY_FIXTURE_CATALOG.every(x=>!x.group_id.startsWith('graphiti-')));
});
test('new recovery service units must match groups, legacy bindings stay accepted',()=>{
 assert.equal(fixtureUnitName('graphiti-curator-recovery-r01'),
  'ghdev-curator-recovery-r01');
 assert.equal(validRecoveryBinding('graphiti-curator-recovery-r01',
  'ghdev-curator-recovery-r01'),true);
 assert.equal(validRecoveryBinding('graphiti-curator-recovery-r01',
  'ghdev-curator-recovery-r02'),false);
 assert.equal(validRecoveryBinding('cur80_qual01','ghdev-curator80-qual01'),true);
 assert.equal(validRecoveryBinding('cur80_qual01','ghdev-curator-recovery-r01'),false);
 assert.equal(validRecoveryBinding('ghdev_gh_mcp','ghdev-curator-recovery-r01'),false);
});

test('the descriptive production graph is distinct from all fixtures and legacy data',()=>{
 const live=describeFixtureGroup('development-knowledge');
 assert.deepEqual(live,{group_id:'development-knowledge',kind:'production',
  label:'Development Knowledge'});
 const old=describeFixtureGroup('ghdev_gh_mcp');
 assert.equal(old.kind,'legacy_production');
 assert.equal(parseFixtureGroup(live.group_id),null);
 assert.equal(isFixtureGroup(live.group_id,'recovery'),false);
 assert.equal(permittedQualificationGroup('ghdev_gh_mcp',
  'development-knowledge','development'),false);
});
