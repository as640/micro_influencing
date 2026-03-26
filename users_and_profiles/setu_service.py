import logging
import requests
import uuid
from django.conf import settings

logger = logging.getLogger(__name__)

SETU_BASE_URL = getattr(settings, 'SETU_BASE_URL', 'https://dg-sandbox.setu.co')
SETU_CLIENT_ID = getattr(settings, 'SETU_CLIENT_ID', '')
SETU_SECRET = getattr(settings, 'SETU_CLIENT_SECRET', '')
SETU_PRODUCT_ID = getattr(settings, 'SETU_PRODUCT_INSTANCE_ID', '')

def _get_headers():
    return {
        "x-client-id": SETU_CLIENT_ID,
        "x-client-secret": SETU_SECRET,
        "x-product-instance-id": SETU_PRODUCT_ID,
        "Content-Type": "application/json"
    }

def request_gst_otp(gstin: str) -> str:
    """
    Calls Setu's GST API to POST a request for OTP.
    Returns the reference_id needed to verify the OTP.
    """
    if not gstin or len(gstin) != 15:
        raise ValueError("Invalid GSTIN format. It must be exactly 15 characters.")
        
    if not SETU_CLIENT_ID or not SETU_SECRET or not SETU_PRODUCT_ID:
        logger.warning("Setu API keys not configured. Falling back to local Mock OTP.")
        reference_id = str(uuid.uuid4())
        print(f"✅ [SETU MOCK] GST OTP triggered for GSTIN '{gstin}'.")
        print(f"   Reference ID: {reference_id}")
        print(f"   Test OTP Code: 123456")
        return reference_id

    try:
        url = f"{SETU_BASE_URL}/api/verify/gst/otp/request"
        # The exact payload schema depends on the final Setu integration keys
        response = requests.post(url, json={"gstin": gstin}, headers=_get_headers(), timeout=10)
        data = response.json()
        
        if not response.ok:
            raise ValueError(f"Setu API Error: {data.get('message', 'Unknown error requesting OTP')}")
            
        # Extract reference ID from success response
        reference_id = data.get("id") or data.get("result", {}).get("id") or data.get("reference_id")
        if not reference_id:
             raise ValueError("Could not parse OTP Reference ID from Setu response.")
             
        return reference_id
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error calling Setu API: {str(e)}")
        raise ValueError("Failed to trigger Setu OTP service.")

def verify_gst_otp(reference_id: str, otp: str, gstin: str) -> dict:
    """
    Verifies the given OTP against Setu's GST API.
    Returns business metadata upon success.
    """
    if not SETU_CLIENT_ID or not SETU_SECRET or not SETU_PRODUCT_ID:
        if otp != "123456" and otp != "000000":
            raise ValueError("Invalid OTP. For local testing, please use '123456'.")
        print(f"✅ [SETU MOCK] GST OTP verified successfully for Reference ID: {reference_id}.")
        return {
            "legalName": "VERIFIED ENTERPRISES PVT LTD",
            "tradeName": "VerifiedTech",
            "gstin": gstin,
            "status": "Active",
        }

    try:
        url = f"{SETU_BASE_URL}/api/verify/gst/otp/verify"
        response = requests.post(url, json={"id": reference_id, "otp": otp, "gstin": gstin}, headers=_get_headers(), timeout=10)
        data = response.json()
        
        if not response.ok:
            raise ValueError(f"Setu API Error: {data.get('message', 'Invalid OTP or reference code')}")
            
        result = data.get("result", {})
        if not result or data.get('status') != 'SUCCESS':
            result = data.get("data", data)
            if not result.get('legalName') and not result.get('tradeName'):
                 raise ValueError("Could not parse GST details from verification.")

        return {
            "legalName": result.get("legalName", "Verified Company"),
            "tradeName": result.get("tradeName", "Verified"),
            "gstin": gstin,
            "status": result.get("status", "Active"),
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error calling Setu API: {str(e)}")
        raise ValueError("Failed to connect to Setu validation service.")
