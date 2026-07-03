# 🤖 Configure Telegram Bot for Local Development

Every developer and contributor can run their own custom Telegram bot during local development without affecting anyone else or conflicting with production integrations.

Follow these 4 simple steps to set up your bot locally using long-polling.

---

## 🛠️ Step-by-Step Setup

### Step 1: Create a Bot via @BotFather
1. Open the [Telegram Client](https://telegram.org) and search for the official [@BotFather](https://t.me/botfather).
2. Start a conversation and send the command:
   ```text
   /newbot
   ```
3. Follow the prompts to name your bot and choose a unique username ending in `bot` (e.g., `my_inboxos_dev_bot`).

---

### Step 2: Retrieve your Bot Token
1. `@BotFather` will reply with a success message containing your HTTP API **Bot Token** (e.g., `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).
2. Copy this token. Keep it private.

---

### Step 3: Configure your local Environment
Open your local environment configuration file (located at `infrastructure/config/env/.env`) and add the following Telegram configurations:

```env
# Telegram Bot Token retrieved from @BotFather
TELEGRAM_BOT_TOKEN=YOUR_VERIFIED_BOT_TOKEN

# Username of your bot (excluding the '@' prefix)
TELEGRAM_BOT_USERNAME=my_inboxos_dev_bot

# Whitelisted chat IDs allowed to interact with the bot (recommended for privacy)
# Leave empty to allow any user to interact
TELEGRAM_ALLOWED_CHAT_IDS=YOUR_TELEGRAM_CHAT_ID

# Set mode to polling for local development
TELEGRAM_MODE=polling

# Leave webhook configs empty during local development
TELEGRAM_WEBHOOK_URL=
TELEGRAM_WEBHOOK_SECRET=
```

> [!TIP]
> To find your private Telegram Chat ID, search for and start a conversation with [@userinfobot](https://t.me/userinfobot) or [@ShowJsonBot](https://t.me/ShowJsonBot). It will immediately reply with your unique ID number.

---

### Step 4: Run the Backend
Start your local backend development server:

```bash
cd backend
npm install
npm start
```

On startup, you should see confirmation logs indicating the bot is authenticated and running in long-polling mode:
```json
{"level":"info","message":"[TelegramConfig] Configured with mode: POLLING","timestamp":"..."}
{"level":"info","message":"[TelegramConfig] Bot running locally using long-polling fallback.","timestamp":"..."}
{"level":"info","message":"[TelegramBot] Bot authenticated. Username: @my_inboxos_dev_bot","timestamp":"..."}
{"level":"info","message":"[TelegramBot] Running in POLLING mode. Starting background long-polling loop.","timestamp":"..."}
```

Start sending commands to your bot in Telegram!

---

## 🤖 Supported Bot Commands

* `/start <user-id>`: Links your chat ID to your local InboxOS user workspace.
* `/inbox`: Displays a list of all your active, pending action items/tasks.
* `/done <task-id>`: Marks the specified task/action item as completed in the database.
* `/status`: Queries system diagnostic status parameters.
* `/help`: Displays bot assistance commands.

---

## 🔒 Security Best Practices

1. **Never Commit Secrets:** Do not commit your `.env` or other private credentials. The environment configuration files (`.env`, `.env.local`, `.env.development`, `.env.production.local`) are ignored in `.gitignore`.
2. **Whitelist Chat IDs:** Always configure `TELEGRAM_ALLOWED_CHAT_IDS` in development to ensure no unauthorized users can fetch your inbox summaries or mark your items completed.
