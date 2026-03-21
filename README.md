<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=32&duration=3000&pause=1000&color=6366F1&center=true&vCenter=true&width=600&lines=InvoiceAI+%F0%9F%9A%80;Smart+Invoice+Generator;Powered+by+AI" alt="Typing SVG" />

<br/>

![Version](https://img.shields.io/badge/version-1.0.0-6366f1?style=for-the-badge)
![Vue](https://img.shields.io/badge/Vue.js-3.0-42b883?style=for-the-badge&logo=vuedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=black)
![Node](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Cache-dc382d?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?style=for-the-badge&logo=docker&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-AI-f55036?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

<br/>

> **InvoiceAI** is a commercial-grade invoice management platform with a built-in AI assistant that knows your business. Generate beautiful PDF invoices, track payments, manage clients, and get real financial insights — all in one place.

<br/>

[Demo](#) · [Features](#features) · [Quick Start](#quick-start) · [Requirements](./REQUIREMENTS.md) · [Screenshots](#screenshots)

</div>

---

## Screenshots

<img width="1919" height="968" alt="image" src="https://github.com/user-attachments/assets/0bf46013-9a41-4530-9ae1-5a7e0054c47b" />


---

## Features

### Invoices
- Create and manage invoices with a beautiful drag-and-drop UI
- Auto-calculate taxes, discounts, and totals
- Generate pixel-perfect PDF invoices
- Send directly to client email
- Track statuses: Draft, Sent, Paid, Overdue

### Clients
- Full client database with invoice history
- Search, filter, and sort
- Per-client analytics and revenue tracking

### Dashboard
- Animated revenue charts by month
- Top clients ranking
- Overdue invoice alerts
- Cash flow overview

### AI Assistant
- Knows your real financial data — not generic answers
- Advises when to follow up on unpaid invoices
- Helps write service descriptions
- Predicts next month cash flow
- Supports Russian and English
- Powered by Groq API (llama-3.3-70b-versatile)

### Design
- Dark theme with glassmorphism effects
- Smooth GSAP and Framer Motion animations
- Page transitions, skeleton loaders, toast notifications
- Fully responsive

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue.js 3, React 18, Tailwind CSS |
| Animations | GSAP, Framer Motion |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Cache | Redis |
| AI | Groq API (llama-3.3-70b-versatile) |
| PDF | PDFKit |
| Email | Nodemailer |
| Auth | JWT |
| DevOps | Docker, Docker Compose |

---

## Quick Start

### Requirements

Full details: **[REQUIREMENTS.md](./REQUIREMENTS.md)** — Node.js, Docker, PostgreSQL/Redis, ports, Groq/SMTP, browsers.

**Short list:**
- **Docker + Docker Compose** (recommended), or **Node.js 20+** with local PostgreSQL & Redis
- **Groq API key** (optional — [console.groq.com](https://console.groq.com/) — for AI chat)
- **SMTP** (optional — for sending invoices by email)

### 1. Clone the repository
```bash
git clone https://github.com/AmaterasuKS/InvoiceAI.git
cd InvoiceAI
```

### 2. Add your API key

Open `backend/.env` and add your Groq API key:
```env
GROQ_API_KEY=your_key_here
```

### 3. Start everything with one command
```bash
docker-compose up --build
```

### 4. Open in browser
```
http://localhost:5173
```

That is it. All services start automatically.

---

## How It Works

The user registers and sets up their company profile. Invoices are
created through an intuitive form, automatically calculated, and
exported as PDF via PDFKit. Each invoice can be sent directly to
the client by email. The built-in AI assistant pulls real data from
the PostgreSQL database on every request, giving personalized
financial advice based on actual invoice history, top clients, and
overdue payments. Chat history is stored in Redis for context
continuity across sessions.

---

## API Endpoints
```
POST   /api/auth/register      Register new user
POST   /api/auth/login         Login and get JWT token
GET    /api/clients            Get all clients
POST   /api/clients            Create client
GET    /api/invoices           Get all invoices
POST   /api/invoices           Create invoice
PATCH  /api/invoices/:id       Update invoice status
POST   /api/invoices/:id/pdf   Generate PDF
POST   /api/invoices/:id/send  Send invoice by email
POST   /api/ai/chat            Chat with AI assistant
```

---

## Project Structure
```
invoiceai/
├── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── react/
│   │   │   │   ├── PDFPreview.jsx
│   │   │   │   └── AIChat.jsx
│   │   │   ├── Sidebar.vue
│   │   │   ├── Navbar.vue
│   │   │   ├── StatsCard.vue
│   │   │   ├── InvoiceTable.vue
│   │   │   └── RevenueChart.vue
│   │   ├── views/
│   │   │   ├── Dashboard.vue
│   │   │   ├── Invoices.vue
│   │   │   ├── CreateInvoice.vue
│   │   │   ├── Clients.vue
│   │   │   └── Auth.vue
│   │   ├── stores/
│   │   ├── router/
│   │   └── api/
└── backend/
    └── src/
        ├── controllers/
        ├── models/
        ├── routes/
        ├── services/
        └── config/
```

---

## Author

<div align="center">

**Kyrylo Sverbiy**

[![GitHub](https://img.shields.io/badge/GitHub-AmaterasuKS-181717?style=for-the-badge&logo=github)](https://github.com/AmaterasuKS)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077b5?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/yourprofile)

*Built with passion and attention to detail.*
*Every line of code written and understood.*

</div>

---

<div align="center">

![Made with](https://img.shields.io/badge/Made%20with-passion-6366f1?style=for-the-badge)
![Built by](https://img.shields.io/badge/Built%20by-Kyrylo-8b5cf6?style=for-the-badge)

</div>
