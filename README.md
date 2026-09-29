# Express Auth Template

A production-ready Express + TypeScript authentication template. Clone this repo and use the Git tags to start at whichever auth strategy fits your project — no need to rewrite auth from scratch every time.

---

## Tech Stack

- **Runtime** — Node.js + TypeScript
- **Framework** — Express
- **ORM** — Prisma
- **Database** — PostgreSQL
- **Cache / Sessions** — Redis
- **Validation** — Zod
- **Email** — nodemailer
- **Auth** — JWT (access + refresh tokens), OAuth (Google)

---

## Getting Started

```bash
git clone https://github.com/AhmedBenaissaM10/express-template.git
cd express-template
npm install
cp .env.example .env
```

Fill in your `.env`, then:

```bash
npx prisma migrate dev
npm run dev
```

---

## Environment Variables

```env
PORT=3000
NODE_ENV=development

DATABASE_URL=postgresql://user:password@localhost:5432/db

REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret


GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

---

## Folder Structure

```
src/
├── config/
│   └── env.ts               # Zod env validation
├── errors/
│   ├── AppError.ts          # Base error class
│   └── ErrorIndex.ts        # Error factory helpers (badRequest, unauthorized…)
├── features/
│   ├── auth/
│   │   ├── authControllers.ts
│   │   ├── authRoute.ts
│   │   ├── authServices.ts
│   │   └── authValidators.ts  # Zod schemas
│   └── admin/
│       ├── adminControllers.ts
│       ├── adminRoute.ts
│       ├── adminServices.ts
│       └── adminValidators.ts
├── generated/
│   └── prisma/              # Prisma generated client output
├── lib/
│   ├── prisma.ts            # Prisma client
│   ├── redis.ts             # Redis client
│   └── mailer.ts            # Resend email client
├── middlewares/
│   ├── auth.ts              # requireAuth middleware
│   ├── errorHandler.ts      # Global error handler
│   ├── rateLimiter.ts       # Global + auth rate limiters
│   └── validate.ts          # Zod request validation middleware
├── utils/
│   ├── catchAsync.ts        # Async error wrapper
│   ├── cookie.ts            # Cookie helpers
│   ├── jwtUtils.ts          # JWT sign/verify utilities
│   └── logger.ts
├── app.ts
└── index.ts
```

---

## Git Tags — Pick Your Starting Point

The repo is built commit-by-commit. Each tag is a fully working checkpoint you can branch off from.

### `base/express-start`
> Express + Zod env validation + logger + error handler + Prisma

Commits:
1. Express setup (app + Zod env validation)
2. Folder structure
3. Logger + global error handler
4. Prisma connection (init)

---

### `auth/sessions`
> Cookie-based sessions with Redis, role-based access control, rate limiting

Commits:
5. Add User model (migrate + generate)
6. Auth routes + controllers + Zod validation (`/signup`, `/login`, `/logout`, `/me`)
7. Redis client setup
8. Session middleware + `requireAuth` middleware
9. Admin routes + controllers (`getAll`, `delete`, `update`, `promote`)
10. `authorize` (role-based) middleware → applied to admin routes
11. Rate limiting + smoke test

---

### `auth/jwt`
> Stateless JWT auth — sessions replaced with signed tokens

Commits:
12. JWT utilities (sign, verify helpers)
13. Swap sessions → JWT (middleware + controllers)

---

### `auth/refresh-access-tokens`
> Short-lived access tokens + long-lived refresh tokens with rotation

Commits:
14. Swap JWT → access + refresh tokens (rotation logic)
15. Refresh token rotation (invalidate old on use)

Token strategy:
- **Access token** — 15 min, stateless, verified by signature
- **Refresh token** — 7 days, stored in Redis, single-use

---

### `auth/otp-email`
> Email verification on signup via 6-digit OTP code

Commits:
16. Email OTP verification (`/verify-email`, `/resend-otp`)

Flow:
- Signup → OTP sent via Resend → user can't login until verified
- OTP stored in Redis with 10 min TTL
- Login on unverified account → new OTP sent automatically

---

### `auth/password-reset`
> Forgot password + reset password flow via email

Commits:
17. Forgot / reset password flow (`/forgot-password`, `/reset-password`)

---

### `auth/oauth-google`
> Google OAuth login

Commits:
18. OAuth — Google (`/auth/google`, `/auth/google/callback`)

---

## API Reference

### Auth Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/signup` | — | Register a new user |
| `POST` | `/api/auth/login` | — | Login + receive tokens |
| `POST` | `/api/auth/logout` | ✅ | Invalidate refresh token |
| `GET` | `/api/auth/me` | ✅ | Get current user |
| `POST` | `/api/auth/refresh` | — | Rotate refresh token |
| `POST` | `/api/auth/verify-email` | — | Verify OTP code |
| `POST` | `/api/auth/resend-otp` | — | Resend OTP code |
| `POST` | `/api/auth/forgot-password` | — | Send reset email |
| `POST` | `/api/auth/reset-password` | — | Reset password with token |
| `GET` | `/api/auth/google` | — | Initiate Google OAuth |
| `GET` | `/api/auth/google/callback` | — | Google OAuth callback |

### Admin Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/users` | ✅ Admin | Get all users |
| `DELETE` | `/api/admin/users/:id` | ✅ Admin | Delete a user |
| `PATCH` | `/api/admin/users/:id` | ✅ Admin | Update a user |
| `PATCH` | `/api/admin/users/:id/promote` | ✅ Admin | Promote to admin |

---

## Rate Limiting

| Limiter | Routes | Limit |
|---------|--------|-------|
| Global | All routes | 100 req / 60s |
| Auth | `/login`, `/signup`, `/resend-otp` | 5 req / 5 min, block 3 min |

Rate limit headers are included in every response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: Wed, 23 Jun 2026 12:00:00 GMT
Retry-After: 180  (only on 429)
```

---

## Token Strategy

Tokens are sent and read from **both** cookies and the `Authorization` header — the middleware checks both, so it works for web and mobile clients.

```
// Web clients — cookie set automatically by the server
Cookie: jwt=<access_token>

// Mobile / API clients — send manually
Authorization: Bearer <access_token>
```

Refresh tokens are stored in Redis and are **single-use** (rotation on every refresh). Reuse of an old refresh token deletes the stored token immediately, forcing re-login.

---

## Scripts

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript
npm start            # Run compiled output
npx prisma studio    # Open Prisma GUI
npx prisma migrate dev --name <name>  # Create a new migration
```
