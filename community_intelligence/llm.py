"""
Thin Anthropic Claude client wrapper.

- Uses claude-haiku-4-5 by default (fast + cheap for batch classification),
  upgradable via COMMUNITY_INTELLIGENCE_LLM_MODEL.
- Auto-applies prompt caching to the system prompt so refreshing trends
  doesn't re-bill the rubric every call.
- Returns parsed JSON when expected.

If ANTHROPIC_API_KEY is missing the wrapper raises a clear error on first
use; the management command checks for it up-front and skips the LLM
stages with a warning so the scraper layer remains usable in dev.
"""

import json
import logging
import re
from django.conf import settings

log = logging.getLogger(__name__)

DEFAULT_MODEL = 'claude-haiku-4-5'


class LLMUnavailable(RuntimeError):
    pass


class Claude:
    def __init__(self):
        self.api_key = getattr(settings, 'ANTHROPIC_API_KEY', '')
        self.model = getattr(settings, 'COMMUNITY_INTELLIGENCE_LLM_MODEL', DEFAULT_MODEL)
        self._client = None

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def _get_client(self):
        if not self.api_key:
            raise LLMUnavailable('ANTHROPIC_API_KEY not configured')
        if self._client is None:
            try:
                import anthropic
            except ImportError as exc:
                raise LLMUnavailable('anthropic SDK not installed') from exc
            self._client = anthropic.Anthropic(api_key=self.api_key)
        return self._client

    def chat_json(
        self,
        system: str,
        user: str,
        max_tokens: int = 1024,
        cache_system: bool = True,
    ) -> dict | list:
        """Call Claude and parse the response as JSON. System block is cached."""
        client = self._get_client()
        system_blocks = [{
            'type': 'text',
            'text': system,
            **({'cache_control': {'type': 'ephemeral'}} if cache_system else {}),
        }]
        try:
            resp = client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system_blocks,
                messages=[{'role': 'user', 'content': user}],
            )
        except Exception as exc:
            raise LLMUnavailable(str(exc)) from exc

        text = ''.join(b.text for b in resp.content if getattr(b, 'type', '') == 'text')
        return self._extract_json(text)

    @staticmethod
    def _extract_json(text: str):
        text = text.strip()
        # Prefer ```json fenced block
        m = re.search(r'```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```', text, flags=re.S)
        if m:
            text = m.group(1)
        # Otherwise use the first {...} or [...] span
        else:
            m = re.search(r'(\{.*\}|\[.*\])', text, flags=re.S)
            if m:
                text = m.group(1)
        try:
            return json.loads(text)
        except Exception as exc:
            log.warning('Failed to parse LLM JSON: %s; raw=%r', exc, text[:200])
            return {}


claude = Claude()
