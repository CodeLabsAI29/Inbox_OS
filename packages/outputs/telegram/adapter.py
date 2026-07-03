import httpx
from typing import Dict, Any
from ..base import BaseAdapter

class TelegramAdapter(BaseAdapter):
    """Deliver alerts and digests directly to users on Telegram."""

    def __init__(self, bot_token: str = ""):
        self.bot_token = bot_token
        self.base_url = f"https://api.telegram.org/bot{bot_token}" if bot_token else None

    def send_notification(self, recipient: str, title: str, content: str, priority: str = "normal") -> Dict[str, Any]:
        """Forward message payload to Telegram chat identifier."""
        if not self.bot_token or not recipient:
            # Mock mode or unconfigured status
            return {
                "status": "success",
                "mode": "mock",
                "recipient": recipient,
                "message": f"Telegram Alert: [{title}] {content}"
            }

        url = f"{self.base_url}/sendMessage"
        formatted_text = f"*🚨 {title}*\n\n{content}"
        payload = {
            "chat_id": recipient,
            "text": formatted_text,
            "parse_mode": "Markdown"
        }

        try:
            with httpx.Client() as client:
                res = client.post(url, json=payload, timeout=10.0)
                res.raise_for_status()
                return {"status": "success", "mode": "live", "telegram_id": res.json()["result"]["message_id"]}
        except Exception as e:
            return {"status": "failed", "error": f"Telegram delivery failed: {str(e)}"}

    def send_digest(self, recipient: str, digest_content: Dict[str, Any]) -> Dict[str, Any]:
        """Send aggregated briefing reports."""
        title = "Daily Summary Briefing"
        bullets = []
        for cat, items in digest_content.get("categories", {}).items():
            bullets.append(f"\n*📂 {cat.upper()}*")
            for item in items[:3]:
                bullets.append(f"• {item.get('subject', 'No Subject')}")

        full_content = "\n".join(bullets)
        return self.send_notification(recipient, title, full_content, priority="digest")

    async def send_message_async(self, chat_id: int, text: str, parse_mode: str = "HTML") -> Dict[str, Any]:
        """Send message payload asynchronously to Telegram."""
        if not self.bot_token:
            return {"status": "success", "mode": "mock"}
        url = f"{self.base_url}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode
        }
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(url, json=payload, timeout=10.0)
                res.raise_for_status()
                return {"status": "success", "mode": "live", "telegram_id": res.json()["result"]["message_id"]}
        except Exception as e:
            return {"status": "failed", "error": str(e)}
