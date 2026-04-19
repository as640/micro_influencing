"""
Community Intelligence API.

GET   /api/community/trends/                 → top topics for current user
GET   /api/community/trends/<id>/            → topic detail (sources + advocacy)
GET   /api/community/categories/             → multi-label categories for current influencer
GET   /api/community/campaigns/              → list community campaigns
POST  /api/community/campaigns/              → influencer suggests a campaign
GET   /api/community/campaigns/<id>/         → campaign detail + endorsements
POST  /api/community/campaigns/<id>/endorse/ → endorse campaign
DEL   /api/community/campaigns/<id>/endorse/ → un-endorse
POST  /api/community/admin/refresh/          → trigger refresh (superuser only)
"""

import logging

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import (
    RetrieveAPIView, ListCreateAPIView,
)

from users_and_profiles.permissions import IsSuperUser

from .models import (
    Topic, CommunityCampaign, CampaignEndorsement, CampaignStatus,
)
from .serializers import (
    TopicListSerializer, TopicDetailSerializer,
    CommunityCampaignSerializer, CommunityCampaignDetailSerializer,
)
from .services import top_topics_for_categories, refresh_trends
from .pipeline.classifier import classify_influencer
from .pipeline.summarizer import summarize_cluster
from .pipeline.safety import safety_check_topic, needs_verification
from .scrapers.base import RawItem

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_categories(user) -> list[str]:
    """Use the influencer's stored category — extended with multi-label classifier."""
    prof = getattr(user, 'influencer_profile', None)
    if not prof:
        return []
    cats = classify_influencer(
        bio=prof.bio or '',
        base_category=prof.category or '',
        handle=prof.instagram_handle or '',
    )
    return [c['name'] for c in cats]


# ---------------------------------------------------------------------------
# Topics
# ---------------------------------------------------------------------------

class TrendingTopicsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cats = _user_categories(request.user)
        topics = top_topics_for_categories(cats, limit=10)
        data = TopicListSerializer(topics, many=True).data
        return Response({'categories': cats, 'topics': data})


class TopicDetailView(RetrieveAPIView):
    queryset = Topic.objects.filter(is_active=True)
    serializer_class = TopicDetailSerializer
    permission_classes = [IsAuthenticated]


class MyCategoriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        prof = getattr(request.user, 'influencer_profile', None)
        if not prof:
            return Response({'categories': []})
        cats = classify_influencer(
            bio=prof.bio or '',
            base_category=prof.category or '',
            handle=prof.instagram_handle or '',
        )
        return Response({'categories': cats})


# ---------------------------------------------------------------------------
# Community Campaigns
# ---------------------------------------------------------------------------

class CommunityCampaignListCreateView(ListCreateAPIView):
    serializer_class = CommunityCampaignSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = CommunityCampaign.objects.exclude(status=CampaignStatus.REJECTED)
        status_q = self.request.query_params.get('status')
        if status_q:
            qs = qs.filter(status=status_q)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        title = serializer.validated_data.get('title', '')
        body = serializer.validated_data.get('description', '')
        cta  = serializer.validated_data.get('call_to_action', '')

        # Run the LLM safety summarizer on the user's draft to:
        #   - propose categories
        #   - assign risk_level / needs_verification
        full_text = f'{title}\n{body}\n{cta}'
        items = [RawItem(platform='reddit', title=title, url='', excerpt=body)]
        s = summarize_cluster(items)
        cats  = serializer.validated_data.get('categories') or s.get('categories', [])
        risk  = s.get('risk_level', 'medium')
        flags = s.get('risk_flags', [])
        risk, flags = safety_check_topic(full_text, risk, flags)
        nv = bool(s.get('needs_verification')) or needs_verification(flags)

        # First-time submissions sit in DRAFT for moderator review unless the
        # user is staff, in which case they go ACTIVE immediately.
        new_status = (
            CampaignStatus.ACTIVE if self.request.user.is_staff
            else CampaignStatus.DRAFT
        )
        serializer.save(
            suggested_by=self.request.user,
            categories=cats,
            risk_level=risk,
            needs_verification=nv,
            status=new_status,
        )


class CommunityCampaignDetailView(RetrieveAPIView):
    queryset = CommunityCampaign.objects.all()
    serializer_class = CommunityCampaignDetailSerializer
    permission_classes = [IsAuthenticated]


class EndorseCampaignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        campaign = get_object_or_404(CommunityCampaign, pk=pk)
        if campaign.status != CampaignStatus.ACTIVE:
            return Response(
                {'detail': 'Only active campaigns can be endorsed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        endorsement, created = CampaignEndorsement.objects.get_or_create(
            campaign=campaign,
            user=request.user,
            defaults={'note': request.data.get('note', '')[:500]},
        )
        return Response(
            {'created': created, 'endorsement_count': campaign.endorsement_count},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        campaign = get_object_or_404(CommunityCampaign, pk=pk)
        deleted, _ = CampaignEndorsement.objects.filter(
            campaign=campaign, user=request.user,
        ).delete()
        return Response(
            {'deleted': bool(deleted), 'endorsement_count': campaign.endorsement_count},
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Admin: trigger refresh on demand
# ---------------------------------------------------------------------------

class RefreshTrendsView(APIView):
    permission_classes = [IsAuthenticated, IsSuperUser]

    def post(self, request):
        limit = int(request.data.get('limit', 40))
        max_topics = int(request.data.get('max_topics', 30))
        stats = refresh_trends(per_source_limit=limit, max_topics=max_topics)
        return Response(stats)
