import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from shared.config import get_settings

settings = get_settings()


def _smtp_identity() -> tuple[str, str, str]:
    sender = settings.SMTP_FROM or settings.EMAIL_FROM
    username = settings.SMTP_USER or settings.EMAIL_FROM
    password = settings.SMTP_PASSWORD or settings.EMAIL_PASSWORD
    if not sender:
        raise RuntimeError("Email sender is not configured. Set SMTP_FROM or EMAIL_FROM.")
    if not username:
        raise RuntimeError("SMTP username is not configured. Set SMTP_USER or EMAIL_FROM.")
    if not password:
        raise RuntimeError("SMTP password is not configured. Set SMTP_PASSWORD or EMAIL_PASSWORD.")
    return sender, username, password


def send_otp_email(to_email: str, otp_code: str, full_name: str = "") -> None:
    sender, username, password = _smtp_identity()
    greeting = f"Hello{f', {full_name.split()[0]}' if full_name else ''},"

    html = f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
      <div style="text-align:center;margin-bottom:28px;">
        <span style="font-size:28px;font-weight:900;color:#004A8F;letter-spacing:-1px;">
          AI-<span style="color:#E8620A;">HPS</span>
        </span>
        <p style="font-size:11px;color:#888;margin:4px 0 0;text-transform:uppercase;letter-spacing:2px;">
          Hôpital Général de Douala
        </p>
      </div>

      <p style="color:#1a1a2e;font-size:15px;margin-bottom:8px;">{greeting}</p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin-bottom:24px;">
        Use the verification code below to complete your registration.
        This code expires in <strong>{settings.OTP_EXPIRE_MINUTES} minutes</strong>.
      </p>

      <div style="background:#F5F7FA;border:2px dashed #004A8F;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="font-size:36px;font-weight:900;letter-spacing:12px;color:#004A8F;margin:0;">
          {otp_code}
        </p>
      </div>

      <p style="color:#888;font-size:12px;line-height:1.6;">
        If you did not request this code, please ignore this email.
        Your account will not be created without the verification code.
      </p>

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#bbb;font-size:11px;text-align:center;">
        {settings.EMAIL_FROM_NAME} · Hôpital Général de Douala, Cameroon
      </p>
    </div>
    """

    plain = (
        f"{greeting}\n\n"
        f"Your AI-HPS verification code is: {otp_code}\n"
        f"Valid for {settings.OTP_EXPIRE_MINUTES} minutes.\n\n"
        f"If you did not request this, ignore this email.\n\n"
        f"— {settings.EMAIL_FROM_NAME}"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your AI-HPS verification code: {otp_code}"
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{sender}>"
    msg["To"] = to_email

    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(username, password)
        server.sendmail(sender, to_email, msg.as_string())
