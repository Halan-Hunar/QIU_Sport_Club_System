# QIU Sport Club Management System

A mobile-first web application for managing university sports club tournaments at Qaiwan International University.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS + Framer Motion
- **Backend:** Node.js + Express
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Real-time:** Supabase Realtime

## Project Structure

```
QIU_Sport_Club_System/
├── backend/       # Node.js + Express API
└── frontend/      # React + Vite app
```

## Getting Started

### Backend
```bash
cd backend
cp .env.example .env   # fill in your values
npm install
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env   # fill in your values
npm install
npm run dev
```

## Branching Strategy

- `main` — production only
- `dev` — integration branch
- `feature/xxx` — new features
- `fix/xxx` — bug fixes

Never commit directly to `main`. All changes go through PRs.
