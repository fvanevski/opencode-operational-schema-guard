# Slice K bootstrap probe

This file is a temporary, non-functional bootstrap probe for validating the trusted-main `ghdev-verify.yml` evidence producer introduced by PR #16.

It intentionally changes only documentation and does not modify the workflow, evidence profile, controller/executor/publisher, receipt library, package/test launch authority, `.npmrc`, or `node_modules` trusted-control surfaces.

Do not merge this probe PR. Close it after the trusted-main exact-head receipt/status path has been proven.
