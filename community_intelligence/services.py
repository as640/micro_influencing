"""
Orchestration: scrapers → clusterer → LLM (summarize, score, sentiment, advocacy)
                       → safety net → DB (Topic, TopicSource, SentimentSnapshot,
                                          AdvocacyAction).

Also exposes top-N reads consumed by views.py.
"""

import logging
from django.db import transaction
from django.utils import timezone

from .models import (
    Topic, TopicSource, SentimentSnapshot, AdvocacyAction,
)
from .scrapers import ALL_SCRAPERS
from .pipeline.clusterer import cluster_items, fingerprint
from .pipeline.summarizer import summarize_cluster, suggest_advocacy
from .pipeline.scorer import score_topic, sentiment_breakdown
from .pipeline.safety import safety_check_topic, needs_verification, is_advocacy_safe

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Refresh: full pipeline run
# ---------------------------------------------------------------------------

def refresh_trends(per_source_limit: int = 40, max_topics: int = 30) -> dict:
    """
    Pull from every scraper, cluster, summarize, score, persist.
    Returns a stats dict useful for the management command + admin.
    """
    raw = []
    per_source = {}
    for s in ALL_SCRAPERS:
        try:
            got = s.fetch(limit=per_source_limit)
        except Exception as exc:
            log.exception('Scraper %s failed: %s', s.platform, exc)
            got = []
        per_source[s.platform] = len(got)
        raw.extend(got)

    log.info('Scraped %d items: %s', len(raw), per_source)

    clusters = cluster_items(raw)
    log.info('Formed %d clusters', len(clusters))

    created, updated = 0, 0
    for cluster in clusters[:max_topics]:
        try:
            t, was_new = _persist_topic(cluster)
            created += int(was_new)
            updated += int(not was_new)
        except Exception as exc:
            log.exception('Failed to persist topic: %s', exc)

    return {
        'scraped': len(raw),
        'per_source': per_source,
        'clusters': len(clusters),
        'topics_created': created,
        'topics_updated': updated,
    }


@transaction.atomic
def _persist_topic(cluster):
    centroid = getattr(cluster, 'centroid', [])
    fp = fingerprint(centroid) if centroid else ''

    summary = summarize_cluster(cluster)
    if not summary:
        log.warning('LLM returned empty summary; skipping cluster')
        raise RuntimeError('empty summary')

    title = summary.get('title') or cluster[0].title[:80]
    body = summary.get('summary') or ''
    cats = summary.get('categories') or []
    stakeholders = summary.get('stakeholders') or []
    angle = summary.get('suggested_angle') or ''
    flags = summary.get('risk_flags') or []
    risk = summary.get('risk_level') or 'low'

    # Hard-coded safety net layered on top of the LLM
    full_text = title + '\n' + body
    risk, flags = safety_check_topic(full_text, risk, flags)
    nv = bool(summary.get('needs_verification')) or needs_verification(flags)

    scores = score_topic(cluster, cats, risk)

    # Dedup by fingerprint — update existing if found
    topic = Topic.objects.filter(embedding_fingerprint=fp).first() if fp else None
    is_new = topic is None
    if topic is None:
        topic = Topic(embedding_fingerprint=fp)

    topic.title = title[:300]
    topic.summary = body
    topic.categories = cats
    topic.stakeholders = stakeholders
    topic.suggested_angle = angle
    topic.risk_level = risk
    topic.risk_flags = flags
    topic.needs_verification = nv
    topic.public_impact_score = scores['public_impact_score']
    topic.growth_velocity = scores['growth_velocity']
    topic.is_active = True
    topic.last_refreshed = timezone.now()
    topic.save()

    # Replace sources (cheaper than diffing)
    TopicSource.objects.filter(topic=topic).delete()
    seen = set()
    for it in cluster:
        if it.url in seen or not it.url:
            continue
        seen.add(it.url)
        TopicSource.objects.create(
            topic=topic,
            platform=it.platform,
            title=it.title[:500],
            url=it.url[:1000],
            excerpt=it.excerpt[:1000] if it.excerpt else '',
            engagement=it.engagement,
        )

    # Sentiment snapshot
    snap = sentiment_breakdown(cluster)
    SentimentSnapshot.objects.create(
        topic=topic,
        positive=snap['positive'],
        negative=snap['negative'],
        neutral=snap['neutral'],
        sample_size=snap['sample_size'],
    )

    # Advocacy actions — only for safe topics
    if is_advocacy_safe(full_text):
        actions = suggest_advocacy(title, body, risk)
        # Replace previous suggestions on each refresh
        AdvocacyAction.objects.filter(topic=topic).delete()
        for a in (actions or [])[:3]:
            kind = a.get('kind') or 'awareness_post'
            AdvocacyAction.objects.create(
                topic=topic,
                kind=kind if kind in dict(AdvocacyAction.KIND_CHOICES) else 'awareness_post',
                headline=(a.get('headline') or '')[:300],
                body=a.get('body') or '',
                safety_notes=a.get('safety_notes') or '',
            )

    return topic, is_new


# ---------------------------------------------------------------------------
# Read APIs used by views
# ---------------------------------------------------------------------------

def top_topics_for_categories(categories: list[str], limit: int = 10):
    """
    Returns the top N active Topics whose `categories` list intersects the
    influencer's categories. Falls back to overall top-N if no match.
    """
    qs = Topic.objects.filter(is_active=True)
    if categories:
        # JSONField __contains works for lists in Postgres
        from django.db.models import Q
        q = Q()
        for c in categories:
            q |= Q(categories__contains=[c])
        matched = list(qs.filter(q).order_by('-public_impact_score')[:limit])
        if matched:
            return matched
    return list(qs.order_by('-public_impact_score')[:limit])
