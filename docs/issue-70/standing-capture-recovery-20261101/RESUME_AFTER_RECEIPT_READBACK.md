# Complete standing Graphiti promotion after the successful OpenViking commit

## Source-grounded incident

On 2026-11-01 at 19:14:25Z, the host controller reported \`Original OpenViking commit resolved (COMPLETE:completed)\`, then a \`KeyError: 'terminal_outcome'\` in its **local receipt verification** and disabled standing Graphiti capture. Issue-70 backend source explicitly defines \`commit_receipts.outcome\`, \`state\` and \`release_proven\`, not \`terminal_outcome\`. Gate source defines \`intents.last_terminal_outcome\`. This is a controller verification-field defect. Do not change production receipt schema to satisfy it.

The original OpenViking request was already rearmed and, according to the controller, processed to completion. Its request key must **never be rearmed or submitted again** just because the later controller verification failed. Corrected gate/backend sources, and the backend receipt DB facility, were retained by rollback. The Graphiti work may be queued, processing, blocked-reconcile, or completed; classify fresh durable state rather than assume.

## One bounded completion, no new approvals or preparation campaign

**First**, fetch exact working branch and read this file and \`tools/inspect_promotion_readback.py\` plus tests. Run read-only:
\`\`\`bash
python3 -m unittest discover -s docs/issue-70/standing-capture-recovery-20261101/tests -p test_inspect_promotion_readback.py -v
python3 docs/issue-70/standing-capture-recovery-20261101/tools/inspect_promotion_readback.py
\`\`\`
Read-back opens source-authoritative gate queue and backend receipt ledgers read-only. This complements, not replaces, source-attributed Graphiti/FalkorDB recall verification.

**Then** make the smallest corrected host continuation based on the classified state:

- \`RESUME_EXISTING_GRAPHITI_DRAIN_ONLY\`: original OpenViking receipt must be terminal/release-proven, its gate intent complete, and the target Graphiti work queued/unclaimed. Restore *only* previously staged standing Graphiti configuration and the capture policies, after the normal agent-exit/lease/quiescence checks. Never rerun source overlay installation, pre-handler negative proof, \`--apply\` rearm, OpenViking commit, or native read. Wait for the original Graphiti work to produce an authenticated persisted receipt/UUID, then check source-attributed recall and the two baseline episodes.
- \`VERIFY_RECALL_AND_STANDING_CONFIG\`: both work items are already durably complete. Check the existing Graphiti UUID against FalkorDB and source-attributed recall, then restore standing configuration only if necessary. No ingestion repeat.
- \`STOP_AND_RECONCILE_EXACT_STATE\`: distinguish \`processing\`, \`blocked_reconcile\`, incomplete backend receipt, gate/ledger disagreement, or contradictory identity; reconcile the exact existing operation using the documented worker recovery path. Never discard a blocked row or claim processing finished because its task completed in a different store.

**Controller repair**: locate the \`terminal_outcome\` access in the private \`activate-and-verify.sh\` Stage 05 only. Replace the incorrect backend field with \`outcome\`, while retaining \`state == terminal\`, \`release_proven == 1\`, nonempty \`task_id\`, exact request/scope/body digest and gate \`last_terminal_outcome\` checks. If multiple uses of \`terminal_outcome\` exist, identify the actual record types before editing. Prefer a short **new continuation command** that skips prior completed production stages; the original journal and previous controller remain immutable evidence.

The user's standing activation instruction authorizes this routine repair. No repeated exact-string approval. Use ordinary host systemd access and sudo where required. Any active interactive agent can prepare and run CPU-only readback, but actual Graphiti inference must run after it exits under the normal shared lease and scheduler admission, as the gate requires. A persistent \`codex app-server\` or \`opencode serve\` helper is not by itself an active interactive agent.

**Completion evidence:** original OpenViking receipt \`state=terminal,outcome=completed,release_proven=1\`, gate intent \`complete\`; target Graphiti \`memory_work=completed\` and matching \`graphiti_ingest_receipts\` with true episode UUID; group-scoped persisted Graphiti readback/recall; two historical UUIDs preserved; services and \`graphiti_enabled=true\` effective after restart. Return directly as \`PROMOTED_ENABLED\` or a specific confirmed technical blocker. No new source fact commit, nomination, PR, issue, or prolonged new test campaign. The already-tested fixed production overlay remains the runtime authority unless fresh hashes contradict.
