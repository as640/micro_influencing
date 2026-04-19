"""
python manage.py refresh_trends [--limit 40] [--max-topics 30]

Run hourly via cron / Railway scheduled job. Idempotent — re-runs update
existing Topics by embedding fingerprint instead of duplicating.
"""

from django.core.management.base import BaseCommand
from community_intelligence.services import refresh_trends
from community_intelligence.llm import claude


class Command(BaseCommand):
    help = 'Refresh public-interest trends across all configured scrapers.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=40,
                            help='Max items per scraper (default: 40)')
        parser.add_argument('--max-topics', type=int, default=30,
                            help='Max topics to persist this run (default: 30)')

    def handle(self, *args, **opts):
        if not claude.available:
            self.stdout.write(self.style.WARNING(
                'ANTHROPIC_API_KEY is not set — running with heuristic fallbacks. '
                'LLM summaries / sentiment / advocacy will be minimal.'
            ))

        stats = refresh_trends(
            per_source_limit=opts['limit'],
            max_topics=opts['max_topics'],
        )
        self.stdout.write(self.style.SUCCESS(
            f"Done. Scraped={stats['scraped']} clusters={stats['clusters']} "
            f"created={stats['topics_created']} updated={stats['topics_updated']}"
        ))
        self.stdout.write(f"  per source: {stats['per_source']}")
