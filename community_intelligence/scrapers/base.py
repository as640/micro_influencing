"""Normalized trend item used by every scraper."""

from dataclasses import dataclass, field
from typing import List


@dataclass
class RawItem:
    platform:    str           # one of SourcePlatform values
    title:       str
    url:         str
    excerpt:     str   = ''
    engagement:  int   = 0     # platform-native engagement signal (likes+comments+upvotes)
    hashtags:    List[str] = field(default_factory=list)
    raw:         dict  = field(default_factory=dict)  # original payload for debugging

    @property
    def text(self) -> str:
        """Concatenated text used for embedding + classification."""
        parts = [self.title]
        if self.excerpt:
            parts.append(self.excerpt)
        if self.hashtags:
            parts.append(' '.join('#' + h for h in self.hashtags))
        return ' — '.join(parts)


class BaseScraper:
    platform: str = ''

    def fetch(self, limit: int = 50) -> list[RawItem]:  # pragma: no cover
        raise NotImplementedError
