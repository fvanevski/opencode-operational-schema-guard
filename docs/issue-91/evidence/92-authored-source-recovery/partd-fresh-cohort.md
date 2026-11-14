# Part D — Fresh prospective cohort freeze (v5)

Group: `graphiti-adr92-a3-prospective-v5` (fresh, 0 episodes pre-freeze; empty-group proof positive)
Cases: 20 = 10 valuable + 10 nonvaluable controls
private_manifest_sha256: efa72509f0a74975e4d1f69695e9574009a8a9a95fc6b8dbe51c4eb95bd0124c
label_freeze_sha256: 37976c72071a483b978a6c1bd64b2e7ca57b5e841ea80ea5f2a0e7a452cacadd
created_utc: 2026-11-13T00:50:12.232915+00:00

Independence: new native message identities + substantive text + technical predicates vs v2/v3/v4, B3, H2-H4; no remembered OpenViking-context text used as a valuable user assertion. Each valuable case bound to the native message that carries the authored statement (per Part B lesson).

## Valuable (10) — source-stated development predicates
 1. `msg_1c2e28adf001zmVsZNHYPo0Baq` — SEARXNG_URL is set in ~/.zsecrets and was manually updated to https://search.garion.us
 2. `msg_1bce8c3d3001URaBjEZdXdaVKE` — opencode.json is deterministically constructed from modular base files; to persist a config change the underlying opencode.base.json must include the revision
 3. `msg_1bd809c0f0015EXEwDZIdJkIqD` — OPENVIKING_ROOT_API_KEY was purposely removed because it changed access to the existing DB store and should not be reverted
 4. `msg_1c15aeec5001HYspK2pD7FWw50` — the mcp-mux work is to be committed and pushed to remote via a working branch associated with a PR for merge to main
 5. `msg_1bd6e56a2001ezkUdZYXZgznDm` — the litellm live instance was reverted to its prior keyless state and services can continue with the old key
 6. `msg_0c5c7398c001693rdOCFjjieMg` — rtk proxy bypasses the rtk wrapper's compression and output rewriting when the wrapper corrupts output
 7. `msg_07ea52738001WOi0Wgy2m1cCk5` — OPENAI_API_URL http://127.0.0.1:8008/v1 is a litellm proxy that transforms incorrectly-shaped responses calls before handing off to the vLLM server at 127.0.0.1:8002/v1
 8. `msg_121a57c38001Xhs1rWsOMElfw0` — ~/.config/openviking/cli.env is loaded by the commit-gate service, so edits to it affect gate behavior
 9. `msg_0b0998b7e001VSIoOVvUE97xPv` — FFmpeg's NVIDIA codec headers have been moved to a separate external repository (nv-codec-headers)
10. `msg_1bceaa06e001aSIW0lSNdVXqE8` — the relevant setting may live in the other modular config file /home/filip/.config/opencode/model-profiles.json

## Nonvaluable controls (10) — negative controls (status chatter, read-only/tool/task instructions, operator checks)
 1. `msg_1c12f0f44001vva3Yk1uGhUfsq` — task-status update announcing a recovery one-shot runner exit status and log paths
 2. `msg_1c113938600107nkr1Auiwdftx` — task-status update announcing a post-exit one-shot runner exit status and log paths
 3. `msg_1c1094fbe001Y0MxqVt91F5ZzD` — operator status check asking to confirm the post-exit sequence completed after exiting the opencode TUI
 4. `msg_1c838e1d9001xXbS7MnrIMTJHr` — operator instruction to confirm the launcher is still armed and re-arm it if it timed out
 5. `msg_1a7f762720015lsEJt1DFQHdT6` — tool instruction to read fsm.js and quote the transition function verbatim without modifying any file
 6. `msg_1a3c2c459001YUvNmqQH7N699c` — task instruction to create prime.js and prime.test.js with specific test cases
 7. `msg_1a373ab940018h84fbdzRHumPb` — task_instruction_create_sum_js_function
 8. `msg_1aecb594c001XiZyACelMEKXEo` — operator progress complaint and instruction to stop and generate a handback evidence report
 9. `msg_089e4f8bd001NBkhcCm1YfYNL3` — operator instruction to generate an evidence/handback packet for central review
10. `msg_1a7f60e14001YkRPPxPIhhWHRB` — task instruction to make the transition function throw on unknown events and add missing terminal state entries

## Scorer / launcher (prepared, NOT run)
- Scorer `issue92-a3-acceptance.mjs` `scoreProspective` (8-arg) ready; fails closed pre-inference (`insufficient_review_samples`).
- Prospective bounds: 24 clusters, 72 candidates, 3600s. EX + scheduler-idle + quiet-grace + once-only + reconcile-only preserved.
- Gate: `V5_HOST_APPROVED=1 python3 a3-v5-prospective-ex-launcher.py` (NOT started — awaiting Central go/no-go).
