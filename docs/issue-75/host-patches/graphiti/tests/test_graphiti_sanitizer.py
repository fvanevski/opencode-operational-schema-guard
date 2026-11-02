"""Unit and regression tests for Graphiti reasoning model output sanitizer."""
import json
import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from graphiti_sanitizer import (
    strip_thinking_tags,
    strip_code_fences,
    sanitize_llm_json_response,
    install_graphiti_sanitizer,
)


class TestGraphitiSanitizer(unittest.TestCase):

    def test_complete_reasoning_block_removed(self):
        raw = "<think>\nLet us analyze the text.\nExtract release pipeline and test suite.\n</think>\n{\"extracted_entities\": [\"pipeline\"]}"
        sanitized = sanitize_llm_json_response(raw)
        self.assertEqual(sanitized, '{"extracted_entities": ["pipeline"]}')
        parsed = json.loads(sanitized)
        self.assertEqual(parsed["extracted_entities"], ["pipeline"])

    def test_orphan_closing_tag_removed(self):
        raw = "</think>{\"extracted_entities\": [\"smoke test\"]}"
        sanitized = sanitize_llm_json_response(raw)
        self.assertEqual(sanitized, '{"extracted_entities": ["smoke test"]}')
        parsed = json.loads(sanitized)
        self.assertEqual(parsed["extracted_entities"], ["smoke test"])

    def test_markdown_code_fences_removed(self):
        raw = "```json\n{\"extracted_entities\": [\"artifact\"]}\n```"
        sanitized = sanitize_llm_json_response(raw)
        self.assertEqual(sanitized, '{"extracted_entities": ["artifact"]}')
        parsed = json.loads(sanitized)
        self.assertEqual(parsed["extracted_entities"], ["artifact"])

    def test_thinking_outside_code_fences_removed(self):
        raw = (
            "<think>\n"
            "Considering the statement carefully.\n"
            "</think>\n"
            "```json\n"
            "{\"extracted_entities\": [\"gate\"], \"extracted_edges\": []}\n"
            "```"
        )
        sanitized = sanitize_llm_json_response(raw)
        parsed = json.loads(sanitized)
        self.assertEqual(parsed["extracted_entities"], ["gate"])
        self.assertEqual(parsed["extracted_edges"], [])

    def test_thinking_inside_code_fences_removed(self):
        raw = (
            "```json\n"
            "<think>\n"
            "Model put think tags inside fence.\n"
            "</think>\n"
            "{\"extracted_entities\": [\"engine\"], \"extracted_edges\": []}\n"
            "```"
        )
        sanitized = sanitize_llm_json_response(raw)
        parsed = json.loads(sanitized)
        self.assertEqual(parsed["extracted_entities"], ["engine"])

    def test_valid_empty_structured_json_preserved(self):
        raw = "<think>No entities found.</think>\n{\"extracted_entities\": [], \"extracted_edges\": []}"
        sanitized = sanitize_llm_json_response(raw)
        parsed = json.loads(sanitized)
        self.assertEqual(parsed, {"extracted_entities": [], "extracted_edges": []})

    def test_orphan_closing_tag_with_whitespace_and_newlines(self):
        raw = "   \n\n  </think>  \n\n  {\"extracted_entities\": []}  \n"
        sanitized = sanitize_llm_json_response(raw)
        self.assertEqual(sanitized, '{"extracted_entities": []}')
        parsed = json.loads(sanitized)
        self.assertEqual(parsed, {"extracted_entities": []})

    def test_malformed_json_raises_json_decode_error(self):
        raw = "<think>Thoughts</think>\n{invalid json: true"
        sanitized = sanitize_llm_json_response(raw)
        with self.assertRaises(json.JSONDecodeError):
            json.loads(sanitized)

    def test_plain_text_non_json_raises_json_decode_error(self):
        raw = "<think>Thoughts</think>\nI could not extract any JSON."
        sanitized = sanitize_llm_json_response(raw)
        with self.assertRaises(json.JSONDecodeError):
            json.loads(sanitized)

    def test_installation_into_dummy_client(self):
        class DummyClient:
            @staticmethod
            def _strip_code_fences(text):
                return text.strip()

        orig = install_graphiti_sanitizer(DummyClient)
        raw = "</think>```json\n{\"ok\": true}\n```"
        result = DummyClient._strip_code_fences(raw)
        self.assertEqual(result, '{"ok": true}')
        DummyClient._strip_code_fences = orig
        self.assertEqual(DummyClient._strip_code_fences("  abc  "), "abc")


class TestGraphitiOpenAIGenericClientBinding(unittest.TestCase):
    """Test binding directly with upstream graphiti_core if available."""

    def test_openai_generic_client_patched(self):
        try:
            # Point to upstream graphiti if installed in workspace
            graphiti_core_path = pathlib.Path("/workspace/mcp_servers/graphiti/upstream")
            if (graphiti_core_path / "graphiti_core").is_dir():
                sys.path.insert(0, str(graphiti_core_path))
            from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient
        except ImportError:
            self.skipTest("graphiti_core not importable in this environment")

        orig = install_graphiti_sanitizer(OpenAIGenericClient)
        try:
            test_input = "<think>\nAnalyzing query.\n</think>\n```json\n{\"status\": \"extracted\"}\n```"
            cleaned = OpenAIGenericClient._strip_code_fences(test_input)
            self.assertEqual(cleaned, '{"status": "extracted"}')
            self.assertEqual(json.loads(cleaned)["status"], "extracted")
        finally:
            OpenAIGenericClient._strip_code_fences = orig


if __name__ == "__main__":
    unittest.main()
