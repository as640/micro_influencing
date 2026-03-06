"""
users_and_profiles/models.py

Maps Django models to the pre-existing PostgreSQL tables.
All models use db_table to match the exact table name in the DB.
The initial migration must be applied with: python manage.py migrate --fake-initial
"""

import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


# ---------------------------------------------------------------------------
# Enums (as TextChoices — mirror the PostgreSQL ENUM types exactly)
# ---------------------------------------------------------------------------

class UserRole(models.TextChoices):
    BUSINESS   = 'business',   'Business'
    INFLUENCER = 'influencer', 'Influencer'


class ContractStatus(models.TextChoices):
    PENDING   = 'pending',   'Pending'
    ACTIVE    = 'active',    'Active'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'


class AdType(models.TextChoices):
    POST             = 'post',             'Post'
    REEL             = 'reel',             'Reel'
    STORY            = 'story',            'Story'
    BRAND_AMBASSADOR = 'brand_ambassador', 'Brand Ambassador'


# ---------------------------------------------------------------------------
# Custom User Manager
# ---------------------------------------------------------------------------

class CustomUserManager(BaseUserManager):
    """
    Manager for the CustomUser model that uses 'email' as the unique identifier
    instead of Django's default 'username'.
    """

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('An email address is required.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # Hashes → stored in 'password' column (= password_hash)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.BUSINESS)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


# ---------------------------------------------------------------------------
# 1. Custom User Model  →  maps to: "users"
# ---------------------------------------------------------------------------

class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    Replaces Django's default User.
    - 'password' field from AbstractBaseUser maps to the 'password_hash' column.
      Django stores the hash there; the column is aliased via db_column.
    - 'is_staff' / 'is_superuser' are NOT in the PostgreSQL schema; they are
      Django admin internals. They will exist only in Django's session layer
      (no extra DB columns needed — Django handles this via PermissionsMixin
      which we mark as managed so Django's contrib tables handle it separately).
    """

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email      = models.EmailField(max_length=255, unique=True)
    # AbstractBaseUser provides a 'password' field; we remap it to the correct column
    password   = models.CharField(max_length=255, db_column='password_hash')
    role       = models.CharField(max_length=20, choices=UserRole.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    # Django admin / auth internals (not in your schema but needed for admin panel)
    is_active    = models.BooleanField(default=True)
    is_staff     = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['role']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f'{self.email} ({self.role})'


# ---------------------------------------------------------------------------
# 2. Influencer Profile  →  maps to: "influencer_profiles"
# ---------------------------------------------------------------------------

class InfluencerProfile(models.Model):
    id                   = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user                 = models.OneToOneField(
                               CustomUser,
                               on_delete=models.CASCADE,
                               related_name='influencer_profile',
                               db_column='user_id',
                           )
    instagram_handle     = models.CharField(max_length=255, unique=True)
    category             = models.CharField(max_length=100)   # e.g. 'Gym/Fitness'
    locality             = models.CharField(max_length=100)   # e.g. 'Noida'
    bio                  = models.TextField(blank=True, null=True)

    # Trust & Verification
    is_verified          = models.BooleanField(default=False)

    # Account Stats
    followers_count      = models.IntegerField(default=0)
    following_count      = models.IntegerField(default=0)
    posts_count          = models.IntegerField(default=0)

    # Performance Metrics
    avg_reach            = models.IntegerField(default=0)
    avg_likes_per_post   = models.IntegerField(default=0)
    avg_likes_per_reel   = models.IntegerField(default=0)

    # Demographics (populated via Instagram Graph API)
    follower_gender_ratio = models.JSONField(
        default=dict,
        blank=True,
        help_text='e.g., {"male": 60, "female": 40}'
    )
    follower_age_ratio = models.JSONField(
        default=dict,
        blank=True,
        help_text='e.g., {"13-17": 5, "18-24": 45, "25-34": 30}' # Added age ratio
    )
    top_audience_locality = models.CharField(max_length=255, blank=True)

    # Pricing
    price_min            = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    price_max            = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    # Instagram OAuth token (stored after verification; never exposed in public API)
    instagram_access_token      = models.TextField(blank=True, null=True)
    instagram_token_expires_at  = models.DateTimeField(blank=True, null=True)

    # ---------------------------------------------------------------------------
    # Payout Details (filled by influencer so platform can transfer earnings)
    # ---------------------------------------------------------------------------
    upi_id                  = models.CharField(max_length=100, blank=True, default='',
                                help_text='e.g. name@upi or 9876543210@paytm')
    bank_account_number     = models.CharField(max_length=30,  blank=True, default='')
    bank_ifsc_code          = models.CharField(max_length=15,  blank=True, default='')
    bank_account_holder_name = models.CharField(max_length=120, blank=True, default='')

    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'influencer_profiles'
        verbose_name = 'Influencer Profile'
        verbose_name_plural = 'Influencer Profiles'

    def __str__(self):
        return f'@{self.instagram_handle} — {self.category} ({self.locality})'


# ---------------------------------------------------------------------------
# 3. Business Profile  →  maps to: "business_profiles"
# ---------------------------------------------------------------------------

class BusinessProfile(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user         = models.OneToOneField(
                       CustomUser,
                       on_delete=models.CASCADE,
                       related_name='business_profile',
                       db_column='user_id',
                   )
    company_name = models.CharField(max_length=255)
    industry     = models.CharField(max_length=100)    # e.g. 'Gym'
    locality     = models.CharField(max_length=100, blank=True, null=True)
    website_url  = models.CharField(max_length=255, blank=True, null=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'business_profiles'
        verbose_name = 'Business Profile'
        verbose_name_plural = 'Business Profiles'

    def __str__(self):
        return f'{self.company_name} ({self.industry})'


# ---------------------------------------------------------------------------
# 4. Campaign  →  maps to: "campaigns"
# ---------------------------------------------------------------------------

class Campaign(models.Model):
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business         = models.ForeignKey(
                           BusinessProfile,
                           on_delete=models.CASCADE,
                           related_name='campaigns',
                           db_column='business_id',
                       )
    title            = models.CharField(max_length=255)
    required_ad_type = models.CharField(max_length=30, choices=AdType.choices)

    # Budget
    budget_min       = models.DecimalField(max_digits=10, decimal_places=2)
    budget_max       = models.DecimalField(max_digits=10, decimal_places=2)

    description      = models.TextField(blank=True, null=True)
    is_active        = models.BooleanField(default=True)

    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'campaigns'
        verbose_name = 'Campaign'
        verbose_name_plural = 'Campaigns'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} [{self.required_ad_type}] — {self.business.company_name}'


# ---------------------------------------------------------------------------
# 5. Conversation  →  maps to: "conversations"
# ---------------------------------------------------------------------------

class Conversation(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business     = models.ForeignKey(
                       BusinessProfile,
                       on_delete=models.CASCADE,
                       related_name='conversations',
                       db_column='business_id',
                   )
    influencer   = models.ForeignKey(
                       InfluencerProfile,
                       on_delete=models.CASCADE,
                       related_name='conversations',
                       db_column='influencer_id',
                   )
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'conversations'
        verbose_name = 'Conversation'
        verbose_name_plural = 'Conversations'
        # Mirror the UNIQUE(business_id, influencer_id) constraint
        unique_together = [('business', 'influencer')]

    def __str__(self):
        return f'Chat: {self.business.company_name} ↔ @{self.influencer.instagram_handle}'


# ---------------------------------------------------------------------------
# 6. Message  →  maps to: "messages"
# ---------------------------------------------------------------------------

class Message(models.Model):
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation    = models.ForeignKey(
                          Conversation,
                          on_delete=models.CASCADE,
                          related_name='messages',
                          db_column='conversation_id',
                      )
    sender          = models.ForeignKey(
                          CustomUser,
                          on_delete=models.CASCADE,
                          related_name='sent_messages',
                          db_column='sender_id',
                      )
    content         = models.TextField()
    is_read         = models.BooleanField(default=False)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'messages'
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'
        ordering = ['created_at']

    def __str__(self):
        return f'Msg from {self.sender.email} @ {self.created_at:%Y-%m-%d %H:%M}'


# ---------------------------------------------------------------------------
# 7. Contract  →  maps to: "contracts"
# ---------------------------------------------------------------------------

class Contract(models.Model):
    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business          = models.ForeignKey(
                            BusinessProfile,
                            on_delete=models.RESTRICT,
                            related_name='contracts',
                            db_column='business_id',
                        )
    influencer        = models.ForeignKey(
                            InfluencerProfile,
                            on_delete=models.RESTRICT,
                            related_name='contracts',
                            db_column='influencer_id',
                        )
    campaign          = models.ForeignKey(
                            Campaign,
                            on_delete=models.SET_NULL,
                            related_name='contracts',
                            blank=True,
                            null=True,
                            db_column='campaign_id',
                        )
    status            = models.CharField(
                            max_length=20,
                            choices=ContractStatus.choices,
                            default=ContractStatus.PENDING,
                        )
    agreed_price      = models.DecimalField(max_digits=10, decimal_places=2)
    deliverables      = models.TextField()
    payment_intent_id = models.CharField(max_length=255, blank=True, null=True)

    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'contracts'
        verbose_name = 'Contract'
        verbose_name_plural = 'Contracts'
        ordering = ['-created_at']

    def __str__(self):
        return (
            f'Contract #{self.id} | {self.business.company_name} ↔ '
            f'@{self.influencer.instagram_handle} [{self.status}]'
        )
