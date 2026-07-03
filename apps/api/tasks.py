import sys
from pathlib import Path

# Add workspace root to python path to import packages correctly
workspace_root = str(Path(__file__).resolve().parents[2])
if workspace_root not in sys.path:
    sys.path.append(workspace_root)

import os
import asyncio
import logging
import random
from datetime import datetime
from celery import Celery
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from apps.api.config import settings
from models import UserSettings, Task, Rule
from packages.core.schemas.email import EmailSchema
from packages.core.schemas.analysis import AnalysisSchema, ExtractedDataSchema
from packages.intelligence.llm_client import LLMClient
from packages.intelligence.classifier import CategoryClassifier
from packages.intelligence.scorer import PriorityScorer
from packages.intelligence.summarizer import EmailSummarizer
from packages.outputs.telegram.adapter import TelegramAdapter
import importlib
rules_engine_evaluator = importlib.import_module("packages.rules-engine.evaluator")
RulesEvaluator = rules_engine_evaluator.RulesEvaluator

# Initialize Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Celery app matching uvicorn/redis settings
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
app = Celery("tasks", broker=REDIS_URL, backend=REDIS_URL)

# Configure Celery Beat to execute the poll task every 2 minutes
app.conf.beat_schedule = {
    "poll-emails-every-2-min": {
        "task": "tasks.ingest_and_notify_all",
        "schedule": 120.0,
    }
}

# Create persistent async database engine for background processes
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./inboxos.db")
async_engine = create_async_engine(DATABASE_URL, future=True)
AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False)

# Realistic mock email templates to simulate live connectors in local environments
SIMULATED_INBOUND_EMAILS = [
    {
        "sender_email": "exam.registrar@university.edu",
        "sender_name": "University Registrar",
        "subject": "🚨 FINAL NOTICE: Exam Registration Closes Tonight at 11:59 PM",
        "body_text": "Dear student, this is a final warning that the portal for course registration and final exam sign-ups closes tonight at 11:59 PM. Late registrations will not be accepted under any circumstances."
    },
    {
        "sender_email": "talent@stripe.com",
        "sender_name": "Stripe Recruiting Team",
        "subject": "Invitation to schedule: Technical System Interview slot",
        "body_text": "Hi applicant! We were highly impressed with your challenge submission. Please schedule your next round call by Friday using this link: https://stripe.com/schedule/interview-swe"
    },
    {
        "sender_email": "no-reply@udemy.com",
        "sender_name": "Udemy Support",
        "subject": "Udemy Invoice: Payment Declined for Course Bundle",
        "body_text": "We were unable to charge your card on file for ₹2,499. Please update your payment credentials immediately to regain access to your course materials."
    },
    {
        "sender_email": "security-alert@google.com",
        "sender_name": "Google Identity Alerts",
        "subject": "Verification code: 847291 (expires in 10 minutes)",
        "body_text": "Use code 847291 to verify your identity. This code is valid for 10 minutes. Do not share it with anyone."
    }
]

@app.task
def ingest_and_notify_all():
    """Celery Beat task wrapper to execute asynchronous ingestion code."""
    asyncio.run(async_ingest_and_notify_all())

async def async_ingest_and_notify_all():
    logger.info("🤖 Starting Celery background email ingestion sweep...")
    async with AsyncSessionLocal() as db:
        # Get active users with Telegram enabled and linked chat IDs
        result = await db.execute(
            select(UserSettings).where(
                UserSettings.telegram_enabled == True,
                UserSettings.telegram_chat_id.isnot(None)
            )
        )
        settings_list = result.scalars().all()
        
        if not settings_list:
            logger.info("ℹ️ No active users with linked Telegram profiles found in database.")
            return
            
        for user_settings in settings_list:
            try:
                await ingest_for_user(user_settings, db)
            except Exception as e:
                logger.error(f"❌ Ingestion failed for user {user_settings.user_id}: {str(e)}")

async def ingest_for_user(user_settings: UserSettings, db):
    user_id = user_settings.user_id
    chat_id = int(user_settings.telegram_chat_id)
    
    # 1. Ingestion: Select a random email from templates to simulate inbound sync
    raw_email = random.choice(SIMULATED_INBOUND_EMAILS)
    email_id = f"sim-{random.randint(10000, 99999)}"
    
    email_schema = EmailSchema(
        id=email_id,
        sender_email=raw_email["sender_email"],
        sender_name=raw_email["sender_name"],
        subject=raw_email["subject"],
        body_text=raw_email["body_text"],
        received_at=datetime.utcnow()
    )
    logger.info(f"Ingested simulated email '{email_schema.subject}' for user {user_id}")
    
    # 2. Intelligence: Classify, Score, and Summarize email using the LLM interface
    llm_client = LLMClient(
        provider=settings.AI_PROVIDER,
        api_key=settings.OPENAI_API_KEY if settings.AI_PROVIDER == "openai" else settings.GEMINI_API_KEY,
        base_url=settings.OLLAMA_BASE_URL
    )
    
    classifier = CategoryClassifier(llm_client)
    scorer = PriorityScorer(llm_client)
    summarizer = EmailSummarizer(llm_client)
    
    class_res = classifier.classify(email_schema)
    score_res = scorer.score(email_schema, class_res["category"])
    summary_res = summarizer.summarize(email_schema, class_res["category"])
    
    analysis_schema = AnalysisSchema(
        category=class_res["category"],
        priority_score=score_res["priority_score"],
        urgency_score=score_res["urgency_score"],
        actionability_score=score_res["actionability_score"],
        confidence_score=class_res["confidence_score"],
        summary=summary_res["summary"],
        reasoning=class_res["reasoning"],
        suggested_reply=summary_res["suggested_reply"],
        extracted_data=ExtractedDataSchema()
    )
    
    # 3. Rules Evaluation: Fetch user-defined rules or use default fallback rules
    rules_res = await db.execute(
        select(Rule).where(Rule.user_id == user_id, Rule.is_active == True)
    )
    rules_list = [
        {
            "id": r.id,
            "user_id": r.user_id,
            "name": r.name,
            "conditions": r.conditions,
            "actions": r.actions,
            "priority_order": r.priority_order,
            "is_active": r.is_active
        }
        for r in rules_res.scalars().all()
    ]
    
    # Fallback to high priority default routing if database has no active rules configured yet
    if not rules_list:
        rules_list = [
            {
                "id": "default-fallback-rule",
                "name": "High Priority Routing Rule",
                "conditions": [{"field": "priority_score", "operator": "gt", "value": 70}],
                "actions": [{"type": "notify_telegram", "params": {}}, {"type": "create_task", "params": {}}],
                "priority_order": 1,
                "is_active": True
            }
        ]
        
    evaluator = RulesEvaluator(rules_list)
    action_logs = evaluator.evaluate(email_schema, analysis_schema)
    
    # 4. Delivery: Route output actions via Adapters
    telegram_adapter = TelegramAdapter(bot_token=settings.TELEGRAM_BOT_TOKEN)
    
    for log in action_logs:
        rule_name = log["rule_name"]
        action_res = log["action_res"]
        action_type = action_res["action_type"]
        
        if action_type == "notify_telegram":
            msg = (
                f"🔔 <b>Rule Action Triggered: {rule_name}</b>\n\n"
                f"📥 <b>Category:</b> {analysis_schema.category.upper()}\n"
                f"👤 <b>From:</b> {email_schema.sender_name or email_schema.sender_email}\n"
                f"📝 <b>Subject:</b> {email_schema.subject}\n"
                f"💡 <b>Summary:</b> {analysis_schema.summary}"
            )
            try:
                await telegram_adapter.send_message_async(chat_id, msg)
                logger.info(f"✅ Forwarded Telegram notification to chat {chat_id} for email {email_id}")
            except Exception as te:
                logger.error(f"❌ Failed to dispatch Telegram notification: {str(te)}")
                
        elif action_type == "create_task":
            # Save task card to user database task lists
            db_task = Task(
                user_id=user_id,
                title=f"Action Required: {email_schema.subject}",
                description=analysis_schema.summary,
                status="pending",
                priority="high" if analysis_schema.priority_score > 70 else "medium",
                source_email_id=email_id
            )
            db.add(db_task)
            await db.commit()
            logger.info(f"✅ Registered Task backlog item in DB: {db_task.title}")
