# CollaboWrite

A production-style collaborative document editor (Google Docs–like) built with the MERN stack.

## Features

- **Authentication**: JWT (access + refresh), HTTP-only refresh cookie, bcrypt, rate-limited login
- **Profile**: Name, bio, change password
- **Documents**: Create, edit, share (viewer/editor), version history (last 10), copy, soft delete, trash (restore / permanent delete)
- **Sharing**: Collaborators by email; public link (anyone with link can view or edit)
- **Starred**: Star/unstar documents; filter by Starred, My Documents, Shared With Me, Trash
- **Real-time**: Socket.io per-document rooms, live changes, active users, debounced auto-save
- **Editor**: Comments (add/delete), version history panel, view/edit mode toggle, delete document
- **Authorization**: Owner / Editor / Viewer roles; document access and edit middleware
- **Frontend**: Login, Register, Dashboard (search, views), Editor, Profile, protected routes

## Tech stack

- **Backend**: Node, Express, MongoDB (Mongoose), Socket.io, JWT, bcrypt, express-validator, Helmet, CORS, express-rate-limit, express-mongo-sanitize
- **Frontend**: React 18, Vite, TypeScript, React Router, Axios, Quill, Tailwind CSS, Radix UI–style components (dialog, label, etc.)
- **Database**: MongoDB

## Setup

### Backend (server)

1. `cd server && npm install`
2. Create `server/.env` with:
   - `PORT` (default 3000)
   - `DATABASE_URL` (MongoDB connection string)
   - `CLIENT_ORIGIN` (e.g. `http://localhost:5173`)
   - `JWT_ACCESS_SECRET` (min 32 chars)
   - `JWT_REFRESH_SECRET` (min 32 chars)
   - `GOOGLE_GENERATIVE_AI_API_KEY` (required for AI features; get a free key at https://aistudio.google.com/app/apikey)
   - `GEMINI_MODEL` (optional; default `gemini-2.0-flash`. If you get a 404, try `gemini-pro`.)
3. `npm run dev` (runs with tsx watch).

### Frontend (client)

1. `cd client && npm install`
2. Create `client/.env` with `VITE_SERVER_URL=http://localhost:3000` (or your server URL)
3. `npm run dev`

### Run both

Run server and client in two terminals (or use your own process manager). From repo root you can run `cd server && npm run dev` and `cd client && npm run dev`.

## API (high level)

- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/me`, `POST /api/auth/change-password`
- **Docs**: `GET/POST /api/docs`, `GET /api/docs/shared`, `GET /api/docs/recent`, `GET /api/docs/starred`, `GET /api/docs/trash`, `GET/PATCH/DELETE /api/docs/:id`, `POST/DELETE /api/docs/:id/star`, `PATCH /api/docs/:id/title`, `GET /api/docs/:id/versions`, `POST /api/docs/:id/versions/:versionId/restore`, `GET/POST/DELETE /api/docs/:id/comments`, `PATCH /api/docs/:id/visibility`, `POST /api/docs/:id/share`, `DELETE /api/docs/:id/share/:userId`, `GET /api/docs/:id/collaborators`, `POST /api/docs/:id/restore`, `POST /api/docs/:id/permanent-delete`, `POST /api/docs/:id/copy`

Protected routes require `Authorization: Bearer <accessToken>`. Refresh token is sent via HTTP-only cookie; use `POST /api/auth/refresh` to get a new access token.

## Project structure

- **server**: `src/models/`, `src/controllers/`, `src/routes/`, `src/middleware/`, `src/sockets/`, `src/utils/`
- **client**: `src/pages/`, `src/components/`, `src/context/`, `src/lib/`, `src/utils/`, `src/constants/`
