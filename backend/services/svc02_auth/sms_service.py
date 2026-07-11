import urllib.parse
import urllib.request
import json

from shared.config import get_settings


settings = get_settings()


def _normalize_cameroon_phone(phone: str) -> str:
    digits = "".join(ch for ch in str(phone or "") if ch.isdigit())
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("237"):
        return digits
    if len(digits) == 9 and digits.startswith("6"):
        return f"237{digits}"
    return digits


def send_otp_sms(phone: str, otp_code: str) -> None:
    if not settings.MTARGET_USERNAME or not settings.MTARGET_PASSWORD:
        raise RuntimeError("MTarget SMS is not configured")

    normalized_phone = _normalize_cameroon_phone(phone)
    if not normalized_phone:
        raise RuntimeError("A valid phone number is required")

    payload = {
        "username": settings.MTARGET_USERNAME,
        "password": settings.MTARGET_PASSWORD,
        "msisdn": f"+{normalized_phone}",
        "msg": f"AI-HPS verification code: {otp_code}. It expires in {settings.OTP_EXPIRE_MINUTES} minutes.",
    }
    if settings.MTARGET_SERVICE_ID:
        payload["serviceid"] = settings.MTARGET_SERVICE_ID

    encoded = urllib.parse.urlencode(payload).encode("utf-8")
    request = urllib.request.Request(
        settings.MTARGET_URL,
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=45) as response:
        body = response.read().decode("utf-8", errors="replace")
        if response.status >= 400:
            raise RuntimeError(f"MTarget SMS request failed with status {response.status}: {body}")

    compact_body = body.replace(" ", "")
    if '"code":0' in compact_body or '"code":"0"' in compact_body or '"ticket"' in compact_body.lower():
        return

    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        parsed = None
    if isinstance(parsed, dict):
        code = parsed.get("code")
        if code in (0, "0") or parsed.get("ticket"):
            return
        results = parsed.get("results")
        if isinstance(results, list) and results and all(str(item.get("code")) == "0" for item in results if isinstance(item, dict)):
            return

    if compact_body:
        raise RuntimeError(f"MTarget SMS was not accepted: {body}")
