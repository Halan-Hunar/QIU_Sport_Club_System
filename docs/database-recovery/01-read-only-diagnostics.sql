-- Run in the SQL Editor of frraifjjwbleiztpebzw ONLY.
-- Read-only snapshot, not a backup. Run each numbered section separately
-- if your editor only displays the last result. Save all results privately.
-- Current catalogs cannot establish creation dates or recover old definitions.

-- 1. Tables, owners, RLS and raw grants (all public tables, plus Storage).
select n.nspname as schema_name, c.relname, c.relkind,
       pg_get_userbyid(c.relowner) as owner,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
       c.relacl::text as grants, c.reltuples as estimated_rows
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r','p','v','m')
  and (n.nspname = 'public' or
       (n.nspname = 'storage' and c.relname in ('buckets','objects')))
order by 1,2;

-- 2. Actual function bodies, signatures, owners, settings and ACLs.
-- NULL ACL means defaults, NOT no access. Include all overloads.
select p.oid::regprocedure::text as signature,
       pg_get_userbyid(p.proowner) as owner, p.prosecdef as security_definer,
       p.proconfig, p.proacl::text as grants, pg_get_functiondef(p.oid) as definition,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
  and p.proname in ('handle_new_user','is_staff','is_admin','touch_updated_at',
                    'admin_list_users','admin_set_role')
order by 1;

-- 3. All application triggers and auth.users triggers (not just named ones).
select n.nspname as schema_name, c.relname as table_name, t.tgname,
       t.tgenabled, t.tgfoid::regprocedure::text as function_name,
       pg_get_triggerdef(t.oid, true) as definition
from pg_trigger t join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal and
      (n.nspname = 'public' or (n.nspname = 'auth' and c.relname = 'users'))
order by 1,2,3;

-- 4. All relevant policies, including other tables using overwritten helpers.
select * from pg_policies
where schemaname in ('public','storage') order by schemaname, tablename, policyname;

-- 5. Column types, defaults, nullable state, constraints, indexes.
select table_name, ordinal_position, column_name, udt_schema, udt_name,
       is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('users','profiles','categories','products')
order by table_name, ordinal_position;

select conrelid::regclass::text as table_name, conname, contype,
       pg_get_constraintdef(oid, true) as definition
from pg_constraint
where conrelid in (to_regclass('public.users'),to_regclass('public.profiles'),
                   to_regclass('public.categories'),to_regclass('public.products'))
   or confrelid in (to_regclass('public.profiles'),to_regclass('public.categories'),
                    to_regclass('public.products'))
order by 1,2;

select * from pg_indexes where schemaname = 'public'
and tablename in ('profiles','categories','products') order by tablename,indexname;

select n.nspname, t.typname, e.enumlabel, e.enumsortorder
from pg_type t join pg_namespace n on n.oid = t.typnamespace
join pg_enum e on e.enumtypid = t.oid
where t.typname in ('gender_t','age_group_t','role_t','user_role')
order by 1,2,4;

-- 6. Recorded dependencies on candidate artifacts and collided functions.
-- PostgreSQL does NOT track every reference inside string function bodies.
with targets as (
  select 'pg_class'::regclass as classid, c.oid
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in ('profiles','categories','products')
  union all
  select 'pg_proc'::regclass, p.oid
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in
    ('handle_new_user','is_staff','is_admin','touch_updated_at','admin_list_users','admin_set_role')
  union all
  select 'pg_type'::regclass, t.oid
  from pg_type t join pg_namespace n on n.oid=t.typnamespace
  where n.nspname='public' and t.typname in ('gender_t','age_group_t','role_t')
)
select pg_describe_object(d.refclassid,d.refobjid,d.refobjsubid) as referenced_object,
       pg_describe_object(d.classid,d.objid,d.objsubid) as dependent_object, d.deptype
from pg_depend d join targets t on t.classid=d.refclassid and t.oid=d.refobjid
order by 1,2;

select p.oid::regprocedure::text as signature, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f'
  and p.prosrc ~* '(profiles|categories|products|is_admin|is_staff|touch_updated_at|role_t)';

-- 7. Bucket metadata and object count. No file contents or tokens.
select b.id,b.name,b.public,b.created_at,
       (select count(*) from storage.objects o where o.bucket_id=b.id) as object_count
from storage.buckets b order by b.id;

select id,name,created_at,updated_at from storage.objects
where bucket_id='product-images' order by created_at limit 100;

-- 8. Run ONLY if section 1 confirms these tables exist.
-- Seed matches are candidates, not proof of ownership or insertion time.
select count(*) as products_count from public.products;
select role::text,count(*) from public.profiles group by role;
select to_jsonb(c) as category,
  case when c.slug like 'legacy-%' then 'legacy candidate'
       else 'seed slug candidate' end as classification
from public.categories c
where c.slug in ('t-shirt','shirt','blouse','trousers','jeans','jacket','coat',
 'dress','skirt','sweater','hoodie','shorts','suit','kids-set','baby-set',
 'pajamas','sportswear','underwear','accessories') or c.slug like 'legacy-%'
order by c.slug;

-- All rows, including unexpected non-clothing categories, require review.
select to_jsonb(c) as category from public.categories c order by c.slug;

-- 9. Club roles and accounts missing their club row; no emails or credentials.
-- Missing rows may predate the incident. Do not automatically promote anyone.
select role::text,count(*) from public.users group by role;
select a.id,a.created_at from auth.users a
left join public.users u on u.id=a.id
where u.id is null order by a.created_at;

-- 10. Effective table grants and default ACLs relevant to restoration.
select * from information_schema.table_privileges
where table_schema='public' and table_name in ('users','profiles','categories','products')
order by table_name,grantee,privilege_type;
select pg_get_userbyid(defaclrole) as owner,
       defaclnamespace::regnamespace::text as schema_name,
       defaclobjtype,defaclacl::text
from pg_default_acl;
