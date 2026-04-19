"""DRF serializers for the Community Intelligence API."""

from rest_framework import serializers

from .models import (
    Topic, TopicSource, SentimentSnapshot, AdvocacyAction,
    CommunityCampaign, CampaignEndorsement,
)


class TopicSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TopicSource
        fields = ['id', 'platform', 'title', 'url', 'excerpt', 'engagement']


class SentimentSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = SentimentSnapshot
        fields = ['positive', 'negative', 'neutral', 'sample_size', 'captured_at']


class AdvocacyActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdvocacyAction
        fields = ['id', 'kind', 'headline', 'body', 'safety_notes', 'created_at']


class TopicListSerializer(serializers.ModelSerializer):
    """Compact shape for the trending list."""
    sentiment = serializers.SerializerMethodField()
    sources_count = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            'id', 'title', 'summary', 'categories', 'stakeholders',
            'suggested_angle', 'risk_level', 'risk_flags', 'needs_verification',
            'public_impact_score', 'growth_velocity',
            'sentiment', 'sources_count', 'last_refreshed',
        ]

    def get_sentiment(self, obj):
        snap = obj.sentiment_snapshots.first()
        return SentimentSnapshotSerializer(snap).data if snap else None

    def get_sources_count(self, obj):
        return obj.sources.count()


class TopicDetailSerializer(TopicListSerializer):
    sources = TopicSourceSerializer(many=True, read_only=True)
    advocacy_actions = AdvocacyActionSerializer(many=True, read_only=True)

    class Meta(TopicListSerializer.Meta):
        fields = TopicListSerializer.Meta.fields + ['sources', 'advocacy_actions']


# ---------------------------------------------------------------------------
# Community Campaigns
# ---------------------------------------------------------------------------

class CampaignEndorsementSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    handle = serializers.SerializerMethodField()

    class Meta:
        model = CampaignEndorsement
        fields = ['id', 'note', 'created_at', 'user_email', 'handle']

    def get_handle(self, obj):
        prof = getattr(obj.user, 'influencer_profile', None)
        return prof.instagram_handle if prof else None


class CommunityCampaignSerializer(serializers.ModelSerializer):
    endorsement_count = serializers.IntegerField(read_only=True)
    suggested_by_email = serializers.CharField(source='suggested_by.email', read_only=True)
    is_endorsed_by_me = serializers.SerializerMethodField()
    topic_title = serializers.CharField(source='topic.title', read_only=True)

    class Meta:
        model = CommunityCampaign
        fields = [
            'id', 'title', 'description', 'call_to_action', 'categories',
            'risk_level', 'needs_verification',
            'topic', 'topic_title',
            'suggested_by_email', 'status',
            'endorsement_count', 'is_endorsed_by_me',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['status', 'risk_level', 'needs_verification', 'topic']

    def get_is_endorsed_by_me(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.endorsements.filter(user=request.user).exists()


class CommunityCampaignDetailSerializer(CommunityCampaignSerializer):
    endorsements = CampaignEndorsementSerializer(many=True, read_only=True)

    class Meta(CommunityCampaignSerializer.Meta):
        fields = CommunityCampaignSerializer.Meta.fields + ['endorsements']
