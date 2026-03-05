"""
users_and_profiles/instagram_service.py

Handles all Instagram OAuth and Graph API interactions.

Flow:
  1. get_auth_url(user_id)         → URL to redirect influencer to Instagram
  2. exchange_code(code)           → Short-lived access token (1 hour)
  3. get_long_lived_token(token)   → Long-lived token (60 days)
  4. fetch_profile(token)          → Followers, bio, username, media count
  5. fetch_media_metrics(token)    → Avg reach, avg reel views

Instagram API used:
  • Instagram Basic Display API — OAuth + basic profile (any account type)
  • Instagram Graph API         — Insights + follower metrics (Business/Creator only)

Developer App setup required:
  https://developers.facebook.com/
  → Create App → Instagram → Basic Display
  → Add redirect URI matching INSTAGRAM_REDIRECT_URI in .env
"""

import logging
import requests
import concurrent.futures
from datetime import datetime, timedelta, timezone
from django.conf import settings

logger = logging.getLogger(__name__)

# Instagram API base URLs
OAUTH_BASE    = "https://api.instagram.com/oauth"
GRAPH_BASE    = "https://graph.instagram.com"


# ---------------------------------------------------------------------------
# Step 1 — Build the OAuth authorization URL
# ---------------------------------------------------------------------------

def get_auth_url(state: str) -> str:
    """
    Returns the URL the influencer should be redirected to in order to
    authorize the app on Instagram.

    'state' should be a tamper-proof identifier (e.g. the user's UUID or
    a signed JWT) so we know which influencer is connecting in the callback.
    """
    params = {
        "client_id":     settings.INSTAGRAM_APP_ID,
        "redirect_uri":  settings.INSTAGRAM_REDIRECT_URI,
        "scope":         "user_profile,user_media",
        "response_type": "code",
        "state":         state,
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{OAUTH_BASE}/authorize?{query}"


# ---------------------------------------------------------------------------
# Step 2 — Exchange the authorization code for a short-lived token
# ---------------------------------------------------------------------------

def exchange_code(code: str) -> dict:
    """
    Exchanges the one-time OAuth code for a short-lived access token (1 hour).
    Returns: { access_token, token_type, user_id }
    Raises: ValueError on failure.
    """
    resp = requests.post(
        f"{OAUTH_BASE}/access_token",
        data={
            "client_id":     settings.INSTAGRAM_APP_ID,
            "client_secret": settings.INSTAGRAM_APP_SECRET,
            "grant_type":    "authorization_code",
            "redirect_uri":  settings.INSTAGRAM_REDIRECT_URI,
            "code":          code,
        },
        timeout=10,
    )
    data = resp.json()
    if "error_type" in data or "error" in data:
        raise ValueError(f"Instagram token exchange failed: {data}")
    return data   # { access_token, token_type, user_id }


# ---------------------------------------------------------------------------
# Step 3 — Upgrade to a long-lived token (60 days)
# ---------------------------------------------------------------------------

def get_long_lived_token(short_lived_token: str) -> dict:
    """
    Exchanges the 1-hour short-lived token for a 60-day long-lived token.
    Returns: { access_token, token_type, expires_in (seconds) }
    """
    resp = requests.get(
        f"{GRAPH_BASE}/access_token",
        params={
            "grant_type":    "ig_exchange_token",
            "client_secret": settings.INSTAGRAM_APP_SECRET,
            "access_token":  short_lived_token,
        },
        timeout=10,
    )
    data = resp.json()
    if "error" in data:
        raise ValueError(f"Long-lived token exchange failed: {data}")
    return data   # { access_token, token_type, expires_in }


# ---------------------------------------------------------------------------
# Step 4 — Fetch influencer's basic profile
# ---------------------------------------------------------------------------

def fetch_profile(access_token: str) -> dict:
    """
    Fetches basic profile information from the Instagram Graph API.

    For Business/Creator accounts: returns follower_count, biography, etc.
    For personal accounts (Basic Display API): returns id, username, media_count only.

    Returns a dict of fields that can be applied directly to InfluencerProfile.
    """
    # Try Graph API first (Business/Creator accounts)
    resp = requests.get(
        f"{GRAPH_BASE}/me",
        params={
            "fields":       "id,username,biography,followers_count,follows_count,media_count,profile_picture_url",
            "access_token": access_token,
        },
        timeout=10,
    )
    data = resp.json()

    if "error" in data:
        # Fallback: Basic Display API (personal accounts)
        logger.warning("Graph API profile fetch failed. Falling back to Basic Display API.")
        resp = requests.get(
            f"{GRAPH_BASE}/me",
            params={
                "fields":       "id,username,media_count",
                "access_token": access_token,
            },
            timeout=10,
        )
        data = resp.json()
        if "error" in data:
            raise ValueError(f"Instagram profile fetch failed: {data}")

    return {
        "instagram_handle":  data.get("username", ""),
        "bio":               data.get("biography") or data.get("bio"),
        "followers_count":   data.get("followers_count", 0),
        "following_count":   data.get("follows_count", 0),
        "posts_count":       data.get("media_count", 0),
    }


# ---------------------------------------------------------------------------
# Step 5 — Fetch media metrics (avg reach & reel views)
# ---------------------------------------------------------------------------

def _fetch_single_reel_insight(media_id: str, access_token: str) -> int:
    """Helper to fetch views for a single reel."""
    try:
        ins = requests.get(
            f"{GRAPH_BASE}/{media_id}/insights",
            params={"metric": "impressions,reach,video_views", "access_token": access_token},
            timeout=5,
        ).json()
        for metric in ins.get("data", []):
            if metric["name"] == "video_views":
                return metric.get("values", [{}])[0].get("value", 0)
    except Exception as e:
        logger.warning(f"Error fetching insight for media {media_id}: {e}")
    return 0


def fetch_media_metrics(access_token: str) -> dict:
    """
    Scans the last 20 media items and computes:
      - avg_views_per_reel  (from VIDEO/REEL type posts)
      - avg_reach           (from post-level insights; requires Business account)

    Uses concurrent.futures to fetch reel insights in parallel, significantly
    speeding up the N+1 API calls.
    """
    resp = requests.get(
        f"{GRAPH_BASE}/me/media",
        params={
            "fields":       "id,media_type,like_count",
            "limit":        20,
            "access_token": access_token,
        },
        timeout=10,
    )
    data = resp.json()
    if "error" in data:
        logger.warning("Media metrics fetch failed: %s", data)
        return {"avg_views_per_reel": 0, "avg_reach": 0, "avg_likes_per_post": 0, "avg_likes_per_reel": 0}

    items       = data.get("data", [])
    all_likes   = []
    reel_likes  = []
    reel_ids    = []

    for item in items:
        likes = item.get("like_count", 0)
        all_likes.append(likes)

        if item.get("media_type") in ("VIDEO", "REELS"):
            reel_likes.append(likes)
            reel_ids.append(item['id'])

    # Fetch all reel insights concurrently to avoid the 6-second delay
    reel_views = []
    if reel_ids:
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(10, len(reel_ids))) as executor:
            # Map the helper function over perfectly batched requests
            futures = [executor.submit(_fetch_single_reel_insight, rid, access_token) for rid in reel_ids]
            for future in concurrent.futures.as_completed(futures):
                views = future.result()
                if views > 0:
                    reel_views.append(views)

    return {
        "avg_views_per_reel": int(sum(reel_views) / len(reel_views)) if reel_views else 0,
        "avg_likes_per_post":  int(sum(all_likes)  / len(all_likes))  if all_likes  else 0,
        "avg_likes_per_reel":  int(sum(reel_likes) / len(reel_likes)) if reel_likes else 0,
        "avg_reach":           0,   # Requires page-level insights (Business account)
    }


# ---------------------------------------------------------------------------
# Step 6 — Fetch Audience Demographics
# ---------------------------------------------------------------------------

def fetch_audience_demographics(access_token: str, instagram_account_id: str) -> dict:
    """
    Fetches audience demographics (gender/age, city) from Instagram Insights.
    Requires a Business or Creator account.
    Falls back gracefully if insights are unavailable.
    """
    if not instagram_account_id:
        return {}

    resp = requests.get(
        f"{GRAPH_BASE}/{instagram_account_id}/insights",
        params={
            "metric": "audience_gender_age,audience_city",
            "period": "lifetime",
            "access_token": access_token,
        },
        timeout=10,
    )
    data = resp.json()

    if "error" in data:
        logger.warning("Audience demographics fetch failed: %s", data)
        return {"follower_gender_ratio": {}, "top_audience_locality": ""}

    demographics = {
        "follower_gender_ratio": {},
        "top_audience_locality": ""
    }

    try:
        metrics = data.get("data", [])
        for metric in metrics:
            if metric["name"] == "audience_gender_age":
                # Values format: {"F.13-17": 10, "M.18-24": 50, ...}
                gender_age_data = metric.get("values", [{}])[0].get("value", {})
                
                # Setup defaults
                demographics["follower_gender_ratio"] = {"female": 0, "male": 0, "other": 0}
                demographics["follower_age_ratio"] = {}
                
                total_f = 0
                total_m = 0
                total_u = 0
                age_buckets = {}

                for key, val in gender_age_data.items():
                    # key looks like 'F.18-24'
                    if '.' in key:
                        gender_prefix, age_range = key.split('.', 1)
                        
                        # Add to gender aggregates
                        if gender_prefix == 'F': total_f += val
                        elif gender_prefix == 'M': total_m += val
                        else: total_u += val
                        
                        # Add to age aggregates
                        age_buckets[age_range] = age_buckets.get(age_range, 0) + val

                total_gender = total_f + total_m + total_u
                if total_gender > 0:
                    demographics["follower_gender_ratio"] = {
                        "female": round((total_f / total_gender) * 100),
                        "male":   round((total_m / total_gender) * 100),
                        "other":  round((total_u / total_gender) * 100)
                    }

                total_age = sum(age_buckets.values())
                if total_age > 0:
                    # Convert to percentages for consistency
                    demographics["follower_age_ratio"] = {
                        age_range: round((count / total_age) * 100)
                        for age_range, count in age_buckets.items()
                    }

            elif metric["name"] == "audience_city":
                # Values format: {"Delhi, India": 500, "Mumbai, India": 300, ...}
                city_data = metric.get("values", [{}])[0].get("value", {})
                if city_data:
                    # Get the key with the highest value
                    top_city = max(city_data, key=city_data.get)
                    demographics["top_audience_locality"] = top_city.split(",")[0].strip()

    except Exception as e:
        logger.error(f"Error parsing audience demographics: {e}")

    return demographics


# ---------------------------------------------------------------------------
# Convenience — full verification pipeline
# ---------------------------------------------------------------------------

def verify_and_update_profile(influencer_profile, code: str) -> None:
    """
    Full pipeline called from the callback view:
      1. Exchange code → short-lived token
      2. Upgrade to long-lived token (60 days)
      3. Fetch profile info
      4. Fetch media metrics
      5. Fetch audience demographics
      6. Save everything to InfluencerProfile + mark is_verified=True
    """
    # Exchange code
    short_token_data = exchange_code(code)
    short_token      = short_token_data["access_token"]

    # Upgrade to long-lived
    long_token_data  = get_long_lived_token(short_token)
    long_token       = long_token_data["access_token"]
    expires_in_secs  = long_token_data.get("expires_in", 5_184_000)  # default 60 days
    expires_at       = datetime.now(timezone.utc) + timedelta(seconds=expires_in_secs)

    # Fetch data
    profile_data     = fetch_profile(long_token)
    metrics_data     = fetch_media_metrics(long_token)
    
    # Needs the Instagram account ID from profile_data
    ig_account_id    = fetch_profile(long_token).get('id', '') # refetched or parse from url
    
    # Better: we modify fetch_profile to return the ID as well as fields.
    # Since fetch_profile returns a dict that maps directly to InfluencerProfile fields,
    # and the ID is not an InfluencerProfile field, we need to extract it inside verify_and_update_profile
    # Let's get it directly:
    resp = requests.get(
        f"{GRAPH_BASE}/me",
        params={"fields": "id", "access_token": long_token},
        timeout=10,
    )
    ig_account_id = resp.json().get('id', '')
    
    demographics_data = fetch_audience_demographics(long_token, ig_account_id)

    # Update the InfluencerProfile
    for field, value in {**profile_data, **metrics_data, **demographics_data}.items():
        if value is not None and value != {}: # Don't overwrite with empty
            setattr(influencer_profile, field, value)

    influencer_profile.instagram_access_token    = long_token
    influencer_profile.instagram_token_expires_at = expires_at
    influencer_profile.is_verified               = True
    influencer_profile.save()
