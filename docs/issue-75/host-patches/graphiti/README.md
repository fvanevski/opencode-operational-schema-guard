# Graphiti Reasoning-Model Extraction Patch & Overlay

## 1. Provenance & Artifact Hashes

- **Base `run_graphiti.py`**:
  - Path: `/workspace/mcp_servers/graphiti/run_graphiti.py` (preimage)
  - SHA-256: `7f9f51853c68f43b44e98e48af11d85cb7accf0b4130f2af919bfe8c5c309ba8`
- **Deployed `run_graphiti.py`**:
  - Path: `/workspace/mcp_servers/graphiti/run_graphiti.py` (live)
  - SHA-256: `2f070e28fc52b0dea04b2adf532661ebb498e02f70ad61721c661164aae60119`
- **Patch File**:
  - `docs/issue-75/host-patches/graphiti/run_graphiti.py.patch`
- **Extraction Overlay**:
  - `docs/issue-75/host-patches/graphiti/graphiti_sanitizer.py`
- **LiteLLM Extraction Configuration**:
  - `docs/issue-75/host-patches/graphiti/litellm-extract.yaml`
- **Test Suite**:
  - `docs/issue-75/host-patches/graphiti/tests/test_graphiti_sanitizer.py`

## 2. Root Cause Analysis & Solution

When using reasoning models (such as local Qwen3.8-27B on `ninfer-serve`):
1. **Thinking Suppression Defect**: Disabling thinking via `enable_thinking: false` caused the model to output `{"extracted_entities": []}` in 8 tokens due to severe negative bias.
2. **Think Tag Delimiter Defect**: With thinking enabled, `ninfer-serve` preserves thinking output wrapped in `<think>...</think>` or outputs leading `</think>` tags into `message.content`. Graphiti's upstream `OpenAIGenericClient._strip_code_fences` only stripped markdown fences (` ```json `), passing the thinking tags directly to `json.loads` and crashing with `json.decoder.JSONDecodeError`.

The patch installs `_strip_code_fences_and_thinking` (and the `graphiti_sanitizer` module) onto `OpenAIGenericClient._strip_code_fences`, stripping:
- Complete multiline `<think>...</think>` blocks
- Orphan leading `</think>` tags
- Markdown code fences
- Nested/interleaved fences and thinking tags

While:
- Preserving valid empty structured JSON (`{"extracted_entities": [], "extracted_edges": []}`)
- Allowing `json.JSONDecodeError` to propagate on actual malformed non-JSON responses
- Preserving interactive `chat` profiles on LiteLLM while providing an explicit `chat-extract` profile with `preserve_thinking: false` and `drop_params: false`.

## 3. Reproduction Command

Run the test suite:
```bash
/workspace/mcp_servers/graphiti/upstream/mcp_server/.venv/bin/python -B \
  docs/issue-75/host-patches/graphiti/tests/test_graphiti_sanitizer.py
```
Expected output: 11 tests passed in ~0.6s.
