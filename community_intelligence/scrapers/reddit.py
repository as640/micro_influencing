"""
Reddit scraper — replicates Hawstein/mcp-server-reddit using the public
JSON endpoint (no API key required).

Default subreddits cover broad public-interest categories. Add or remove
in COMMUNITY_INTELLIGENCE_REDDIT_SUBS in settings.py.
"""

import logging
import requests
from django.conf import settings

from .base import BaseScraper, RawItem

log = logging.getLogger(__name__)

DEFAULT_SUBS = [
    'worldnews', 'news', 'technology', 'science', 'politics',
    'TwoXChromosomes', 'MensLib', 'india', 'IndianTeenagers',
    'personalfinance', 'environment', 'mentalhealth',
]

USER_AGENT = 'CommunityIntelligenceBot/0.1 (by /u/microfluence)'


class RedditScraper(BaseScraper):
    platform = 'reddit'

    def __init__(self):
        self.subs = getattr(settings, 'COMMUNITY_INTELLIGENCE_REDDIT_SUBS', DEFAULT_SUBS)
        self.timeframe = 'day'
        self.per_sub = 5

    def fetch(self, limit: int = 50) -> list[RawItem]:
        items: list[RawItem] = []
        headers = {'User-Agent': USER_AGENT}
        for sub in self.subs:
            if len(items) >= limit:
                break
            url = f'https://www.reddit.com/r/{sub}/top.json?t={self.timeframe}&limit={self.per_sub}'
            try:
                r = requests.get(url, headers=headers, timeout=10)
                if r.status_code != 200:
                    log.warning('Reddit %s HTTP %s', sub, r.status_code)
                    continue
                data = r.json().get('data', {}).get('children', [])
            except Exception as exc:
                log.warning('Reddit fetch failed for r/%s: %s', sub, exc)
                continue

            for child in data:
                d = child.get('data', {})
                items.append(RawItem(
                    platform='reddit',
                    title=d.get('title', '')[:500],
                    url='https://www.reddit.com' + d.get('permalink', ''),
                    excerpt=(d.get('selftext') or '')[:600],
                    engagement=int(d.get('score', 0)) + int(d.get('num_comments', 0)),
                    raw={'subreddit': sub},
                ))
        return items[:limit]
