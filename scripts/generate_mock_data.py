#!/usr/bin/env python3
"""
generate_mock_data.py
Generates 100 mock emails with a realistic email structure, threaded conversations,
and realistic email contents categorized into InboxOS specific categories:
academic, job, finance, meeting, OTP, newsletter, personal, support.

Outputs mock_emails.json containing a 100-item JSON array.
"""

import json
import os
import random
import uuid
from datetime import datetime, timedelta, timezone
from faker import Faker

# Initialize Faker
fake = Faker()

# Primary user metadata
USER_NAME = "Alex Mercer"
USER_EMAIL = "alex.mercer@inboxos.dev"
USER_ID = str(uuid.uuid4())

# Set up category-specific content generators
def generate_otp_email(sender_name, sender_email):
    service = fake.company()
    code = str(random.randint(100000, 999999))
    subject = f"Your {service} Verification Code: {code}"
    body = (
        f"Hi {USER_NAME},\n\n"
        f"A login request was made to your {service} account. Please use the following "
        f"one-time password (OTP) to complete your verification:\n\n"
        f"Security Code: {code}\n\n"
        f"This code will expire in 10 minutes. If you did not request this, please change your password immediately.\n\n"
        f"Best regards,\n"
        f"The {service} Security Team"
    )
    return subject, body

def generate_meeting_email(sender_name, sender_email):
    topic = fake.catch_phrase()
    dt = datetime.now(timezone.utc) + timedelta(days=random.randint(1, 7), hours=random.randint(-4, 4))
    date_str = dt.strftime("%A, %B %d, %Y at %I:%M %p UTC")
    meeting_link = f"https://meet.google.com/{''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=3))}-{''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=4))}-{''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=3))}"
    
    subject = f"Invitation: {topic} - Discussion"
    body = (
        f"Hi {USER_NAME},\n\n"
        f"You are invited to join the upcoming discussion regarding '{topic}'.\n\n"
        f"Time: {date_str}\n"
        f"Join Link: {meeting_link}\n\n"
        f"Agenda:\n"
        f"1. Project updates and status overview\n"
        f"2. Key blockers and milestones\n"
        f"3. Next steps & Q&A\n\n"
        f"Please RSVP to confirm your availability.\n\n"
        f"Thanks,\n"
        f"{sender_name}"
    )
    return subject, body

def generate_finance_email(sender_name, sender_email):
    invoice_num = f"INV-{random.randint(10000, 99999)}"
    amount = f"${random.randint(50, 2500)}.{random.randint(10, 99)}"
    due_dt = datetime.now(timezone.utc) + timedelta(days=random.randint(3, 14))
    due_date = due_dt.strftime("%B %d, %Y")
    company = fake.company()
    
    subject = f"Invoice {invoice_num} from {company} - Action Required"
    body = (
        f"Dear {USER_NAME},\n\n"
        f"Your new invoice from {company} is ready for payment. Here is a summary of the charges:\n\n"
        f"Invoice Number: {invoice_num}\n"
        f"Amount Due: {amount}\n"
        f"Due Date: {due_date}\n\n"
        f"Please click the link below to view the invoice details and complete your payment online:\n"
        f"https://billing.{company.lower().replace(' ', '').replace(',', '').replace('.', '')}.com/pay/{invoice_num}\n\n"
        f"If you have any questions, please contact our support team.\n\n"
        f"Sincerely,\n"
        f"{company} Billing Team"
    )
    return subject, body

def generate_job_email(sender_name, sender_email):
    role = fake.job()
    company = fake.company()
    
    subject = f"Opportunity: {role} at {company}"
    body = (
        f"Hi {USER_NAME},\n\n"
        f"I came across your profile and was highly impressed by your experience. "
        f"We are currently looking for a {role} to join our growing team at {company}.\n\n"
        f"Your background seems to align perfectly with what we are trying to build. "
        f"Would you be open to a brief 15-minute call sometime this week to discuss this further?\n\n"
        f"Looking forward to hearing from you.\n\n"
        f"Best,\n"
        f"{sender_name}\n"
        f"Talent Acquisition, {company}"
    )
    return subject, body

def generate_academic_email(sender_name, sender_email):
    course = f"Introduction to {fake.bs().title()}"
    assignment = f"Assignment {random.randint(1, 5)}"
    due_dt = datetime.now(timezone.utc) + timedelta(days=random.randint(1, 5))
    due_str = due_dt.strftime("%A, %B %d at %H:%M UTC")
    
    subject = f"Reminder: {course} - {assignment} Deadline"
    body = (
        f"Hello Students,\n\n"
        f"This is a quick reminder that {assignment} for {course} is due on {due_str}.\n\n"
        f"Please submit your work in PDF format via the student portal. "
        f"Late submissions will be penalized by 10% per day. Ensure that you run your code "
        f"and include all required graphs before final submission.\n\n"
        f"If you have questions, office hours are tomorrow from 2-4 PM.\n\n"
        f"Regards,\n"
        f"Prof. {sender_name.split()[-1]}"
    )
    return subject, body

def generate_support_email(sender_name, sender_email):
    ticket_id = f"TKT-{random.randint(100000, 999999)}"
    product = fake.word().capitalize()
    
    subject = f"[Ticket #{ticket_id}] Re: Problem with {product}"
    body = (
        f"Hello {USER_NAME},\n\n"
        f"Thank you for contacting customer support. We have received your query regarding '{product}' "
        f"and a ticket has been opened under reference #{ticket_id}.\n\n"
        f"Our support engineering team is investigating the issue. We aim to respond to all "
        f"queries within 24 business hours. If you have any additional details or screenshots to share, "
        f"please reply directly to this email.\n\n"
        f"Thank you for your patience,\n"
        f"{sender_name}\n"
        f"Customer Care, Support Team"
    )
    return subject, body

def generate_newsletter_email(sender_name, sender_email):
    newsletter_name = f"The {fake.word().capitalize()} Digest"
    article_title = fake.catch_phrase()
    
    subject = f"☕ {newsletter_name}: {article_title}"
    body = (
        f"Hey {USER_NAME.split()[0]},\n\n"
        f"Welcome to this week's edition of {newsletter_name}!\n\n"
        f"In today's feature, we explore:\n"
        f"**{article_title}**\n"
        f"{fake.paragraph(nb_sentences=5)}\n\n"
        f"Other interesting reads this week:\n"
        f"- {fake.catch_phrase()}\n"
        f"- {fake.catch_phrase()}\n\n"
        f"Thanks for subscribing. You can manage your preferences or unsubscribe at any time below.\n\n"
        f"Cheers,\n"
        f"The {newsletter_name} Editors"
    )
    return subject, body

def generate_personal_email(sender_name, sender_email):
    topics = [
        "Catching up next week?",
        "Weekend plans",
        "Recipe I mentioned",
        "Quick favor",
        "Did you see this?"
    ]
    topic = random.choice(topics)
    subject = topic
    body = (
        f"Hey {USER_NAME.split()[0]},\n\n"
        f"{fake.paragraph(nb_sentences=4)}\n\n"
        f"Let me know what you think. We should grab coffee or dinner soon to catch up properly!\n\n"
        f"Talk soon,\n"
        f"{sender_name.split()[0]}"
    )
    return subject, body

# Mapping categories to generator functions
GENERATORS = {
    "academic": generate_academic_email,
    "job": generate_job_email,
    "finance": generate_finance_email,
    "meeting": generate_meeting_email,
    "OTP": generate_otp_email,
    "newsletter": generate_newsletter_email,
    "personal": generate_personal_email,
    "support": generate_support_email
}

def generate_reply_body(category, sender_name, recipient_name):
    replies = [
        f"Hi {recipient_name},\n\nThanks for getting back to me. That sounds good. Let me review and follow up with you tomorrow.\n\nBest,\n{sender_name}",
        f"Hi {recipient_name},\n\nThank you for the update. I appreciate the quick response. Let's proceed as suggested.\n\nThanks,\n{sender_name}",
        f"Hi {recipient_name},\n\nI received your message. I am a bit tied up today but will get back to you by end of day tomorrow with the requested details.\n\nBest regards,\n{sender_name}",
        f"Hi {recipient_name},\n\nCould we reschedule our meeting to a bit later if possible? Let me know what times work for you.\n\nThanks,\n{sender_name}"
    ]
    return random.choice(replies)

def generate_mock_emails(total_count=100):
    emails = []
    
    # 1. Partition the 100 emails into threads of sizes 1 to 4
    thread_sizes = []
    while sum(thread_sizes) < total_count:
        remaining = total_count - sum(thread_sizes)
        if remaining <= 4:
            thread_sizes.append(remaining)
        else:
            thread_sizes.append(random.choice([1, 2, 3, 4]))
            
    # 2. Generate each thread
    for size in thread_sizes:
        thread_id = str(uuid.uuid4())
        category = random.choice(list(GENERATORS.keys()))
        
        # Determine external participant
        ext_first_name = fake.first_name()
        ext_last_name = fake.last_name()
        ext_name = f"{ext_first_name} {ext_last_name}"
        ext_email = f"{ext_first_name.lower()}.{ext_last_name.lower()}@{fake.free_email_domain()}"
        
        # Decide if the first email is incoming or outgoing (85% incoming, 15% outgoing)
        is_incoming = random.random() < 0.85
        
        # Base starting timestamp for this thread within the last 30 days
        # We select between 28 days ago and 2 days ago to leave room for reply delays (1-12h per reply)
        base_time = fake.date_time_between(start_date='-28d', end_date='-2d', tzinfo=timezone.utc)
        
        prev_message_id = None
        base_subject = None
        prev_timestamp = None
        prev_sender = None
        
        for step in range(size):
            # For replies, swap sender/recipient
            if step == 0:
                if is_incoming:
                    sender = f"{ext_name} <{ext_email}>"
                    recipient = f"{USER_NAME} <{USER_EMAIL}>"
                else:
                    sender = f"{USER_NAME} <{USER_EMAIL}>"
                    recipient = f"{ext_name} <{ext_email}>"
                
                subject, body = GENERATORS[category](ext_name, ext_email)
                base_subject = subject
                in_reply_to = None
                timestamp = base_time
            else:
                # Swap sender/recipient of previous email
                if prev_sender == f"{USER_NAME} <{USER_EMAIL}>":
                    sender = f"{ext_name} <{ext_email}>"
                    recipient = f"{USER_NAME} <{USER_EMAIL}>"
                    reply_sender_name = ext_name
                    reply_recip_name = USER_NAME
                else:
                    sender = f"{USER_NAME} <{USER_EMAIL}>"
                    recipient = f"{ext_name} <{ext_email}>"
                    reply_sender_name = USER_NAME
                    reply_recip_name = ext_name
                
                subject = f"Re: {base_subject}" if not base_subject.startswith("Re: ") else base_subject
                body = generate_reply_body(category, reply_sender_name, reply_recip_name)
                in_reply_to = prev_message_id
                
                # Add delay between messages (between 1 and 12 hours)
                delay_hours = random.randint(1, 12)
                timestamp = prev_timestamp + timedelta(hours=delay_hours)
            
            message_id = f"<{uuid.uuid4()}@mail.{fake.domain_name()}>"
            
            # Determine status
            # If sender is user, status is 'SENT', otherwise random 'READ'/'UNREAD'
            if sender == f"{USER_NAME} <{USER_EMAIL}>":
                status = "SENT"
            else:
                status = "UNREAD" if random.random() < 0.3 else "READ"
                
            email_obj = {
                "id": str(uuid.uuid4()),
                "messageId": message_id,
                "inReplyTo": in_reply_to,
                "sender": sender,
                "recipient": recipient,
                "subject": subject,
                "body": body,
                "status": status,
                "category": category,
                "createdAt": timestamp.strftime('%Y-%m-%dT%H:%M:%SZ'),
                "userId": USER_ID,
                "threadId": thread_id
            }
            
            emails.append(email_obj)
            
            # Save references for reply logic
            prev_sender = sender
            prev_timestamp = timestamp
            prev_message_id = message_id

    # Sort emails by createdAt so they are chronologically ordered in the output
    emails.sort(key=lambda e: e["createdAt"])
    
    return emails

def main():
    print("Generating 100 mock emails using Faker...")
    mock_emails = generate_mock_emails(100)
    
    output_filename = "mock_emails.json"
    with open(output_filename, "w", encoding="utf-8") as f:
        json.dump(mock_emails, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully generated {len(mock_emails)} emails and saved to {output_filename}")

if __name__ == "__main__":
    main()
