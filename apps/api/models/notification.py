from sqlalchemy import Column, String, DateTime, JSON, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, nullable=False, index=True)
    email_id = Column(String, nullable=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    remind_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, default="pending")  # pending | sent | cancelled | snoozed
    channel = Column(String, default="telegram")  # telegram | email | dashboard
    snooze_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="reminders")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, nullable=False, index=True)
    channel = Column(String, nullable=False)  # telegram | whatsapp | email | dashboard
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    status = Column(String, default="pending")  # pending | sent | failed | read
    sent_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    notification_metadata = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, nullable=False, unique=True, index=True)

    # Appearance
    theme = Column(String, default="dark")  # dark | light | system
    language = Column(String, default="en")

    # AI
    ai_provider = Column(String, default="mock")
    ai_model = Column(String, default="")

    # Notifications
    telegram_chat_id = Column(String, nullable=True)
    telegram_enabled = Column(Boolean, default=False)
    whatsapp_enabled = Column(Boolean, default=False)
    email_digest_enabled = Column(Boolean, default=True)
    digest_frequency = Column(String, default="daily")  # daily | weekly

    # Privacy
    store_email_body = Column(Boolean, default=True)
    analytics_enabled = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="settings")
