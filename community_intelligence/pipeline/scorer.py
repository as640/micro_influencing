"""
Quantitative scoring layer.

  growth_velocity     : how fast the topic is gaining cross-platform volume,
                        normalized 0-100. Cheap heuristic — number of unique
                        platforms × log(total engagement).
  public_impact_score : combines growth_velocity, risk_level, sensitive
                        category presence and breadth into a 0-100 number.
  sentiment_breakdown : LLM call returning positive/negative/neutral split.
"""

import math
from typing import List

from ..scrapers.base import RawItem
from ..llm import claude, LLMUnavailable

SENSITIVE_CATEGORIES = {
    'Politics', 'Gender', 'Social Justice', 'Safety', 'Health',
}

SENTIMENT_SYSTEM = """You analyze public sentiment on a topic.

Return STRICT JSON:
{
  "positive": 0-100,
  "negative": 0-100,
  "neutral":  0-100
}
The three values must sum to 100. Base your estimate on the headlines + excerpts provided.
"""


def score_topic(items: List[RawItem], categories: list[str], risk_level: str) -> dict:
    platforms = {it.platform for it in items}
    engagement = sum(max(0, it.engagement) for it in items)

    velocity = min(100.0, len(platforms) * 12 + math.log10(engagement + 10) * 12)

    risk_weight = {'low': 0.0, 'medium': 10.0, 'high': 20.0}.get(risk_level, 0.0)
    sensitive_bonus = 15.0 if (set(categories) & SENSITIVE_CATEGORIES) else 0.0
    breadth_bonus = min(20.0, len(items) * 1.5)

    impact = min(100.0, velocity * 0.55 + risk_weight + sensitive_bonus + breadth_bonus)

    return {
        'growth_velocity': round(velocity, 1),
        'public_impact_score': round(impact, 1),
    }


def sentiment_breakdown(items: List[RawItem]) -> dict:
    """Returns {'positive':..,'negative':..,'neutral':..,'sample_size':n}."""
    sample = items[:20]
    n = len(sample)
    fallback = {'positive': 33.0, 'negative': 33.0, 'neutral': 34.0, 'sample_size': n}

    if not claude.available or n == 0:
        return fallback

    payload = '\n'.join(f'- {it.title}' for it in sample)
    try:
        out = claude.chat_json(
            system=SENTIMENT_SYSTEM,
            user=payload,
            max_tokens=120,
        )
    except LLMUnavailable:
        return fallback

    if not isinstance(out, dict):
        return fallback
    pos = float(out.get('positive', 33))
    neg = float(out.get('negative', 33))
    neu = float(out.get('neutral', 34))
    total = pos + neg + neu or 1.0
    return {
        'positive': round(pos * 100 / total, 1),
        'negative': round(neg * 100 / total, 1),
        'neutral':  round(neu * 100 / total, 1),
        'sample_size': n,
    }
