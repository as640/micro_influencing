"""
Hard-coded safety checks layered on top of the LLM output.

These run AFTER the LLM has labeled risk_level / risk_flags so we get a
deterministic safety net even if the model under-flags content.
"""

import re

# Patterns that should always elevate to HIGH risk
HIGH_RISK_PATTERNS = [
    r'\b(suicide|self[- ]harm|kill yourself|kys)\b',
    r'\b(rape|sexual assault|child(ren)?|minor[s]?)\b',
    r'\b(genocide|ethnic cleansing)\b',
    r'\b(bomb|terror(ist|ism)?)\b',
]

# Patterns that should set needs_verification=true
RUMOR_PATTERNS = [
    r'\b(allegedly|reportedly|rumou?r|claims that|unconfirmed|sources say)\b',
    r'\b(viral video|leaked|leaks)\b',
]

# Patterns we refuse to suggest advocacy for at all (return [])
HARASSMENT_BLOCK_PATTERNS = [
    r'\b(dox+|leak.*address|home address)\b',
    r'\b(call to violence|attack .* (person|individual))\b',
]


def _matches(text: str, patterns: list[str]) -> bool:
    t = text.lower()
    return any(re.search(p, t) for p in patterns)


def safety_check_topic(topic_text: str, llm_risk: str, llm_flags: list[str]) -> tuple[str, list[str]]:
    """
    Returns (final_risk_level, augmented_flags).
    Never downgrades the LLM's verdict — only escalates.
    """
    risk = llm_risk or 'low'
    flags = list(llm_flags or [])

    if _matches(topic_text, HIGH_RISK_PATTERNS):
        risk = 'high'
        for f in ('sensitive_content', 'safety_critical'):
            if f not in flags:
                flags.append(f)

    if _matches(topic_text, RUMOR_PATTERNS):
        if 'unverified_claims' not in flags:
            flags.append('unverified_claims')
        if risk == 'low':
            risk = 'medium'

    return risk, flags


def needs_verification(flags: list[str]) -> bool:
    return 'unverified_claims' in (flags or [])


def is_advocacy_safe(topic_text: str) -> bool:
    """Block advocacy suggestions entirely if topic invites harassment."""
    return not _matches(topic_text, HARASSMENT_BLOCK_PATTERNS)
