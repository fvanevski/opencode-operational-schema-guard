import { sourcedEpisodeResolver } from '/home/filip/.config/opencode/plugins/ghdev-graphiti-memory/docs/issue-78/v2-curator/sourced-recall.mjs';
const out = await sourcedEpisodeResolver(
  '/home/filip/.local/state/ghdev-graphiti',
  'development-knowledge',
  '/workspace/mcp_servers/gh_mcp',
  'gh_mcp',
  ['009974d2-f051-45fd-ac0c-f259dcfdd1a8']
);
console.log(JSON.stringify(out, null, 2));
