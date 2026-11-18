# GHDEV #101 C6.4 — last P3 tool-boundary reconciliation

**Central design / source, not host acceptance.** Issue #101 stays OPEN until exact-head review and separate parent #98 gate. No new PR for this evidence-only slice; use `issue/101-security-boundary` and make at most one coherent PR later if durable acceptance material should merge.

## Decision record

C6.3 P2 is accepted. The operator restored the original LiteLLM route, removed its temporary observer, and reverified the HOME fail-closed/project-ready sandbox. **Do not re-run C6.3 P2, restart its observer, reconfigure HOME/XDG or mutate OpenCode SQLite.** C6.1/C6.2/C6.3 host records remain frozen at their exact source/service identities.

C6.3 P3's `REVIEW_READY` checker validated reference strings rather than their targets. Specifically, `firecrawl`, `context7` and `graphiti` uploaded `tools/list` JSON with empty arrays; OpenViking's catalog was absent; `/api/mcp` was captured with `location.directory=/home/filip`, not the project. The inventory listed model-accessible `graphiti.clear_graph`, `graphiti.delete_episode`, `graphiti.delete_entity_edge`, `openviking.invoke_mcp_tool`, and Firecrawl URL-taking operations as bounded without source-backed, effective limits. Transport over HTTPS does not mean remote host execution, and OpenCode's bwrap/V2 file tool guard does not confine separate MCP processes. None of these are an established exploit or proof of an observed leak, but the zero-uncontained-executor assertion cannot be accepted as-is.

Official OpenCode V2 permissions accept normalized `<server>_<tool>` actions, with `resource="*"` for MCP calls; the last matching rule wins. A selected model-tool denial can be configured without removing a server. Confirm effective behavior from the exact installed V2 build and model/Code Mode surfaces; do not blindly copy legacy V1 rules. https://opencode.ai/docs/permissions/ ; https://opencode.ai/docs/mcp-servers/.

OpenViking's `find_mcp_tools`/`invoke_mcp_tool` may traverse a **second-tier registered MCP catalog** with stored upstream credentials, scoped to both user and account-shared roots. The correct observation is authenticated, read-only enumeration of both actual registry scopes and any mounted live contexts; if nonempty, inspect each reachable server/tool and its effective execution boundary. A bare outer `tools/list` cannot settle this. See https://docs.openviking.ai/en/api/26-mcp-live-context and https://docs.openviking.ai/en/guides/06-mcp-integration.

A Firecrawl tool that validates merely `http(s)` syntax does **not** prove protection from loopback, private IPv4/IPv6, link-local/metadata, DNS changes, redirects or browser actions. Classify at the actually deployed Firecrawl MCP **and downstream fetch engine**, inspecting the installed source/config. A 2026 upstream issue documents this threat pattern, but is not proof that the host's specific version is vulnerable: https://github.com/firecrawl/firecrawl-mcp-server/issues/194.

## Central policy choices and bounded remediation

1. **Preserve normal memory functionality and accepted #99/#100 source.** Graphiti/Ov remain connected for authorized reads and existing post-exit curation. Do not alter source/group/remote identity, Graphiti UUIDs, EX gate, curator, normal service or its provider route.
2. **Model-exposed destructive Graphiti tools are not needed for normal memory recall.** The production model's access to `clear_graph`, `delete_episode`, `delete_entity_edge` should be **denied** through effective V2 per-tool policy unless an already accepted, source-verified use demonstrates necessity. This does not delete graph data or disable post-exit trusted Graphiti worker use. Other Graphiti mutators (`add_memory`, `add_triplet`, `build_communities`, `summarize_saga`) require source-qualified, non-interactive authority or the same narrow model denial. Do not invoke a destructive tool merely to verify policy.
3. **OpenViking indirect gateway:** Prefer read-only proof that both upstream registries and applicable mounts contain no callable uncontained tool. If registry/mount coverage is incomplete or an unsafe secondary tool is callable, use a narrowly scoped **effective model denial** of `openviking_invoke_mcp_tool` while retaining ordinary OpenViking recall. Account for `find_mcp_tools`/live mounts if they enable invocation indirectly. No server-wide OpenViking disable.
4. **Firecrawl fetch:** Inspect actual `firecrawl_scrape`, `firecrawl_agent`, `firecrawl_search` (including `scrapeOptions`), and any other URL/action-accepting tool in the **observed current catalog**. If installed-source and runtime network policy cannot prove protection against private/loopback/metadata + redirects and browser JS/action escape, narrowly deny the unsafe fetch-capable model tools; preserve independently bounded search or parse functionality. Do not test against local secrets, internal services or cloud metadata URLs. No broad Firecrawl rewrite or new proxy.
5. **Other MCP tools:** Treat Caveman/Context7/Graphiti/OpenViking tool schemas as code/data boundaries to inspect, not as proof by name. Verify `download`, `add_resource`, `write`, `edit`, ACL/privacy actions and indirect service invocation scope where present. Material unexpected generic shell/host-file functionality is BLOCKED unless a supported narrow model-tool denial safely removes it.
6. **Safety and completion:** Routine generated-config permission edits (and one carefully controlled service restart if truly needed) are allowed to remove a demonstrated model-tool bypass. Back up before editing and verify unchanged non-permission config, plugins, EX/curator and provider route after. No agent-authored code changes, GitHub writes, skill self-modification, new observer, graph model drains, Graphiti physical deletion or extra inference daemon.

## Central implementation: primary-evidence preflight

`p3-evidence-preflight.mjs` closes the *structural evidence* bug from C6.3, without claiming to validate upstream code truth. Input: one private directory containing `p3-closure.json` and SHA256-pinned, regular-file JSON primary records. The verifier rejects missing, empty, corrupt, symlinked, cross-epoch, HOME-location or mismatched catalogs, missing per-tool decisions and missing security-control proofs. It cross-checks the real MCP `tools/list` entries with the current project-scoped model/Code-Mode registry, including tools not directly in the top-level provider `tools[]` but reachable via Code Mode. An explicit `model_registry.tools[]` entry is required for every accessible MCP capability; do not suppress Code Mode reachability.

**Required normalized schema** (each referenced record is JSON with `origin`, `service_epoch`, `project_location` and the indicated fields):

```json
{
  "schema": "ghdev101-c64-p3-v1",
  "service_epoch": "pid-actual:invocation-actual",
  "project_location": "/workspace/opencode-operational-schema-guard",
  "config_sha256": "<real full SHA-256>",
  "evidence": {
    "mcp_state": {"path": "mcp-state.json", "sha256": "<real SHA-256>"},
    "model_registry": {"path": "model-registry.json", "sha256": "<real SHA-256>"}
  },
  "catalogs": {
    "caveman": {"path":"catalogs/caveman.json","sha256":"<real SHA-256>"},
    "context7": {"path":"catalogs/context7.json","sha256":"<real SHA-256>"},
    "firecrawl": {"path":"catalogs/firecrawl.json","sha256":"<real SHA-256>"},
    "graphiti": {"path":"catalogs/graphiti.json","sha256":"<real SHA-256>"},
    "openviking": {"path":"catalogs/openviking.json","sha256":"<real SHA-256>"}
  },
  "decisions": {
    "graphiti.clear_graph": {
      "model_exposed": false, "disposition":"denied",
      "primary_proof":{"path":"proof/graphiti-clear-denial.json","sha256":"<real SHA-256>"}
    }
  },
  "special_controls": {
    "openviking_upstream_gateway": {"outcome":"no_registered_upstreams","covers":["openviking.invoke_mcp_tool"],"primary_proof":{"path":"proof/ov-upstreams.json","sha256":"<real SHA-256>"}},
    "firecrawl_network_fetch": {"outcome":"denied_effective","covers":["firecrawl.firecrawl_scrape"],"primary_proof":{"path":"proof/firecrawl-denial.json","sha256":"<real SHA-256>"}},
    "graphiti_destructive_mutations": {"outcome":"denied_effective","covers":["graphiti.clear_graph"],"primary_proof":{"path":"proof/graphiti-denial.json","sha256":"<real SHA-256>"}}
  }
}
```

The example is deliberately **incomplete**, since all discovered MCP tools need decisions and all security controls must cover every matching tool in the live catalog; use it only for field shapes, never as a fixture or claim of installed status. `mcp-state.json` must contain `servers:[{name,status}]` for the actual project. `model-registry.json` contains a normalized list of actual effective/direct/Code Mode reachable tools as `tools:[{name,origin,server?,tool?,access_mode?}]`. Each `catalogs/<server>.json` contains `server` and the actual MCP `tools:[{name,inputSchema,...}]`. A tool absent from the direct provider list but callable through Code Mode is **model_exposed=true**. `decisions` keys are `<server>.<tool>` for every discovered MCP tool, with accurate `model_exposed`, `disposition` (`bounded`, `denied`, `not_exposed`) and for hot tools a `primary_proof` file. Hot-tool source proofs must include `proof_type`, exact installed `implementation_sha`, `source_location` and `actual_constraint`; permission-denial proofs additionally include observed effective denial. `special_controls` include `covers[]` enumerating all matching tools. If `verified_bounded` is claimed for Firecrawl, supporting proof must establish four flags: `scheme_restricted`, `private_ip_and_loopback_blocked`, `redirect_targets_revalidated`, `browser_actions_constrained` with source/endpoint receipts. If OpenViking is empty, prove both user and shared registries zero and consider mounted live contexts. Claims and flags still need Central's independent source review.

Run `node docs/issue-101/c64/p3-evidence-preflight.mjs <private-evidence-directory>`; it returns `REVIEW_READY` **only** on structural consistency. Raw service credentials, original prompts, short-password hashes, entire process env, active secret paths and credential-bearing registered upstream headers MUST NOT be exported. Use per-member SHA-256 and a sanitized allowlist archive. Host-private originals may be retained for audit.

## Completion gate

**P2 remains accepted; P3 only.** The host handback should contain: exact main/C64 branch SHA+tree, effective service epoch/config and project location, catalog names/counts, individual hot-tool risk dispositions and effective denied/allowed proof, actual installed source/endpoint evidence with commit/tree, OpenViking two-tier registry/mount state, Firecrawl SSRF/browser boundary, Graphiti model-tool policy, script test/evaluator producer exits, unchanged plugin/graph/EX/provider state, privacy-checked archive digests and remaining bounded blockers. The central preflight result alone does not authorize #101 closure.

If source review reveals **no unsafe exposed tools** and all scoped evidence is complete, stop and return one packet. If any optional high-risk tool is exposed without constraints, apply the smallest supported per-tool denial, restart/reload once if required, recheck the final active registry and safety, and stop. If this requires an architectural code change, restore normal service and return exact source defect to Central. No new standalone issue/PR for a single tool rule.
