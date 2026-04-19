"""
Instagram trends scraper.

Approach taken from rugvedp/Trends-MCP — scrape later.com's weekly Reels
trends report (no API key, no login). For richer data set
APIFY_TOKEN + use the Apify Instagram scraper actor (matches
apify/apify-mcp-server pattern).
"""

import logging
import re
import requests
from django.conf import settings

from .base import BaseScraper, RawItem

log = logging.getLogger(__name__)

LATER_URL = 'https://later.com/blog/instagram-reels-trends/'


class InstagramScraper(BaseScraper):
    platform = 'instagram'

    def __init__(self):
        self.apify_token = getattr(settings, 'APIFY_TOKEN', '')

    def fetch(self, limit: int = 25) -> list[RawItem]:
        if self.apify_token:
            try:
                return self._fetch_apify(limit)
            except Exception as exc:
                log.warning('Apify Instagram failed: %s', exc)
        return self._fetch_later(limit)

    # ---- Free path: Later.com weekly trends -------------------------------
    def _fetch_later(self, limit: int) -> list[RawItem]:
        try:
            r = requests.get(
                LATER_URL,
                headers={'User-Agent': 'Mozilla/5.0'},
                timeout=10,
            )
            if r.status_code != 200:
                return []
            html = r.text
        except Exception as exc:
            log.warning('Later.com fetch failed: %s', exc)
            return []

        # Extract H2/H3 trend headings + paragraph excerpts (Later structures
        # weekly post that way). Non-fatal if structure changes.
        headings = re.findall(r'<h[23][^>]*>(.*?)</h[23]>', html, flags=re.S)
        items = []
        for h in headings:
            clean = re.sub(r'<.*?>', '', h).strip()
            if not clean or len(clean) < 8:
                continue
            items.append(RawItem(
                platform='instagram',
                title=clean[:500],
                url=LATER_URL,
                excerpt='',
                engagement=0,
                hashtags=re.findall(r'#(\w+)', clean),
            ))
            if len(items) >= limit:
                break
        return items

    # ---- Paid path: Apify -------------------------------------------------
    def _fetch_apify(self, limit: int) -> list[RawItem]:
        # Apify "Instagram Hashtag Scraper" run-sync endpoint
        r = requests.post(
            'https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items',
            params={'token': self.apify_token},
            json={
                'hashtags': ['trending', 'viral', 'news'],
                'resultsLimit': limit,
            },
            timeout=60,
        )
        if r.status_code != 200:
            return []
        items = []
        for it in r.json():
            items.append(RawItem(
                platform='instagram',
                title=(it.get('caption') or '')[:500],
                url=it.get('url') or '',
                excerpt='',
                engagement=int(it.get('likesCount', 0)) + int(it.get('commentsCount', 0)),
                hashtags=it.get('hashtags', [])[:10],
            ))
        return items[:limit]
