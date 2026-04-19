"""
YouTube trends scraper.

Strategy (in order):
  1. YouTube Data API v3 if YOUTUBE_API_KEY is set (richest)
  2. yt-dlp with the YT_TRENDING playlist (no key, like
     labeveryday/youtube-mcp-server-enhanced) if installed
  3. Fallback: scrape the public trending HTML page (no key, no deps)
"""

import json
import logging
import re
import requests
from django.conf import settings

from .base import BaseScraper, RawItem

log = logging.getLogger(__name__)


class YouTubeScraper(BaseScraper):
    platform = 'youtube'

    def __init__(self):
        self.api_key = getattr(settings, 'YOUTUBE_API_KEY', '')
        self.region = getattr(settings, 'COMMUNITY_INTELLIGENCE_YT_REGION', 'IN')

    def fetch(self, limit: int = 50) -> list[RawItem]:
        if self.api_key:
            try:
                return self._fetch_api(limit)
            except Exception as exc:
                log.warning('YouTube Data API failed: %s', exc)

        try:
            import yt_dlp  # noqa
            return self._fetch_ytdlp(limit)
        except ImportError:
            pass
        except Exception as exc:
            log.warning('yt-dlp trending fetch failed: %s', exc)

        return self._fetch_html(limit)

    # ---- 1. Official API --------------------------------------------------
    def _fetch_api(self, limit: int) -> list[RawItem]:
        r = requests.get(
            'https://www.googleapis.com/youtube/v3/videos',
            params={
                'part': 'snippet,statistics',
                'chart': 'mostPopular',
                'regionCode': self.region,
                'maxResults': min(50, limit),
                'key': self.api_key,
            },
            timeout=10,
        )
        data = r.json()
        items = []
        for v in data.get('items', []):
            sn = v.get('snippet', {})
            st = v.get('statistics', {})
            items.append(RawItem(
                platform='youtube',
                title=sn.get('title', '')[:500],
                url=f'https://www.youtube.com/watch?v={v.get("id")}',
                excerpt=(sn.get('description') or '')[:600],
                engagement=int(st.get('viewCount', 0) or 0) // 1000,
                hashtags=sn.get('tags', [])[:10],
                raw={'channel': sn.get('channelTitle', '')},
            ))
        return items[:limit]

    # ---- 2. yt-dlp --------------------------------------------------------
    def _fetch_ytdlp(self, limit: int) -> list[RawItem]:
        import yt_dlp

        opts = {
            'quiet': True,
            'extract_flat': True,
            'skip_download': True,
            'playlist_items': f'1-{min(50, limit)}',
        }
        url = f'https://www.youtube.com/feed/trending?gl={self.region}'
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)

        entries = info.get('entries', []) or []
        items = []
        for e in entries:
            items.append(RawItem(
                platform='youtube',
                title=(e.get('title') or '')[:500],
                url=e.get('url') or e.get('webpage_url') or '',
                excerpt='',
                engagement=int(e.get('view_count') or 0) // 1000,
                raw={'channel': e.get('channel') or ''},
            ))
        return items[:limit]

    # ---- 3. HTML fallback -------------------------------------------------
    def _fetch_html(self, limit: int) -> list[RawItem]:
        try:
            r = requests.get(
                f'https://www.youtube.com/feed/trending?gl={self.region}',
                headers={'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9'},
                timeout=10,
            )
            html = r.text
        except Exception as exc:
            log.warning('YouTube HTML fetch failed: %s', exc)
            return []

        m = re.search(r'var ytInitialData = (\{.*?\});</script>', html)
        if not m:
            return []
        try:
            data = json.loads(m.group(1))
        except Exception:
            return []

        items = []
        # Walk the JSON for videoRenderer nodes — robust enough for trending page
        def walk(node):
            if isinstance(node, dict):
                if 'videoRenderer' in node:
                    yield node['videoRenderer']
                for v in node.values():
                    yield from walk(v)
            elif isinstance(node, list):
                for v in node:
                    yield from walk(v)

        for vr in walk(data):
            try:
                vid = vr.get('videoId')
                title = vr['title']['runs'][0]['text']
                views = vr.get('viewCountText', {}).get('simpleText', '0')
                views_num = int(re.sub(r'[^0-9]', '', views) or 0)
            except Exception:
                continue
            items.append(RawItem(
                platform='youtube',
                title=title[:500],
                url=f'https://www.youtube.com/watch?v={vid}',
                engagement=views_num // 1000,
            ))
            if len(items) >= limit:
                break
        return items
