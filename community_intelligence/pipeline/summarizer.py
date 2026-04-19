"""
LLM summarization + advocacy suggestion stages.

Each call returns a dict consumed by services.py to build a Topic record.
All prompts are routed through llm.claude.chat_json which auto-caches the
system block — refreshes 5+ topics within the cache window only pay the
system tokens once.
"""

from typing import List

from ..scrapers.base import RawItem
from ..llm import claude, LLMUnavailable

CATEGORY_VOCAB = [
    'Tech', 'Politics', 'Gender', 'Finance', 'Lifestyle',
    'Gaming', 'Health', 'Climate', 'Education', 'Entertainment',
    'Social Justice', 'Safety', 'Business', 'Science',
]

SUMMARIZE_SYSTEM = f"""You analyze clusters of social media + news items for an
influencer marketing platform's "Community Intelligence" tab.

For each cluster you receive, return STRICT JSON:
{{
  "title": "<= 80 char headline",
  "summary": "exactly 3 short sentences describing what is happening",
  "categories": [<subset of {CATEGORY_VOCAB}>],
  "stakeholders": ["group1", "group2"],
  "suggested_angle": "<= 200 char neutral framing for an influencer post",
  "risk_flags": [<subset of "misinformation","sensitive_content","legal_risk","minors","unverified_claims">],
  "risk_level": "low" | "medium" | "high",
  "needs_verification": true | false
}}

Rules (HARD):
- Never name or target individual private people
- Never make legal accusations
- Never encourage harassment or doxxing
- Mark needs_verification=true for any rumor or unconfirmed claim
- Be neutral — do not take partisan positions
"""

ADVOCACY_SYSTEM = """You suggest SAFE structured advocacy actions an influencer
could take on a public-interest topic.

Return STRICT JSON list of 2-3 action objects:
[{
  "kind": "awareness_post" | "educational_thread" | "petition_support" | "community_call",
  "headline": "<= 90 char hook",
  "body": "<= 350 char draft post body, neutral tone, fact-based",
  "safety_notes": "any caveats — needs verification / sensitivity / scope"
}]

Hard rules:
- No personal attacks or doxxing
- No legal accusations
- No calls to harass any individual or organization
- Frame petitions as "If credible, sign…" not endorsements
- If topic is unverified, every action must say so in safety_notes
"""


def _cluster_payload(items: List[RawItem]) -> str:
    lines = []
    for i, it in enumerate(items[:15], 1):  # cap to keep tokens bounded
        lines.append(f'[{i}] ({it.platform}) {it.title} :: {it.excerpt[:200]}')
    return '\n'.join(lines)


def summarize_cluster(items: List[RawItem]) -> dict:
    """
    Returns the structured Topic dict (or {} if LLM unavailable).
    Caller is responsible for merging defaults / safety overrides.
    """
    if not claude.available:
        # Heuristic fallback so the pipeline still produces topics in dev
        title = items[0].title[:80]
        return {
            'title': title,
            'summary': (items[0].excerpt or items[0].title)[:300],
            'categories': [],
            'stakeholders': [],
            'suggested_angle': '',
            'risk_flags': ['unverified_claims'],
            'risk_level': 'medium',
            'needs_verification': True,
        }

    try:
        return claude.chat_json(
            system=SUMMARIZE_SYSTEM,
            user='Cluster items:\n' + _cluster_payload(items),
            max_tokens=700,
        ) or {}
    except LLMUnavailable:
        return {}


def suggest_advocacy(topic_title: str, topic_summary: str, risk_level: str) -> list[dict]:
    if not claude.available:
        return []
    try:
        out = claude.chat_json(
            system=ADVOCACY_SYSTEM,
            user=(
                f'Topic: {topic_title}\n'
                f'Summary: {topic_summary}\n'
                f'Risk level: {risk_level}\n'
                'Return 2-3 safe actions.'
            ),
            max_tokens=900,
        )
        if isinstance(out, list):
            return out
        return out.get('actions', []) if isinstance(out, dict) else []
    except LLMUnavailable:
        return []
