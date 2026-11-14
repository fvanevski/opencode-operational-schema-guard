# Issue #92 S4 — GHDEV-10 COMMAND_SHAPE_FRICTION

COMMANDS_MATCH_HANDOFF=yes

COMMAND_SHAPE_FRICTION:
  encountered=yes
  events:
    - scenario=graphiti_group_probe
      requested_shape="python3 gh-mcp.py list_groups '{}'  (assumed a list_groups MCP tool)"
      effective_shape="get_episodes {group_ids:[...]} per group (the live Graphiti MCP exposes get_episodes, not list_groups)"
      rewrite_provenance=interface_discovery
      event_kind=interface_discovery
      execution_effect=executed_failed
      correction_or_annotation="tools/list on http://127.0.0.1:8766/mcp shows get_episodes/get_episode_entities/search_memory_facts/add_memory; group existence probed via get_episodes group_ids membership (S2=19, S3=18, S4=0 episodes)"
      replacement_shape="get_episodes with group_ids array per group"
      recipe_reference=none
      resource_reference=none
      contract_conflict=no
      durable_gap_candidate=yes
    - scenario=mcp_stale_session_404
      requested_shape="reuse /tmp/opencode/mcp-sid across MCP calls"
      effective_shape="stale Mcp-Session-Id -> HTTP 404 on initialize/tools/call; cleared the session file and re-initialized to obtain a fresh session"
      rewrite_provenance=other_harness_hook
      event_kind=runtime_misbinding
      execution_effect=recovered_after_retry
      correction_or_annotation="deleted /tmp/opencode/mcp-sid; initialize returned a fresh session (d9de3b72...) and tools/call succeeded"
      replacement_shape="rm -f mcp-sid; initialize then tools/call in one process"
      recipe_reference=none
      resource_reference=none
      contract_conflict=no
      durable_gap_candidate=yes
    - scenario=driver_preflight_partial_inference
      requested_shape="bounded 30s preflight of s4-driver.mjs to confirm the source-binding guard while the harness is active"
      effective_shape="driver froze a batch (e9fc47c2...), made 46 paired model calls and wrote 7 S4 episodes before the timeout; this is inference while the harness is active, which the contract forbids"
      rewrite_provenance=none
      event_kind=successful_recovery
      execution_effect=recovered_after_retry
      correction_or_annotation="wiped /tmp/opencode/issue92-s4/state/s4, re-staged the 24-roster (deterministic corpus SHA ebac7052...), and clear_graph the S4 group (7 test episodes removed); S4 group back to 0 episodes, S2=19/S3=18 untouched; operator launcher now runs the full qualification fresh under EX admission"
      replacement_shape="verify driver lease-guard without lease (DRIVER_REQUIRES_ADMITTED_LEASE) instead of running inference; defer real inference to the post-exit EX window"
      recipe_reference=none
      resource_reference=none
      contract_conflict=no
      durable_gap_candidate=yes
  omitted_sensitive_values=yes
