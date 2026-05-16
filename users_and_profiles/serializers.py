"""
users_and_profiles/serializers.py

Handles validation and data transformation for:
  - User registration (business + influencer, creates profile automatically)
  - JWT login
  - Current user ("me") response
"""

from django.contrib.auth import authenticate
from django.db import transaction
from rest_framework import serializers
from .models import (
    CustomUser, UserRole,
    InfluencerProfile,
    BusinessProfile,
    Campaign, CampaignInterest, CampaignInterestStatus,
    Conversation,
    Message,
    Contract,
    ContractStatus,
)


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

class RegisterSerializer(serializers.ModelSerializer):
    """
    Registers a new user and automatically creates their profile stub.

    Required for both roles:
        email, password, role

    Required only for role='influencer':
        instagram_handle, category, locality

    Required only for role='business':
        company_name, industry
    """
    password = serializers.CharField(write_only=True, min_length=8)

    # Influencer-specific (optional at serializer level — validated in validate())
    instagram_handle = serializers.CharField(max_length=255, required=False)
    category         = serializers.CharField(max_length=100,  required=False)
    locality         = serializers.CharField(max_length=100,  required=False)

    # Business-specific
    company_name     = serializers.CharField(max_length=255, required=False)
    industry         = serializers.CharField(max_length=100,  required=False)
    gstin            = serializers.CharField(max_length=15, required=False)
    reference_id     = serializers.CharField(required=False)
    otp              = serializers.CharField(max_length=6, required=False)

    class Meta:
        model  = CustomUser
        fields = ['email', 'password', 'role',
                  # influencer
                  'instagram_handle', 'category', 'locality',
                  # business
                  'company_name', 'industry', 'gstin', 'reference_id', 'otp']

    def validate(self, attrs):
        role = attrs.get('role')

        if role == UserRole.INFLUENCER:
            for field in ['instagram_handle', 'category', 'locality']:
                if not attrs.get(field):
                    raise serializers.ValidationError(
                        {field: f'Required for influencers.'}
                    )

        elif role == UserRole.BUSINESS:
            for field in ['gstin', 'reference_id', 'otp']:
                if not attrs.get(field):
                    raise serializers.ValidationError(
                        {field: f'GST verification required for business registration.'}
                    )
            
            # Ensure GSTIN uniqueness before hitting the Setu API
            gstin = attrs['gstin']
            if BusinessProfile.objects.filter(gstin=gstin).exists():
                raise serializers.ValidationError(
                    {'gstin': 'This GST number is already registered to another business account.'}
                )
            
            # Execute synchronous GST Auth call to block unauthorized CustomUser creations
            from . import setu_service
            try:
                gst_data = setu_service.verify_gst_otp(
                    reference_id=attrs['reference_id'],
                    otp=attrs['otp'],
                    gstin=attrs['gstin']
                )
                # Pass legal_name down to create()
                attrs['legal_name'] = gst_data.get('legalName', 'Verified Business')
            except ValueError as e:
                raise serializers.ValidationError({'otp': str(e)})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        # Prevent temporary state bugs
        legal_name       = validated_data.pop('legal_name', None)
        gstin            = validated_data.pop('gstin', None)
        validated_data.pop('reference_id', None)
        validated_data.pop('otp', None)
        
        # Pop profile fields before creating the user
        instagram_handle = validated_data.pop('instagram_handle', None)
        category         = validated_data.pop('category', None)
        locality         = validated_data.pop('locality', '')
        company_name     = validated_data.pop('company_name', None)
        industry         = validated_data.pop('industry', 'Other')

        password = validated_data.pop('password')
        user     = CustomUser(**validated_data)
        user.set_password(password)
        user.save()

        if user.role == UserRole.INFLUENCER:
            InfluencerProfile.objects.create(
                user=user,
                instagram_handle=instagram_handle,
                category=category,
                locality=locality,
            )
        elif user.role == UserRole.BUSINESS:
            BusinessProfile.objects.create(
                user=user,
                company_name=company_name or legal_name,
                industry=industry,
                locality=locality,
                gstin=gstin,
                legal_name=legal_name,
                is_verified=True
            )

        return user


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get('request'),
            username=attrs['email'],   # USERNAME_FIELD = 'email'
            password=attrs['password'],
        )
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('This account has been deactivated.')
        attrs['user'] = user
        return attrs


# ---------------------------------------------------------------------------
# Current User ("Me")
# ---------------------------------------------------------------------------

# Word-match helper — Jaccard token similarity
# -----------------------------------------------
def _word_match_category(raw: str, standards: list) -> str:
    """
    Returns the closest standard category for a user-typed string
    using Jaccard token similarity. Falls back to 'other' if no
    match reaches the threshold.
    """
    tokens_raw = set(raw.lower().split())
    best, best_score = 'other', 0.0
    for cat in standards:
        tokens_cat = set(cat.lower().replace('_', ' ').split())
        intersection = tokens_raw & tokens_cat
        union = tokens_raw | tokens_cat
        if not union:
            continue
        score = len(intersection) / len(union)
        if score > best_score:
            best_score = score
            best = cat
    return best if best_score >= 0.25 else 'other'


STANDARD_CATEGORIES = [
    'lifestyle', 'fitness', 'food', 'tech', 'fashion',
    'travel', 'beauty', 'gaming', 'education', 'finance',
    'health', 'entertainment', 'sports', 'music', 'art',
    'photography', 'parenting', 'business', 'skincare', 'other',
]


class InfluencerProfileSerializer(serializers.ModelSerializer):
    profile_completion_pct = serializers.SerializerMethodField()

    class Meta:
        model  = InfluencerProfile
        exclude = ['user']

    def get_profile_completion_pct(self, obj):
        """Returns 0-100. Criteria: handle, category, locality, bio, price_min+price_max, is_verified."""
        fields_checked = [
            bool(obj.instagram_handle),
            bool(obj.category),
            bool(obj.locality),
            bool(obj.bio),
            obj.price_min is not None and obj.price_max is not None,
            obj.is_verified,
        ]
        filled = sum(1 for f in fields_checked if f)
        return round(filled / len(fields_checked) * 100)

    def validate_custom_category(self, value):
        """If user typed a custom category, word-match it and store the normalised version in category."""
        return value  # raw stored; normalisation happens in update()

    def update(self, instance, validated_data):
        custom_cat = validated_data.get('custom_category', '')
        if custom_cat and not validated_data.get('category'):
            # Auto-classify via word-match
            validated_data['category'] = _word_match_category(custom_cat, STANDARD_CATEGORIES)
        return super().update(instance, validated_data)


class BusinessProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BusinessProfile
        exclude = ['user']


class UserMeSerializer(serializers.ModelSerializer):
    """Returns the current authenticated user + their profile."""
    influencer_profile = InfluencerProfileSerializer(read_only=True)
    business_profiles  = BusinessProfileSerializer(many=True, read_only=True)

    class Meta:
        model  = CustomUser
        fields = ['id', 'email', 'role', 'created_at', 'is_superuser',
                  'profile_picture', 'influencer_profile', 'business_profiles']


# ---------------------------------------------------------------------------
# Discovery — Influencer Serializers
# ---------------------------------------------------------------------------

class InfluencerListSerializer(serializers.ModelSerializer):
    """
    Compact card shown in the influencer search grid.
    Includes only the fields a business needs to scan quickly.
    """
    email = serializers.EmailField(source='user.email', read_only=True)
    profile_picture = serializers.ImageField(source='user.profile_picture', read_only=True)
    profile_completion_pct = serializers.SerializerMethodField()

    class Meta:
        model  = InfluencerProfile
        fields = [
            'id', 'email', 'profile_picture', 'instagram_handle', 'category', 'locality',
            'is_verified', 'followers_count', 'avg_reach',
            'avg_likes_per_reel', 'price_min', 'price_max',
            'profile_completion_pct',
        ]

    def get_profile_completion_pct(self, obj):
        fields_checked = [
            bool(obj.instagram_handle),
            bool(obj.category),
            bool(obj.locality),
            bool(obj.bio),
            obj.price_min is not None and obj.price_max is not None,
            obj.is_verified,
        ]
        filled = sum(1 for f in fields_checked if f)
        return round(filled / len(fields_checked) * 100)


class InfluencerDetailSerializer(serializers.ModelSerializer):
    """
    Full influencer profile — all metrics, shown on public profile page.
    """
    email = serializers.EmailField(source='user.email', read_only=True)
    profile_picture = serializers.ImageField(source='user.profile_picture', read_only=True)

    class Meta:
        model  = InfluencerProfile
        fields = [
            'id', 'email', 'profile_picture',
            'instagram_handle', 'category', 'locality', 'bio',
            'is_verified',
            # Stats
            'followers_count', 'following_count', 'posts_count',
            # Performance metrics
            'avg_reach', 'avg_likes_per_post', 'avg_likes_per_reel',
            # Audience demographics (from Instagram verification)
            'follower_gender_ratio', 'follower_age_ratio', 'top_audience_locality',
            # Pricing
            'price_min', 'price_max',
            'updated_at',
        ]


# ---------------------------------------------------------------------------
# Discovery — Campaign Serializers
# ---------------------------------------------------------------------------

class BusinessProfilePublicSerializer(serializers.ModelSerializer):
    """Minimal business info shown inside a campaign card."""
    profile_picture = serializers.ImageField(source='user.profile_picture', read_only=True)

    class Meta:
        model  = BusinessProfile
        fields = ['id', 'profile_picture', 'company_name', 'industry', 'locality']


class CampaignSerializer(serializers.ModelSerializer):
    """
    Serializer for Campaigns.
    - GET  → includes nested business info
    - POST → business is auto-set from the authenticated user
    """
    # Read-only nested field shown in listing/detail
    business_info = BusinessProfilePublicSerializer(
        source='business', read_only=True
    )
    interests_count = serializers.SerializerMethodField()

    class Meta:
        model  = Campaign
        fields = [
            'id', 'title', 'required_ad_type',
            'budget_min', 'budget_max', 'description',
            'is_active', 'created_at', 'updated_at',
            # nested
            'business', 'business_info', 'interests_count'
        ]
        extra_kwargs = {
            # 'business' is write-only (we set it from the view via request.user)
            'business':    {'write_only': True, 'required': False},
            'is_active':   {'required': False},
            'description': {'required': False},
        }

    def get_interests_count(self, obj):
        return obj.interests.count()


# ---------------------------------------------------------------------------
# Messaging — Serializers
# ---------------------------------------------------------------------------

class MessageSerializer(serializers.ModelSerializer):
    """
    A single chat message.
    Includes sender's email + role for display in the inbox.
    """
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    sender_role  = serializers.CharField(source='sender.role',  read_only=True)

    class Meta:
        model  = Message
        fields = [
            'id', 'conversation',
            'sender', 'sender_email', 'sender_role',
            'content', 'is_read', 'created_at',
        ]
        extra_kwargs = {
            'conversation': {'write_only': True},
            'sender':       {'write_only': True},
        }


class ConversationSerializer(serializers.ModelSerializer):
    """
    Compact conversation card shown in the inbox thread list.
    Shows participants and an unread message count.
    """
    # Surfaced info for each party
    business_name      = serializers.CharField(source='business.company_name',        read_only=True)
    influencer_handle  = serializers.CharField(source='influencer.instagram_handle',  read_only=True)
    business_picture   = serializers.ImageField(source='business.user.profile_picture', read_only=True)
    influencer_picture = serializers.ImageField(source='influencer.user.profile_picture', read_only=True)
    # Expose IDs as readable fields (FK fields themselves are write-only)
    influencer_id      = serializers.UUIDField(source='influencer.id', read_only=True)
    business_id        = serializers.UUIDField(source='business.id',   read_only=True)
    unread_count       = serializers.SerializerMethodField()
    last_message       = serializers.SerializerMethodField()

    class Meta:
        model  = Conversation
        fields = [
            'id', 'created_at',
            'business', 'business_name', 'business_id', 'business_picture',
            'influencer', 'influencer_handle', 'influencer_id', 'influencer_picture',
            'unread_count', 'last_message',
        ]
        extra_kwargs = {
            'business':   {'write_only': True},
            'influencer': {'write_only': True},
        }

    def get_unread_count(self, obj):
        """Count messages NOT sent by the current user that are unread."""
        request = self.context.get('request')
        if not request:
            return 0
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        if not msg:
            return None
        return {
            'content':    msg.content[:80] + ('…' if len(msg.content) > 80 else ''),
            'sender_email': msg.sender.email,
            'created_at': msg.created_at,
        }


class ConversationDetailSerializer(ConversationSerializer):
    """
    Full conversation view — all fields from ConversationSerializer
    plus the complete message thread.
    """
    messages = MessageSerializer(many=True, read_only=True)

    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + ['messages']


# ---------------------------------------------------------------------------
# Contracts — Serializers
# ---------------------------------------------------------------------------

class ContractSerializer(serializers.ModelSerializer):
    """
    Used for both creating and reading contracts.

    On write (POST):
        Required: influencer_id, agreed_price, deliverables
        Optional: campaign_id

    On read (GET):
        Returns nested business + influencer info alongside all contract fields.
    """
    # Nested read-only display fields
    business_name      = serializers.CharField(source='business.company_name',        read_only=True)
    influencer_handle  = serializers.CharField(source='influencer.instagram_handle',  read_only=True)
    business_picture   = serializers.ImageField(source='business.user.profile_picture', read_only=True)
    influencer_picture = serializers.ImageField(source='influencer.user.profile_picture', read_only=True)
    campaign_title     = serializers.CharField(source='campaign.title', default=None, read_only=True)
    has_open_dispute   = serializers.SerializerMethodField()
    display_number     = serializers.CharField(read_only=True)

    class Meta:
        model  = Contract
        fields = [
            'id', 'contract_number', 'display_number', 'status', 'has_open_dispute',
            'agreed_price', 'deliverables', 'payment_intent_id', 'payout_transfer_id',
            'escrow_opted', 'deadline_at', 'completion_deadline',
            'created_at', 'updated_at',
            # write-only FKs
            'business', 'influencer', 'campaign',
            # read-only display
            'business_name', 'influencer_handle', 'business_picture', 'influencer_picture', 'campaign_title',
        ]
        extra_kwargs = {
            'business':          {'write_only': True, 'required': False},
            'influencer':        {'write_only': True},
            'campaign':          {'write_only': True, 'required': False},
            'payment_intent_id': {'required': False},
            'status':            {'required': False},
            'escrow_opted':      {'required': False},
            'deadline_at':       {'required': False, 'read_only': True},
            'completion_deadline': {'required': False},
        }

    def get_has_open_dispute(self, obj):
        # Prevent N+1 issues if preferred, but since it's a small list this is fine
        return obj.disputes.filter(status='open').exists()

# ---------------------------------------------------------------------------
# Password Reset
# ---------------------------------------------------------------------------

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user found with this email.")
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True, min_length=8)


# ---------------------------------------------------------------------------
# Disputes
# ---------------------------------------------------------------------------

class DisputeSerializer(serializers.ModelSerializer):
    raised_by_email       = serializers.EmailField(source='raised_by.email',            read_only=True)
    business_name         = serializers.CharField(source='contract.business.company_name', read_only=True)
    influencer_handle     = serializers.CharField(source='contract.influencer.instagram_handle', read_only=True)
    resolved_by_email     = serializers.EmailField(source='resolved_by.email', default=None, read_only=True)

    class Meta:
        from .models import Dispute
        model  = Dispute
        fields = [
            'id', 'contract', 'raised_by', 'raised_by_email',
            'business_name', 'influencer_handle',
            'reason', 'status', 'resolution_note',
            'resolved_by', 'resolved_by_email',
            'created_at', 'resolved_at',
        ]
        extra_kwargs = {
            'raised_by':  {'read_only': True},
            'resolved_by': {'read_only': True},
            'status':     {'read_only': True},
            'resolved_at': {'read_only': True},
        }


# ---------------------------------------------------------------------------
# Campaign Interest
# ---------------------------------------------------------------------------

class CampaignInterestSerializer(serializers.ModelSerializer):
    influencer_handle  = serializers.CharField(source='influencer.instagram_handle', read_only=True)
    influencer_picture = serializers.ImageField(source='influencer.user.profile_picture', read_only=True)
    influencer_id      = serializers.UUIDField(source='influencer.id', read_only=True)
    followers_count    = serializers.IntegerField(source='influencer.followers_count', read_only=True)
    category           = serializers.CharField(source='influencer.category', read_only=True)
    locality           = serializers.CharField(source='influencer.locality', read_only=True)
    price_min          = serializers.DecimalField(source='influencer.price_min', max_digits=10, decimal_places=2, read_only=True)
    price_max          = serializers.DecimalField(source='influencer.price_max', max_digits=10, decimal_places=2, read_only=True)
    campaign_title     = serializers.CharField(source='campaign.title', read_only=True)
    campaign_id        = serializers.UUIDField(source='campaign.id', read_only=True)
    business_id        = serializers.UUIDField(source='campaign.business.id', read_only=True)

    class Meta:
        model  = CampaignInterest
        fields = [
            'id', 'status', 'note', 'created_at', 'updated_at',
            # campaign
            'campaign', 'campaign_id', 'campaign_title', 'business_id',
            # influencer
            'influencer', 'influencer_id', 'influencer_handle',
            'influencer_picture', 'followers_count', 'category', 'locality',
            'price_min', 'price_max',
        ]
        extra_kwargs = {
            'campaign':   {'write_only': True, 'required': False},
            'influencer': {'write_only': True, 'required': False},
            'status':     {'required': False},
        }

