# Admin audience analytics

Implemented locally; production SQL and deployment are still required. No production records were changed and no commits or merges were made.

## Start an isolated preview

From the repository root, using Node 22 or newer:

```powershell
npm.cmd --prefix backend run preview:analytics
```

Open http://127.0.0.1:5176/login. Use a test display name and any password of at least six characters. Click the profile button, then **Analytics**. The preview uses 7,600 fictional events in an in-memory PostgreSQL database. It does not import backend credentials or write to Supabase. Closing it discards the sample data. This preview only provides the endpoints needed for analytics/news/home, so it is not a complete tournament-management environment.

## Production setup

1. Take a backup or recovery checkpoint of the **QIU** database. Confirm the project; do not run the full base schema or any HAVI SQL.
2. Pause match-event editing during the SQL/backend rollout. Apply these two new files in chronological order in the QIU Supabase SQL editor (each file is transactional):
   - `supabase/migrations/20260928081037_club_analytics_and_safety.sql`
   - `supabase/migrations/20260928082727_club_head_founder_flag.sql`
3. Deploy the matching backend immediately after the first migration, before resuming event editing. The new trigger owns score increments; the old backend would also increment, so never run old backend event writes with the new trigger.
4. Set the backend's `CORS_ORIGIN` to the exact frontend origin(s), comma-separated. Include the Vercel origin and the custom domain if both are used. No wildcard. No new analytics secret is needed. Service-role credentials remain backend-only.
5. Install from the updated lockfiles and build/deploy the frontend and backend using Node 22+. The React Router security update moves the frontend to v7's compatible declarative API; Vite is patched to 6.4.3. The frontend CSP permits HTTPS connections for existing API, fonts, and image exports, and Supabase secure WebSockets.
6. In a signed-out browser, decline analytics and verify browsing still works. Use Privacy settings to allow it, visit a published article, scroll, then open a tournament and a match. Sign in as admin to confirm the report and article counts. Confirm unauthenticated/non-admin access to `/api/analytics/report` is denied. Verify private notes and draft articles remain protected.
7. Check mobile/desktop layouts, keyboard focus, profile dropdown, date filters, failure/retry and empty states, and article reading measurements. Test a goal, own goal, deletion, and concurrent goal submissions on a **disposable test tournament**. Completed matches must be reopened before editing events.
8. Confirm the retention cleanup succeeds in backend logs and run Supabase's database/security advisors against the deployed schema. Run a real admin logout/refresh test and verify security headers at the deployed frontend.

## What the numbers mean

| Metric | Calculation |
|---|---|
| Visitor visits | Distinct random tab-session IDs in the selected period; not unique people |
| Page views | One record per public page/detail navigation; match modal opens excluded |
| Article views | Page views of successfully loaded, published articles; `/news` and `/events` use one canonical ID/path |
| Match popularity | Match-detail modal opens, ranked separately |
| Tournament popularity | Tournament and tournament-statistics views combined by tournament ID |
| Reading time | Average accumulated visible, focused, non-idle article time over all article views, including zero-second views; 30-minute cap per view |
| Scroll depth | Maximum fraction of article-body height reached by viewport bottom, averaged across views |
| Reached 90% | Article views with depth at least 90%, divided by all article views |
| Growth | `(current - previous) / previous * 100`; zero baseline is explicitly labelled |
| Heatmap | Page views grouped by ISO weekday and hour in Asia/Baghdad |

Daily/weekly/monthly chart controls group daily points. Weekly/monthly visits are explicitly labelled **daily visits summed** because a tab session crossing midnight can appear on both days. The main period visit KPI counts each session once for that entire period.

The date range includes whole local calendar days, up to 90 days within the last 90 days. Comparison uses the immediately preceding equal-length range. Today is incomplete; newly enabled analytics has incomplete historical coverage. The report shows the earliest retained observation. Article admin-list counts cover the last 180 days, not lifetime views.

## Privacy and operation

- Fresh opt-in is required. The old policy acknowledgement does not grant analytics consent. Declining keeps the public site usable; footer Privacy settings reopens the choice.
- Signed-in accounts, supported DNT/GPC signals, and common bot user agents are excluded. No cross-visit user identity, raw IP, full referrer, query string, or raw user agent is stored in the analytics table.
- Session storage holds a random tab-visit ID and broad referral category. A new page visit after 30 minutes of inactivity renews the ID. Events use server timestamps and bounded, validated values.
- Heartbeats update the same event UUID with monotonic time/depth values, so retrying or delivering updates out of order does not inflate views. Measurements are approximate; source headers can be absent, and public collection endpoints cannot prove a real human generated an event.
- SQL aggregates the full matching dataset rather than downloading a capped subset into JavaScript. RPCs use invoker privileges, fixed search paths, and service-role-only grants; browser roles cannot access analytics tables or functions directly.
- The backend deletes analytics older than 180 days on startup and every 24 hours while running. An offline/sleeping backend postpones cleanup until restart. Provider backups/log retention is separate.
- The privacy and terms pages describe these practices and the actual service providers. Operator review and any jurisdiction-specific legal review remain necessary; this is not a legal compliance certification.

## Security/reliability review

Reviewed API route protections, auth/token handling, public/private data exposure, article rendering/uploads, database grants and new SQL, error propagation, dependencies, and public read paths.

Fixed:

- Player API reads now require sign-in; internal notes are only returned to admins. Browser database roles can select explicit public player columns, not notes. Team-detail API now matches the protected frontend route.
- Logout uses the backend admin client and revokes the current refresh session. Supabase access JWTs can remain valid until expiry; the app still uses browser local storage for auth. This update does not introduce HttpOnly-cookie authentication.
- API retries replace stale Authorization headers after refresh, and reject destinations outside the configured API origin.
- Express 4 rejected async handlers reach the error middleware; clients receive generic errors. Parameter IDs are validated, exact CORS origins are supported, and production trusts one Render proxy hop for rate limiting.
- Goal/own-goal insertion and deletion change scores in the database transaction with a match-row lock. Foreign teams/players are rejected; completed matches reject event edits.
- Generating fixtures refuses to erase existing fixtures/history. Bracket generators still contain multi-step writes and should not be run concurrently; a fully transactional bracket-generation rewrite is a separate remaining reliability task.
- Existing founder UI now has its missing schema migration and a backward-compatible false default.
- Public statistical aggregate reads paginate beyond the default row cap and fail explicitly on incomplete reads. Champion-run win/loss classification respects an explicit winner even when scores are tied.
- Public summaries are cached in backend memory for ten seconds, invalidated after successful content mutations. External/database-only edits may take up to ten seconds to appear in those summaries. Analytics heartbeats do not invalidate this cache.
- Patched dependency advisories, pinned Supabase client versions, protected all `.env.*` variants except examples, and added deployed frontend security headers.

Verification completed locally: regression/database tests, migration execution against PostgreSQL-compatible PGlite, browser-tracker logic tests, production build, fresh online npm audits for both packages, and isolated HTTP preview login/report/assets checks. Browser automation was unavailable, so visual appearance, actual browser interactions, deployed headers, provider configuration, live RLS/advisors, and real-account delivery/session behavior are not claimed verified. No review guarantees the absence of every vulnerability.

Implementation references: [Supabase RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase admin sign-out](https://supabase.com/docs/reference/javascript/auth-admin-signout), [Vite 6 migration](https://v6.vite.dev/guide/migration).
