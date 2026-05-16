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


def transfer_payout(payment_id: str, amount_inr: float, influencer_profile) -> dict:
    """
    After work is verified and payment is completed, transfer 98% of the amount
    to the influencer. Deducts 2% as platform escrow commission.
    
    Uses Razorpay X Payouts API if UPI is available, otherwise falls back
    to direct bank transfer via Razorpay Payouts.
    
    Returns a dict with transfer details or raises ValueError.
    """
    client = get_client()
    
    platform_commission = 0.02  # 2%
    payout_amount = amount_inr * (1 - platform_commission)
    payout_paise = int(payout_amount * 100)
    
    upi_id = getattr(influencer_profile, 'upi_id', '') or ''
    bank_acc = getattr(influencer_profile, 'bank_account_number', '') or ''
    ifsc = getattr(influencer_profile, 'bank_ifsc_code', '') or ''
    holder = getattr(influencer_profile, 'bank_account_holder_name', '') or ''
    
    if not client:
        # Mock response for local testing
        return {
            'id': f'payout_mock_{payment_id}',
            'amount': payout_paise,
            'currency': 'INR',
            'status': 'processed',
            'mode': 'mock',
            'commission_deducted': int(amount_inr * platform_commission * 100),
            'influencer_receives': payout_paise,
        }
    
    try:
        # Prefer UPI payout (instant), fallback to bank transfer
        if upi_id:
            payout_data = {
                'account_number': settings.RAZORPAY_KEY_ID,  # Your Razorpay account
                'fund_account': {
                    'account_type': 'vpa',
                    'vpa': {'address': upi_id},
                    'contact': {
                        'name': holder or influencer_profile.instagram_handle,
                        'type': 'vendor',
                        'email': influencer_profile.user.email,
                    }
                },
                'amount': payout_paise,
                'currency': 'INR',
                'mode': 'UPI',
                'purpose': 'payout',
                'queue_if_low_balance': True,
                'reference_id': f'mf_payout_{payment_id[:20]}',
                'narration': 'MicroFluence Payout',
            }
        elif bank_acc and ifsc:
            payout_data = {
                'account_number': settings.RAZORPAY_KEY_ID,
                'fund_account': {
                    'account_type': 'bank_account',
                    'bank_account': {
                        'name': holder or influencer_profile.instagram_handle,
                        'ifsc': ifsc,
                        'account_number': bank_acc,
                    },
                    'contact': {
                        'name': holder or influencer_profile.instagram_handle,
                        'type': 'vendor',
                        'email': influencer_profile.user.email,
                    }
                },
                'amount': payout_paise,
                'currency': 'INR',
                'mode': 'NEFT',
                'purpose': 'payout',
                'queue_if_low_balance': True,
                'reference_id': f'mf_payout_{payment_id[:20]}',
                'narration': 'MicroFluence Payout',
            }
        else:
            raise ValueError(
                'Influencer has no payout details (UPI or bank account). '
                'Ask them to add payout details in Account Settings.'
            )
        
        # Make the payout via Razorpay X
        # Note: This requires RazorpayX to be activated on your account
        result = client.payout.create(data=payout_data)
        logger.info(f"Payout created: {result.get('id')} for ₹{payout_amount:.2f}")
        return {
            'id': result.get('id'),
            'amount': payout_paise,
            'currency': 'INR',
            'status': result.get('status', 'processing'),
            'mode': 'UPI' if upi_id else 'NEFT',
            'commission_deducted': int(amount_inr * platform_commission * 100),
            'influencer_receives': payout_paise,
        }
    except Exception as e:
        logger.error(f"Payout transfer failed: {e}")
        raise ValueError(f"Payout failed: {str(e)}")
