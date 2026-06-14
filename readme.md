# Blog API

A RESTful Blog API built with **Node.js**, **Express**, **PostgreSQL**, **Prisma**, and **TypeScript**.

## Features

- 🔐 **Authentication** — JWT-based authentication with access and refresh tokens
- 🛡️ **Authorization** — Role-Based Access Control (RBAC) and ownership-based permissions
- ⏱️ **Rate Limiting** — protects API endpoints from abuse
- ✅ **Validation** — request validation with Zod
- 📝 **Logging** — structured logging with Winston (console + file transports)
- 📄 **Pagination** — paginated responses for list endpoints
- ⚠️ **Centralized Error Handling** — consistent error responses across environments

## Tech Stack

| Layer          | Technology       |
| -------------- | ---------------- |
| Runtime        | Node.js          |
| Framework      | Express          |
| Language       | TypeScript       |
| Database       | PostgreSQL       |
| ORM            | Prisma           |
| Validation     | Zod              |
| Logging        | Winston + Morgan |
| Authentication | JWT (access + refresh tokens) |

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database

### Installation

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=4000
NODE_ENV=development

DATABASE_URL=postgresql://user:password@localhost:5432/blog_db

JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
```

### Database Setup

```bash
npx prisma generate
npx prisma migrate dev
```

### Running the Project

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start
```

The server will start on `http://localhost:4000` (or the port set in `.env`).

## Project Structure

```
src/
├── config/          # Environment & app configuration
├── features/        # Feature modules (auth, posts, users, etc.)
├── middlewares/      # Express middlewares (auth, error handling, rate limiting, validation)
├── errors/           # Custom error classes
├── lib/              # Shared libraries (Prisma client, etc.)
├── utils/            # Utility functions (logger, helpers)
├── app.ts            # Express app setup
└── index.ts          # App entry point
```

## Authentication

- On login, the API issues:
  - An **access token** (short-lived, used to authorize requests)
  - A **refresh token** (long-lived, used to obtain new access tokens)
- Protected routes require a valid access token.
- Use the refresh endpoint to obtain a new access token once the current one expires.

## Authorization

- **Role-Based**: certain actions are restricted based on user roles (e.g., admin-only routes).
- **Ownership-Based**: users can only modify or delete resources (e.g., posts) they own.

## Error Handling

Errors are handled centrally and return consistent JSON responses:

```json
{
  "status": "fail",
  "message": "Resource not found"
}
```

In development mode, additional details (stack trace, error object) are included for easier debugging.

## License

This project is licensed under the MIT License.