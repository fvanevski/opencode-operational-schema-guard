#!/usr/bin/env node
/** Fixed synthetic pilot only; real host sample/holdout is still required. */
import { readFile } from 'node:fs/promises';
import { fromPrompt, fromTool } from './events.mjs';
import { selectUserDecision, selectCompletedTest } from '../../issue-75/v2-candidate/memory-core.mjs';
const pilot = JSON.parse(await readFile(new URL('./pilot-cases.json', import.meta.url), 'utf8'));
const scope = { group:'pilot', project:'gh_mcp', workspace:'/workspace/mcp_servers/gh_mcp' };
const rows = pilot.cases.map((c, i) => {
  const prompt = { sessionID:'ses-pilot', messageID:'msg-' + i, prompt:{text:c.text}, timestamp:'2026-11-03T16:00:00Z' };
  const tool = { sessionID:'ses-pilot', callID:c.callID, status:'completed',
    input:{ command:c.command }, result:{output:{exit:c.exit,output:c.output || 'x'.repeat(c.output_length || 0)}} };
  const old = c.source==='user' ? Boolean(selectUserDecision(c.text)) : Boolean(selectCompletedTest(tool));
  const next = c.source==='user' ? Boolean(fromPrompt(prompt,scope,{admitted:true})) : Boolean(fromTool(tool,scope));
  return {id:c.id, valuable:c.valuable, baseline_selected:old, new_selected:next};
});
const valuable = rows.filter(x => x.valuable);
const selected = k => rows.filter(x => x[k]).length;
const recall = k => valuable.filter(x => x[k]).length / valuable.length;
console.log(JSON.stringify({ pilot_kind:pilot.kind, frozen_at:pilot.frozen_at,
  total:rows.length, valuable:valuable.length,
  baseline:{selected:selected('baseline_selected'), valuable_recall:recall('baseline_selected')},
  candidate:{selected:selected('new_selected'), valuable_recall:recall('new_selected')}, rows }, null, 2));
