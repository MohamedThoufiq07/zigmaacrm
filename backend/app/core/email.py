import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def _send_email_sync(to_email: str, subject: str, html_body: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email

    part = MIMEText(html_body, "html")
    msg.attach(part)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())

async def send_email_async(to_email: str, subject: str, html_body: str):
    await asyncio.to_thread(_send_email_sync, to_email, subject, html_body)

async def send_otp_email(to_email: str, otp_code: str):
    subject = f"{otp_code} is your Zigmaa CRM verification code"
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7fb; margin: 0; padding: 0; }}
        .container {{ max-width: 520px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }}
        .header {{ background: #0b1528; padding: 28px 24px; text-align: center; }}
        .header h1 {{ color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }}
        .header p {{ color: #94a3b8; margin: 4px 0 0 0; font-size: 13px; }}
        .content {{ padding: 32px 28px; text-align: center; }}
        .content h2 {{ color: #0f172a; margin: 0 0 12px 0; font-size: 20px; }}
        .content p {{ color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; }}
        .otp-box {{ background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 10px; padding: 18px 24px; display: inline-block; letter-spacing: 8px; font-size: 32px; font-weight: 800; color: #15803d; margin: 8px 0 24px 0; font-family: monospace; }}
        .footer {{ background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; color: #94a3b8; font-size: 12px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Zigmaacrm</h1>
          <p>Next-Gen High Velocity Enterprise CRM</p>
        </div>
        <div class="content">
          <h2>Verify Your Identity</h2>
          <p>We received a request to verify your account or reset your password. Use the verification code below to proceed:</p>
          <div class="otp-box">{otp_code}</div>
          <p>This code will expire in <strong>10 minutes</strong>. If you did not make this request, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          &copy; 2026 Zigmaacrm Inc. Secured with End-to-End Encryption.
        </div>
      </div>
    </body>
    </html>
    """
    await send_email_async(to_email, subject, html_body)
