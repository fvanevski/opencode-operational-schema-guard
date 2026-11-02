"""CPU-only contract tests. Never contact a live service or instantiate a Worker."""
import importlib.util
import pathlib
import unittest

FILE = pathlib.Path(__file__).resolve().parents[1] / "service_commit_qualification.py"
SPEC = importlib.util.spec_from_file_location("issue75_service_qual", FILE)
QUAL = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(QUAL)


class ServiceQualificationContract(unittest.TestCase):
    def setUp(self):
        self.scope = dict(account="a", user_id="u", actor_peer="peer", session_id="session")
        self.intent = dict(self.scope, state="complete", processed_generation=1, requested_generation=1)
        self.attempt = dict(self.scope, generation=1, submitted=1, resolved=1, request_key="key")
        self.receipt = dict(request_key="key", scope_json='{"account":"a","user_id":"u","actor_peer":"peer","session_id":"session"}',
                            state="terminal", outcome="completed", release_proven=1, task_id="task")

    def test_terminal_success_requires_all_predicates(self):
        QUAL.check_terminal(self.intent, self.attempt, self.receipt, self.scope)

    def test_accepted_is_not_terminal(self):
        with self.assertRaises(AssertionError):
            QUAL.check_terminal(self.intent, self.attempt, dict(self.receipt, state="accepted"), self.scope)

    def test_missing_release_proof_is_failure(self):
        with self.assertRaises(AssertionError):
            QUAL.check_terminal(self.intent, self.attempt, dict(self.receipt, release_proven=0), self.scope)

    def test_wrong_owner_is_failure(self):
        with self.assertRaises(AssertionError):
            QUAL.check_terminal(self.intent, self.attempt, self.receipt, dict(self.scope, account="wrong"))

    def test_unresolved_attempt_is_failure(self):
        with self.assertRaises(AssertionError):
            QUAL.check_terminal(self.intent, dict(self.attempt, resolved=0), self.receipt, self.scope)

    def test_noncompleted_outcome_is_failure(self):
        with self.assertRaises(AssertionError):
            QUAL.check_terminal(self.intent, self.attempt, dict(self.receipt, outcome="skipped"), self.scope)

    def test_requires_loopback_with_port(self):
        self.assertEqual(QUAL.loopback_base("http://127.0.0.1:1933"), "http://127.0.0.1:1933")
        for url in ("https://127.0.0.1:1933", "http://0.0.0.0:1933", "http://server:1933", "http://127.0.0.1"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                QUAL.loopback_base(url)

    def test_no_host_work_on_import(self):
        self.assertFalse(hasattr(QUAL, "Worker"))
        self.assertTrue(callable(QUAL.observe_once))


if __name__ == "__main__":
    unittest.main()
