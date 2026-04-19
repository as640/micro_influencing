"""
Influencer category multi-label classification.

Used when an influencer first hits the Community Hub — we cross-reference
their existing single-label `InfluencerProfile.category` field with bio /
hashtag signals to expand into a multi-label list with confidence scores.
"""

from ..llm import claude, LLMUnavailable
from .summarizer import CATEGORY_VOCAB

CLASSIFY_SYSTEM = f"""Classify an influencer profile into MULTIPLE categories
from this fixed vocabulary (max 4): {CATEGORY_VOCAB}.

Return STRICT JSON:
{{
  "categories": [
    {{"name": "Tech", "confidence": 0.0-1.0}},
    ...
  ]
}}

Use only categories from the vocabulary. Order by confidence desc.
"""


def classify_influencer(bio: str, base_category: str, handle: str = '') -> list[dict]:
    """
    Returns a list like [{'name': 'Tech', 'confidence': 0.92}, ...].
    Always seeds with the influencer's stored category at confidence=1.0
    so we never lose the explicit signal.
    """
    seeded = [{'name': base_category, 'confidence': 1.0}] if base_category else []

    if not claude.available or not bio:
        return seeded

    try:
        out = claude.chat_json(
            system=CLASSIFY_SYSTEM,
            user=(
                f'Handle: @{handle}\n'
                f'Stored category: {base_category}\n'
                f'Bio: {bio}'
            ),
            max_tokens=300,
        )
    except LLMUnavailable:
        return seeded

    cats = out.get('categories', []) if isinstance(out, dict) else []
    # Merge: keep seeded first, then any new ones from LLM
    seen = {c['name'].lower() for c in seeded}
    for c in cats:
        if not isinstance(c, dict):
            continue
        name = (c.get('name') or '').strip()
        if name and name.lower() not in seen and name in CATEGORY_VOCAB:
            seeded.append({
                'name': name,
                'confidence': float(c.get('confidence', 0.5)),
            })
            seen.add(name.lower())
    return seeded
