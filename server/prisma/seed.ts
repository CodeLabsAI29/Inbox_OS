import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { reminderQueue } from '../src/jobs/reminder.job';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing database emails and related data (preserving users)
  console.log('🧼 Cleaning up existing tables...');
  await prisma.notification.deleteMany({});
  await prisma.reminder.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.calendarEvent.deleteMany({});
  await prisma.actionItem.deleteMany({});
  await prisma.emailAnalysis.deleteMany({});
  await prisma.email.deleteMany({});
  await prisma.thread.deleteMany({});

  // Clean redis queue if possible
  try {
    await reminderQueue.clean(0, 10000, 'delayed');
    await reminderQueue.clean(0, 10000, 'wait');
    await reminderQueue.clean(0, 10000, 'active');
    console.log('🧼 BullMQ reminderQueue cleaned.');
  } catch (qErr) {
    console.warn('⚠️ Could not clean BullMQ reminderQueue (Redis offline or not configured). Skipping.');
  }

  // 2. Find or create default demo user
  const email = 'demo@inboxos.app';
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.log(`👤 Creating default demo user: ${email}...`);
    const passwordHash = await bcrypt.hash('password123', 10);
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    // Create default settings
    await prisma.userSettings.create({
      data: {
        userId: user.id,
        theme: 'dark',
        timezone: 'America/New_York', // Default to EST
        telegramChatId: 'demo-chat-id',
        telegramEnabled: true,
      },
    });
  } else {
    console.log(`👤 Default demo user found: ${user.email}`);
  }

  const userId = user.id;

  // Helpers to generate ISO dates relative to now
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const daysAhead = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  // ==========================================
  // 1. CALENDAR EVENT EMAILS (4 items)
  // ==========================================
  console.log('📅 Seeding Calendar Event Emails...');

  // Meeting 1: Zoom Interview
  await prisma.thread.create({
    data: {
      id: 'thread-cal-1',
      summary: 'TechCorp interview coordination thread',
    },
  });

  const emailCal1 = await prisma.email.create({
    data: {
      userId,
      messageId: 'msg-cal-1',
      sender: 'hr@techcorp.com',
      recipient: email,
      subject: 'Interview Invitation: Senior Software Engineer at TechCorp',
      body: `
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #334155;">
              <h2 style="color: #6366f1;">TechCorp Interview Invitation</h2>
              <p>Hi Alex,</p>
              <p>We are excited to invite you for a technical interview for the Senior Software Engineer position.</p>
              <div style="background-color: #0f172a; padding: 15px; border-radius: 8px; border-left: 4px solid #6366f1; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Date:</strong> July 10, 2026</p>
                <p style="margin: 0 0 8px 0;"><strong>Time:</strong> 2:00 PM EST (New York Time)</p>
                <p style="margin: 0 0 8px 0;"><strong>Format:</strong> Zoom Video Conference</p>
                <p style="margin: 0;"><strong>Meeting Link:</strong> <a href="https://zoom.us/j/9281726354" style="color: #818cf8;">https://zoom.us/j/9281726354</a></p>
              </div>
              <p>Please prepare your portfolio and review the job description prior to the call.</p>
              <p>Best regards,<br>Sarah Jenkins, Talent Acquisition</p>
            </div>
          </body>
        </html>
      `,
      category: 'meeting',
      status: 'PROCESSED',
      threadId: 'thread-cal-1',
      createdAt: daysAgo(1),
    },
  });

  await prisma.emailAnalysis.create({
    data: {
      emailId: emailCal1.id,
      category: 'meeting',
      deadlines: ['2026-07-10T18:00:00Z'], // 2:00 PM EST is 6:00 PM UTC
      summary: 'Job interview invitation for Senior Software Engineer at TechCorp. Scheduled on July 10, 2026, at 2:00 PM EST via Zoom.',
      priorityScore: 90,
      urgencyScore: 85,
    },
  });

  await prisma.actionItem.create({
    data: {
      emailId: emailCal1.id,
      taskDescription: 'Review Senior Software Engineer job description and prepare portfolio for TechCorp interview',
      deadline: new Date('2026-07-10T14:00:00Z'),
    },
  });

  await prisma.calendarEvent.create({
    data: {
      emailId: emailCal1.id,
      userId,
      title: 'Interview at TechCorp (Senior Software Engineer)',
      startTime: new Date('2026-07-10T18:00:00Z'), // UTC
      endTime: new Date('2026-07-10T19:00:00Z'),
      location: 'Zoom Video Call',
      meetingLink: 'https://zoom.us/j/9281726354',
      status: 'synced',
    },
  });

  // Meeting 2: Google Meet Sync
  await prisma.thread.create({
    data: {
      id: 'thread-cal-2',
      summary: 'Weekly Team Roadmap syncs',
    },
  });

  const emailCal2 = await prisma.email.create({
    data: {
      userId,
      messageId: 'msg-cal-2',
      sender: 'lead@inboxos.app',
      recipient: email,
      subject: 'Weekly Team Roadmap Sync & Planning',
      body: `
        <p>Hey team,</p>
        <p>Let's align on the Q3 roadmap developments. We'll review the BullMQ background processing structures and the email parsing filters.</p>
        <p><strong>When:</strong> Monday, July 6, 2026, at 10:00 AM UTC.</p>
        <p><strong>Join Google Meet:</strong> <a href="https://meet.google.com/abc-defg-hij">https://meet.google.com/abc-defg-hij</a></p>
      `,
      category: 'meeting',
      status: 'PROCESSED',
      threadId: 'thread-cal-2',
      createdAt: daysAgo(2),
    },
  });

  await prisma.emailAnalysis.create({
    data: {
      emailId: emailCal2.id,
      category: 'meeting',
      deadlines: ['2026-07-06T10:00:00Z'],
      summary: 'Weekly roadmap sync on July 6, 2026 at 10:00 AM UTC via Google Meet.',
      priorityScore: 70,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      emailId: emailCal2.id,
      userId,
      title: 'Weekly Team Roadmap Sync',
      startTime: new Date('2026-07-06T10:00:00Z'),
      endTime: new Date('2026-07-06T11:00:00Z'),
      location: 'Google Meet',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      status: 'synced',
    },
  });

  // Meeting 3: Microsoft Teams Seminar
  await prisma.thread.create({
    data: {
      id: 'thread-cal-3',
      summary: 'Guest lectures thread',
    },
  });

  const emailCal3 = await prisma.email.create({
    data: {
      userId,
      messageId: 'msg-cal-3',
      sender: 'seminars@university.edu',
      recipient: email,
      subject: 'AI Research Seminar: Next-Gen Agentic Workflows',
      body: `
        <p>Hello researchers,</p>
        <p>You are invited to our guest lecture seminar covering state of the art advancements in agentic programming.</p>
        <p><strong>Time:</strong> July 8, 2026 at 4:00 PM EST.</p>
        <p><strong>Teams Link:</strong> <a href="https://teams.microsoft.com/l/meetup-join/19%3ameeting_xyz">Join Teams Link</a></p>
      `,
      category: 'meeting',
      status: 'PROCESSED',
      threadId: 'thread-cal-3',
      createdAt: daysAgo(3),
    },
  });

  await prisma.emailAnalysis.create({
    data: {
      emailId: emailCal3.id,
      category: 'meeting',
      deadlines: ['2026-07-08T20:00:00Z'], // 4:00 PM EST -> 8:00 PM UTC
      summary: 'Guest seminar on agentic workflows on July 8, 2026 at 4:00 PM EST via Microsoft Teams.',
      priorityScore: 50,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      emailId: emailCal3.id,
      userId,
      title: 'AI Research Seminar: Next-Gen Agentic Workflows',
      startTime: new Date('2026-07-08T20:00:00Z'),
      endTime: new Date('2026-07-08T21:30:00Z'),
      location: 'Microsoft Teams',
      meetingLink: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_xyz',
      status: 'synced',
    },
  });

  // Meeting 4: Local Appointment
  await prisma.thread.create({
    data: {
      id: 'thread-cal-4',
      summary: 'Dental appointments updates',
    },
  });

  const emailCal4 = await prisma.email.create({
    data: {
      userId,
      messageId: 'msg-cal-4',
      sender: 'appointments@smithdental.com',
      recipient: email,
      subject: 'Appointment Confirmed: Dr. Richard Smith',
      body: `
        <p>Hi Alex,</p>
        <p>This is a confirmation of your upcoming checkup and cleaning appointment.</p>
        <p><strong>When:</strong> July 9, 2026, at 9:00 AM EST.</p>
        <p><strong>Where:</strong> Smiths Dental Suite, 123 Medical Center Way, Suite 400.</p>
      `,
      category: 'meeting',
      status: 'PROCESSED',
      threadId: 'thread-cal-4',
      createdAt: daysAgo(4),
    },
  });

  await prisma.emailAnalysis.create({
    data: {
      emailId: emailCal4.id,
      category: 'meeting',
      deadlines: ['2026-07-09T13:00:00Z'], // 9:00 AM EST -> 1:00 PM UTC
      summary: 'Dental cleaning checkup with Dr. Smith scheduled on July 9, 2026 at 9:00 AM EST.',
      priorityScore: 60,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      emailId: emailCal4.id,
      userId,
      title: 'Dental Checkup - Dr. Richard Smith',
      startTime: new Date('2026-07-09T13:00:00Z'),
      endTime: new Date('2026-07-09T14:00:00Z'),
      location: 'Smiths Dental Suite, 123 Medical Center Way, Suite 400',
      status: 'synced',
    },
  });

  // ==========================================
  // 2. DAILY DIGEST EMAILS (12 items)
  // ==========================================
  console.log('📂 Seeding Daily/Weekly Digest low-priority emails...');

  const digestSources = [
    { sender: 'promo@amazon.com', subj: 'Amazon Deals: Up to 40% off Tech Essentials!', cat: 'promotional' },
    { sender: 'deals@flipkart.com', subj: 'Flipkart Super Saver Deals live now!', cat: 'promotional' },
    { sender: 'noreply@github.com', subj: 'GitHub Trending: Top repositories this week', cat: 'newsletter' },
    { sender: 'notifications@linkedin.com', subj: 'LinkedIn: John Doe and 5 others viewed your profile', cat: 'social' },
    { sender: 'noreply@medium.com', subj: 'Medium: Recommended stories based on your interests', cat: 'newsletter' },
    { sender: 'newsletter@stackoverflow.com', subj: 'Stack Overflow Weekly: Top TypeScript questions', cat: 'newsletter' },
    { sender: 'digest@reddit.com', subj: 'Reddit: Trending on r/typescript: Vite 8.0 discussion', cat: 'social' },
    { sender: 'marketing@chasebank.com', subj: 'Unlock up to $500 cashback with our new credit card!', cat: 'promotional' },
    { sender: 'offers@uber.com', subj: 'Get 20% off your next 3 Uber Eats orders!', cat: 'promotional' },
    { sender: 'digest@twitter.com', subj: 'X Social: Mentions and highlights from last night', cat: 'social' },
    { sender: 'updates@slack.com', subj: 'Slack Product Updates: Canvas and Clips improvements', cat: 'newsletter' },
    { sender: 'newsletter@tldr.tech', subj: 'TLDR AI: Claude 3.5 Sonnet updates & Google Gemini Pro', cat: 'newsletter' },
  ];

  for (let i = 0; i < digestSources.length; i++) {
    const src = digestSources[i];
    await prisma.thread.create({
      data: {
        id: `thread-dig-${i}`,
        summary: `Low-priority update from ${src.sender}`,
      },
    });

    const emailD = await prisma.email.create({
      data: {
        userId,
        messageId: `msg-dig-${i}`,
        sender: src.sender,
        recipient: email,
        subject: src.subj,
        body: `Here are the latest updates, newsletters, and promotional offerings from ${src.sender}. Save money, catch up on news, and review your social feeds.`,
        category: src.cat,
        status: 'PROCESSED',
        threadId: `thread-dig-${i}`,
        createdAt: daysAgo(1 + (i % 3)), // spread over the last 3 days
      },
    });

    await prisma.emailAnalysis.create({
      data: {
        emailId: emailD.id,
        category: src.cat,
        summary: `Low-priority update from ${src.sender} regarding ${src.subj}.`,
        priorityScore: 15 + (i % 10), // Low priority (all below 40)
        urgencyScore: 10,
      },
    });
  }

  // ==========================================
  // 3. EXPENSE / RECEIPT EMAILS (4 items)
  // ==========================================
  console.log('💳 Seeding Expense/Receipt Emails...');

  // Expense 1: Amazon Order Receipt
  await prisma.thread.create({
    data: {
      id: 'thread-exp-1',
      summary: 'Amazon invoices thread',
    },
  });

  const emailExp1 = await prisma.email.create({
    data: {
      userId,
      messageId: 'msg-exp-1',
      sender: 'shipment-confirm@amazon.com',
      recipient: email,
      subject: 'Your Amazon.com order confirmation #102-392817',
      body: `
        <div style="font-family: Arial; padding: 20px; color: #333;">
          <h2>Thanks for your order, Alex!</h2>
          <p>Order #102-392817</p>
          <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
            <tr style="background: #f3f4f6;">
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
            </tr>
            <tr>
              <td>USB-C Fast Charging Cable (2m)</td>
              <td>2</td>
              <td>$19.99</td>
            </tr>
            <tr>
              <td>Magnetic Cable Desk Organizer</td>
              <td>1</td>
              <td>$8.00</td>
            </tr>
          </table>
          <p><strong>Tax:</strong> $2.50</p>
          <p><strong>Total:</strong> $50.48</p>
          <p><strong>Payment Method:</strong> Visa ending in 4242</p>
        </div>
      `,
      category: 'finance',
      status: 'PROCESSED',
      threadId: 'thread-exp-1',
      createdAt: daysAgo(2),
    },
  });

  await prisma.emailAnalysis.create({
    data: {
      emailId: emailExp1.id,
      category: 'finance',
      summary: 'Amazon order confirmation receipt for desk tech accessories totaling $50.48.',
      priorityScore: 65,
    },
  });

  await prisma.expense.create({
    data: {
      userId,
      emailId: emailExp1.id,
      amount: 50.48,
      amountUsd: 50.48,
      currency: 'USD',
      merchantName: 'Amazon',
      category: 'shopping',
      date: daysAgo(2),
      paymentMethod: 'Visa ending in 4242',
      items: [
        { name: 'USB-C Fast Charging Cable (2m)', quantity: 2, unitPrice: 19.99 },
        { name: 'Magnetic Cable Desk Organizer', quantity: 1, unitPrice: 8.00 }
      ],
      isRecurring: false,
    },
  });

  // Expense 2: Uber Ride Receipt
  await prisma.thread.create({
    data: {
      id: 'thread-exp-2',
      summary: 'Uber transport invoices',
    },
  });

  const emailExp2 = await prisma.email.create({
    data: {
      userId,
      messageId: 'msg-exp-2',
      sender: 'receipts@uber.com',
      recipient: email,
      subject: 'Your ride receipt with Uber from Friday evening',
      body: `
        <p>Total: $18.50</p>
        <p>Thanks for riding, Alex. Merchant: Uber Technologies. Paid via Apple Pay.</p>
        <p>Items: UberX Ride - $18.50</p>
      `,
      category: 'finance',
      status: 'PROCESSED',
      threadId: 'thread-exp-2',
      createdAt: daysAgo(3),
    },
  });

  await prisma.emailAnalysis.create({
    data: {
      emailId: emailExp2.id,
      category: 'finance',
      summary: 'Uber ride receipt for local Friday transport totaling $18.50.',
      priorityScore: 50,
    },
  });

  await prisma.expense.create({
    data: {
      userId,
      emailId: emailExp2.id,
      amount: 18.50,
      amountUsd: 18.50,
      currency: 'USD',
      merchantName: 'Uber',
      category: 'travel',
      date: daysAgo(3),
      paymentMethod: 'Apple Pay',
      items: [
        { name: 'UberX Ride', quantity: 1, unitPrice: 18.50 }
      ],
      isRecurring: false,
    },
  });

  // Expense 3: Swiggy Food (INR conversion)
  await prisma.thread.create({
    data: {
      id: 'thread-exp-3',
      summary: 'Swiggy food order receipt thread',
    },
  });

  const emailExp3 = await prisma.email.create({
    data: {
      userId,
      messageId: 'msg-exp-3',
      sender: 'receipt@swiggy.in',
      recipient: email,
      subject: 'Swiggy Order Receipt for Order #SW-291827',
      body: `
        <p>Your order was delivered successfully!</p>
        <p>Total Paid: ₹450.00</p>
        <p>Merchant: Swiggy India. Payment via UPI.</p>
        <p>Items: Paneer Butter Masala (1) - 350.00, Butter Naan (2) - 100.00</p>
      `,
      category: 'finance',
      status: 'PROCESSED',
      threadId: 'thread-exp-3',
      createdAt: daysAgo(4),
    },
  });

  await prisma.emailAnalysis.create({
    data: {
      emailId: emailExp3.id,
      category: 'finance',
      summary: 'Swiggy food order receipt for dinner delivery totaling INR 450.00 (~$5.40 USD).',
      priorityScore: 45,
    },
  });

  await prisma.expense.create({
    data: {
      userId,
      emailId: emailExp3.id,
      amount: 450.00,
      amountUsd: 5.40, // 450 * 0.012 INR fallback rate
      currency: 'INR',
      merchantName: 'Swiggy',
      category: 'food',
      date: daysAgo(4),
      paymentMethod: 'UPI',
      items: [
        { name: 'Paneer Butter Masala', quantity: 1, unitPrice: 350.00 },
        { name: 'Butter Naan', quantity: 2, unitPrice: 50.00 }
      ],
      isRecurring: false,
    },
  });

  // Expense 4: Delta Flight Ticket
  await prisma.thread.create({
    data: {
      id: 'thread-exp-4',
      summary: 'Delta Airlines bookings',
    },
  });

  const emailExp4 = await prisma.email.create({
    data: {
      userId,
      messageId: 'msg-exp-4',
      sender: 'confirm@delta.com',
      recipient: email,
      subject: 'Delta Flight Ticket Confirmation & Invoice - Booking Code: DL927',
      body: `
        <p>Passenger: Alex Chen. Booking confirmation DL927.</p>
        <p>Flight: BOS -> JFK</p>
        <p>Total fare charge: $350.00</p>
        <p>Merchant: Delta Air Lines. Paid via Mastercard ending in 9999.</p>
      `,
      category: 'finance',
      status: 'PROCESSED',
      threadId: 'thread-exp-4',
      createdAt: daysAgo(5),
    },
  });

  await prisma.emailAnalysis.create({
    data: {
      emailId: emailExp4.id,
      category: 'finance',
      summary: 'Delta Airlines flight ticket booking confirmation totaling $350.00.',
      priorityScore: 80,
    },
  });

  await prisma.expense.create({
    data: {
      userId,
      emailId: emailExp4.id,
      amount: 350.00,
      amountUsd: 350.00,
      currency: 'USD',
      merchantName: 'Delta',
      category: 'travel',
      date: daysAgo(5),
      paymentMethod: 'Mastercard ending in 9999',
      items: [
        { name: 'One-way ticket BOS -> JFK', quantity: 1, unitPrice: 350.00 }
      ],
      isRecurring: false,
    },
  });

  // ==========================================
  // 4. REMINDER / DEADLINE EMAILS (4 items)
  // ==========================================
  console.log('⏰ Seeding Reminder/Deadline Emails...');

  // Deadline 1: Project Submission (future)
  await prisma.thread.create({
    data: {
      id: 'thread-ddl-1',
      summary: 'Academic deadlines CS50',
    },
  });

  const emailDdl1 = await prisma.email.create({
    data: {
      userId,
      messageId: 'msg-ddl-1',
      sender: 'canvas@university.edu',
      recipient: email,
      subject: 'Action Required: Final Project Submission Deadline',
      body: `
        <p>Hi students,</p>
        <p>Please note that the final project submission for CS50 is due by July 10, 2026, at 11:59 PM EST.</p>
        <p>Late submissions will not be graded.</p>
      `,
      category: 'academic',
      status: 'PROCESSED',
      threadId: 'thread-ddl-1',
      createdAt: daysAgo(1),
    },
  });

  await prisma.emailAnalysis.create({
    data: {
      emailId: emailDdl1.id,
      category: 'academic',
      deadlines: ['2026-07-10T23:59:00Z'], // EST deadline
      summary: 'Academic final project submission deadline on July 10, 2026 at 11:59 PM EST.',
      priorityScore: 95,
    },
  });

  await prisma.actionItem.create({
    data: {
      emailId: emailDdl1.id,
      taskDescription: 'Submit final academic project for CS50',
      deadline: new Date('2026-07-10T23:59:00Z'),
    },
  });

  // Schedule Reminder + BullMQ delayed jobs
  const reminderDdl1 = await prisma.reminder.create({
    data: {
      userId,
      emailId: emailDdl1.id,
      deadline: new Date('2026-07-10T23:59:00Z'),
      offsets: [1440, 60, 0],
      status: 'active',
    },
  });

  try {
    for (const offset of [1440, 60, 0]) {
      const triggerTime = new Date(new Date('2026-07-10T23:59:00Z').getTime() - offset * 60 * 1000);
      const delay = triggerTime.getTime() - Date.now();
      if (delay > 0) {
        await reminderQueue.add(
          `reminder-${reminderDdl1.id}-${offset}`,
          {
            reminderId: reminderDdl1.id,
            userId,
            emailId: emailDdl1.id,
            deadline: new Date('2026-07-10T23:59:00Z'),
            offset,
            isSnoozed: false,
          },
          { delay, removeOnComplete: true, removeOnFail: true }
        );
      }
    }
  } catch (qErr) {
    console.warn('⚠️ Could not queue BullMQ jobs for Reminder 1. Skipping.');
  }

  // Deadline 2: Internship Application (future)
  await prisma.thread.create({
    data: {
      id: 'thread-ddl-2',
      summary: 'Innovations applications thread',
    },
  });

  const emailDdl2 = await prisma.email.create({
    data: {
      userId,
      messageId: 'msg-ddl-2',
      sender: 'recruitment@innovations.co',
      recipient: email,
      subject: 'Innovations Inc. Internship Application Closing Soon',
      body: `
        <p>Dear Candidate,</p>
        <p>Our internship applications portal closes July 20, 2026. Submit your resume before the cutoff.</p>
      `,
      category: 'job',
      status: 'PROCESSED',
      threadId: 'thread-ddl-2',
      createdAt: daysAgo(2),
    },
  });

  await prisma.emailAnalysis.create({
    data: {
      emailId: emailDdl2.id,
      category: 'job',
      deadlines: ['2026-07-20T23:59:00Z'],
      summary: 'Internship applications for Innovations Inc closes July 20, 2026.',
      priorityScore: 85,
    },
  });

  await prisma.actionItem.create({
    data: {
      emailId: emailDdl2.id,
      taskDescription: 'Submit resume for Innovations Inc internship application',
      deadline: new Date('2026-07-20T23:59:00Z'),
    },
  });

  const reminderDdl2 = await prisma.reminder.create({
    data: {
      userId,
      emailId: emailDdl2.id,
      deadline: new Date('2026-07-20T23:59:00Z'),
      offsets: [1440, 60, 0],
      status: 'active',
    },
  });

  try {
    for (const offset of [1440, 60, 0]) {
      const triggerTime = new Date(new Date('2026-07-20T23:59:00Z').getTime() - offset * 60 * 1000);
      const delay = triggerTime.getTime() - Date.now();
      if (delay > 0) {
        await reminderQueue.add(
          `reminder-${reminderDdl2.id}-${offset}`,
          {
            reminderId: reminderDdl2.id,
            userId,
            emailId: emailDdl2.id,
            deadline: new Date('2026-07-20T23:59:00Z'),
            offset,
            isSnoozed: false,
          },
          { delay, removeOnComplete: true, removeOnFail: true }
        );
      }
    }
  } catch (qErr) {
    console.warn('⚠️ Could not queue BullMQ jobs for Reminder 2. Skipping.');
  }

  // Deadline 3: Electricity Bill (past/overdue)
  await prisma.thread.create({
    data: {
      id: 'thread-ddl-3',
      summary: 'Electricity bill payments history',
    },
  });

  const emailDdl3 = await prisma.email.create({
    data: {
      userId,
      messageId: 'msg-ddl-3',
      sender: 'billing@powergrid.com',
      recipient: email,
      subject: 'Urgent: Your Electricity Bill is Due Today',
      body: `
        <p>Dear customer,</p>
        <p>Your payment of $75.00 is due by July 5, 2026. Please log in to complete your transaction.</p>
      `,
      category: 'finance',
      status: 'PROCESSED',
      threadId: 'thread-ddl-3',
      createdAt: daysAgo(1),
    },
  });

  await prisma.emailAnalysis.create({
    data: {
      emailId: emailDdl3.id,
      category: 'finance',
      deadlines: ['2026-07-05T00:00:00Z'], // past deadline
      summary: 'Electricity bill payment deadline of $75.00 due on July 5, 2026.',
      priorityScore: 90,
    },
  });

  await prisma.actionItem.create({
    data: {
      emailId: emailDdl3.id,
      taskDescription: 'Pay utility electricity bill ($75.00)',
      deadline: new Date('2026-07-05T00:00:00Z'),
    },
  });

  // Create as past/overdue reminder
  await prisma.reminder.create({
    data: {
      userId,
      emailId: emailDdl3.id,
      deadline: new Date('2026-07-05T00:00:00Z'),
      offsets: [1440, 60, 0],
      status: 'active', // remains active but overdue
    },
  });

  // Immediately generate notification records for past/overdue
  await prisma.notification.create({
    data: {
      userId,
      type: 'action_item',
      title: '⚠️ Overdue Task Reminder',
      message: `🚨 Overdue Reminder: Follow-up on "Urgent: Your Electricity Bill is Due Today". Deadline: ${new Date('2026-07-05T00:00:00Z').toLocaleString()}`,
      metadata: { emailId: emailDdl3.id, overdue: true } as any,
    },
  });

  // Deadline 4: Passport Appointment (future)
  await prisma.thread.create({
    data: {
      id: 'thread-ddl-4',
      summary: 'Passport renewal processes',
    },
  });

  const emailDdl4 = await prisma.email.create({
    data: {
      userId,
      messageId: 'msg-ddl-4',
      sender: 'services@government.gov',
      recipient: email,
      subject: 'Passport Renewal Appointment Instructions',
      body: `
        <p>Alex Chen,</p>
        <p>Your appointment is scheduled for July 15, 2026. Prepare all required verification documentations prior.</p>
      `,
      category: 'personal',
      status: 'PROCESSED',
      threadId: 'thread-ddl-4',
      createdAt: daysAgo(2),
    },
  });

  await prisma.emailAnalysis.create({
    data: {
      emailId: emailDdl4.id,
      category: 'personal',
      deadlines: ['2026-07-15T09:00:00Z'],
      summary: 'Passport renewal appointment instructions. Scheduled on July 15, 2026.',
      priorityScore: 75,
    },
  });

  await prisma.actionItem.create({
    data: {
      emailId: emailDdl4.id,
      taskDescription: 'Assemble verification documents for passport appointment',
      deadline: new Date('2026-07-15T09:00:00Z'),
    },
  });

  const reminderDdl4 = await prisma.reminder.create({
    data: {
      userId,
      emailId: emailDdl4.id,
      deadline: new Date('2026-07-15T09:00:00Z'),
      offsets: [1440, 60, 0],
      status: 'active',
    },
  });

  try {
    for (const offset of [1440, 60, 0]) {
      const triggerTime = new Date(new Date('2026-07-15T09:00:00Z').getTime() - offset * 60 * 1000);
      const delay = triggerTime.getTime() - Date.now();
      if (delay > 0) {
        await reminderQueue.add(
          `reminder-${reminderDdl4.id}-${offset}`,
          {
            reminderId: reminderDdl4.id,
            userId,
            emailId: emailDdl4.id,
            deadline: new Date('2026-07-15T09:00:00Z'),
            offset,
            isSnoozed: false,
          },
          { delay, removeOnComplete: true, removeOnFail: true }
        );
      }
    }
  } catch (qErr) {
    console.warn('⚠️ Could not queue BullMQ jobs for Reminder 4. Skipping.');
  }

  console.log('✅ Database seeding complete. Ready for developer testing!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
