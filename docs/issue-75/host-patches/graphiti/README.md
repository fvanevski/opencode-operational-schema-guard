# Issue #75: source-owned Graphiti extraction adapter

Files here are the COMPLETE central-authored candidate for the remaining
sanitizer/config review correction, not proof that the candidate is deployed.

- graphiti_sanitizer.py is the only sanitizer implementation.
- run_graphiti.py.patch applies to the pinned clean preimage
  SHA256 7f9f51853c68f43b44e98e48af11d85cb7accf0b4130f2af919bfe8c5c309ba8.
- run_graphiti.deployed-to-module.patch applies to the previously observed
  deployed SHA256 2f070e28fc52b0dea04b2adf532661ebb498e02f70ad61721c661164aae60119.
- Stage the new graphiti_sanitizer.py beside /workspace/mcp_servers/graphiti/run_graphiti.py
  in a disposable reconstructed tree. Confirm the exact source SHA before applying
  either patch. Compare both reconstruction paths for identical resulting bytes.
- Execute tests/test_graphiti_sanitizer.py in the installed Graphiti venv and
  verify the patched method through the actual import/startup path in a fresh
  disposable process before replacing the live deployed wrapper.
- Then deploy as one coherent reversible pair, capture hashes, and do
  a single bounded existing Graphiti smoke test. Do not repeat the prior full
  retrieval benchmarks or the already accepted 3-node/3-edge qualification.

The LiteLLM YAML is for the disposable local 8003 extraction proxy only.
Supply a strong private LITELLM_MASTER_KEY, bind explicitly to 127.0.0.1,
and configure Graphiti to use that key in private environment. This file does
not grant authority to replace the normal interactive LiteLLM service.
