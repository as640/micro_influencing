"""
Twitter / X scraper.

Strategy:
  1. ScrapeBadger paid API if SCRAPEBADGER_API_KEY set (matches
     scrape-badger/scrapebadger-mcp).
  2. Nitter RSS instance otherwise — public, no auth. The instance host
     is configurable via NITTER_HOST.

If neither path returns data we return [] (the pipeline degrades gracefully).
"""

import logging
import xml.etree.ElementTree as ET
import requests
from django.conf import settings

from .base import BaseScraper, RawItem

log = logging.getLogger(__name__)

# Hashtags that broadly map to public-interest topics — overridable in settings
DEFAULT_QUERIES = [
    'India', 'Tech', 'Climate', 'Women', 'Politics',
    'MentalHealth', 'OnlineSafety', 'AI',
]


class TwitterScraper(BaseScraper):
    platform = 'twitter'

    def __init__(self):
        self.api_key  = getattr(settings, 'SCRAPEBADGER_API_KEY', '')
        self.nitter   = getattr(settings, 'NITTER_HOST', 'https://nitter.net')
        self.queries  = getattr(settings, 'COMMUNITY_INTELLIGENCE_TWITTER_QUERIES', DEFAULT_QUERIES)

    def fetch(self, limit: int = 50) -> list[RawItem]:
        if self.api_key:
            try:
                return self._fetch_scrapebadger(limit)
            except Exception as exc:
                log.warning('ScrapeBadger failed, falling back: %s', exc)
        return self._fetch_nitter(limit)

    # ---- Paid -------------------------------------------------------------
    def _fetch_scrapebadger(self, limit: int) -> list[RawItem]:
        items: list[RawItem] = []
        per_q = max(1, limit // max(1, len(self.queries)))
        for q in self.queries:
            if len(items) >= limit:
                break
            try:
                r = requests.get(
                    'https://api.scrapebadger.com/v1/search',
                    params={'q': q, 'limit': per_q},
                    headers={'Authorization': f'Bearer {self.api_key}'},
                    timeout=10,
                )
                tweets = r.json().get('tweets', []) if r.status_code == 200 else []
            except Exception:
                continue
            for t in tweets:
                items.append(RawItem(
                    platform='twitter',
                    title=(t.get('text') or '')[:500],
                    url=t.get('url') or '',
                    excerpt='',
                    engagement=int(t.get('likes', 0)) + int(t.get('retweets', 0)),
                    hashtags=t.get('hashtags', []),
                ))
        return items[:limit]

    # ---- Free -------------------------------------------------------------
    def _fetch_nitter(self, limit: int) -> list[RawItem]:
        items: list[RawItem] = []
        per_q = max(1, limit // max(1, len(self.queries)))
        for q in self.queries:
            if len(items) >= limit:
                break
            url = f'{self.nitter.rstrip("/")}/search/rss?f=tweets&q={q}'
            try:
                r = requests.get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
                if r.status_code != 200:
                    continue
                root = ET.fromstring(r.content)
            except Exception as exc:
                log.warning('Nitter RSS failed for %s: %s', q, exc)
                continue
            count = 0
            for entry in root.iter('item'):
                title = (entry.findtext('title') or '').strip()
                link = (entry.findtext('link') or '').strip()
                if not title or not link:
                    continue
                items.append(RawItem(
                    platform='twitter',
                    title=title[:500],
                    url=link,
                    excerpt='',
                    engagement=0,
                    hashtags=[q],
                ))
                count += 1
                if count >= per_q or len(items) >= limit:
                    break
        return items[:limit]
