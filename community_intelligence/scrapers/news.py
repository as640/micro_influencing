"""
News scraper — RSS aggregation pattern (no API key).

Inspired by github.com/imprvhub/mcp-rss-aggregator and
github.com/pranciskus/newsmcp. Falls back to NewsAPI if NEWSAPI_KEY is set
in environment for richer metadata.
"""

import logging
import xml.etree.ElementTree as ET
import requests
from django.conf import settings

from .base import BaseScraper, RawItem

log = logging.getLogger(__name__)

# Google News RSS topic feeds — public, no auth, region-aware
DEFAULT_FEEDS = [
    ('World',         'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en'),
    ('Technology',    'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en'),
    ('Business',      'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en'),
    ('Health',        'https://news.google.com/rss/headlines/section/topic/HEALTH?hl=en-IN&gl=IN&ceid=IN:en'),
    ('Science',       'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-IN&gl=IN&ceid=IN:en'),
    ('Entertainment', 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-IN&gl=IN&ceid=IN:en'),
]


class NewsScraper(BaseScraper):
    platform = 'news'

    def __init__(self):
        self.feeds = getattr(settings, 'COMMUNITY_INTELLIGENCE_NEWS_FEEDS', DEFAULT_FEEDS)
        self.api_key = getattr(settings, 'NEWSAPI_KEY', '')

    def fetch(self, limit: int = 50) -> list[RawItem]:
        if self.api_key:
            return self._fetch_newsapi(limit)
        return self._fetch_rss(limit)

    # ---- Free path ---------------------------------------------------------
    def _fetch_rss(self, limit: int) -> list[RawItem]:
        items: list[RawItem] = []
        per_feed = max(1, limit // max(1, len(self.feeds)))
        for label, url in self.feeds:
            if len(items) >= limit:
                break
            try:
                r = requests.get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
                if r.status_code != 200:
                    continue
                root = ET.fromstring(r.content)
            except Exception as exc:
                log.warning('News RSS failed (%s): %s', label, exc)
                continue

            for entry in root.iter('item'):
                title = (entry.findtext('title') or '').strip()
                link = (entry.findtext('link') or '').strip()
                desc = (entry.findtext('description') or '').strip()
                if not title or not link:
                    continue
                items.append(RawItem(
                    platform='news',
                    title=title[:500],
                    url=link,
                    excerpt=desc[:600],
                    engagement=0,  # RSS gives no signal — scoring uses cross-platform freq
                    raw={'feed': label},
                ))
                if len(items) >= limit:
                    break
        return items[:limit]

    # ---- Paid alternative --------------------------------------------------
    def _fetch_newsapi(self, limit: int) -> list[RawItem]:
        try:
            r = requests.get(
                'https://newsapi.org/v2/top-headlines',
                params={'country': 'in', 'pageSize': min(100, limit), 'apiKey': self.api_key},
                timeout=10,
            )
            data = r.json()
        except Exception as exc:
            log.warning('NewsAPI failed: %s', exc)
            return self._fetch_rss(limit)

        items: list[RawItem] = []
        for art in data.get('articles', []):
            items.append(RawItem(
                platform='news',
                title=(art.get('title') or '')[:500],
                url=art.get('url') or '',
                excerpt=(art.get('description') or '')[:600],
                engagement=0,
                raw={'source': (art.get('source') or {}).get('name', '')},
            ))
        return items[:limit]
