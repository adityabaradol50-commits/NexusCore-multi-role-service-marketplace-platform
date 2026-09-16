import random
import hmac
import hashlib
from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Dict, Any, Optional
from app.config import settings

class PaymentGatewayStrategy(ABC):
    @abstractmethod
    async def create_payment_intent(self, order_id: str, amount: Decimal, currency: str = "USD", payment_method: str = "card") -> Dict[str, Any]:
        pass

    @abstractmethod
    async def verify_payment_signature(self, transaction_id: str, payload: Dict[str, Any], signature: Optional[str] = None) -> bool:
        pass

    @abstractmethod
    async def process_refund(self, transaction_id: str, amount: Decimal) -> Dict[str, Any]:
        pass


class TestSandboxPaymentGateway(PaymentGatewayStrategy):
    """
    Development & Testing Payment Provider Strategy.
    Simulates secure payment gateway intents, server-side signature verification, and refunds.
    """
    async def create_payment_intent(self, order_id: str, amount: Decimal, currency: str = "USD", payment_method: str = "card") -> Dict[str, Any]:
        tx_num = random.randint(10000000, 99999999)
        transaction_id = f"tx_test_{tx_num}"

        # Generate HMAC signature for server verification testing
        raw = f"{order_id}:{transaction_id}:{amount}:{currency}".encode("utf-8")
        computed_sig = hmac.new(
            settings.PAYMENT_KEY_SECRET.encode("utf-8"),
            raw,
            hashlib.sha256
        ).hexdigest()

        return {
            "status": "SUCCEEDED",
            "transaction_id": transaction_id,
            "amount": amount,
            "currency": currency,
            "payment_method": payment_method,
            "provider": "test_sandbox",
            "signature": computed_sig
        }

    async def verify_payment_signature(self, transaction_id: str, payload: Dict[str, Any], signature: Optional[str] = None) -> bool:
        if not signature:
            # Basic validation
            return bool(transaction_id and transaction_id.startswith("tx_"))
        
        order_id = payload.get("order_id", "")
        amount = payload.get("amount", "")
        currency = payload.get("currency", "USD")
        
        raw = f"{order_id}:{transaction_id}:{amount}:{currency}".encode("utf-8")
        expected_sig = hmac.new(
            settings.PAYMENT_KEY_SECRET.encode("utf-8"),
            raw,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected_sig, signature)

    async def process_refund(self, transaction_id: str, amount: Decimal) -> Dict[str, Any]:
        refund_num = random.randint(100000, 999999)
        return {
            "status": "REFUNDED",
            "refund_id": f"ref_test_{refund_num}",
            "transaction_id": transaction_id,
            "amount": amount,
            "provider": "test_sandbox"
        }


class PaymentProviderService:
    def __init__(self):
        provider_name = settings.PAYMENT_PROVIDER.lower()
        if provider_name in ["test", "sandbox", "development"]:
            self._strategy = TestSandboxPaymentGateway()
        else:
            # Fallback to test gateway for unconfigured providers
            self._strategy = TestSandboxPaymentGateway()

    async def initiate_payment(self, order_id: str, amount: Decimal, currency: str = "USD", payment_method: str = "card") -> Dict[str, Any]:
        return await self._strategy.create_payment_intent(order_id, amount, currency, payment_method)

    async def verify_payment(self, transaction_id: str, payload: Dict[str, Any], signature: Optional[str] = None) -> bool:
        return await self._strategy.verify_payment_signature(transaction_id, payload, signature)

    async def refund_payment(self, transaction_id: str, amount: Decimal) -> Dict[str, Any]:
        return await self._strategy.process_refund(transaction_id, amount)

payment_provider = PaymentProviderService()
