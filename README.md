# InvoiceAI — Smart Invoice Generator

Коммерческий продукт уровня стартапа: учёт клиентов и инвойсов, PDF, email, дашборд и AI‑ассистент с **реальным контекстом** из PostgreSQL (Groq API).

## Возможности

- **Авторизация** — регистрация, вход, JWT, профиль компании (название, лого, реквизиты JSON).
- **Клиенты** — CRUD, поиск, карточка с аналитикой по инвойсам.
- **Инвойсы** — позиции, налоги, статусы `draft | sent | paid | overdue`, список с сортировкой и пагинацией.
- **Дашборд** — выручка, график по месяцам (Chart.js), топ клиенты, неоплаченные, % оплаты.
- **AI‑чат** (React) — `/api/ai/chat`, история в Redis (10 сообщений), промпт с агрегатами по пользователю.
- **UI** — Vue 3 + React‑острова (PDF preview, чат), тёмная тема, glassmorphism, анимации (GSAP, Framer Motion).

## Стек

| Слой | Технологии |
|------|------------|
| Frontend | Vue 3 (Composition API), React 18, Vite 5, Pinia, Vue Router, Tailwind (зависимости), Chart.js, vue-chartjs, GSAP, Framer Motion, Axios |
| Backend | Node.js 20, Express, PostgreSQL (pg), Redis, JWT, PDFKit, Nodemailer, Groq SDK |
| Infra | Docker Compose: `frontend`, `backend`, `postgres`, `redis` |

## Быстрый старт (Docker)

Из корня репозитория:

```bash
docker compose up --build
```

- **Frontend:** http://localhost:5173  
- **Backend API:** http://localhost:3000  
- **Health:** http://localhost:3000/health  

Первый запуск подтянет `npm install` в контейнерах (тома `node_modules`).

### Переменные backend

Файл `backend/.env` уже предусмотрен в проекте. Перед продакшеном обязательно задайте:

| Переменная | Назначение |
|------------|------------|
| `PORT` | Порт API (по умолчанию `3000`) |
| `JWT_SECRET` | Секрет подписи JWT |
| `DATABASE_URL` | PostgreSQL (в Docker: `postgresql://postgres:postgres@postgres:5432/invoiceai`) |
| `REDIS_URL` | Redis (в Docker: `redis://redis:6379`) |
| `GROQ_API_KEY` | Ключ [Groq Console](https://console.groq.com/) |
| `SMTP_*` | Отправка писем (Gmail и др.) |

**Groq / SMTP:** без валидных ключей AI и email не заработают; остальной функционал доступен.

### CORS

По умолчанию API разрешает `http://localhost:5173`. Дополнительные origin через `CORS_ORIGIN` в окружении **backend** (через запятую).

### Frontend proxy в Docker

В `docker-compose.yml` для сервиса `frontend` задано `VITE_API_PROXY=http://backend:3000`, чтобы dev‑сервер Vite проксировал `/api` на backend внутри сети Compose.

Локально без Docker в `frontend` используется `VITE_API_PROXY` или по умолчанию `http://localhost:3000`.

## Локальная разработка без Docker

1. Поднимите PostgreSQL и Redis (или используйте Docker только для БД).
2. `backend/.env` — укажите `DATABASE_URL` и `REDIS_URL` на ваши инстансы.
3. Backend:

```bash
cd backend
npm install
npm run dev
```

4. Frontend:

```bash
cd frontend
npm install
npm run dev
```

Откройте http://localhost:5173 — запросы к `/api` проксируются на `localhost:3000`.

## API (кратко)

Базовый префикс: `/api`.

| Метод | Путь | Описание |
|--------|------|----------|
| POST | `/auth/register` | Регистрация |
| POST | `/auth/login` | Вход |
| GET/PATCH | `/auth/me` | Профиль (JWT) |
| CRUD | `/clients` | Клиенты |
| CRUD | `/invoices` | Инвойсы |
| GET | `/invoices/next-number` | Следующий номер |
| POST | `/ai/chat` | AI (JWT), тело `{ "message": "..." }` |

Заголовок: `Authorization: Bearer <token>`.

## Структура репозитория

```
invoiceai/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── src/
│   │   ├── config/      # database, redis
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/    # pdf, email, ai
│   │   └── index.js
│   ├── .env
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── assets/
    │   ├── components/  # vue + react/
    │   ├── router/
    │   ├── stores/
    │   ├── views/
    │   ├── App.vue
    │   └── main.js
    ├── index.html
    └── package.json
```

## PDF и email по HTTP

Сервисы **PDF** (`pdfService.js`) и **email** (`emailService.js`) подключены в backend; при необходимости добавьте маршруты вида «скачать PDF» / «отправить на email» в `invoice`‑роутер и вызывайте эти сервисы из контроллера.

## Безопасность (продакшен)

- Смените `JWT_SECRET`, пароли БД, ограничьте CORS.
- Не публикуйте `backend/.env` в репозиторий.
- Настройте TLS и reverse proxy (nginx, Traefik и т.д.).

## Лицензия

Proprietary — использование по соглашению с правообладателем.

---

**InvoiceAI** — готовность к демо и тендеру: единая команда `docker compose up`, понятный стек и расширяемая архитектура.
