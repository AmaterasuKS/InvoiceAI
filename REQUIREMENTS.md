# Requirements — InvoiceAI

Everything you need to run, develop, or deploy **InvoiceAI** locally or in production.

---

## Runtime (recommended)

| Component | Version / notes |
|-----------|-----------------|
| **Node.js** | **20.x** or newer (LTS). Matches `engines` in `frontend/package.json` and `backend/package.json`. |
| **npm** | Comes with Node (or use **pnpm** / **yarn** if you prefer). |

Used when running **without** Docker (`npm run dev` in `frontend/` and `backend/`).

---

## Docker path (easiest)

| Tool | Version / notes |
|------|-----------------|
| **Docker Engine** | 24+ recommended |
| **Docker Compose** | v2 (`docker compose` CLI) |

**Resources:** at least **2 GB RAM** free for all containers (Postgres, Redis, Node x2). **4 GB+** recommended for comfortable dev.

**Ports used (default):**

| Port | Service |
|------|---------|
| **5173** | Vite dev server (frontend) |
| **3000** | Express API (backend) |
| **5432** | PostgreSQL |
| **6379** | Redis |

Ensure nothing else binds these ports, or change mappings in `docker-compose.yml`.

---

## Databases (if not using Compose DBs)

| Service | Version |
|---------|---------|
| **PostgreSQL** | **14+** (Compose uses **16** image) |
| **Redis** | **6+** (Compose uses **7** image) |

Connection strings go in `backend/.env` as `DATABASE_URL` and `REDIS_URL`.

---

## External APIs & accounts (optional but full feature set)

| Service | Required for | How to get |
|---------|----------------|------------|
| **Groq** | AI chat (`/api/ai/chat`) | [Groq Console](https://console.groq.com/) — API key → `GROQ_API_KEY` in `backend/.env` |
| **SMTP** | Sending invoices by email | Any SMTP provider (Gmail app password, SendGrid, etc.) → `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |

Without **Groq**, the rest of the app works; AI endpoints will return an error until a key is set.  
Without **SMTP**, PDF generation still works; email sending will fail until SMTP is configured.

---

## Browsers (frontend)

- **Chrome / Edge / Firefox / Safari** — latest stable (ES modules, CSS `backdrop-filter`, modern JS).

---

## Developer tooling (optional)

| Tool | Use |
|------|-----|
| **Git** | Clone, branch, PR workflow |
| **VS Code / Cursor** | Recommended IDE |

---

## Production checklist (extra)

- **TLS** (HTTPS) in front of the app and API.
- Strong **`JWT_SECRET`**, unique DB passwords, **never commit** `.env` (see `.gitignore`).
- **CORS**: set `CORS_ORIGIN` on the backend to your real frontend origin(s).
- **Backups** for PostgreSQL and any uploaded assets.

---

## Summary

**Minimum to try the stack:** Docker + Docker Compose + free Groq key in `backend/.env`.  
**Minimum without Docker:** Node 20+, PostgreSQL, Redis, configured `backend/.env`, then `npm install` + `npm run dev` in both apps.

For details, see **[README.md](./README.md)**.
