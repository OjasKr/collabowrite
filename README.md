# Collabowrite

A production-style collaborative document editor (Google Docs–like) built with the MERN stack.

## Features

- **Authentication**: JWT (access + refresh), HTTP-only refresh cookie, bcrypt, rate-limited login
- **Documents**: Create, edit, share (viewer/editor), version history (last 10), copy, soft delete
- **Real-time**: Socket.io per-document rooms, live changes, active users, typing, debounced auto-save
- **Authorization**: Owner / Editor / Viewer roles; document access and edit middleware
- **Frontend**: Login, Register, Dashboard (My docs, Shared, Recent), Editor with role badge and Settings

## Tech stack

- **Backend**: Node, Express, MongoDB (Mongoose), Socket.io, JWT, bcrypt, express-validator, Helmet, CORS, express-rate-limit, express-mongo-sanitize
- **Frontend**: React 18, Vite, TypeScript, React Router, Axios, Quill, Tailwind, shadcn/ui
- **Database**: MongoDB

## Setup

### Backend (server)

1. `cd server && npm install`
2. Create `server/.env` (see `server/.env.example`):
   - `PORT` (default 3000)
   - `DATABASE_URL` (MongoDB connection string)
   - `CLIENT_ORIGIN` (e.g. `http://localhost:5173`)
   - `JWT_ACCESS_SECRET` (min 32 chars)
   - `JWT_REFRESH_SECRET` (min 32 chars)
3. `npm run dev` (builds and runs)

### Frontend (client)

1. `cd client && npm install`
2. Create `client/.env` with `VITE_SERVER_URL=http://localhost:3000`
3. `npm run dev`

### Run both

From repo root: `docker-compose up` (if configured), or run server and client in two terminals as above.

## API (high level)

- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`
- **Docs**: `GET/POST /api/docs`, `GET/PATCH/DELETE /api/docs/:id`, `GET /api/docs/:id/versions`, `POST /api/docs/:id/versions/:versionId/restore`, `POST /api/docs/:id/share`, `DELETE /api/docs/:id/share/:userId`, `GET /api/docs/:id/collaborators`, `POST /api/docs/:id/copy`

Protected routes require `Authorization: Bearer <accessToken>`. Refresh token is sent via HTTP-only cookie and used by `POST /api/auth/refresh`.

## Project structure

- **server**: `src/models/`, `src/controllers/`, `src/routes/`, `src/middleware/`, `src/sockets/`, `src/utils/`
- **client**: `src/pages/`, `src/components/`, `src/context/`, `src/lib/`
