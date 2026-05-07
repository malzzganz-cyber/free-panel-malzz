# 🚀 Malzz Hosting — Premium Pterodactyl Management Panel

A modern, full-stack Pterodactyl management platform built with **Express.js**, **Firebase**, and a stunning dark-mode dashboard UI.

---

## ✨ Features

- **Instant Panel Creation** — Create Pterodactyl users + servers in one click
- **Server Management** — List, search, monitor, and delete servers
- **Admin Management** — Create and remove Pterodactyl admin accounts
- **Analytics Dashboard** — Chart.js charts for server trends and resource usage
- **Realtime Notifications** — Firebase-powered notification system
- **Activity Logs** — Full audit trail of every system action
- **JWT Authentication** — Secure login with token-based auth
- **Rate Limiting** — Prevent abuse with express-rate-limit
- **Glassmorphism UI** — Premium dark-mode design inspired by Vercel, Linear, Supabase
- **Fully Responsive** — Works on mobile, tablet, and desktop

---

## 📁 Project Structure

```
malzz-hosting/
├── public/
│   ├── css/
│   │   └── style.css         # Global styles + glassmorphism theme
│   ├── js/
│   │   ├── utils.js          # API client, Toast, Modal, Helpers
│   │   └── dashboard.js      # Dashboard logic & page navigation
│   ├── index.html            # Landing page
│   ├── login.html            # Login page
│   └── dashboard.html        # Main dashboard (SPA)
├── src/
│   ├── firebase/
│   │   └── admin.js          # Firebase Admin SDK init
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── servers.controller.js
│   │   ├── admins.controller.js
│   │   └── analytics.controller.js
│   ├── middleware/
│   │   └── auth.js           # JWT middleware
│   ├── routes/
│   │   └── index.js          # All API routes
│   ├── services/
│   │   ├── pterodactyl.js    # Pterodactyl API service
│   │   └── firebase.service.js # Firebase operations
│   ├── utils/
│   │   └── logger.js         # Winston logger
│   ├── logs/                 # Log files (auto-created)
│   └── app.js                # Express app entry point
├── .env.example
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A running Pterodactyl installation
- Firebase project

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/malzz-hosting.git
cd malzz-hosting
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env
```

Fill in all values (see Environment Variables section below).

### 3. Run Development

```bash
npm run dev
```

### 4. Run Production

```bash
npm start
```

Visit `http://localhost:3000` — the landing page will load. Go to `/login.html` to sign in.

---

## 🔧 Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `JWT_SECRET` | Secret for signing JWT tokens (min 32 chars) |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `PTERO_DOMAIN` | Your Pterodactyl panel URL (e.g. `https://panel.yourdomain.com`) |
| `PTERO_API_KEY` | Pterodactyl Application API key |
| `PTERO_CLIENT_API` | Pterodactyl Client API key |
| `PTERO_NODE_ID` | Default node ID |
| `PTERO_NEST_ID` | Default nest ID |
| `PTERO_EGG_ID` | Default egg ID |
| `PTERO_LOCATION_ID` | Default location ID |
| `PTERO_ALLOCATION_ID` | Default allocation ID |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK client email |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK private key |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `ADMIN_USERNAME` | Dashboard login username |
| `ADMIN_PASSWORD` | Dashboard login password |
| `ADMIN_EMAIL` | Admin email shown in UI |

---

## 🔥 Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Firestore Database** (start in test mode, then apply security rules)
4. Go to **Project Settings → Service Accounts** → Generate new private key
5. Copy the JSON values into your `.env` file

### Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only allow server-side Admin SDK access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Collections Created Automatically

- `users` — Pterodactyl user records
- `admins` — Admin account tracking
- `servers` — Server records
- `logs` — Login logs
- `analytics` — Daily analytics data
- `notifications` — System notifications
- `activity` — Full activity audit trail
- `settings` — Application settings

---

## 🦕 Pterodactyl Setup

1. Log into your Pterodactyl panel as admin
2. Go to **Admin Area → Application API**
3. Create a new API key with all permissions — copy to `PTERO_API_KEY`
4. Go to **Admin Area → Account API** (or client area)
5. Create a client API key — copy to `PTERO_CLIENT_API`

Make sure you set the correct IDs for:
- `PTERO_NODE_ID` — Your server node ID
- `PTERO_NEST_ID` — The egg nest (e.g. Minecraft = 1)
- `PTERO_EGG_ID` — The specific egg (e.g. Paper = 15)
- `PTERO_LOCATION_ID` — Your datacenter location ID
- `PTERO_ALLOCATION_ID` — A free allocation ID

---

## 🌐 VPS Deployment

### Method 1: PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the app
pm2 start src/app.js --name malzz-hosting

# Auto-start on reboot
pm2 startup
pm2 save
```

### Method 2: Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then get SSL with Certbot:
```bash
sudo certbot --nginx -d yourdomain.com
```

### Method 3: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "src/app.js"]
```

```bash
docker build -t malzz-hosting .
docker run -d -p 3000:3000 --env-file .env malzz-hosting
```

---

## 📡 API Documentation

All API routes are prefixed with `/api` and protected by JWT (except login).

### Authentication

**POST** `/api/auth/login`
```json
{ "username": "admin", "password": "yourpassword" }
```
Returns: `{ success: true, token: "jwt...", user: {...} }`

**POST** `/api/auth/logout` — Logs out (requires Bearer token)

**GET** `/api/auth/me` — Returns current user info

---

### Servers

**POST** `/api/servers/create`
```json
{
  "username": "playerone",
  "email": "player@example.com",
  "ram": 1024,
  "disk": 5120,
  "cpu": 100,
  "telegramId": "@playerone",
  "serverName": "MyServer",
  "databases": 1,
  "backups": 1
}
```

**GET** `/api/servers?page=1` — List all servers

**DELETE** `/api/servers/:id` — Delete server by Pterodactyl ID

**GET** `/api/servers/status` — Quick status overview

---

### Admins

**POST** `/api/admins/create`
```json
{
  "username": "newadmin",
  "email": "newadmin@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

**GET** `/api/admins` — List all tracked admins

**DELETE** `/api/admins/:id` — Delete admin by Firebase doc ID

---

### Bulk Operations

**POST** `/api/bulk/delete-users`
```json
{ "userIds": [1, 2, 3] }
```

**POST** `/api/bulk/delete-servers`
```json
{ "serverIds": [10, 11, 12] }
```

---

### Analytics & Logs

**GET** `/api/analytics` — Dashboard analytics + chart data

**GET** `/api/notifications` — Recent system notifications

**GET** `/api/activity?limit=50` — Activity log entries

---

## 🔒 Security

- JWT tokens with configurable expiry
- Rate limiting: 100 requests per 15 minutes per IP
- Helmet security headers (CSP, HSTS, etc.)
- Input validation on all endpoints
- All secrets via environment variables
- Login attempts logged to Firebase
- Failed logins return generic error messages

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Express.js 4.x |
| Auth | JSON Web Tokens (jsonwebtoken) |
| Database | Firebase Firestore |
| Storage | Firebase Storage |
| Logging | Winston |
| HTTP Client | Axios |
| Security | Helmet, express-rate-limit |
| Frontend | HTML5, CSS3, Vanilla JS |
| Styling | Tailwind CSS CDN + Custom CSS |
| Charts | Chart.js 4 |
| Fonts | Google Fonts (Outfit, JetBrains Mono) |

---

## 🐛 Troubleshooting

**Firebase connection error**
- Verify `FIREBASE_PRIVATE_KEY` includes `\n` newlines
- Check `FIREBASE_PROJECT_ID` matches your project

**Pterodactyl API errors**
- Ensure API key has all permissions enabled
- Check `PTERO_DOMAIN` has no trailing slash
- Verify `PTERO_ALLOCATION_ID` is a free (unassigned) allocation

**Login fails**
- Check `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`
- Look in `src/logs/combined.log` for error details

---

## 📄 License

MIT License — Free to use, modify, and sell.

---

Built with ❤️ by **Malzz Hosting** — Premium Pterodactyl Management
