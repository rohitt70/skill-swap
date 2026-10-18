# SkillSwap: Peer-to-Peer Student Skill Exchange Platform

**SkillSwap** is a secure, scalable peer-to-peer student skill exchange platform built with NestJS, Next.js, TypeScript, PostgreSQL, Prisma, and Socket.IO.

---

## 🚀 Quick Start Guide

You can run SkillSwap in two ways:
1. **Option A: One-Command Docker Setup** (Recommended - starts DB, Redis, Backend, and Frontend together)
2. **Option B: Local Node.js Development** (For active local development)

---

### Option A: Running with Docker Compose (Recommended)

#### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

#### 2. Start all services
In the project root directory (`skillswap`):
```bash
docker compose up -d
```

This starts:
- **PostgreSQL Database**: `localhost:5432`
- **Redis Cache & PubSub**: `localhost:6379`
- **Backend API & WebSockets**: `http://localhost:4000`
- **Frontend Next.js Web App**: `http://localhost:3000`

#### 3. Seed demo data
```bash
docker compose exec backend npm run prisma:seed
```

---

### Option B: Running Locally with Node.js & npm

#### 1. Prerequisites
- **Node.js**: v20 or higher (Current detected: v24.14.0)
- **PostgreSQL**: Running locally or via Docker
- **Redis**: (Optional in development)

If you only want PostgreSQL and Redis in Docker while running code locally:
```bash
docker compose up -d postgres redis
```

#### 2. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
cp .env.example backend/.env
```

Ensure `DATABASE_URL` in `backend/.env` points to your PostgreSQL instance:
```env
DATABASE_URL="postgresql://skillswap_user:skillswap_password@localhost:5432/skillswap_db?schema=public"
JWT_SECRET="dev_jwt_secret_min_32_chars_long_skillswap"
PORT=4000
FRONTEND_URL="http://localhost:3000"
```

#### 3. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

The backend starts at `http://localhost:4000`.
- **Interactive Swagger OpenAPI Docs**: `http://localhost:4000/api/docs`

#### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

The frontend web application starts at `http://localhost:3000`.

---

## 👥 Demo Student Credentials (Pre-seeded)

Use any of these pre-seeded student accounts to test discovery, matching, friend requests, and secure chat:

| Name | Email | Password | Role | Skills Offered / Wanted |
|---|---|---|---|---|
| **Alice Chen** | `alice@university.edu` | `Password123!` | Student | Teaches: **Python** $\leftrightarrow$ Learns: **Graphic Design** |
| **Bob Rivera** | `bob@university.edu` | `Password123!` | Student | Teaches: **Graphic Design** $\leftrightarrow$ Learns: **Python** |
| **Charlie Kim** | `charlie@university.edu` | `Password123!` | Admin | Teaches: **Calculus & Linear Algebra** |

*(Notice: Alice and Bob are mutual matches and pre-connected friends!)*

---

## 🧪 Running Automated Tests

To run the backend security, friend request lifecycle, and authorization tests:
```bash
cd backend
npm test
```

---

## 🔒 Key Security Features Implemented
- **Argon2id Password Hashing**: State-of-the-art memory-hard password protection.
- **Inactivity Chat Lifecyle**:
  - Inactivity warning at 5 minutes
  - Inactivity lock at 10 minutes
  - Absolute session cutoff at 60 minutes
  - 15-minute rejoin window
- **Server-Side Authorization**: Conversations and message channels strictly verify user participation in the database before granting access or message delivery.
- **Safe Audit Logging**: Credential tokens and message content are filtered out of logs.
