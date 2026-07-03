# 🚀 InboxOS Local Setup Guide

Welcome to the local development setup guide for **InboxOS**—a decision + execution layer for AI email automation. This document will guide you through setting up your local environment, installing dependencies, configuring database migrations, and running the services.

---

## 📋 Prerequisites

Before you start, ensure you have the following installed on your local machine:

1. **Node.js (v18.0.0 or higher)**
   - Used for the frontend client and the primary backend server.
   - [Download Node.js](https://nodejs.org/)
2. **PostgreSQL (v15.0 or higher)**
   - Used as the persistent database layer.
   - [Download PostgreSQL](https://www.postgresql.org/download/)
3. **Docker & Docker Compose (v2.0 or higher)**
   - Highly recommended for spinning up PostgreSQL, Redis, and other services with a single command.
   - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
4. **Python (v3.11 or higher)** *(Optional / API dependent)*
   - Required if you are running the FastAPI Python API server manually.
   - [Download Python](https://www.python.org/downloads/)
5. **Redis (v7.0 or higher)** *(Optional)*
   - Used for caching and asynchronous Celery tasks. Required if running the backend manually without Docker.
   - [Download Redis](https://redis.io/download/)

---

## 🛠️ Step-by-Step Installation

### Step 1: Clone the Repository
Clone the repository and navigate into the project directory:

```bash
git clone https://github.com/inboxos/inboxos.git
cd inboxos
```

---

### Step 2: Configure Environment Variables
InboxOS reads configurations from environment variable files. You need to copy the template `.env.example` file and configure it:

```bash
# Copy the example environment file to the active configuration location
cp infrastructure/config/env/.env.example infrastructure/config/env/.env
```

Now, open the newly created [infrastructure/config/env/.env](../../infrastructure/config/env/.env) file in your editor and adjust the settings:

#### 🔑 Key Environment Variables Explained

Refer to [infrastructure/config/env/.env.example](../../infrastructure/config/env/.env.example) for reference:

| Key | Description | Default / Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | Database connection string. If you are using PostgreSQL, configure it with your credentials. | `sqlite:///./inboxos.db` |
| `REDIS_URL` | Redis URL for message broker and cache storage. | `redis://localhost:6379/0` |
| `AI_PROVIDER` | Selected intelligence engine (`openai`, `gemini`, `ollama`, or `mock`). | `mock` |
| `OPENAI_API_KEY` | Your API key if `AI_PROVIDER` is set to `openai`. | `sk-proj-...` |
| `GEMINI_API_KEY` | Your API key if `AI_PROVIDER` is set to `gemini`. | `AIzaSy...` |
| `OLLAMA_BASE_URL` | The endpoint of your local Ollama server if `AI_PROVIDER` is `ollama`. | `http://localhost:11434` |
| `JWT_SECRET` | Cryptographic secret for signing API tokens. Change this to a random 32-char string. | `change-this-to-a-random-32-char-string-in-production` |
| `TELEGRAM_BOT_TOKEN` | Token for the Telegram Bot API credentials. | `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ` |
| `TELEGRAM_WEBHOOK_SECRET` | Secret token to authenticate incoming requests from Telegram API. | `my-secure-webhook-secret-token` |
| `TELEGRAM_WEBHOOK_URL` | Public base URL of your API backend server to register webhooks (leave empty for background long-polling fallback). | `https://api.yourdomain.com` |
| `TELEGRAM_ALLOWED_CHAT_IDS` | Comma-separated whitelist list of Telegram chat IDs authorized to interact with the bot (leave empty to allow all). | `12345678,98765432` |

> [!NOTE]
> For a step-by-step walkthrough on how to set up your own Telegram Bot for local development, refer to [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md).

---

### Step 3: Database Migrations
Prisma ORM is used by the Node.js backend. You must initialize your database schema before starting the application:

```bash
# Navigate to the backend folder
cd backend

# Install the package dependencies
npm install

# Run database migrations to construct the database schema
npx prisma migrate dev
```
> [!NOTE]
> The schema is defined in [schema.prisma](../../backend/prisma/schema.prisma) and targets a PostgreSQL database. Ensure your connection URL is set correctly in your environment variables before running migrations.

---

### Step 4: Run the Application

You can start the InboxOS stack using Docker Compose (Recommended) or run the individual services manually.

#### Option A: Docker Compose Setup (Recommended)
This runs all microservices (Postgres, Redis, API Backend, Celery, and Frontend) in containerized environments:

```bash
# Spin up all services using the compose file in infrastructure/docker/
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

To stop the containers:
```bash
docker compose -f infrastructure/docker/docker-compose.yml down
```

---

#### Option B: Manual Setup (Local Debugging)
Run this if you want to run the processes natively on your machine:

##### 1. Start the Node.js Backend Server
In your first terminal window:
```bash
cd backend
npm install
npm start
```

##### 2. Start the Vite/React Frontend Client
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

---

## 🎯 Verification

Once all services are running, verify they are working by accessing these URLs:

### For Docker Compose Setup (Recommended)
- **Frontend Application Dashboard:** [http://localhost](http://localhost)
- **Node.js Backend Server:** [http://localhost:8000](http://localhost:8000) (Metrics: [http://localhost:8000/metrics](http://localhost:8000/metrics))

### For Manual Setup (Local Debugging)
- **Frontend Application Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Node.js Backend Server (if running):** [http://localhost:8000](http://localhost:8000) (Metrics: [http://localhost:8000/metrics](http://localhost:8000/metrics))
