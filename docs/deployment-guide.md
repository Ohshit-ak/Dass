# 🚀 Felicity Event Management — Deployment Guide

This guide covers deploying the Felicity MERN stack application (React frontend + Express/Node.js backend + MongoDB Atlas).

---

## 📋 Prerequisites

- A [GitHub](https://github.com) account (to push your code)
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (cloud database — you already have this)
- A [Render](https://render.com) account **OR** a [Railway](https://railway.app) account (for the backend)
- A [Vercel](https://vercel.com) account **OR** [Netlify](https://netlify.com) account (for the frontend)
- A Gmail App Password for email (you already have this)

---

## Step 1: Push Code to GitHub

```bash
# From the project root: /Dass/
cd /home/akshith-kandagtla/Desktop/Dass-assignment-1/Dass

git init
git add .
git commit -m "Initial commit - Felicity Event Management"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```

> ⚠️ **Important:** Create a `.gitignore` in the project root before pushing:

```gitignore
# Node
node_modules/
.env

# React build (optional — Vercel builds it for you)
frontend/build/

# OS files
.DS_Store
Thumbs.db
```

---

## Step 2: Ensure MongoDB Atlas is Accessible

Your database is already on MongoDB Atlas. Just make sure:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com) → your cluster
2. **Network Access** → Click **"Add IP Address"** → Select **"Allow Access from Anywhere"** (`0.0.0.0/0`)
   - This is required so your deployed backend can connect
3. Copy your connection string — it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```

---

## Step 3: Deploy the Backend (Option A — Render)

### 3A.1 Create a Render Web Service

1. Go to [render.com](https://render.com) → **Dashboard** → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:

| Setting | Value |
|---|---|
| **Name** | `felicity-backend` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

### 3A.2 Add Environment Variables

In the Render dashboard, go to **Environment** and add:

| Key | Value |
|---|---|
| `MONGO_URI` | `mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/<db>?retryWrites=true&w=majority` |
| `JWT_SECRET` | `your-secret-key` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `your-email@gmail.com` |
| `SMTP_PASS` | `your-gmail-app-password` |
| `NODE_ENV` | `production` |

### 3A.3 Deploy

Click **"Create Web Service"**. Render will install dependencies and start your server.

Your backend URL will be: `https://felicity-backend.onrender.com`

> ⚠️ **Free tier note:** Render free instances spin down after 15 min of inactivity. First request after idle takes ~30s to wake up.

---

## Step 3: Deploy the Backend (Option B — Railway)

### 3B.1 Create a Railway Project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub Repo**
2. Select your repo
3. Railway will auto-detect Node.js

### 3B.2 Configure

- **Root Directory**: Set to `backend`
- **Start Command**: `npm start`

### 3B.3 Add Environment Variables

Same variables as the Render table above.

### 3B.4 Generate Domain

Go to **Settings** → **Networking** → **Generate Domain**

Your backend URL will be: `https://felicity-backend-production.up.railway.app`

---

## Step 4: Deploy the Frontend (Option A — Vercel)

### 4A.1 Import Project

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import your GitHub repo
3. Configure:

| Setting | Value |
|---|---|
| **Framework Preset** | Create React App |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `build` |

### 4A.2 Add Environment Variable

| Key | Value |
|---|---|
| `REACT_APP_API_URL` | `https://felicity-backend.onrender.com` *(your deployed backend URL)* |

> This is the variable used in `api.js` and `EventDetails.js` to connect to the backend.

### 4A.3 Deploy

Click **Deploy**. Vercel will build your React app and give you a URL like:
`https://felicity-frontend.vercel.app`

### 4A.4 Fix Client-Side Routing

Create a `vercel.json` in the `frontend/` folder:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This ensures React Router works correctly on page refresh.

---

## Step 4: Deploy the Frontend (Option B — Netlify)

### 4B.1 Import Project

1. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
2. Select your repo
3. Configure:

| Setting | Value |
|---|---|
| **Base directory** | `frontend` |
| **Build command** | `npm run build` |
| **Publish directory** | `frontend/build` |

### 4B.2 Add Environment Variable

Go to **Site settings** → **Environment variables**:

| Key | Value |
|---|---|
| `REACT_APP_API_URL` | `https://felicity-backend.onrender.com` |

### 4B.3 Fix Client-Side Routing

Create a `frontend/public/_redirects` file:

```
/*    /index.html   200
```

---

## Step 5: Update Backend CORS

After deploying the frontend, update `backend/index.js` to allow requests from your frontend domain instead of `*`:

```javascript
// Replace this:
app.use(cors());

// With this:
app.use(cors({
  origin: [
    'http://localhost:3000',                    // local dev
    'https://felicity-frontend.vercel.app'      // your deployed frontend URL
  ],
  credentials: true
}));

// Also update Socket.io CORS:
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://felicity-frontend.vercel.app'
    ],
    methods: ['GET', 'POST']
  }
});
```

Commit and push — Render/Railway will auto-redeploy.

---

## Step 6: Verify Deployment

1. **Backend health check**: Visit `https://your-backend-url.onrender.com` — should see a response or logs in Render dashboard
2. **Frontend**: Visit `https://your-frontend.vercel.app` — should see the landing page
3. **Test the flow**:
   - Sign up as a student
   - Sign up as a club (organizer)
   - Create an event → Publish it
   - Register as student → Verify QR email arrives
   - Test the forum (WebSocket)

---

## 🔧 Troubleshooting

### "CORS error" in browser console
- Make sure your backend CORS `origin` array includes your exact frontend URL (no trailing slash)
- Redeploy the backend after updating CORS

### "MongoDB connection error"
- Verify `MONGO_URI` is correctly set in environment variables
- Ensure Atlas Network Access allows `0.0.0.0/0`

### WebSocket / Socket.io not connecting
- Make sure `REACT_APP_API_URL` points to the backend (not just the API path)
- Verify Socket.io CORS is updated to include the frontend URL

### Emails not sending
- Gmail App Passwords work regardless of deployment. Make sure `SMTP_USER` and `SMTP_PASS` env vars are set
- Check backend logs for SMTP errors

### "Page not found" on refresh (404)
- Add the `vercel.json` rewrite (Vercel) or `_redirects` file (Netlify) as shown in Step 4

### Images/uploads not loading
- Your app stores files as base64 data URIs in MongoDB, so no filesystem storage is needed — this works on all platforms

---

## 📁 Environment Variables Summary

### Backend

| Variable | Description | Example |
|---|---|---|
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for JWT tokens | `my-super-secret-key-123` |
| `SMTP_HOST` | Email SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | Email SMTP port | `587` |
| `SMTP_USER` | Gmail address | `your-email@gmail.com` |
| `SMTP_PASS` | Gmail App Password | `xxxx xxxx xxxx xxxx` |
| `NODE_ENV` | Environment mode | `production` |

### Frontend

| Variable | Description | Example |
|---|---|---|
| `REACT_APP_API_URL` | Backend API base URL | `https://felicity-backend.onrender.com` |

---

## 🎯 Recommended Stack (Free Tier)

| Component | Service | Cost |
|---|---|---|
| **Database** | MongoDB Atlas (M0 Free) | Free |
| **Backend** | Render (Free Web Service) | Free |
| **Frontend** | Vercel (Hobby Plan) | Free |

This gives you a fully deployed MERN app at **zero cost**.
