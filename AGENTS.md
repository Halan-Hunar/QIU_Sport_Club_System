# QIU Sport Club Management System

## What it does
A full-stack sport club management web app built for QIU (unofficial). It lets admins create and manage tournaments, register teams and players, run group-stage and knockout brackets, log match events (goals, cards) in real time, and track live standings, top scorers, and clean sheets. Visitors can browse tournaments, view standings, and follow results without logging in. Only authorised admins can manage data.

Key features:
- Tournament creation with group + knockout format support
- Manual group draw and automatic bracket generation
- Live match event logging (goals, cards) with real-time score updates via Supabase
- Group standings (excludes knockout rounds), knockout bracket view
- Stats page: total goals, goals/match, biggest win, clean sheets, top scorers leaderboard, champion's tournament run
- Award tracking: Best Player, Best Defender, Best Playmaker, Best Goalkeeper — admin-set manually
- Export graphics: results, standings, bracket, squad, overview — rendered as PNG via html-to-image
- Soft delete for players and teams (historical data preserved in tournaments)
- End tournament flow with permanent record retention
- Visitor access restricted to Tournaments and Stats; Teams/Players require login

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS, Zustand (state), Framer Motion (animations), html-to-image (PNG export)
- **Backend:** Node.js + Express, Zod (validation), Helmet + rate limiting (security)
- **Database:** Supabase (PostgreSQL) with Row Level Security, real-time subscriptions
- **Auth:** Supabase Auth (email/password), role-based (admin vs visitor)
- **Hosting:** Render (backend, free tier) + Vercel (frontend, free tier)
- **Deployment:** Auto-redeploy on push to `main` branch

## URLs
- Frontend: https://sportclubmanagement.vercel.app
- Backend: https://sportclub-8vh0.onrender.com

## Git workflow
- Branches: `feature/*`, `fix/*` → merge into `dev` → merge into `main`
- Developer handles all git commits and merges manually — never include git commands in prompts
- Admin accounts: Halan (halangame4@gmail.com), Dyako
