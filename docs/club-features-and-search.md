# Club profiles, event dates, and Google Search

## Release order

1. Apply `supabase/migrations/20260923115929_club_heads_and_event_dates.sql` to the **QIU Sports Club** Supabase project using its SQL Editor. It adds a nullable event date and a separate profiles table; it does not change existing sports records. This migration has been tested in local PostgreSQL (PGlite), not applied to production by this change.
2. Apply `supabase/migrations/20260923123624_club_head_number.sql` afterward to add the optional head number (1–999). Existing profiles keep this blank until edited.
3. Deploy the backend, then the frontend through your normal manual Git workflow.
3. As an admin, open The Club > Heads of the Club > Manage profiles. Create a draft, preview it, and publish. Confirm in a signed-out window that published profiles are visible and drafts are not.
4. Set actual event dates on older articles. Unknown dates sort last; article-date sorting remains available. Both date fields support newest-first and oldest-first sorting.

Profiles share the article rich-text editor, safe Markdown renderer, image upload validation, and private storage bucket. Portraits are optional and can be replaced or removed in favor of initials. Colors are accents rather than body text colors. Only one published current head is permitted; change the previous head to former before publishing the next one. Unpublishing preserves the profile as a private draft.

## Google visibility without a purchased domain

The existing `https://sportclubmanagement.vercel.app/` address can be indexed now. No custom domain purchase is required, and no implementation guarantees first position.

After deployment:

1. Open [Google Search Console](https://search.google.com/search-console/) and add a **URL-prefix property** for `https://sportclubmanagement.vercel.app/`.
2. Choose HTML-file or HTML-tag ownership verification. Place Google's supplied file in `frontend/public/`, or its exact verification meta tag in `frontend/index.html`, then deploy and verify. Do not paste account credentials into code or chat.
3. Submit `https://sportclubmanagement.vercel.app/sitemap.xml` under Sitemaps.
4. Inspect the homepage URL and request indexing. Monitor Page indexing for errors. Discovery and ranking can take time.
5. Link this site from the club's Instagram bio and, if the university agrees, its relevant student-club webpage. Keep publishing useful, accurate club content.

This change adds a descriptive homepage title, meta description, Open Graph information, SportsOrganization structured data, robots.txt, and a static sitemap for the main public sections. The sitemap does not enumerate individual database articles or profiles. The React site still relies on JavaScript rendering; prerendering/server rendering and a dynamic sitemap would be a useful later SEO improvement.

When a custom domain is purchased, connect it in Vercel, redirect the old address, update sitemap/robots/structured-data URLs, and verify the new property in Search Console.

Reference: [Google SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

## Optional additions to decide later

- Term start/end years, so previous heads form a chronological archive.
- An achievements section highlighting each head's contribution.
- Links from event head credits to the matching profile.

These additions are suggestions, not part of this change.
