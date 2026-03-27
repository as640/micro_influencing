"""
users_and_profiles/instagram_service.py

Instagram Login + Graph API helpers for professional Instagram accounts.
"""

import concurrent.futures
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

API_VERSION = "v21.0"
AUTH_BASE = "https://www.instagram.com/oauth"
TOKEN_BASE = "https://api.instagram.com/oauth"
GRAPH_BASE = f"https://graph.instagram.com/{API_VERSION}"
INSTAGRAM_LOGIN_SCOPES = (
    "instagram_business_basic",
    "instagram_business_manage_insights",
)


def _parse_response(response: requests.Response, action: str) -> dict:
    """Decode a JSON response and raise a helpful error on failure."""
    try:
        data = response.json()
    except ValueError as exc:
        response.raise_for_status()
        raise ValueError(f"{action} failed: non-JSON response from Instagram.") from exc

    if response.ok and "error" not in data and "error_type" not in data:
        return data

    raise ValueError(f"{action} failed: {data}")


def get_auth_url(state: str) -> str:
    """
    Return the Instagram Login authorization URL.

    The state value should identify the logged-in influencer in a tamper-proof
    way so the callback can be matched back to the correct user session.
    """
    params = {
        "client_id": settings.INSTAGRAM_APP_ID,
        "redirect_uri": settings.INSTAGRAM_REDIRECT_URI,
        "scope": ",".join(INSTAGRAM_LOGIN_SCOPES),
        "response_type": "code",
        "state": state,
    }
    return f"{AUTH_BASE}/authorize?{urlencode(params)}"


def exchange_code(code: str) -> dict:
    """Exchange the authorization code for a short-lived access token."""
    response = requests.post(
        f"{TOKEN_BASE}/access_token",
        data={
            "client_id": settings.INSTAGRAM_APP_ID,
            "client_secret": settings.INSTAGRAM_APP_SECRET,
            "grant_type": "authorization_code",
            "redirect_uri": settings.INSTAGRAM_REDIRECT_URI,
            "code": code,
        },
        timeout=10,
    )
    return _parse_response(response, "Instagram token exchange")


def get_long_lived_token(short_lived_token: str) -> dict:
    """Exchange the short-lived token for a long-lived token."""
    response = requests.get(
        f"{GRAPH_BASE}/access_token",
        params={
            "grant_type": "ig_exchange_token",
            "client_secret": settings.INSTAGRAM_APP_SECRET,
            "access_token": short_lived_token,
        },
        timeout=10,
    )
    return _parse_response(response, "Instagram long-lived token exchange")


def fetch_profile(access_token: str) -> tuple[str, dict]:
    """
    Fetch the connected professional account ID and profile summary fields.

    Returns:
      (instagram_user_id, influencer_profile_fields)
    """
    response = requests.get(
        f"{GRAPH_BASE}/me",
        params={
            "fields": (
                "id,user_id,username,name,account_type,"
                "profile_picture_url,followers_count,follows_count,media_count"
            ),
            "access_token": access_token,
        },
        timeout=10,
    )
    data = _parse_response(response, "Instagram profile fetch")

    instagram_user_id = data.get("user_id") or data.get("id") or ""
    profile_fields = {
        "instagram_handle": data.get("username", ""),
        "followers_count": data.get("followers_count", 0) or 0,
        "following_count": data.get("follows_count", 0) or 0,
        "posts_count": data.get("media_count", 0) or 0,
    }
    return instagram_user_id, profile_fields


def _extract_metric_values(data: dict) -> dict:
    metrics = {}
    for metric in data.get("data", []):
        values = metric.get("values") or []
        if values:
            metrics[metric["name"]] = values[0].get("value", 0)
    return metrics


def _fetch_single_media_insight(media_item: dict, access_token: str) -> dict:
    """Fetch reach and, when supported, views for a single media item."""
    media_id = media_item["id"]
    metric_names = ["reach"]
    if media_item.get("media_type") == "VIDEO" or media_item.get("media_product_type") == "REELS":
        metric_names.insert(0, "views")

    try:
        response = requests.get(
            f"{GRAPH_BASE}/{media_id}/insights",
            params={"metric": ",".join(metric_names), "access_token": access_token},
            timeout=5,
        )
        data = _parse_response(response, f"Instagram media insight fetch for {media_id}")
        return _extract_metric_values(data)
    except Exception as exc:
        logger.warning("Error fetching insight for media %s: %s", media_id, exc)
        return {}


def fetch_media_metrics(access_token: str, instagram_user_id: str) -> dict:
    """
    Scan recent media and compute average likes, reach, and views.
    """
    if not instagram_user_id:
        return {
            "avg_views_per_reel": 0,
            "avg_reach": 0,
            "avg_likes_per_post": 0,
            "avg_likes_per_reel": 0,
        }

    response = requests.get(
        f"{GRAPH_BASE}/{instagram_user_id}/media",
        params={
            "fields": "id,media_type,media_product_type,like_count",
            "limit": 20,
            "access_token": access_token,
        },
        timeout=10,
    )

    try:
        data = _parse_response(response, "Instagram media list fetch")
    except ValueError as exc:
        logger.warning("Media metrics fetch failed: %s", exc)
        return {
            "avg_views_per_reel": 0,
            "avg_reach": 0,
            "avg_likes_per_post": 0,
            "avg_likes_per_reel": 0,
        }

    items = data.get("data", [])
    all_likes = []
    reel_likes = []
    insight_candidates = []
    reach_values = []
    reel_views = []

    for item in items:
        likes = item.get("like_count", 0)
        all_likes.append(likes)

        if item.get("media_type") == "VIDEO" or item.get("media_product_type") == "REELS":
            reel_likes.append(likes)

        insight_candidates.append(item)

    if insight_candidates:
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(10, len(insight_candidates))) as executor:
            futures = [executor.submit(_fetch_single_media_insight, item, access_token) for item in insight_candidates]
            for future in concurrent.futures.as_completed(futures):
                metrics = future.result()
                reach = metrics.get("reach")
                views = metrics.get("views")
                if isinstance(reach, (int, float)) and reach > 0:
                    reach_values.append(int(reach))
                if isinstance(views, (int, float)) and views > 0:
                    reel_views.append(int(views))

    return {
        "avg_views_per_reel": int(sum(reel_views) / len(reel_views)) if reel_views else 0,
        "avg_likes_per_post": int(sum(all_likes) / len(all_likes)) if all_likes else 0,
        "avg_likes_per_reel": int(sum(reel_likes) / len(reel_likes)) if reel_likes else 0,
        "avg_reach": int(sum(reach_values) / len(reach_values)) if reach_values else 0,
    }


def fetch_audience_demographics(access_token: str, instagram_account_id: str) -> dict:
    """
    Fetch audience demographics from Instagram Insights.

    This requires a professional account and may return no data for small
    accounts or accounts without sufficient insights eligibility.
    """
    if not instagram_account_id:
        return {}

    try:
        response = requests.get(
            f"{GRAPH_BASE}/{instagram_account_id}/insights",
            params={
                "metric": "audience_gender_age,audience_city",
                "period": "lifetime",
                "access_token": access_token,
            },
            timeout=10,
        )
        data = _parse_response(response, "Instagram audience demographics fetch")
    except ValueError as exc:
        logger.warning("Audience demographics fetch failed: %s", exc)
        return {"follower_gender_ratio": {}, "top_audience_locality": ""}

    demographics = {
        "follower_gender_ratio": {},
        "top_audience_locality": "",
    }

    try:
        metrics = data.get("data", [])
        for metric in metrics:
            if metric["name"] == "audience_gender_age":
                gender_age_data = metric.get("values", [{}])[0].get("value", {})
                demographics["follower_gender_ratio"] = {"female": 0, "male": 0, "other": 0}
                demographics["follower_age_ratio"] = {}

                total_f = 0
                total_m = 0
                total_u = 0
                age_buckets = {}

                for key, val in gender_age_data.items():
                    if "." not in key:
                        continue

                    gender_prefix, age_range = key.split(".", 1)
                    if gender_prefix == "F":
                        total_f += val
                    elif gender_prefix == "M":
                        total_m += val
                    else:
                        total_u += val

                    age_buckets[age_range] = age_buckets.get(age_range, 0) + val

                total_gender = total_f + total_m + total_u
                if total_gender > 0:
                    demographics["follower_gender_ratio"] = {
                        "female": round((total_f / total_gender) * 100),
                        "male": round((total_m / total_gender) * 100),
                        "other": round((total_u / total_gender) * 100),
                    }

                total_age = sum(age_buckets.values())
                if total_age > 0:
                    demographics["follower_age_ratio"] = {
                        age_range: round((count / total_age) * 100)
                        for age_range, count in age_buckets.items()
                    }

            elif metric["name"] == "audience_city":
                city_data = metric.get("values", [{}])[0].get("value", {})
                if city_data:
                    top_city = max(city_data, key=city_data.get)
                    demographics["top_audience_locality"] = top_city.split(",")[0].strip()

    except Exception as exc:
        logger.error("Error parsing audience demographics: %s", exc)

    return demographics


def verify_and_update_profile(influencer_profile, code: str) -> None:
    """
    Full verification pipeline:
      1. Exchange code -> short-lived token
      2. Upgrade -> long-lived token
      3. Fetch profile fields
      4. Fetch media metrics
      5. Fetch demographics
      6. Save profile + mark verified
    """
    short_token_data = exchange_code(code)
    short_token = short_token_data["access_token"]

    long_token_data = get_long_lived_token(short_token)
    long_token = long_token_data["access_token"]
    expires_in_secs = long_token_data.get("expires_in", 5_184_000)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in_secs)

    instagram_account_id, profile_data = fetch_profile(long_token)
    metrics_data = fetch_media_metrics(long_token, instagram_account_id)
    demographics_data = fetch_audience_demographics(long_token, instagram_account_id)

    for field, value in {**profile_data, **metrics_data, **demographics_data}.items():
        if value is not None and value != {}:
            setattr(influencer_profile, field, value)

    influencer_profile.instagram_access_token = long_token
    influencer_profile.instagram_token_expires_at = expires_at
    influencer_profile.is_verified = True
    influencer_profile.save()
