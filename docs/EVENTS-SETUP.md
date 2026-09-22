# Club Events setup

Code changes are local and have not been deployed. The private club-news bucket was configured and upload/read-tested on September 22, 2026; no database migrations were applied by this setup task.

## Database

Use only the QIU club project: `frraifjjwbleiztpebzw`. Never use the HAVI project.

In Supabase SQL Editor, apply these files in order:

1. `supabase/migrations/20260921181657_club_news.sql` — only if the Club News table has not already been created.
2. `supabase/migrations/20260922113555_event_organisers_and_display_names.sql` — adds event organisers and admin display names.

Apply the SQL before deploying the updated backend. The second migration assigns names only to the two existing admin account IDs; it does not change passwords or roles. Display names are stored in `public.users`, independently of the Auth dashboard's metadata display-name field.

## Private image storage

If not already configured, run in PowerShell from the project root:

```powershell
cd backend
node scripts/setup-news-storage.js
```

The script checks the project address and creates a private `club-news` bucket. It uses the existing backend `.env`; never copy the service-role key into frontend configuration or chat.

## Usage

- The visual editor supports selection formatting and inserting photos at the cursor. Photo descriptions are optional.
- The subtitle appears under the title, before the credits. For compatibility it uses the existing `cover_alt` storage field; existing descriptions are retained. No additional migration is needed.
- Published events are ordered by article date, newest first.
- Public events: `/events`. Old `/news` links still work.
- Admin sign-in: type `/login` into the address bar. There is no public Login button.
- Sign in with your email, `Halan Hunar`, or `Dyako Abubakr` and the existing password. Names are case-insensitive; extra spaces are ignored.
- Organiser choices describe the event's historical head; they do not grant account access. Halan is optional as co-organiser.
- Drafts stay admin-only. Public cards and the homepage show published articles only.
- Images use five-minute signed links. Unpublishing hides the article from new public requests, but cannot retract copies already loaded or invalidate an already-issued image link immediately.
- Unused uploads are retained; automatic media deletion is deliberately not enabled.

## Local verification

```powershell
cd backend
npm.cmd test
npm.cmd run preview:events
```

The preview uses a disposable local database and fake authentication, without connecting to Supabase. Open `http://127.0.0.1:5174`; its fake password is `fixture-password`. Never deploy this preview server.

For the production frontend build, run `npm.cmd run build` from `frontend`.

Existing dependency audit findings remain in the Express/Vite dependency trees; broad framework upgrades were not included in this feature change. Git commits, merges and deployment remain manual.
