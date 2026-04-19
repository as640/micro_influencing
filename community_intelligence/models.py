"""
community_intelligence/models.py

Storage for the Community Intelligence Engine:

  Topic                – a clustered theme (e.g. "Online assault tag removal push")
  TopicSource          – raw items (Reddit, News, YouTube...) that fed the topic
  SentimentSnapshot    – periodic positive/negative/neutral breakdown per topic
  AdvocacyAction       – LLM-suggested safe actions for influencers
  CommunityCampaign    – influencer-launched or topic-derived advocacy campaign
  CampaignEndorsement  – an influencer signing onto a campaign

All written for Postgres but uses Django ORM defaults (managed=True), so a
fresh `python manage.py makemigrations community_intelligence && migrate`
creates the tables.
"""

import uuid
from django.db import models
from django.conf import settings


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class RiskLevel(models.TextChoices):
    LOW    = 'low',    'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH   = 'high',   'High'


class SourcePlatform(models.TextChoices):
    REDDIT    = 'reddit',    'Reddit'
    TWITTER   = 'twitter',   'Twitter / X'
    NEWS      = 'news',      'News'
    YOUTUBE   = 'youtube',   'YouTube'
    INSTAGRAM = 'instagram', 'Instagram'


class CampaignStatus(models.TextChoices):
    DRAFT     = 'draft',     'Draft (awaiting review)'
    ACTIVE    = 'active',    'Active'
    ARCHIVED  = 'archived',  'Archived'
    REJECTED  = 'rejected',  'Rejected'


# ---------------------------------------------------------------------------
# 1. Topic
# ---------------------------------------------------------------------------

class Topic(models.Model):
    """
    A clustered, summarized public-interest theme. One Topic groups many
    raw items (TopicSource) from one or more platforms. Refreshed by the
    `refresh_trends` management command.
    """
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title           = models.CharField(max_length=300)
    summary         = models.TextField(help_text='3-line LLM-generated summary')
    categories      = models.JSONField(
                          default=list,
                          help_text='Multi-label categories like ["Politics","Gender"]'
                      )
    stakeholders    = models.JSONField(
                          default=list,
                          help_text='List of groups/entities involved'
                      )
    suggested_angle = models.TextField(blank=True, default='')
    risk_level      = models.CharField(
                          max_length=10,
                          choices=RiskLevel.choices,
                          default=RiskLevel.LOW,
                      )
    risk_flags      = models.JSONField(
                          default=list,
                          help_text='e.g. ["misinformation","legal_risk"]'
                      )
    needs_verification = models.BooleanField(default=False)

    # Scoring
    public_impact_score = models.FloatField(default=0.0, help_text='0-100')
    growth_velocity     = models.FloatField(default=0.0, help_text='0-100')

    # Embedding fingerprint of the cluster centroid (for dedup on refresh)
    embedding_fingerprint = models.CharField(
        max_length=64, blank=True, default='', db_index=True,
        help_text='sha256 of rounded centroid vector — used for dedup'
    )

    is_active   = models.BooleanField(default=True)
    first_seen  = models.DateTimeField(auto_now_add=True)
    last_refreshed = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ci_topics'
        ordering = ['-public_impact_score', '-growth_velocity']
        indexes = [
            models.Index(fields=['-public_impact_score']),
            models.Index(fields=['-last_refreshed']),
        ]

    def __str__(self):
        return f'{self.title} (impact={self.public_impact_score:.0f})'


# ---------------------------------------------------------------------------
# 2. TopicSource — raw items that fed a topic
# ---------------------------------------------------------------------------

class TopicSource(models.Model):
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    topic       = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='sources')
    platform    = models.CharField(max_length=20, choices=SourcePlatform.choices)
    title       = models.CharField(max_length=500)
    url         = models.URLField(max_length=1000)
    excerpt     = models.TextField(blank=True, default='')
    engagement  = models.IntegerField(default=0, help_text='likes+comments+upvotes etc.')
    fetched_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ci_topic_sources'
        ordering = ['-engagement']
        unique_together = [('topic', 'url')]


# ---------------------------------------------------------------------------
# 3. SentimentSnapshot
# ---------------------------------------------------------------------------

class SentimentSnapshot(models.Model):
    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    topic     = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='sentiment_snapshots')
    positive  = models.FloatField(default=0.0)   # 0-100
    negative  = models.FloatField(default=0.0)
    neutral   = models.FloatField(default=0.0)
    sample_size = models.IntegerField(default=0)
    captured_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ci_sentiment_snapshots'
        ordering = ['-captured_at']


# ---------------------------------------------------------------------------
# 4. AdvocacyAction
# ---------------------------------------------------------------------------

class AdvocacyAction(models.Model):
    """
    LLM-suggested action an influencer can responsibly take on a topic.
    Pre-screened by safety.py — never includes personal targeting.
    """
    KIND_CHOICES = [
        ('awareness_post',   'Raise awareness post'),
        ('educational_thread','Educational thread'),
        ('petition_support', 'Petition support'),
        ('community_call',   'Call for community input'),
    ]
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    topic       = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='advocacy_actions')
    kind        = models.CharField(max_length=30, choices=KIND_CHOICES)
    headline    = models.CharField(max_length=300)
    body        = models.TextField()
    safety_notes = models.TextField(
        blank=True, default='',
        help_text='Surfaced caveats: needs verification, sensitive content, etc.'
    )
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ci_advocacy_actions'
        ordering = ['-created_at']


# ---------------------------------------------------------------------------
# 5. CommunityCampaign
# ---------------------------------------------------------------------------

class CommunityCampaign(models.Model):
    """
    An advocacy / awareness campaign that influencers can endorse.
    Either user-suggested or auto-derived from a high-impact Topic.
    """
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    title        = models.CharField(max_length=300)
    description  = models.TextField()
    call_to_action = models.TextField(
        blank=True, default='',
        help_text='What action to take — e.g. "Sign petition X", "Share #removeunw tag"'
    )
    categories   = models.JSONField(default=list)
    risk_level   = models.CharField(
        max_length=10, choices=RiskLevel.choices, default=RiskLevel.LOW
    )
    needs_verification = models.BooleanField(default=False)

    # Optional link back to a Topic that spawned this campaign
    topic        = models.ForeignKey(
                       Topic, on_delete=models.SET_NULL, blank=True, null=True,
                       related_name='community_campaigns'
                   )

    # Who suggested it (NULL = system-generated from Topic)
    suggested_by = models.ForeignKey(
                       settings.AUTH_USER_MODEL,
                       on_delete=models.SET_NULL, blank=True, null=True,
                       related_name='suggested_campaigns',
                   )

    status       = models.CharField(
                       max_length=20,
                       choices=CampaignStatus.choices,
                       default=CampaignStatus.DRAFT,
                   )

    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ci_community_campaigns'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} [{self.status}]'

    @property
    def endorsement_count(self):
        return self.endorsements.count()


# ---------------------------------------------------------------------------
# 6. CampaignEndorsement
# ---------------------------------------------------------------------------

class CampaignEndorsement(models.Model):
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign    = models.ForeignKey(
                      CommunityCampaign, on_delete=models.CASCADE, related_name='endorsements'
                  )
    user        = models.ForeignKey(
                      settings.AUTH_USER_MODEL,
                      on_delete=models.CASCADE, related_name='campaign_endorsements'
                  )
    note        = models.TextField(blank=True, default='', help_text='Optional comment')
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ci_campaign_endorsements'
        ordering = ['-created_at']
        unique_together = [('campaign', 'user')]
