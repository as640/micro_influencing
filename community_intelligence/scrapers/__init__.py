"""
community_intelligence.scrapers — pluggable trend sources.

Each scraper exposes a `fetch(limit: int = 50) -> list[RawItem]` callable.
RawItem is the normalized cross-platform shape consumed by the pipeline.
"""

from .base import RawItem
from .reddit import RedditScraper
from .news import NewsScraper
from .youtube import YouTubeScraper
from .twitter import TwitterScraper
from .instagram import InstagramScraper

ALL_SCRAPERS = [
    RedditScraper(),
    NewsScraper(),
    YouTubeScraper(),
    TwitterScraper(),
    InstagramScraper(),
]

__all__ = [
    'RawItem', 'ALL_SCRAPERS',
    'RedditScraper', 'NewsScraper', 'YouTubeScraper',
    'TwitterScraper', 'InstagramScraper',
]
