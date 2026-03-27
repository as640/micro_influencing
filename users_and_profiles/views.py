"""
users_and_profiles/views.py

Auth API views:
  POST  /api/auth/register/
  POST  /api/auth/login/
  POST  /api/auth/logout/
  GET   /api/auth/me/

Discovery API views:
  GET   /api/influencers/
  GET   /api/influencers/<id>/
  GET   /api/campaigns/
  POST  /api/campaigns/
  GET   /api/campaigns/<id>/
  PATCH /api/campaigns/<id>/

Messaging API views:
  GET   /api/conversations/            → my inbox threads
  POST  /api/conversations/            → business starts a chat
  GET   /api/conversations/<id>/       → thread + all messages
  POST  /api/conversations/<id>/messages/  → send a message
  POST  /api/conversations/<id>/read/  → mark all unread as read
"""

import django_filters
from django_filters.rest_framework import DjangoFilterBackend

from django.shortcuts import get_object_or_404

from rest_framework import status, filters
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import (
    ListAPIView, RetrieveAPIView,
    ListCreateAPIView, RetrieveUpdateAPIView,
)

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import InfluencerProfile, BusinessProfile, Campaign, Conversation, Message
from django.utils import timezone
from django.db.models import Sum
from .permissions import IsBusiness, IsConversationParticipant, IsSuperUser
from .serializers import (
    RegisterSerializer, LoginSerializer, UserMeSerializer,
    InfluencerListSerializer, InfluencerDetailSerializer,
    CampaignSerializer,
    ConversationSerializer, ConversationDetailSerializer, MessageSerializer,
    InfluencerProfileSerializer, BusinessProfileSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)


# ===========================================================================
# Helpers
# ===========================================================================

def _get_tokens_for_user(user):
    """Generate a JWT access + refresh token pair for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access':  str(refresh.access_token),
    }


# ===========================================================================
# Superadmin User Dashboard
# ===========================================================================

class SuperadminDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsSuperUser]
    
    def get(self, request):
        now = timezone.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        total_businesses = BusinessProfile.objects.count()
        total_influencers = InfluencerProfile.objects.count()
        active_campaigns = Campaign.objects.filter(is_active=True).count()
        
        # Contracts
        # Note: Assuming Contract model is already imported properly
        total_pending_contracts = Contract.objects.filter(status='pending').count()
        total_active_contracts = Contract.objects.filter(status='active').count()
        
        closed_deals_this_month = Contract.objects.filter(
            status='completed', 
            updated_at__gte=start_of_month
        ).count()
        
        # Platform value
        completed_contracts = Contract.objects.filter(status='completed')
        total_platform_value = completed_contracts.aggregate(
            total=Sum('agreed_price')
        )['total'] or 0

        return Response({
            'total_businesses': total_businesses,
            'total_influencers': total_influencers,
            'active_campaigns': active_campaigns,
            'closed_deals_this_month': closed_deals_this_month,
            'total_pending_contracts': total_pending_contracts,
            'total_active_contracts': total_active_contracts,
            'total_platform_value': float(total_platform_value),
        }, status=status.HTTP_200_OK)


# ===========================================================================
# Auth Views
# ===========================================================================

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user   = serializer.save()
        tokens = _get_tokens_for_user(user)
        return Response(
            {
                'message': 'Account created successfully.',
                'user': {'id': str(user.id), 'email': user.email, 'role': user.role},
                **tokens,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user   = serializer.validated_data['user']
        tokens = _get_tokens_for_user(user)
        return Response(
            {
                'message': 'Login successful.',
                'user': {'id': str(user.id), 'email': user.email, 'role': user.role},
                **tokens,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_205_RESET_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserMeSerializer(request.user).data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        if user.role == 'influencer':
            serializer = InfluencerProfileSerializer(
                user.influencer_profile, data=request.data, partial=True
            )
        else:
            serializer = BusinessProfileSerializer(
                user.business_profile, data=request.data, partial=True
            )
            
        if serializer.is_valid():
            serializer.save()
            return Response(UserMeSerializer(user).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ===========================================================================
# Discovery — Influencer Filters & Views
# ===========================================================================

class InfluencerFilter(django_filters.FilterSet):
    min_reach     = django_filters.NumberFilter(field_name='avg_reach',       lookup_expr='gte')
    max_price     = django_filters.NumberFilter(field_name='price_max',        lookup_expr='lte')
    min_followers = django_filters.NumberFilter(field_name='followers_count',  lookup_expr='gte')

    class Meta:
        model  = InfluencerProfile
        fields = {
            'locality':    ['exact', 'icontains'],
            'category':    ['exact', 'icontains'],
            'is_verified': ['exact'],
        }


class InfluencerListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = InfluencerListSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class    = InfluencerFilter
    search_fields      = ['instagram_handle', 'category', 'locality', 'bio']
    ordering_fields    = ['followers_count', 'avg_reach', 'avg_views_per_reel', 'price_min']
    ordering           = ['-followers_count']

    def get_queryset(self):
        return InfluencerProfile.objects.select_related('user').filter(user__is_active=True)


class InfluencerDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = InfluencerDetailSerializer

    def get_queryset(self):
        return InfluencerProfile.objects.select_related('user').filter(user__is_active=True)


class BusinessListView(ListAPIView):
    """GET /api/businesses/ — returns all business profiles (for superadmin dropdown)."""
    permission_classes = [IsAuthenticated]
    serializer_class   = BusinessProfileSerializer

    def get_queryset(self):
        return BusinessProfile.objects.select_related('user').all()


# ===========================================================================
# Discovery — Campaign Filters & Views
# ===========================================================================

class CampaignFilter(django_filters.FilterSet):
    min_budget = django_filters.NumberFilter(field_name='budget_min', lookup_expr='gte')
    max_budget = django_filters.NumberFilter(field_name='budget_max', lookup_expr='lte')
    business_locality = django_filters.CharFilter(field_name='business__locality', lookup_expr='icontains')

    class Meta:
        model  = Campaign
        fields = {
            'required_ad_type': ['exact'],
            'is_active':        ['exact'],
        }


class CampaignListCreateView(ListCreateAPIView):
    serializer_class = CampaignSerializer
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class  = CampaignFilter
    search_fields    = ['title', 'description']
    ordering_fields  = ['budget_min', 'budget_max', 'created_at']
    ordering         = ['-created_at']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated()]  # superadmin + business both allowed; role checked in perform_create
        return [IsAuthenticated()]

    def get_queryset(self):
        return Campaign.objects.select_related('business').filter(is_active=True)

    def perform_create(self, serializer):
        user = self.request.user
        # Superadmin must provide a business_id explicitly
        if not user.is_superuser and user.role != 'business':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only business accounts can create campaigns.')
        business_id = self.request.data.get('business_id')
        if business_id:
            from django.shortcuts import get_object_or_404
            business = get_object_or_404(BusinessProfile, id=business_id)
        else:
            business = user.business_profiles.first() if hasattr(user, 'business_profiles') else None
            if not business:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'business_id': 'No business profile found. Please create or specify one.'})
        serializer.save(business=business)


class CampaignDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = CampaignSerializer
    queryset         = Campaign.objects.select_related('business').all()

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH'):
            return [IsBusiness()]
        return [IsAuthenticated()]

    def update(self, request, *args, **kwargs):
        campaign = self.get_object()
        if not request.user.is_superuser and campaign.business.user != request.user:
            return Response(
                {'error': 'You can only edit your own campaigns.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        campaign = self.get_object()
        if not request.user.is_superuser and campaign.business.user != request.user:
            return Response(
                {'error': 'You can only delete your own campaigns.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


# ===========================================================================
# Messaging Views
# ===========================================================================

class ConversationListCreateView(APIView):
    """
    GET  /api/conversations/
        Returns all conversation threads the current user is a participant in.
        Businesses see their outbound threads; influencers see inbound threads.

    POST /api/conversations/
        Business-only. Starts a new conversation with an influencer.
        Body: { "influencer_id": "<uuid>" }
        Returns existing thread if one already exists (idempotent).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'business':
            qs = Conversation.objects.filter(
                business__in=user.business_profiles.all()
            ).prefetch_related('messages__sender').select_related('business', 'influencer')
        else:
            qs = Conversation.objects.filter(
                influencer=user.influencer_profile
            ).prefetch_related('messages__sender').select_related('business', 'influencer')

        qs = qs.order_by('-created_at')
        serializer = ConversationSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        """Both businesses and influencers can initiate a conversation."""
        user = request.user
        
        # 1. Business initiating chat with Influencer (or superadmin acting as business)
        if user.role == 'business' or user.is_superuser:
            influencer_id = request.data.get('influencer_id')
            business_id = request.data.get('business_id')
            if not influencer_id:
                return Response(
                    {'error': 'influencer_id is required for a business to start a chat.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            influencer = get_object_or_404(InfluencerProfile, pk=influencer_id)
            if business_id:
                business = get_object_or_404(BusinessProfile, pk=business_id)
            else:
                business = user.business_profiles.first() if hasattr(user, 'business_profiles') else None
                if not business:
                    return Response({'error': 'No business profile found. Please create one first.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # 2. Influencer initiating chat with Business (Applying for campaign)
        elif user.role == 'influencer':
            business_id = request.data.get('business_id')
            if not business_id:
                return Response(
                    {'error': 'business_id is required for an influencer to start a chat.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            business   = get_object_or_404(BusinessProfile, pk=business_id)
            influencer = user.influencer_profile
            
        else:
            return Response({'error': 'Invalid role.'}, status=status.HTTP_403_FORBIDDEN)

        # Idempotent — return existing thread if already open
        conversation, created = Conversation.objects.get_or_create(
            business=business,
            influencer=influencer,
        )

        serializer = ConversationSerializer(
            conversation, context={'request': request}
        )
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class ConversationDetailView(APIView):
    """
    GET /api/conversations/<uuid>/
    Returns the full conversation thread including all messages,
    ordered oldest → newest.
    Only accessible by the two participants.
    """
    permission_classes = [IsAuthenticated, IsConversationParticipant]

    def get_object(self, pk, user):
        conversation = get_object_or_404(
            Conversation.objects
                .select_related('business', 'influencer')
                .prefetch_related('messages__sender'),
            pk=pk,
        )
        self.check_object_permissions(self.request, conversation)
        return conversation

    def get(self, request, pk):
        conversation = self.get_object(pk, request.user)
        serializer   = ConversationDetailSerializer(
            conversation, context={'request': request}
        )
        return Response(serializer.data)


class MessageCreateView(APIView):
    """
    POST /api/conversations/<uuid>/messages/
    Send a new message inside a conversation.
    Body: { "content": "Hello!" }
    Only the two participants can send messages.
    """
    permission_classes = [IsAuthenticated, IsConversationParticipant]

    def post(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        self.check_object_permissions(request, conversation)

        content = request.data.get('content', '').strip()
        if not content:
            return Response(
                {'error': 'Message content cannot be empty.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content,
        )
        return Response(
            MessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )


class MarkMessagesReadView(APIView):
    """
    POST /api/conversations/<uuid>/read/
    Mark all unread messages in this thread (sent by the OTHER party)
    as read. Returns the count of messages marked.
    """
    permission_classes = [IsAuthenticated, IsConversationParticipant]

    def post(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        self.check_object_permissions(request, conversation)

        updated = conversation.messages.filter(
            is_read=False
        ).exclude(
            sender=request.user
        ).update(is_read=True)

        return Response(
            {'marked_as_read': updated},
            status=status.HTTP_200_OK,
        )


# ===========================================================================
# Contract Views
# ===========================================================================

from .models import Contract, ContractStatus
from .serializers import ContractSerializer


class ContractListCreateView(APIView):
    """
    GET  /api/contracts/
        Returns all contracts the current user is a party to.
        Businesses see contracts they proposed.
        Influencers see contracts sent to them.

    POST /api/contracts/
        Business-only. Proposes a new contract to an influencer.
        Body: {
          "influencer": "<uuid>",
          "agreed_price": "5000.00",
          "deliverables": "1 Instagram Reel (60 sec), posted within 7 days",
          "campaign": "<uuid>"   ← optional
        }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'business':
            qs = Contract.objects.filter(business__in=user.business_profiles.all())
        else:
            qs = Contract.objects.filter(influencer=user.influencer_profile)

        qs = qs.select_related('business', 'influencer', 'campaign').order_by('-created_at')
        return Response(ContractSerializer(qs, many=True).data)

    def post(self, request):
        if request.user.role != 'business' and not request.user.is_superuser:
            return Response(
                {'error': 'Only business accounts can propose a contract.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data.copy()
        business_id = request.data.get('business_id')
        if business_id:
            business = get_object_or_404(request.user.business_profiles.all(), pk=business_id)
        else:
            business = request.user.business_profiles.first()
            if not business:
                return Response({'error': 'No verified business found.'}, status=status.HTTP_400_BAD_REQUEST)

        # Auto-attach the authorized business profile
        data['business'] = str(business.id)

        serializer = ContractSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        contract = serializer.save()
        return Response(
            ContractSerializer(contract).data,
            status=status.HTTP_201_CREATED,
        )


class ContractDetailView(APIView):
    """
    GET /api/contracts/<uuid>/
    Returns full contract detail.
    Only accessible by the business or influencer on the contract.
    """
    permission_classes = [IsAuthenticated]

    def _get_contract(self, pk, user):
        contract = get_object_or_404(
            Contract.objects.select_related('business', 'influencer', 'campaign'),
            pk=pk,
        )
        is_party = (
            (user.role == 'business'   and contract.business.user == user) or
            (user.role == 'influencer' and contract.influencer == user.influencer_profile)
        )
        if not is_party:
            return None, Response(
                {'error': 'You are not a party to this contract.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return contract, None

    def get(self, request, pk):
        contract, err = self._get_contract(pk, request.user)
        if err:
            return err
        return Response(ContractSerializer(contract).data)


class ContractStatusView(APIView):
    """
    PATCH /api/contracts/<uuid>/status/
    Updates the status of a contract following strict transition rules:

    ┌─────────────┬──────────────┬───────────────────────────────────┐
    │ From        │ To           │ Who can do it                     │
    ├─────────────┼──────────────┼───────────────────────────────────┤
    │ pending     │ active       │ Influencer (accept)               │
    │ pending     │ cancelled    │ Either party (withdraw/reject)    │
    │ active      │ completed    │ Business (marks job as done)      │
    │ active      │ cancelled    │ Either party                      │
    └─────────────┴──────────────┴───────────────────────────────────┘

    Body: { "status": "active" | "completed" | "cancelled" }
    """
    permission_classes = [IsAuthenticated]

    # Valid transitions: (from_status, to_status) → which role can initiate
    TRANSITIONS = {
        (ContractStatus.PENDING,   ContractStatus.ACTIVE):    'influencer',
        (ContractStatus.PENDING,   ContractStatus.CANCELLED): 'any',
        (ContractStatus.ACTIVE,    ContractStatus.COMPLETED): 'business',
        (ContractStatus.ACTIVE,    ContractStatus.CANCELLED): 'any',
    }

    def patch(self, request, pk):
        contract = get_object_or_404(
            Contract.objects.select_related('business', 'influencer'),
            pk=pk,
        )
        user = request.user

        # Verify the user is a party to this contract
        is_business    = (user.role == 'business'   and contract.business.user == user)
        is_influencer  = (user.role == 'influencer' and contract.influencer == user.influencer_profile)
        if not (is_business or is_influencer):
            return Response(
                {'error': 'You are not a party to this contract.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': 'status field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        transition_key = (contract.status, new_status)
        allowed_role   = self.TRANSITIONS.get(transition_key)

        if not allowed_role:
            return Response(
                {
                    'error': f"Invalid transition: '{contract.status}' → '{new_status}'.",
                    'allowed_transitions': [
                        f"'{k[0]}' → '{k[1]}' (by {v})"
                        for k, v in self.TRANSITIONS.items()
                    ],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if allowed_role == 'influencer' and not is_influencer:
            return Response({'error': 'Only the influencer can perform this transition.'}, status=status.HTTP_403_FORBIDDEN)
        if allowed_role == 'business' and not is_business:
            return Response({'error': 'Only the business can perform this transition.'}, status=status.HTTP_403_FORBIDDEN)

        contract.status = new_status
        contract.save(update_fields=['status', 'updated_at'])

        return Response(
            {
                'message': f'Contract status updated to "{new_status}".',
                'contract': ContractSerializer(contract).data,
            },
            status=status.HTTP_200_OK,
        )


# ===========================================================================
# Payment Views (Phase 6 — Escrow)
# ===========================================================================

from . import payment_service


class ContractPaymentCreateView(APIView):
    """
    POST /api/contracts/<id>/payment/create/

    Business calls this when they are ready to fund the contract.
    Returns a Razorpay Order ID that the frontend will use to open the
    checkout modal.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        if user.role != 'business':
            return Response(
                {'error': 'Only businesses can fund contracts.'},
                status=status.HTTP_403_FORBIDDEN
            )

        contract = get_object_or_404(
            Contract.objects.select_related('business'),
            pk=pk,
            business__user=user
        )

        if contract.status != ContractStatus.ACTIVE:
            return Response(
                {'error': f"Contract must be active to fund. Current status is {contract.status}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate order (amount in INR)
        try:
            order = payment_service.create_order(
                amount_inr=float(contract.agreed_price),
                receipt_id=f"contract_{contract.id}"
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(order, status=status.HTTP_201_CREATED)


class ContractPaymentVerifyView(APIView):
    """
    POST /api/contracts/<id>/payment/verify/

    Frontend calls this after a successful Razorpay checkout.
    Verifies the cryptographic signature from Razorpay.
    If valid, marks the contract as funded / updates a payment intent field.

    Body:
    {
       "razorpay_order_id": "...",
       "razorpay_payment_id": "...",
       "razorpay_signature": "..."
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        if user.role != 'business':
            return Response({'error': 'Only businesses can verify payment.'}, status=status.HTTP_403_FORBIDDEN)

        contract = get_object_or_404(Contract, pk=pk, business=user.business_profile)

        order_id   = request.data.get('razorpay_order_id', '')
        payment_id = request.data.get('razorpay_payment_id', '')
        signature  = request.data.get('razorpay_signature', '')

        if not all([order_id, payment_id, signature]):
            return Response({'error': 'Missing Razorpay parameters.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify signature via service
        is_valid = payment_service.verify_signature(order_id, payment_id, signature)

        if not is_valid:
             return Response({'error': 'Payment verification failed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Mark as funded
        contract.payment_intent_id = payment_id
        contract.save(update_fields=['payment_intent_id', 'updated_at'])

        return Response({
            'message': 'Payment successfully verified. Contract is now funded in escrow.',
            'payment_id': payment_id
        }, status=status.HTTP_200_OK)


# ===========================================================================
# Instagram OAuth Views  (Phase 5 — Verification Engine)
# ===========================================================================

from . import instagram_service


class InstagramAuthURLView(APIView):
    """
    GET /api/instagram/auth-url/

    Returns the Instagram OAuth URL the influencer should open in their browser.
    The 'state' parameter embeds the influencer's user ID so the callback
    knows which profile to update.

    Only influencer accounts can call this.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != 'influencer':
            return Response(
                {'error': 'Only influencer accounts can connect an Instagram profile.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        auth_url = instagram_service.get_auth_url(state=str(user.id))
        return Response({
            'auth_url':    auth_url,
            'instruction': (
                'Open auth_url in a browser. After authorising, Instagram will '
                'redirect you to the redirect_uri with a ?code= parameter. '
                'Copy that code and POST it to /api/instagram/callback/.'
            ),
        })


class InstagramCallbackView(APIView):
    """
    POST /api/instagram/callback/

    Called after the influencer completes the Instagram OAuth flow.
    The frontend extracts the 'code' from the Instagram redirect and
    sends it here.

    Body: { "code": "<one-time-code-from-instagram>" }

    What this does:
      1. Exchanges the code for a short-lived token
      2. Upgrades it to a 60-day token
      3. Fetches follower count, bio, media count from Instagram
      4. Fetches avg reel views + likes from recent media
      5. Saves all metrics to the influencer's profile
      6. Sets is_verified = True ✓

    Returns: the updated InfluencerProfile.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role != 'influencer':
            return Response(
                {'error': 'Only influencer accounts can complete Instagram verification.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        code = request.data.get('code', '').strip()
        if not code:
            return Response(
                {'error': 'code is required. Copy it from the Instagram redirect URL.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            profile = user.influencer_profile
        except Exception:
            return Response(
                {'error': 'Influencer profile not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            instagram_service.verify_and_update_profile(profile, code)
        except ValueError as e:
            return Response(
                {
                    'error': 'Instagram verification failed.',
                    'detail': str(e),
                    'hint': (
                        'Make sure INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, and '
                        'INSTAGRAM_REDIRECT_URI are set in your .env file, and '
                        'that the code has not expired (codes expire in minutes).'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(InfluencerDetailSerializer(profile).data, status=status.HTTP_200_OK)


        # Return the updated profile
        from .serializers import InfluencerDetailSerializer
        profile.refresh_from_db()
        return Response(InfluencerDetailSerializer(profile).data, status=status.HTTP_200_OK)


# ===========================================================================
# Password Reset Views
# ===========================================================================
from django.core.mail import send_mail
from django.conf import settings
from .models import PasswordResetOTP, CustomUser
import random

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        
        user = CustomUser.objects.get(email=email)
        
        # Invalidate old OTPs for this user
        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)
        
        # Generate 6 digit OTP
        otp_code = f"{random.randint(100000, 999999)}"
        PasswordResetOTP.objects.create(user=user, otp=otp_code)
        
        # Send email (fail silently so we don't 500, but print to console for backup)
        try:
            print(f"--- OTP GENERATED FOR {email}: {otp_code} ---")
            send_mail(
                subject="Microfluence Password Reset OTP",
                message=f"Your OTP for password reset is: {otp_code}\nThis OTP is valid for 10 minutes.",
                from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@microfluence.com',
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
        
        return Response({"message": "OTP sent to your email."}, status=status.HTTP_200_OK)

class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp']
        new_password = serializer.validated_data['new_password']
        
        user = get_object_or_404(CustomUser, email=email)
        
        # Find latest OTP matching user and code
        otp_obj = PasswordResetOTP.objects.filter(user=user, otp=otp_code).order_by('-created_at').first()
        
        if not otp_obj or not otp_obj.is_valid():
            return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Reset password
        user.set_password(new_password)
        user.save()
        
        # Mark OTP as used
        otp_obj.is_used = True
        otp_obj.save()
        
        return Response({"message": "Password reset successful."}, status=status.HTTP_200_OK)


# ===========================================================================
# Setu GST Add / Verify Views
# ===========================================================================
from . import setu_service

class PublicBusinessGSTRequestOTPView(APIView):
    """
    POST /api/auth/business/gst-request/
    Allows unauthenticated users during registration to request a GST OTP.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        gstin = request.data.get('gstin')
        if not gstin:
            return Response({'error': 'GSTIN is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            ref_id = setu_service.request_gst_otp(gstin)
            return Response({'reference_id': ref_id, 'message': 'OTP sent successfully.'}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BusinessGSTRequestOTPView(APIView):
    """
    POST /api/business/gst-request/
    Body: {"gstin": "07AAAAA0000A1Z5"}
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if request.user.role != 'business':
            return Response({'error': 'Only business accounts can verify GST.'}, status=status.HTTP_403_FORBIDDEN)
            
        gstin = request.data.get('gstin')
        if not gstin:
            return Response({'error': 'GSTIN is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            ref_id = setu_service.request_gst_otp(gstin)
            return Response({'reference_id': ref_id, 'message': 'OTP sent successfully.'}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class BusinessGSTVerifyOTPView(APIView):
    """
    POST /api/business/gst-verify/
    Verifies the OTP and spawns a new verified BusinessProfile linked to the user.
    Body: {"reference_id": "uuid", "otp": "123456", "gstin": "07AAAAA0000A1Z5", "company_name": "My Agency", "industry": "Marketing"}
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if request.user.role != 'business':
            return Response({'error': 'Only business accounts can verify GST.'}, status=status.HTTP_403_FORBIDDEN)
            
        reference_id = request.data.get('reference_id')
        otp = request.data.get('otp')
        gstin = request.data.get('gstin')
        
        if not all([reference_id, otp, gstin]):
            return Response({'error': 'reference_id, otp, and gstin are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Ensure this GST is not already in use
        if BusinessProfile.objects.filter(gstin=gstin, is_verified=True).exists():
            return Response({'error': 'This GSTIN has already been verified on the platform.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            gst_data = setu_service.verify_gst_otp(reference_id, otp, gstin)
            legal_name = gst_data.get('legalName', 'Verified Business')
            trade_name = gst_data.get('tradeName', legal_name)
            
            company_name = request.data.get('company_name') or trade_name
            industry = request.data.get('industry', 'Other')
            locality = request.data.get('locality', '')
            
            business = BusinessProfile.objects.create(
                user=request.user,
                company_name=company_name,
                industry=industry,
                locality=locality,
                gstin=gstin,
                legal_name=legal_name,
                is_verified=True
            )
            
            return Response(
                BusinessProfileSerializer(business).data, 
                status=status.HTTP_201_CREATED
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Return the updated profile
        from .serializers import InfluencerDetailSerializer
        profile.refresh_from_db()
        return Response(
            {
                'message':   '✓ Instagram account verified successfully!',
                'profile':   InfluencerDetailSerializer(profile).data,
            },
            status=status.HTTP_200_OK,
        )
