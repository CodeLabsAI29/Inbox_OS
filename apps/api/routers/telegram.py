import sys
from pathlib import Path

# Dynamically inject workspace root to sys.path so we can import from packages/
workspace_root = str(Path(__file__).resolve().parents[3])
if workspace_root not in sys.path:
    sys.path.append(workspace_root)

from fastapi import APIRouter, Header, HTTPException, Request, Depends
from apps.api.config import settings
from apps.api.database import get_db
from models import UserSettings, Task
from packages.outputs.telegram.adapter import TelegramAdapter
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

router = APIRouter(prefix="/api/telegram", tags=["telegram"])
telegram_adapter = TelegramAdapter(bot_token=settings.TELEGRAM_BOT_TOKEN)

async def verify_secret(x_telegram_bot_api_secret_token: str = Header(None)):
    if settings.TELEGRAM_SECRET_TOKEN and x_telegram_bot_api_secret_token != settings.TELEGRAM_SECRET_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid secret token")
    return True

@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_secret)
):
    update = await request.json()
    
    if "message" in update:
        message = update["message"]
        chat_id = message["chat"]["id"]
        text = message.get("text", "")
        
        # Route commands
        if text.startswith("/start"):
            return await handle_start(chat_id, text, db)
        elif text.startswith("/inbox"):
            return await handle_inbox(chat_id, db)
        elif text.startswith("/done"):
            return await handle_done(chat_id, text, db)
    
    return {"ok": True}

async def handle_start(chat_id: int, text: str, db: AsyncSession):
    parts = text.split()
    if len(parts) < 2:
        await telegram_adapter.send_message_async(
            chat_id, 
            "<b>Welcome to InboxOS!</b>\n\nLink your account by sending: <code>/start &lt;your-token&gt;</code>"
        )
        return {"ok": True}
    
    token = parts[1]
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == token)
    )
    user_settings = result.scalar_one_or_none()
    
    if user_settings:
        user_settings.telegram_chat_id = str(chat_id)
        user_settings.telegram_enabled = True
        await db.commit()
        await telegram_adapter.send_message_async(
            chat_id, 
            "✅ <b>Account linked successfully!</b>\n\nUse <code>/inbox</code> to view your items."
        )
    else:
        # Development fallback: Create a UserSettings profile on the fly if token doesn't exist
        try:
            user_settings = UserSettings(user_id=token, telegram_chat_id=str(chat_id), telegram_enabled=True)
            db.add(user_settings)
            await db.commit()
            await telegram_adapter.send_message_async(
                chat_id, 
                "✅ <b>Account linked!</b> (Created a profile on-the-fly for dev validation)\n\nUse <code>/inbox</code> to see items."
            )
        except Exception as e:
            await db.rollback()
            await telegram_adapter.send_message_async(
                chat_id, 
                f"❌ <b>Linking failed.</b> Invalid token or database constraint error: {str(e)}"
            )
            
    return {"ok": True}

async def handle_inbox(chat_id: int, db: AsyncSession):
    result = await db.execute(
        select(UserSettings).where(UserSettings.telegram_chat_id == str(chat_id))
    )
    user_settings = result.scalar_one_or_none()
    
    if not user_settings:
        await telegram_adapter.send_message_async(
            chat_id, 
            "⚠️ Please link your account first by sending: <code>/start &lt;your-token&gt;</code>"
        )
        return {"ok": True}
    
    # Query database for user's pending tasks
    tasks_result = await db.execute(
        select(Task).where(Task.user_id == user_settings.user_id, Task.status == "pending")
    )
    tasks = tasks_result.scalars().all()
    
    if not tasks:
        await telegram_adapter.send_message_async(chat_id, "📥 <b>Your InboxOS is clean!</b> No pending actions.")
        return {"ok": True}
        
    lines = ["📥 <b>Pending InboxOS Actions:</b>\n"]
    for idx, t in enumerate(tasks, 1):
        lines.append(f"<b>{idx}. {t.title}</b>")
        if t.description:
            lines.append(f"<i>Description:</i> {t.description}")
        lines.append(f"<i>Command to complete:</i> <code>/done {t.id}</code>\n")
        
    await telegram_adapter.send_message_async(chat_id, "\n".join(lines))
    return {"ok": True}

async def handle_done(chat_id: int, text: str, db: AsyncSession):
    parts = text.split()
    if len(parts) < 2:
        await telegram_adapter.send_message_async(chat_id, "⚠️ Usage: <code>/done &lt;task-id&gt;</code>")
        return {"ok": True}
        
    task_id = parts[1]
    
    # Look up UserSettings to confirm authentication
    result = await db.execute(
        select(UserSettings).where(UserSettings.telegram_chat_id == str(chat_id))
    )
    user_settings = result.scalar_one_or_none()
    
    if not user_settings:
        await telegram_adapter.send_message_async(
            chat_id, 
            "⚠️ Please link your account first by sending: <code>/start &lt;your-token&gt;</code>"
        )
        return {"ok": True}
        
    # Look up Task
    task_result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user_settings.user_id)
    )
    task = task_result.scalar_one_or_none()
    
    if not task:
        await telegram_adapter.send_message_async(chat_id, "❌ <b>Task not found</b> in your workspace backlog.")
        return {"ok": True}
        
    task.status = "done"
    await db.commit()
    await telegram_adapter.send_message_async(chat_id, f"✅ <b>Task completed:</b> {task.title}")
    return {"ok": True}
