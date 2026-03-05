# AI GitHub PR Risk Analyzer 🛡️

An AI-powered quality gate for your Pull Requests. This app automatically analyzes diffs using Gemini AI and a set of safety heuristics, then publishes a GitHub Check Run (SAFE, REVIEW, or BLOCK).

## Features
- **AI Analysis:** Uses Gemini Pro to understand the intent and risk of changes.
- **Safety Heuristics:** Automatically flags changes to auth, config, and critical system paths.
- **GitHub Checks:** Integrates directly into the GitHub UI (no comment spam).
- **MongoDB Persistence:** Tracks repository and analysis history.

---

## 🛠️ Local Setup

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- A Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))
- [smee-client](https://www.npmjs.com/package/smee-client) (for local webhooks)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and fill in the values:
```bash
cp .env.example .env
```

### 4. Database Migration
```bash
npx prisma db push
```

### 5. Start the Server
```bash
npm run dev
```

---

## 🚀 GitHub App Configuration

1. **Create App:** Go to GitHub Settings > Developer Settings > GitHub Apps > **New GitHub App**.
2. **Webhook URL:** Use a `smee.io` proxy URL (e.g., `https://smee.io/your-unique-id`).
   - Run `npx smee -u https://smee.io/your-unique-id -p 3000 -path /webhooks` locally.
3. **Permissions:**
   - **Repository permissions:**
     - Checks: `Read & write`
     - Metadata: `Read-only`
     - Pull requests: `Read-only`
   - **Subscribe to events:**
     - Pull request
4. **Private Key:** Generate a private key, download it, and paste its content into `GITHUB_PRIVATE_KEY` in your `.env`.
5. **Secrets:** Generate a **Webhook secret** and set it in both GitHub and your `.env`.

---

### 🏠 Hosting & Deployment

#### 1. Database (MongoDB Atlas)
- Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database).
- In "Database Access", create a user with read/write permissions.
- In "Network Access", allow your hosting provider's IP (or `0.0.0.0/0` for testing).
- Copy the Connection String and set it as `DATABASE_URL` in your `.env`.

#### 2. App Hosting (Railway / Render - Recommended)
I recommend **[Railway](https://railway.app/)** or **Render** for persistent Node.js processes:
1. **Connect GitHub:** Link your repository to a new project.
2. **Variables:** Add all keys from your `.env`.
3. **Deploy:** They will automatically detect `package.json` and run `npm start`.
4. **Update GitHub App:** Update the **Webhook URL** in your GitHub App settings to your production URL + `/webhooks`.

#### 3. App Hosting (Vercel)
1. **Push to GitHub:** Ensure your code is in a GitHub repo.
2. **Import Project:** Select your repo in the Vercel dashboard.
3. **Set Variables:** Add all environment variables from `.env`.
4. **Deploy:** Vercel will use the `vercel.json` configuration.
5. **CRITICAL:** Vercel Hobby accounts have a **10-second timeout**. Large PR analyses might fail if they take longer. For professional use, consider Railway or Vercel Pro.

---

### ✅ Deployment Checklist
- [ ] MongoDB connection string is correct and accessible.
- [ ] GitHub App `Webhook URL` points to your production server + `/webhooks`.
- [ ] `GITHUB_PRIVATE_KEY` is correctly formatted in environment variables.
- [ ] `GEMINI_API_KEY` is valid.

---

## 📖 How to Use
1. Install the app on your testing repository.
2. Open a Pull Request.
3. Observe the **"AI Risk Analyzer"** check run appearing in the PR status area.
4. Click **Details** to see the full AI breakdown, risk score, and review checklist.
