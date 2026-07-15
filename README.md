<div align="center">
  <h1>🚀 CareerForge AI</h1>
  <p><strong>The Next-Generation AI Career Optimization Platform</strong></p>

  <p>
    <img src="https://img.shields.io/badge/License-Proprietary-red.svg" alt="License: Proprietary" />
    <img src="https://img.shields.io/badge/React-18-blue.svg" alt="React 18" />
    <img src="https://img.shields.io/badge/TypeScript-Strict-blue.svg" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Node.js-Express-green.svg" alt="Node.js" />
    <img src="https://img.shields.io/badge/Database-PostgreSQL-blue.svg" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/AI-Gemini_Flash-orange.svg" alt="Google Gemini API" />
    <img src="https://img.shields.io/badge/Payments-Stripe-purple.svg" alt="Stripe" />
  </p>
</div>

> **🚨 PROPRIETARY & CONFIDENTIAL 🚨**  
> This repository contains the proprietary, commercial source code for **CareerForge AI**. Unauthorized copying, distribution, reverse engineering, or modification of this code—in whole or in part—is strictly prohibited and punishable by law. See the `LICENSE` file for full terms.

---

## 📖 Executive Summary

**CareerForge AI** is a premium, full-stack AI SaaS platform engineered to give job seekers an unfair advantage in the modern job market. It seamlessly analyzes resumes against Applicant Tracking Systems (ATS), generates bespoke cover letters, and simulates real-world interviews using advanced LLM technology. 

Designed for high-availability production deployment, CareerForge AI utilizes a decoupled architecture with a highly-performant Node.js backend and a hyper-responsive React frontend, backed by PostgreSQL and robust background queue processing.

---

## ⚡ Core Platform Capabilities

* 🎯 **Hyper-Accurate ATS Scoring**: Our proprietary parsing engine maps exact keywords, analyzes semantic density, verifies formatting constraints, and grades resumes identically to modern enterprise ATS systems (Workday, Greenhouse, Lever).
* 📄 **Automated "Harvard-Style" PDF Generation**: Instant, one-click export to a guaranteed machine-readable, flawlessly formatted PDF using a custom layout engine.
* ✍️ **Context-Aware Cover Letters**: Automated AI drafting that understands the exact delta between a user's experience and the target Job Description, matching tone and style.
* 👔 **Interactive Interview Prep**: Generates high-probability technical and behavioral questions based on the candidate's specific profile and the role's requirements.
* 💰 **Integrated Monetization & Quota Management**: Fully integrated Stripe recurring billing with tiered usage limits, hard-capped API quotas, and webhook-driven subscription syncing.
* 📊 **Comprehensive Admin Dashboard**: Global CMS to monitor signups, track LLM API usage, manage user subscriptions, and toggle platform feature flags.

---

## 🛠️ System Architecture & Tech Stack

CareerForge AI is built on a modern, decoupled architecture ensuring high availability, type safety, and rapid iteration.

### 🎨 Frontend (Client)
- **Framework**: React 18 & Vite (Ultra-fast HMR)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 (Glassmorphism, gradients, modern utility classes)
- **State Management**: React Context API & Custom Hooks
- **Animations**: Framer Motion for micro-interactions
- **Icons & Typography**: Lucide React + Inter Font Family
- **PDF Generation**: jsPDF + custom layout engine

### ⚙️ Backend (API Server)
- **Runtime**: Node.js
- **Framework**: Express.js REST API
- **Language**: TypeScript
- **Database**: PostgreSQL (Relational Data Modeling)
- **ORM**: Prisma (Type-safe queries, connection pooling & migrations)
- **Queueing & Cron**: BullMQ + Redis + node-cron (For asynchronous email & webhooks)
- **Authentication**: JWT-based stateless Auth + OAuth 2.0 (Google)

### 🔌 Third-Party Integrations
- **AI Core**: Google Gemini API (Core LLM logic for parsing and generation)
- **Payments**: Stripe (Checkout, Webhooks, Billing Portal, Subscriptions)
- **Storage**: Cloudinary (Secure resume & asset hosting)
- **Analytics**: PostHog (Product analytics) & Sentry (Error tracking/tracing)
- **Email**: Resend / SMTP (Transactional notifications)

---

## 🧠 Deep-Dive: AI & LLM Pipeline

The core of CareerForge AI relies on multi-stage LLM prompting and deterministic parsing:
1. **Extraction Phase**: The resume is parsed locally (PDF/Docx to text) and sent to the LLM to extract structured entities (Skills, Experience, Education).
2. **Analysis Phase**: The Job Description is processed similarly to extract mandatory vs. optional requirements.
3. **Scoring Engine**: A custom deterministic engine calculates a weighted grade (40% Keyword Match, 30% Experience Depth, 20% Formatting, 10% Soft Skills) to prevent LLM hallucination on numerical scoring.
4. **Generation Phase**: Cover letters and interview questions are generated with low `temperature` settings to ensure professional, realistic outputs.

---

## 👥 Role-Based Access Control (RBAC)

- **Unauthenticated Users**: Can view landing pages, pricing, and login/register.
- **Free Tier Users (`FREE`)**: Restricted to a monthly quota (e.g., 5 ATS scans). Cannot access advanced interview prep.
- **Pro Tier Users (`PRO`)**: Unlimited usage (subject to fair-use rate limits), priority support, and advanced cover letter templates.
- **Administrators (`ADMIN`)**: Full access to global analytics, user management, and system-wide overrides via `/admin` dashboard.

---

## 🗄️ Database Schema Overview

Our PostgreSQL database (managed by Prisma) relies on these core models:
- **`User`**: Manages credentials, roles, OAuth tokens, and Stripe `customerId`.
- **`Subscription`**: Tracks active Stripe plans, renewal dates, and status (`active`, `canceled`, `past_due`).
- **`Resume`**: Stores parsed version of uploaded resumes.
- **`Scan` / `ATSReport`**: Stores historical ATS matches, extracted missing keywords, and the generated scores.
- **`CoverLetter` / `InterviewPrep`**: Stores generated AI artifacts tied to specific users and scans.

---

## 📂 Comprehensive Project Structure

```text
careerforge-ai/
├── prisma/                 # Database schema and migration histories
│   └── schema.prisma       # Core relational models (Users, Scans, Subscriptions)
├── public/                 # Static public assets (Favicons, OpenGraph images)
├── server/                 # Express Backend API
│   ├── config/             # Environment validation (Zod)
│   ├── routes/             # API Endpoints (Auth, ATS, Stripe, Admin)
│   ├── middleware/         # Security guards (Rate limits, JWT auth, RBAC)
│   ├── services/           # Business logic (AI engines, Email, Cloudinary)
│   ├── lib/                # Shared utilities and Cron Jobs
│   └── server.ts           # Server bootstrap and cluster setup
├── src/                    # React UI Codebase
│   ├── components/         # Atomic UI & complex widgets
│   ├── contexts/           # Global State (Auth, Theme, Toast)
│   ├── pages/              # Routing views (Analyzer, Dashboard, Billing)
│   ├── types/              # Shared TS Interfaces
│   └── utils/              # Client-side helpers (PDF parsing, formatting)
├── .env.example            # Boilerplate environment configuration
├── .gitignore              # Ignored builds, secrets, and caches
└── package.json            # Monolithic dependency tracking & scripts
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.x` or higher
- **Database**: PostgreSQL instance (Local or Cloud)
- **Redis**: Required for BullMQ background jobs (Optional if falling back to local loops)
- **API Keys**: Stripe, Gemini/OpenAI, Cloudinary

### Local Installation

1. **Clone the secure repository:**
   ```bash
   git clone <repository-url>
   cd resumeai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Copy `.env.example` to `.env` and fill in your secure credentials. Ensure `DATABASE_URL` is correctly mapped.
   ```bash
   cp .env.example .env
   ```

4. **Initialize Database:**
   Push the schema to your local PostgreSQL instance and generate the Prisma Client.
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   *This concurrently spins up the Vite frontend and the Express backend with hot-module replacement via `tsx`.*

### Available NPM Scripts
- `npm run dev`: Starts the application in development mode.
- `npm run build`: Compiles the Vite frontend and bundles the Express server using `esbuild` into `/dist`.
- `npm run clean`: Cleans build caches and output directories.
- `npm run lint`: Runs TypeScript compiler checks without emitting files.
- `npm run create-admin`: Helper script to promote a user to the Admin role via CLI.

---

## 🔐 Security & Compliance

For a commercial deployment, CareerForge AI implements several security layers:
- **Data Encryption**: Passwords hashed via `bcrypt`. JWTs securely signed.
- **Rate Limiting**: IP-based rate limiting via `express-rate-limit` backed by Redis to prevent API abuse.
- **Input Validation**: Strict schema validation using `Zod` on all incoming API requests.
- **XSS & CSRF Prevention**: Helmet.js for secure HTTP headers, strictly parameterized SQL queries (via Prisma) to prevent SQL Injection.
- **CORS Policies**: Explicit origin whitelisting for the frontend client.

---

## 🚢 Deployment Strategy

CareerForge AI is container-ready and designed for PaaS/IaaS deployment.

- **Database**: Supabase, AWS RDS, or Aiven (PostgreSQL).
- **Backend API**: Render, AWS Elastic Beanstalk, or Railway. Ensure `NODE_ENV=production`.
- **Frontend App**: Vercel, Netlify, or AWS Amplify.
- **Cache**: Upstash or AWS ElastiCache (Redis).

**Critical Notice for Production**: 
Ensure CORS policies (`CLIENT_URL`) are strictly defined. Never expose the `.env` file or commit it to version control. Set up Sentry (`SENTRY_DSN`) to actively monitor production errors.

---

## ⚖️ License & Legal

This software is **Proprietary and Confidential**. All rights, title, and interest in and to the software, including all intellectual property rights therein, are the exclusive property of **CareerForge AI**. 

Unauthorized copying, modification, distribution, public display, or commercial exploitation is strictly prohibited. For licensing inquiries, compliance questions, or enterprise partnership, please contact the administrators.

*Copyright © 2024-Present CareerForge AI. All rights reserved.*
