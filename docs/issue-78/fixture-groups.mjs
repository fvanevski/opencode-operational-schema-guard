/** Read-only fixture identity contract. Never aliases or renames a persisted group. */
const DOMAIN=/^[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*){0,2}$/;
const PURPOSES=new Set(['capture','development','diagnostic','efficiency','holdout',
 'isolation','qualification','recovery']);
const NAMED=/^graphiti-([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*){0,2})-(capture|development|diagnostic|efficiency|holdout|isolation|qualification|recovery)-r([0-9]{2,3})$/;
const LEGACY_HOLDOUT=/^cur81_holdout_[a-f0-9]{8}$/;
const LEGACY_DEVELOPMENT=/^cur81_dev_[a-f0-9]{8}$/;
const LEGACY_RECOVERY=/^cur80_[a-z0-9_-]{3,60}$/;
const LEGACY_CAPTURE=/^cur81_native_[a-f0-9]{8}$/;

/** Verified historical identity labels: for display ONLY, never remote lookups. */
export const LEGACY_FIXTURE_CATALOG=Object.freeze([
 ['cur80_disposable','Curator disposable qualification'],
 ['cur80_qual01','Curator qualification run 01'],
 ['cur80_qual02','Curator qualification run 02'],
 ['cur81_dev','Frozen development-corpus source scope'],
 ['cur81_dev_ce555621','Curated-memory development cohort'],
 ['cur81_native_a1f3c9d7','WebVTT native diagnostic capture'],
 ['cur81_native_8cd61d76','Cron native acceptance capture'],
 ['cur81_holdout_cc5349fc','Cron acceptance holdout'],
].map(([group_id,label])=>Object.freeze({group_id,label:label+' (legacy)'})));

export function parseFixtureGroup(group){
 if(typeof group!=='string'||group.length>100)return null;
 const m=NAMED.exec(group);
 if(!m||Number(m[3])<1)return null;
 if(m[1].split('-').some(x=>/^(?:cur|issue|pr)\d+$/.test(x)||
  /^[a-f0-9]{8,}$/.test(x)))return null;
 return {group_id:group,domain:m[1],purpose:m[2],run:Number(m[3])};
}
export function fixtureGroupName(domain,purpose,run=1){
 if(typeof domain!=='string'||!DOMAIN.test(domain)||!PURPOSES.has(purpose)||
  !Number.isInteger(run)||run<1||run>999)
  throw Error('DESCRIPTIVE_FIXTURE_ID_REQUIRED');
 const group='graphiti-'+domain+'-'+purpose+'-r'+String(run).padStart(2,'0');
 if(!parseFixtureGroup(group))throw Error('DESCRIPTIVE_FIXTURE_ID_REQUIRED');
 return group;
}
export function isFixtureGroup(group,purpose,{allowLegacy=false}={}){
 const named=parseFixtureGroup(group);
 if(named)return !purpose||named.purpose===purpose;
 if(!allowLegacy)return false;
 if(purpose==='holdout')return LEGACY_HOLDOUT.test(group||'');
 if(purpose==='development'||purpose==='efficiency')
  return group==='cur81_dev'||LEGACY_DEVELOPMENT.test(group||'');
 if(purpose==='capture'||purpose==='diagnostic')return LEGACY_CAPTURE.test(group||'');
 if(purpose==='recovery')return LEGACY_RECOVERY.test(group||'');
 return false;
}
/** Allows bounded *new* source bindings; caller still verifies every event ID. */
export function permittedQualificationGroup(source,target,split){
 if(source===target)return true;
 const original=parseFixtureGroup(source),next=parseFixtureGroup(target);
 if(source==='cur81_dev')
  return split==='holdout'?
   isFixtureGroup(target,'holdout',{allowLegacy:true}):
   split==='development'&&(
    isFixtureGroup(target,'development',{allowLegacy:true})||
    isFixtureGroup(target,'efficiency',{allowLegacy:true}));
 if(!original||!next||original.domain!==next.domain)return false;
 if(split==='holdout')
  return ['development','capture','diagnostic'].includes(original.purpose)&&
   next.purpose==='holdout';
 if(split==='development')
  return original.purpose==='development'&&
   ['development','efficiency'].includes(next.purpose);
 return false;
}
export function fixtureUnitName(group){
 if(!parseFixtureGroup(group))throw Error('DESCRIPTIVE_FIXTURE_ID_REQUIRED');
 return 'ghdev-'+group.slice('graphiti-'.length);
}
export function validRecoveryBinding(group,unit){
 if(isFixtureGroup(group,'recovery'))return unit===fixtureUnitName(group);
 return LEGACY_RECOVERY.test(group||'')&&
  /^ghdev-curator80-[a-z0-9-]{1,40}$/.test(unit||'');
}
export function describeFixtureGroup(group){
 const named=parseFixtureGroup(group);
 if(named){
  const words=x=>x.split('-').map(t=>t[0].toUpperCase()+t.slice(1)).join(' ');
  return {group_id:group,kind:'named_fixture',
   label:words(named.domain)+' / '+words(named.purpose)+' / Run '+
    String(named.run).padStart(2,'0'),
   domain:named.domain,purpose:named.purpose,run:named.run};
 }
 const historical=LEGACY_FIXTURE_CATALOG.find(x=>x.group_id===group);
 if(historical)return {...historical,kind:'legacy_fixture',
  immutable_group_id:group};
 if(['holdout','development','capture','recovery'].some(p=>
  isFixtureGroup(group,p,{allowLegacy:true})))
  return {group_id:group,kind:'unmapped_legacy_fixture',
   label:'Historical fixture: purpose not independently verified'};
 return {group_id:group,kind:'not_a_known_fixture',label:null};
}
