#!/usr/bin/env node
/**
 * GHDEV #101 C6.4: fail-closed completeness and evidence-integrity preflight.
 * Inputs are sanitized HOST OBSERVATIONS. No network access, no secret reads,
 * no modification and no independent proof of an upstream security claim.
 * A REVIEW_READY result means Central must inspect each source-backed control.
 */
import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { join, resolve, relative, isAbsolute, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const SHA256 = /^[a-f0-9]{64}$/;
const HEX = /^[a-f0-9]{40,64}$/;
const PROJECT = '/workspace/opencode-operational-schema-guard';
const EXPECTED = ['caveman','context7','firecrawl','graphiti','openviking'];
const HOT = Object.freeze({
  'graphiti': ['add_memory','add_triplet','delete_episode','delete_entity_edge','clear_graph','build_communities','summarize_saga'],
  'openviking': ['invoke_mcp_tool','set_acl','privacy_upsert','add_resource','add_skill','write','edit','remember','forget','cancel_watch'],
  'firecrawl': ['firecrawl_scrape','firecrawl_search','firecrawl_agent'],
});

export function important(server, tool) {
  return (HOT[server] || []).includes(tool);
}
export function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
const isObject = x => x && typeof x==='object' && !Array.isArray(x);
const exactKeys = (arr) => new Set(arr).size === arr.length;
const clean = str => typeof str==='string' && /^[a-zA-Z0-9._/:-]+$/.test(str) && !str.includes('..') && !str.startsWith('/') && !str.includes('\\');

/** Root must be an ordinary directory; all evidence paths are relative to it.
 * Check every ancestor and leaf for symlinks, refusing escape and special files. */
function safeRead(root, name, max=2*1024*1024) {
  if (!clean(name)) throw Error('invalid evidence relative path');
  const full=resolve(root,name), rel=relative(root,full);
  if (rel.startsWith('..'+sep) || rel==='..' || isAbsolute(rel)) throw Error('path escapes evidence root');
  let cursor=root;
  for (const part of name.split('/')) {
    if (!part || part==='.') throw Error('ambiguous path component');
    cursor=join(cursor,part);
    const stat=lstatSync(cursor);
    if (stat.isSymbolicLink()) throw Error('symlink evidence forbidden');
  }
  const stat=lstatSync(full);
  if (!stat.isFile() || stat.size>max) throw Error('evidence must be regular bounded file');
  return readFileSync(full);
}
function readVerified(root, rec) {
  if (!isObject(rec) || !clean(rec.path) || !SHA256.test(rec.sha256))throw Error('missing path or full SHA256');
  const bytes=safeRead(root,rec.path);
  if (sha256(bytes)!==rec.sha256)throw Error('evidence SHA256 mismatch');
  return JSON.parse(bytes.toString('utf8'));
}
function proof(root, ref, errors, label) {
  try {
    const content=readVerified(root,ref);
    if (!isObject(content) || !Object.keys(content).length) throw Error('empty primary proof');
    if (!content.origin || !content.service_epoch || !content.project_location)throw Error('missing observation provenance');
    return content;
  } catch(e) {errors.push(`${label}: ${e.message}`);return null;}
}
/** Exported pure evaluator reads explicit root and report, no host/remote calls. */
export function evaluate(root, packet) {
  const errors=[];
  const fail=(label,why)=>errors.push(`${label}: ${why}`);
  if (!isObject(packet))return {result:'FAIL',problems:['packet must be an object']};
  if (packet.schema!=='ghdev101-c64-p3-v1')fail('schema','wrong schema');
  if (packet.project_location!==PROJECT)fail('project_location','expected project-scoped observations');
  if (typeof packet.service_epoch!=='string' || packet.service_epoch.length<8)fail('service_epoch','missing');
  if (!SHA256.test(packet.config_sha256||''))fail('config_sha256','full sha256 required');
  if (!isObject(packet.evidence))fail('evidence','missing');
  const read=(key)=>{const x=proof(root,packet.evidence?.[key],errors,key);if(x && (x.service_epoch!==packet.service_epoch || x.project_location!==PROJECT))fail(key,'epoch/location mismatch');return x;};
  const status=read('mcp_state'), registry=read('model_registry');
  if (status && (!Array.isArray(status.servers) || status.servers.some(x=>!isObject(x)||!x.name||!x.status)))fail('mcp_state','servers[] missing');
  if (registry && (!Array.isArray(registry.tools) || registry.tools.some(x=>!isObject(x)||typeof x.name!=='string'||!x.name)))fail('model_registry','tools[] missing');
  const connected=new Set((status?.servers||[]).filter(x=>x.status==='connected').map(x=>x.name));
  if (!exactKeys((status?.servers||[]).map(x=>x.name)))fail('mcp_state','duplicate server names');
  for (const s of EXPECTED) if (!connected.has(s))fail('mcp_state',`${s} not connected in project scope`);
  if (connected.has('probe'))fail('mcp_state','probe exposed');
  const registryNames=(registry?.tools||[]).map(x=>x.name);
  if (!exactKeys(registryNames))fail('model_registry','duplicate tool names');
  const catalogs=packet.catalogs;
  if (!isObject(catalogs))fail('catalogs','missing');
  const catalogIds=new Set();
  let toolCount=0;
  const activeServers=(status?.servers||[]).filter(x=>x.status==='connected').map(x=>x.name);
  for (const server of activeServers) {
    const item=proof(root,catalogs?.[server],errors,`catalog:${server}`);
    if (!item)continue;
    if (item.service_epoch!==packet.service_epoch || item.project_location!==PROJECT || item.server!==server)fail(`catalog:${server}`,'scope/epoch/server mismatch');
    if (!Array.isArray(item.tools) || item.tools.length===0){fail(`catalog:${server}`,'empty tools/list is not proof');continue;}
    const names=[];
    for (const t of item.tools) {
      if (!isObject(t) || typeof t.name!=='string'||!t.name || !isObject(t.inputSchema) || t.inputSchema.type!=='object') {
        fail(`catalog:${server}`,'missing tool name or full object inputSchema');continue;
      }
      names.push(t.name);
      // Exactly the normalization OpenCode publishes: every unsupported char -> underscore.
      const native=`${server}_${t.name}`.replace(/[^A-Za-z0-9_-]/g,'_');
      const id=`${server}.${t.name}`;
      if (catalogIds.has(id))fail(`catalog:${server}`,'duplicate global tool id');
      catalogIds.add(id);toolCount++;
      const model=registry?.tools?.find(x=>x.name===native && x.origin==='mcp' && x.server===server && x.tool===t.name && ['direct','code_mode'].includes(x.access_mode));
      const classified=packet.decisions?.[id];
      if (!isObject(classified)) {fail(`decision:${id}`,'missing classification');continue;}
      if (classified.model_exposed===true && !model)fail(`decision:${id}`,'reported exposed but absent from model registry');
      if (classified.model_exposed===false && model)fail(`decision:${id}`,'reported non-exposed but present in model registry');
      if (![true,false].includes(classified.model_exposed))fail(`decision:${id}`,'exposure not boolean');
      if (!['bounded','denied','not_exposed'].includes(classified.disposition))fail(`decision:${id}`,'unsupported disposition');
      if (classified.model_exposed===true && classified.disposition==='not_exposed')fail(`decision:${id}`,'exposed tool cannot be not_exposed');
      if (classified.model_exposed===false && classified.disposition==='bounded')fail(`decision:${id}`,'not exposed tool should not claim bounded execution');
      if (important(server,t.name) && classified.model_exposed===true) {
        const evidence=proof(root,classified.primary_proof,errors,`risk:${id}`);
        if (evidence && !(['source_readback','policy_denial','runtime_boundary','registry_empty'].includes(evidence.proof_type)))fail(`risk:${id}`,'not an allowed primary proof type');
        if (evidence && !HEX.test(evidence.implementation_sha||''))fail(`risk:${id}`,'exact installed source identity missing');
        if (evidence && (typeof evidence.actual_constraint!=='string' || !evidence.actual_constraint.trim() || typeof evidence.source_location!=='string' || !evidence.source_location.trim()))fail(`risk:${id}`,'implemented constraint or exact source location absent');
        if (classified.disposition==='bounded' && !['source_readback','runtime_boundary','registry_empty'].includes(evidence?.proof_type))fail(`risk:${id}`,'bounded operation needs actual implementation proof');
        if (classified.disposition==='denied' && evidence?.proof_type!=='policy_denial')fail(`risk:${id}`,'denial requires effective permission proof');
      }
    }
    if(!exactKeys(names))fail(`catalog:${server}`,'duplicate tool entries');
  }
  for (const id of Object.keys(packet.decisions||{}))if(!catalogIds.has(id))fail(`decision:${id}`,'not found in actual MCP catalog');
  const sensitive=packet.special_controls;
  for (const control of ['openviking_upstream_gateway','firecrawl_network_fetch','graphiti_destructive_mutations']) {
    const x=sensitive?.[control];
    if(!isObject(x)||!['verified_bounded','denied_effective','no_registered_upstreams'].includes(x.outcome)){fail(`special:${control}`,'missing resolved control');continue;}
    const p=proof(root,x.primary_proof,errors,`special:${control}`);
    const targetPrefixes={openviking_upstream_gateway:['openviking.invoke_mcp_tool'],firecrawl_network_fetch:['firecrawl.firecrawl_scrape','firecrawl.firecrawl_search','firecrawl.firecrawl_agent'],graphiti_destructive_mutations:['graphiti.delete_episode','graphiti.delete_entity_edge','graphiti.clear_graph']};
    for(const id of targetPrefixes[control])if(catalogIds.has(id) && !x.covers?.includes(id))fail(`special:${control}`,`missing affected tool ${id}`);
    if(p && p.service_epoch!==packet.service_epoch)fail(`special:${control}`,'different epoch');
    if (control==='openviking_upstream_gateway' && x.outcome==='no_registered_upstreams'){
      if (!p || p.proof_type!=='registry_empty' || p.user_count!==0 || p.account_count!==0 || p.mounts_checked!==true || p.unsafe_mounted_tools_count!==0)fail(`special:${control}`,'both scopes of live upstream registry and unsafe mounts must be proven empty');
    }
    if (control==='firecrawl_network_fetch' && x.outcome==='verified_bounded'){
      if (!p || !p.private_ip_and_loopback_blocked || !p.redirect_targets_revalidated || !p.scheme_restricted || !p.browser_actions_constrained)
        fail(`special:${control}`,'actual service/source proof of SSRF and browser actions incomplete');
    }
    if (x.outcome==='denied_effective' && (!p || p.proof_type!=='policy_denial' || p.denial_confirmed!==true))fail(`special:${control}`,'unproven effective model denial');
    if (x.outcome==='verified_bounded' && (!p || p.proof_type!=='source_readback'))fail(`special:${control}`,'bounded claims require source readback');
  }
  return {result:errors.length?'FAIL':'REVIEW_READY',problems:errors,
    connected_servers:activeServers.length,catalogued_tools:toolCount,
    limitation:'Structure and evidence byte-integrity only. Central must independently inspect source readbacks, permission decisions, scope and actual constraints.'};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  try {
    if (process.argv.length!==3)throw Error('usage: node p3-evidence-preflight.mjs <private-evidence-directory>');
    const root=realpathSync(process.argv[2]);
    if(!lstatSync(root).isDirectory())throw Error('evidence root must be directory');
    const packet=JSON.parse(safeRead(root,'p3-closure.json').toString('utf8'));
    const result=evaluate(root,packet);
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if (result.result!=='REVIEW_READY') process.exitCode=1;
  } catch(e){process.stderr.write('P3 evidence refused: '+e.message.replace(/\/\S+/g,'<path>')+'\n');process.exitCode=2;}
}
