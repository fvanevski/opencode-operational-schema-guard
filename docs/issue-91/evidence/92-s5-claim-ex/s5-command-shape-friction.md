# Issue #92 S5 — GHDEV-10 COMMAND_SHAPE_FRICTION

COMMANDS_MATCH_HANDOFF=yes

COMMAND_SHAPE_FRICTION:
  encountered=yes
  inherited_from_S4:
    - see docs/issue-91/evidence/92-s4-claim-evidence/s4-command-shape-friction.md
      (graphiti_group_probe interface_discovery; mcp_stale_session_404 runtime_misbinding;
       driver_preflight_partial_inference successful_recovery)
  s5_events:
    - scenario=graphiti_endpoint_managed_route
      requested_shape="http://127.0.0.1:8766/mcp (S4 driver hardcoded a standalone MCP on 8766)"
      effective_shape="the live Graphiti MCP is mcp-mux-managed; direct 8766 was down at campaign start and is woken on demand; the stable loopback endpoint is the mcp-mux route http://127.0.0.1:8012/graphiti (public https://mcp.garion.us/graphiti), spawned by start-graphiti.sh on 8766"
      rewrite_provenance=interface_discovery
      event_kind=interface_discovery
      execution_effect=recovered_after_retry
      correction_or_annotation="probed 8766 (refused) then 8012/graphiti (initialize + get_episodes OK); the S5 driver uses 8766/mcp (woken by the mcp-mux backend) and the verifier uses the 8012/graphiti managed route; both are loopback and accepted by the GraphitiMcp client"
      replacement_shape="use the mcp-mux managed route 127.0.0.1:8012/graphiti for readback; 8766/mcp for the admitted driver writes"
      recipe_reference=none
      resource_reference=none
      contract_conflict=no
      durable_gap_candidate=yes
    - scenario=scheduler_auto_metric_transient_busy
      requested_shape="one-shot scheduler-idle check at EX admission"
      effective_shape="the gate parse_vllm_metrics 'auto' detection maps ninfer_requests_materializing->running and ninfer_requests_paused->waiting; a transient Graphiti extraction from concurrent MCP read probes made the scheduler report busy and the launcher fail-closed ('scheduler busy running/waiting nonzero')"
      rewrite_provenance=runtime_misbinding
      event_kind=runtime_misbinding
      execution_effect=recovered_after_retry
      correction_or_annotation="added a bounded admission-wait (180s) that re-polls observation() until the scheduler is idle through the 30s quiet grace; the final post-grace observation stays fail-closed. No inference occurred before admission in any attempt."
      replacement_shape="bounded admission-wait before the quiet grace; final check fail-closed"
      recipe_reference=none
      resource_reference=none
      contract_conflict=no
      durable_gap_candidate=yes
    - scenario=bridge_stdout_not_captured
      requested_shape="read the admitted Node driver's stdout from run_admitted_node to log the tail"
      effective_shape="ex_admitted_node_bridge.run_admitted_node uses subprocess.run with inherited stdout (no capture), so proc.stdout is None; the launcher's proc.stdout.strip() raised 'NoneType has no attribute strip' AFTER the driver had already completed and written s5-claim-ex-result.json (9 persisted)"
      rewrite_provenance=runtime_misbinding
      event_kind=runtime_misbinding
      execution_effect=recovered_after_retry
      correction_or_annotation="the driver was resumable (no-replay); fixed the launcher to treat proc.stdout as optional and rely on returncode + the written result file; the terminal reconcile-only then settled 9 queued -> persisted"
      replacement_shape="guard (proc.stdout or '') and rely on the driver-written result + reconcile-only"
      recipe_reference=none
      resource_reference=none
      contract_conflict=no
      durable_gap_candidate=yes
  safety_incidents:
    - none (no forced EMIT, no destructive cleanup, no S1-S4 group mutation, no model call before a proven EX admission in the final admitted run; the two pre-admission scheduler-busy fail-closes and the post-run NoneType crash were both recovered with no state mutation and no blind resubmission)
