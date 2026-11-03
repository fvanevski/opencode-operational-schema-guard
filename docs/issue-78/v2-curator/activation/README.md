# Optional automatic post-exit wake for Issue #80

This is **an event wake**, not an inference scheduler or new model service.
The \`*.path\` watches the existing bounded candidate **and review-state**
 directories; both native capture and portal approvals must wake the oneshot
service invokes **the already accepted** \`docs/issue-75/v2-candidate/post-exit-drain.py\`
which owns canonical inference lease, active-harness exclusion, quiet grace,
scheduler-idle check and unresolved-Graphiti fail-closed behavior. It invokes
\`curator-cli.mjs drain\`, never curation in an interactive OpenCode hook.

The templates are deliberately **not installed or enabled** by GitHub source
staging. Instantiate them only against a disposable group, private test state,
isolated Graphiti MCP endpoint and authenticated live gate source/config, and
only when the installed gate's current interface has been checked.

Before enabling, create a private 0600 environment file **outside Git**
with \`LOCAL_CURATOR_URL=http://127.0.0.1:<port>/v1/chat/completions\`,
\`LOCAL_CURATOR_MODEL=<actual available id>\`, optionally
\`LOCAL_CURATOR_API_KEY=<local API key>\`. Never stage the values.
Use actual absolute executable paths and verified installed gate config.
The candidate queue group directory must already exist (the capture plugin
creates it), or first create it in the **disposable** state root.

For disposable qualification, use \`render-qualification.mjs\` to generate
 private unit files, then install them under the current user's
 \`~/.config/systemd/user/\` and operate with \`systemctl --user\` only.
 Do not use \`sudo systemctl\` or create root-owned queue/review records.
 Install only disposable \`ghdev-curator80-*\` units. The renderer never
 installs or enables a service and never touches the real plugin list.

The oneshot service may fail with "interactive harness active" while the client
is still running; systemd retry is a 30-second event-wake continuation, not
authorization to infer during activity. Actual lock/scheduler check remains in
the existing gate. A lost Graphiti ACK or nonterminal extraction is **not**
safe to retry blindly. The accepted Python wrapper may retain EX admission
indefinitely on an unresolved remote job; its *disposable-worker-only*
quiescence procedure must not be applied to production services. Do not
activate a permanent systemd instance or mutate live Graphiti without the
separate approved activation/rollback boundary.

Validate a real disposable workflow with the operator leaving the OpenCode
client: a queued capture causes wake; pre-exit does not call LLM/add_memory;
after genuinely exited and gate idle, one model-curation and one group-scoped
Graphiti submission occur; positive persisted episode readback ends the
oneshot. Exercise a model outage and ambiguous ACK with structured status.
If the actual gate requires a different safe queue trigger, adapt this *wake
surface* under the same admitted worker contract; do not add a second scheduler
or rewrite the canonical inference admission gate to fit the example.
