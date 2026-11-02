"""One implementation for Graphiti's reasoning-output sanitization.

Strip only leading reasoning envelopes and enclosing Markdown fences. Never
remove think-like strings inside an already valid JSON payload.
"""
from __future__ import annotations

import re
from typing import Any, Callable

_LEADING_THINK = re.compile(r"^\s*<\s*think\s*>.*?<\s*/\s*think\s*>\s*", re.I | re.S)
_LEADING_ORPHAN = re.compile(r"^\s*<\s*/\s*think\s*>\s*", re.I)
_FENCE_OPEN = re.compile(r"^`{3}[a-zA-Z0-9_-]*[ \t]*\r?\n")
_FENCE_CLOSE = re.compile(r"\r?\n?`{3}[ \t]*$")


def strip_thinking_tags(text: str) -> str:
    if not isinstance(text, str):
        return ""
    result = text.strip()
    for _ in range(8):
        match = _LEADING_THINK.match(result) or _LEADING_ORPHAN.match(result)
        if not match:
            break
        result = result[match.end():].strip()
    return result


def strip_code_fences(text: str) -> str:
    if not isinstance(text, str):
        return ""
    result = text.strip()
    opening = _FENCE_OPEN.match(result)
    if opening:
        body = result[opening.end():]
        ending = _FENCE_CLOSE.search(body)
        if ending:
            return body[:ending.start()].strip()
    return result


def sanitize_llm_json_response(text: str) -> str:
    if not isinstance(text, str):
        return ""
    result = text.strip()
    # Supports leading think block inside a surrounding fence, or a fence after think.
    for _ in range(8):
        changed = strip_code_fences(strip_thinking_tags(result))
        if changed == result:
            return result
        result = changed
    return result


def install_graphiti_sanitizer(client_cls: Any = None) -> Callable[..., Any]:
    if client_cls is None:
        from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient
        client_cls = OpenAIGenericClient
    orig = client_cls._strip_code_fences
    client_cls._strip_code_fences = staticmethod(sanitize_llm_json_response)
    return orig
