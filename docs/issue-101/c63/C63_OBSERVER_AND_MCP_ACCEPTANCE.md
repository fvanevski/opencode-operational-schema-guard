# GHDEV #101 — C6.3 final provider / MCP boundary closure

**Central architecture and implementation; host evidence pending.** This supplements C6.1/C6.2 without changing #99/#100 memory source, model, normal EX admission, or existing production sandbox. Source authority at staging: main `df703861714717b795465423939f4563cb3d08e6`, C6.2 branch `686a29f45ee5f28547d27db0d42ab41dcb16fe4e`. Do not relabel old cohorts or the pre-sandbox 145/237 provider captures as post-sandbox.

## Root cause and bounded resolution

C6.2 verified the current `serve --service` epoch's HOME fail-closed and repository-ready sandbox, but its `NInfer --request-log-jsonl` captured only request metadata. Neither OpenCode's model response quoting markers nor active plugin status establishes simultaneous injection into a **single provider-input body**. A temporarily configured, loopback-only, pass-through request observer provides source-backed, private proof without persisting prompt bodies.

P3 cannot claim containment from MCP server trust or HTTPS transport. `mcp.garion.us` resolves locally to the protected host, and stdio processes may run under the same user. Native OpenCode V2 shell wrapping and file guards do not automatically sandbox MCP tools. Inventory and judge individual **model-exposed tools** and actual input schemas, source capabilities, and execution authority. Preserve useful Graphiti, OpenViking, Context7 and Firecrawl operations where their concrete API is bounded. Do not broadly disable services because they are on-host.

## Centrally authored tools

- `provider-marker-observer.mjs`: Node 22+ HTTP/1.1 loopback-only, header-preserving pass-through to the existing loopback LiteLLM provider route, streams SSE responses, does not persist message bodies, response bodies, HTTP headers, provider secrets or password hashes. A high-entropy challenge generated on the host links a native user's request to an observed provider input. A qualifying event requires challenge **in user input**, balanced non-empty Graphiti and OpenViking markers **in system/developer input**, no marker spoofing in the user prompt, a valid parsed provider request, and a successful provider response. Logs only structural positions, boolean tests, request ID, timestamps, bytes and upstream HTTP status. Caller retains raw prompt only inside transient process memory. It is an OBSERVER, not a security gateway, persistent service, or substitute for OpenCode's actual plugin enforcement.
- `provider-marker-observer.test.mjs`: unit plus real local HTTP/SSE forwarding tests.
- `mcp-capability-gate.mjs`: conservative checker over an **actual model-visible** tool registry plus MCP `tools/list` evidence and independently inspected implementation contracts. Returns `REVIEW_READY`, **never** `PASS`; Central inspects the referenced host observations. The checker distinguishes built-in V2 file guard from independently contained MCP processes and fails any on-host arbitrary host executor lacking a proven boundary.
- `mcp-capability-gate.test.mjs`: focused false-positive/bypass regressions.

No GHDEV memory implementation, provider daemon, upstream sandbox, or credential code is changed by these tools.

## Activation topology and bounded lifecycle

Existing route (read back, do not assume):

`native OpenCode shared serve (real HOME / XDG) -> LiteLLM loopback :8002 -> NInfer loopback :8001`

Temporary route for only this observer window:

`native OpenCode shared serve -> temporary loopback :18791 observer -> unchanged LiteLLM :8002 -> unchanged NInfer :8001`

The observer must be started **before** any generated-config provider baseURL change. Probe its loopback health with a non-secret request and verify HTTP pass-through against a disposable mock. Use exact existing baseURL path/prefix rules from the live current generated config, not a blind copy-paste; this source assumes a standard `/v1` completion path. An OpenAI-compatible client may emit `/v1/chat/completions` or `/v1/responses`; the observer captures both, but provider-shape mismatches must be diagnosed before production promotion.

Private files: create a new `0700` directory under the preexisting Hermes scratch authority, a `0600` challenge file with `GHDEV101C63_<128+bits lowercase hex>` and a **new**, not-yet-existing receipt path. The observer checks ownership and permissions, refuses remote upstream targets, listens only at `127.0.0.1`, and cannot append to existing evidence. Launch without ambient service credentials where practical. Source example:

```bash
node docs/issue-101/c63/provider-marker-observer.mjs \
  --port 18791 --upstream http://127.0.0.1:8002 \
  --receipt "$PRIVATE/observer.jsonl" \
  --challenge-file "$PRIVATE/challenge.txt"
```

Only the canonical host supervisor may edit the provider's **generated config baseURL** to the observer and perform the standard reversible service restart. Create a SHA-verified private rollback of the existing effective config and actual service invocation **before** mutating. Preserve every non-provider setting and the 3 actual plugins (sandbox, Graphiti, OpenViking). Do not alter the base AI model, LiteLLM/NInfer, HOME/XDG, OpenCode SQLite, tool guard, MCP exposure or EX gate while changing the route. Respect current service-generated authentication from `service.json` rather than assuming the launcher `OPENCODE_SERVER_PASSWORD` was adopted. Do not expose passwords in process argv/logs; authenticate through the canonical native client.

Use one ordinary fresh native repository session, append a high-entropy challenge to a source-relevant non-secret question, and correlate a qualifying observer receipt with that session's native model invocation and current service epoch. Do not type either marker into the user question. The user message should not include raw secrets. If first relevant request lacks eligible context, a few additional normal source-relevant questions in the same short observer window are allowed; do not manufacture facts, add plugins, replay graph ingestion or start a benchmark campaign.

Once a real `qualifying=true` provider-input event and normal response are observed, **immediately restore the original provider baseURL and original production launch route**; stop and remove the observer process. Compare the final generated config SHA to the verified pre-window value (except for an expressly justified narrower tool-disable change), verify normal authenticated OpenCode, both memory plugins, sandbox, same-group authority and EX/curator non-regression. If route promotion fails or provider response is impaired, rollback at once. Never leave the observer installed, enabled or in the normal request path. Do not post raw prompts, body excerpts or credentials; the redacted structural record is the actual first-order in-route observation.

**Important:** A provider request with `qualifying=true` is necessary but not sufficient for closure of all #101. The native session/workspace source relevance, provider status and final source/config parity must be independently corroborated. An observer event from a different location/epoch is not a current #101 P2 success.

## P3 MCP tool-level audit

Use the current project's authenticated model tool registry and **live `tools/list`** for every initialized MCP (including remote-over-HTTPS and local stdio). Record the actual exposed tool names, minimal sanitized input schema (or digest and private source file), control capability, server transport, where it executes, and a source- or endpoint-backed reason that it cannot perform arbitrary host file reads, arbitrary code/shell execution, or unbounded localhost/file/metadata fetch. `probe` must remain disabled; `gitnexus`/`serena` failed startup are not callable if shown absent from effective registry.

For each actual model-exposed tool:

| Class | Required verification |
| --- | --- |
| Built-in shell | Real bwrap isolation on the repository location; no unsandboxed exemptions |
| Built-in file read/write/grep/glob/edit | V2 tool guard enforced, correct project/denied paths and original denial receipts |
| MCP shell/arbitrary code/filesystem | Independent sandbox or supported restriction proven on that actual MCP process; OpenCode bwrap/toolGuard inheritance **cannot be presumed** |
| MCP arbitrary fetch | Inspect URL scheme/host validation and loopback/private-network or local-file access; arbitrary on-host fetch without a verified boundary remains unresolved |
| MCP bounded graph/search/session/API | Inspect effective input schema plus server implementation/endpoint controls; distinguish domain-specific operations from generic file/command escape paths |
| Disabled/failed tool | Show it is actually absent from the model-visible registry, not merely marked disabled in configuration |

Run `node docs/issue-101/c63/mcp-capability-gate.mjs <sanitized-inventory.json>` with schema `ghdev101-c63-tool-inventory-v1` (see source tests for required fields). The output `REVIEW_READY` means only that the evidence is structurally present and risk claims are internally consistent, not that source inspection proved every claimed boundary. Central reviews source evidence and residual unknowns.

If an **actual** model-reachable unrestricted host-execution tool is discovered, report it promptly. A narrow reversible removal of an **optional** offending tool is within host supervisor authority in the same campaign if it does not disable needed memory plugins or widen privileges; verify final active tool catalog after such narrowing. A source-level security fix, entire MCP subsystem redesign, or broad disabling of unrelated tools is not authorized.

## One closure packet and exit conditions

Produce one allowlisted private tar containing: exact source+branch/main identities, tool SHA256 and 14 focused test outcomes, pre/provider/post service/config and observer identities, challenge-linked first-order provider receipt (no challenge text), source-qualified native session evidence, final live project plugin/EX status, complete actual MCP tools/list + capability classifications and source references, probe absence, privacy/nonmutation/rollback status and member-level SHA256 manifest. Keep any private original source/logs host-private; do not ship credential values, raw prompts, raw request/response bodies, model-generated secret text or low-entropy password hashes. Validate all member digests and archive structure.

RETURN P2 and P3 **separately**. `P2=PASS` requires an actual qualifying request; `P3=PASS` requires full independently inspectable tool-level evidence without exposed uncontained paths. If the observer cannot operate without another architecture change, or sensitive tool capabilities remain unresolved, report `BLOCKED` with precise evidence and restore production. No PR, issue closure or GitHub mutations from Hermes. Central owns final #101 adjudication and separate parent #98 gate.
