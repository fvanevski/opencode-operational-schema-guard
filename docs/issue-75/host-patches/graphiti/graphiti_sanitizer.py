"""Reproducible sanitization overlay for reasoning model outputs in Graphiti.

Local reasoning models (e.g., Qwen3.8 with thinking enabled) output reasoning tokens
wrapped in `<think>...</think>` or with an orphan leading `</think>` marker before the
structured JSON payload. Standard OpenAI clients expect raw JSON (or markdown-fenced
JSON), causing `json.loads` to crash with `JSONDecodeError`.

This module provides clean, tested sanitization that strips thinking markers and
code fences without swallowing JSON syntax errors or altering valid empty responses.
"""
from __future__ import annotations

import json
import re
from typing import Any, Callable


def strip_thinking_tags(text: str) -> str:
    """Strip complete <think>...</think> blocks and orphan leading </think> tags."""
    if not isinstance(text, str):
        return ""
    stripped = text.strip()
    # Strip complete <think>...</think> blocks (multiline)
    stripped = re.sub(r'<\s*think\s*>.*?<\s*/\s*think\s*>', '', stripped, flags=re.DOTALL | re.IGNORECASE)
    # Strip orphan leading </think> tag
    stripped = re.sub(r'^\s*<\s*/\s*think\s*>', '', stripped, flags=re.IGNORECASE)
    return stripped.strip()


def strip_code_fences(text: str) -> str:
    """Strip wrapping markdown code fences (```json ... ``` or ``` ... ```)."""
    if not isinstance(text, str):
        return ""
    stripped = text.strip()
    if stripped.startswith('```'):
        stripped = re.sub(r'^```[a-zA-Z0-9_-]*[ \t]*\r?\n?', '', stripped)
        stripped = re.sub(r'\r?\n?```[ \t]*$', '', stripped)
    return stripped.strip()


def sanitize_llm_json_response(text: str) -> str:
    """Sanitize LLM output by removing thinking tags and markdown code fences.

    Handles combinations where thinking tags occur before fences, inside fences,
    or after fences. Returns the inner content ready for `json.loads()`.
    """
    if not isinstance(text, str):
        return ""
    # First pass: strip outer thinking tags or outer code fences
    cleaned = strip_thinking_tags(text)
    cleaned = strip_code_fences(cleaned)
    # Second pass: in case fences were inside thinking, or thinking was inside fences
    cleaned = strip_thinking_tags(cleaned)
    cleaned = strip_code_fences(cleaned)
    return cleaned.strip()


def install_graphiti_sanitizer(client_cls: Any = None) -> Callable[..., Any]:
    """Install sanitizer into Graphiti's OpenAIGenericClient._strip_code_fences.

    Returns the original method so caller can restore if desired.
    """
    if client_cls is None:
        from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient
        client_cls = OpenAIGenericClient

    orig_method = client_cls._strip_code_fences

    def _sanitizing_strip_code_fences(text: str) -> str:
        return sanitize_llm_json_response(text)

    client_cls._strip_code_fences = staticmethod(_sanitizing_strip_code_fences)
    return orig_method
