"""
users_and_profiles/payment_service.py

Handles Razorpay integration for creating orders (escrow) and 
verifying payment signatures.
"""

import razorpay
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def get_client():
    if not settings.RAZORPAY_KEY_ID or set(['', None]).intersection([settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET]):
        logger.warning("Razorpay credentials not set; returning mock client or None")
        # Ensure we fail fast or return placeholder
        return None
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_order(amount_inr: float, receipt_id: str) -> dict:
    """
    Creates a Razorpay Order ID for the frontend to use in checkout.
    Razorpay expects amounts in basic unit (paise), so we multiply INR by 100.
    """
    client = get_client()

    amount_paise = int(amount_inr * 100)

    try:
        # If running without real credentials, mock the response for easy local testing
        if not client:
            return {
                "id": f"order_mock_{receipt_id}",
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt_id,
                "status": "created"
            }

        data = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt_id,
            "payment_capture": 1  # auto-capture payment
        }
        order = client.order.create(data=data)
        return order
    except Exception as e:
        logger.error(f"Failed to create Razorpay order: {e}")
        raise ValueError(str(e))


def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """
    Verifies that the payment callback came from Razorpay and hasn't been tampered with.
    """
    client = get_client()

    if not client:
        # Mock verification for testing purposes
        if order_id.startswith("order_mock_"):
            return True
        return False

    params = {
        'razorpay_order_id': order_id,
        'razorpay_payment_id': payment_id,
        'razorpay_signature': signature
    }
    try:
        # This function raises a SignatureVerificationError on failure
        client.utility.verify_payment_signature(params)
        return True
    except razorpay.errors.SignatureVerificationError:
        return False
    except Exception as e:
        logger.error(f"Signature verification error: {e}")
        return False
