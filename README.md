# Blog API

A REST API for a simple blog, built with Express, TypeScript and Prisma. It has cookie-based authentication (email/password and Google OAuth), posts, and comments, with role-based permissions and full API documentation in OpenAPI.

## Features

- **Authentication**: signup, login, logout, refresh tokens, profile management, change password, forgot/reset password with an emailed OTP, and Google sign-in
- **Posts**: create, list (paginated), read, update and delete
- **Comments**: add, list (paginated), update and delete comments on a post
- **Roles**: `USER` and `ADMIN`, with owner-or-admin rules on writes
- **Validation**: every request body, query and param is validated with Zod
- **Consistent responses**: one success envelope and one error envelope across the whole API, each with a request ID
- **Health checks**: liveness and readiness endpoints
- **Tests**: integration and end-to-end tests with Vitest and Supertest

## Tech stack

| Area | Tools |
|---|---|
| Runtime / language | Node.js, TypeScript |
| Framework | Express |
| Database | PostgreSQL with Prisma ORM (`@prisma/adapter-pg`) |
| Cache / sessions | Redis (refresh tokens) |
| Auth | JWT in httpOnly cookies, Passport (Google OAuth), bcrypt |
| Email | Nodemailer (OTP codes) |
| Validation | Zod |
| Testing | Vitest, Supertest |
| Tooling | ESLint, Prettier, Husky + lint-staged, Docker |

## Getting started

### Prerequisites

- Node.js 20 or newer
- PostgreSQL
- Redis
- Docker (optional, for running the services locally)

### Installation

```bash
git clone https://github.com/AhmedBenaissaM10/Blog-API
cd Blog_API
npm install
```

### Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

`.env.example` lists every variable the app reads. At a minimum you need your PostgreSQL connection string, for example:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/blog"
```

along with the JWT secrets, Redis URL, SMTP settings and Google OAuth credentials described in `.env.example`.

### Database

```bash
npx prisma migrate dev
npx prisma generate
```

### Run the server

```bash
npm run dev      # development with reload
npm run build    # compile TypeScript
npm start        # run the compiled build
```

The API is served at `http://localhost:3000/api`.

## API documentation

The full specification is in [`openapi.yml`](./openapi.yml). Load it into Swagger UI, Postman or Insomnia to browse and try the endpoints.

### Endpoints at a glance

| Method | Path | Access |
|---|---|---|
| GET | `/health/live` | public |
| GET | `/health/ready` | public |
| POST | `/auth/signup` | public |
| POST | `/auth/login` | public |
| POST | `/auth/logout` | logged in |
| POST | `/auth/refresh-token` | refresh cookie |
| GET / PATCH | `/auth/profile` | logged in |
| POST | `/auth/change-password` | logged in |
| POST | `/auth/forgot-password` | public |
| POST | `/auth/reset-password` | public |
| GET | `/auth/google`, `/auth/google/callback` | public |
| GET | `/posts` | public, paginated |
| POST | `/posts` | logged in |
| GET | `/posts/:id` | public |
| PATCH / DELETE | `/posts/:id` | owner or admin |
| GET | `/posts/:postId/comments` | public, paginated |
| POST | `/posts/:postId/comments` | logged in |
| PATCH | `/comments/:id` | comment owner |
| DELETE | `/comments/:id` | comment owner or admin |

### Authentication

Tokens are sent as httpOnly cookies (`accessToken` and `refreshToken`), not as bearer tokens. Browsers and API clients must keep and send cookies. In Postman or Insomnia, enable the cookie jar.

### Permissions

- Anyone can read posts and comments.
- Any logged-in user can create posts and comments.
- Only a post's author or an admin can edit or delete it.
- Only a comment's author can edit it. The author or an admin can delete it.

### Response format

Success:

```json
{
  "success": true,
  "data": { },
  "message": "Post created successfully",
  "meta": { "page": 1, "limit": 20, "totalItems": 42, "totalPages": 3 }
}
```

`meta` appears on paginated lists only. List endpoints accept `page` (default 1) and `limit` (default 20, max 100).

Error:

```json
{
  "success": false,
  "status": "fail",
  "message": "Invalid Input",
  "requestId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

`status` is `fail` for expected errors such as validation or permissions, and `error` for unexpected server errors.

## Data model

```prisma
enum Role {
  USER
  ADMIN
}

model User {
  id        String    @id @default(uuid())
  email     String    @unique
  name      String?
  password  String
  googleId  String?   @unique
  provider  String?   @default("local")
  createdAt DateTime  @default(now())
  role      Role      @default(USER)

  posts     Post[]
  comments  Comment[]
}

model Post {
  id        String    @id @default(uuid())
  title     String
  content   String    @db.Text
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  authorId  String
  author    User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  comments  Comment[]

  @@index([authorId])
}

model Comment {
  id        String   @id @default(uuid())
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([postId, createdAt])
  @@index([authorId])
}
```

Deleting a post deletes its comments. Deleting a user deletes their posts and comments.

## Project structure

```text
.
├── openapi.yml
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app.ts
│   ├── index.ts
│   ├── config/         # environment loading and validation
│   ├── errors/         # AppError and error factory functions
│   ├── features/
│   │   ├── auth/
│   │   ├── post/
│   │   └── comment/    # each feature: route, validator, controller, service
│   ├── lib/            # prisma, redis, mailer clients
│   ├── middlewares/    # auth, validate, rate limiter, error handler, request ID
│   ├── routes/         # health routes
│   └── utils/          # catchAsync, logger, response helpers, JWT and cookie utils
└── tests/
    ├── helpers/        # auth and database helpers
    ├── integration/    # per-module API tests
    └── e2e/            # full user flows
```

Every feature follows the same layered pattern: **route** (wiring and middleware), **validator** (Zod schemas), **controller** (HTTP in and out), **service** (business logic and database access).

## Testing

Tests run against a separate test database configured in `.env.test`. The database is cleared between tests.

```bash
npm test                 # run everything once
npm run test:watch       # watch mode
```

- `tests/integration/`: one file per module (`post.test.ts`, `comment.test.ts`), covering status codes, validation, ownership and admin rules
- `tests/e2e/`: full flows, such as signup, create post, update post, delete post, logout

## Author

Ahmed Ben Aissa: [@AhmedBenaissaM10](https://github.com/AhmedBenaissaM10)
