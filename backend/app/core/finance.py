from decimal import Decimal
from typing import Dict
from app.config import settings

def calculate_financial_split(gross_amount: Decimal) -> Dict[str, Decimal]:
    """
    Calculates the standard financial split for an order:
    - total_amount: Gross amount paid by consumer
    - platform_fee: 10% platform fee retained by NexusCore
    - client_earnings: 90% net earnings disbursed to provider business
    All decimal calculations use 2 decimal place quantizing.
    """
    if isinstance(gross_amount, (int, float, str)):
        gross_amount = Decimal(str(gross_amount))

    commission_rate = Decimal(str(settings.PLATFORM_COMMISSION_PERCENTAGE)) / Decimal("100.0")
    platform_fee = (gross_amount * commission_rate).quantize(Decimal("0.01"))
    client_earnings = gross_amount - platform_fee

    return {
        "total_amount": gross_amount.quantize(Decimal("0.01")),
        "platform_fee": platform_fee,
        "client_earnings": client_earnings.quantize(Decimal("0.01"))
    }
