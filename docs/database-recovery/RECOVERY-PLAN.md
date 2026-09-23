# QIU recovery from the HAVI schema incident

Target: `frraifjjwbleiztpebzw`. No live connection was used and no database changes have been executed. Diagnostics are read-only and have been statically reviewed, not tested against the live database.

## Evidence and priorities

The current club schema is `backend/src/utils/schema.sql`; the additional migration is `backend/src/utils/migration-awards-archive.sql`. The local HAVI script is `C:/Users/Asus/OneDrive/Documents/HAVI/supabase/schema.sql`. Confirm this is the exact version executed; local files are evidence of intended behavior, not proof of the previous deployed state.

1. **Authorization collision:** QIU's `is_admin()` reads `public.users`; HAVI replaces it to read `public.profiles`. Existing club RLS policies still call this function, so they now use the wrong role source. HAVI also revokes PUBLIC execution and grants authenticated execution. Restore the body AND review effective grants. Do not promote accounts in HAVI profiles to work around this.
2. **Signup collision:** QIU's `handle_new_user()` inserts `(id,email,role='user')` into `public.users`. HAVI instead inserts a customer into `public.profiles`. Accounts created since the incident can lack the club row. Existing club users are not deleted by this script. The backend checks `public.users` using its admin client, so existing backend admin access may still work even while database authorization is wrong.
3. **RLS:** QIU already enables RLS on its ten club tables. HAVI only explicitly enables it on profiles/categories/products. Leave club RLS enabled. On collided tables, added permissive policies can broaden access as well as restrict it; same-named policies are dropped/replaced by HAVI.
4. **Possible data collisions:** categories are upserted, so the 19 slugs may represent overwritten old rows, not just new rows. Product gender/category conversions cannot be reliably reversed from current values alone. The product update trigger may also change `updated_at` during backfills. Recover prior values from a pre-incident backup when needed.
5. **Additional artifacts:** `products_active_idx`, `products_category_idx`, `products_season_idx`; `products_season_chk`; removal of `products_size_type_chk`; changed nullability, new columns, three enum types, six function names, two triggers, table/storage policies, bucket, and function grants. Optional SQL commented out at the bottom of HAVI's script is not executed.

The club files do not define profiles/categories/products, the HAVI enum types, is_staff, touch_updated_at, admin_list_users or admin_set_role. These are **likely foreign**, not yet approved for deletion. is_admin and handle_new_user definitely belong to the club and must be restored, not removed.

## Stage 1: Preserve and inspect

- Record incident time/timezone and preserve the exact executed SQL from SQL Editor history. Pause new signups during recovery if possible.
- Export current schema, data, owners and grants securely before mutations. Preserve Storage files separately. Diagnostics are not a full backup. Check for a pre-incident backup/PITR; restore it to a separate recovery environment for comparison where available. Do not roll production back wholesale and lose newer tournament data.
- Verify the dashboard project ref, then run `01-read-only-diagnostics.sql`. Save every result; numbered sections can be run separately. Redact account IDs and file names if desired before sharing. Never share tokens, credentials or auth user dumps.
- Catalogs have no reliable object creation timestamp or previous function/policy body. Object OIDs, row timestamps and matching names do not prove provenance. Compare results with the club files, prior migrations, SQL history and a pre-incident backup. Flag any additional manual club SQL absent from this repository.

## Stage 2: Restore the two shared functions first

After reviewing diagnostics, prepare a small transaction restoring the two definitions from the club schema (is_admin around line 205; handle_new_user around line 276). Do not rerun the whole club schema: its initial CREATE TYPE/TABLE/POLICY statements are not idempotent.

- is_admin must query `public.users`, matching `auth.uid()` and the club `admin` role. Preserve/verify function owner and SECURITY DEFINER behavior; use qualified objects and a controlled search_path.
- handle_new_user must insert `new.id`, `new.email`, and the club `user` role into `public.users`, then return NEW. It must not write to HAVI profiles. Do not copy role grants from user-editable metadata.
- If the existing enabled trigger is exactly AFTER INSERT ON auth.users, FOR EACH ROW, calling public.handle_new_user(), replacing the function repairs its behavior without dropping/recreating the trigger. If timing/arguments/condition differ, show the exact correction and obtain approval before any DROP.
- Restore the verified pre-incident execute privileges. The repository contains no explicit original ACL for these two functions; do not infer it solely from a current ACL or grant broad access blindly. Test anon/authenticated/service-role behavior needed by existing policies.
- Keep all club RLS states/policies as verified. Restore only demonstrated changes on collided tables; never globally disable RLS.
- Review missing public.users rows by incident time and account ownership. A separately reviewed backfill may insert confirmed missing club accounts with role `user`, preserving existing rows and roles. Administrator promotion needs explicit account confirmation. New signup repair alone does not backfill past accounts.

## Stage 3: Present exact deletions for approval

Approval is required before ANY DROP, as requested by Halan. No deletion script is supplied for blind execution.

For each table/function/type/policy/index/bucket or row set, present its name, definition, row count, dependencies and reason it is foreign. Obtain confirmation that profiles, categories, products and product-images did not exist for club use, and review any content created since the incident.

After approval, perform dependency-aware cleanup using explicit names/signatures and RESTRICT (never CASCADE): remove the confirmed foreign Storage policies and administrative RPCs, remove confirmed foreign tables and their attached triggers/policies/indexes, then remaining foreign helpers and enum types once unused. Keep and restore the club's is_admin(), handle_new_user() and auth trigger. Inspect catalog dependencies AND textual function references/application use: Postgres does not track all references inside function bodies. An unexpected dependency is a stop condition.

If a table predates HAVI, retain it. Restore its prior columns, nullability, constraints, policies, indexes and data from evidence. Do not delete all matching category slugs: restore overwritten rows and delete only specifically proven inserted IDs after checking references. Do not remove enum values by rebuilding a shared type without an independently reviewed migration.

Delete the approved product-images bucket/files through the Storage dashboard/API, not SQL DELETE on storage metadata. Export any files first. Storage cleanup is separate from the database transaction and cannot be rolled back with SQL.

## Stage 4: Verify before finalizing

Re-run diagnostics. Test existing admin login and an authorized reversible admin edit, visitor tournament/stats reads, unauthorized write rejection, real-time match/standings behavior, and club image loading. Test a controlled new account only with approval: its club row must be created with role user and it must have no admin permissions. Verify repaired missing accounts separately. Compare club table row counts and critical records with the captured baseline; no tournament/player/match data should be deleted. Use real authenticated/anonymous sessions: a SQL Editor query as postgres alone does not test RLS. Reload PostgREST schema after approved function/schema cleanup, then repeat relevant checks.

References:
- https://supabase.com/docs/guides/platform/backups (database backups do not include Storage file bytes)
- https://supabase.com/docs/guides/storage/schema/design (Storage metadata is read-only for SQL; use API operations)
