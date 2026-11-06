# Claims overview implementation plan

**Goal:** Make ASC overview the single place to inspect live claim totals, affected product categories, FRG/ARC sources, and repeat claims per kitchen.

**Architecture:** Retain the existing Next.js admin route, brand styles, permissions and English/German translation system. Use a read-only loader and pure summary, sharing product classification with the existing ASC reports. Count retained cases, not selected parts or follow-up submissions.

**Design:** Default ASC to all time. Provide period, source, category and actual kitchen filters. Lead with total claims, cabinet claims, electrical claims and affected kitchens; follow with source/category comparisons, repeated-kitchen history, ranked products/cities, activity, data completeness and latest cases. Exclude 111 contracts and test ticket series. FRG identity is its Kitchen record; ARC identity is its individual contract, consistent with ASC reports. Missing matches remain explicitly unknown. Repeat history is all-time for the selected kitchens, with period counts shown separately. Categories can overlap; no unsupported resolution or SLA statistics.

**Approach:** Extend the existing overview rather than create a separate report or schema. A separate reporting service would duplicate the existing case and kitchen definitions.

## Tasks

- [x] Add behavioral tests for categories, case deduplication, test exclusion, actual kitchen identity, period/history distinction, legacy areas and empty/malformed data; run red.
- [x] Share pure classification/extraction with reports, implement read-only loader and summary, run focused tests green.
- [x] Replace overview with responsive scoped CSS, useful comparisons, working filters/drill-down and EN/DE labels. Wire ASC route with all-time default.
- [x] Verify focused regression tests, production build, authenticated local rendering and browser layout when available. Review the final diff.

## Verification record

- Behavioral tests exercised RED then GREEN, including legacy sink cabinet labels, actual endpoint attachment metadata, mixed unclassified products and Berlin calendar periods across DST.
- Authenticated local HTTP renders passed for English, German, combined filters and an empty kitchen selection; actual local SQL totals reconcile by source and kitchen.
- Desktop layout inspected in Chrome. Browser interaction checks were limited by concurrent user input; mobile rules were checked in source and responsive layout began correctly in a narrow browser window.
- Independent review found no Critical/Important issues. Its city-link scope finding was resolved by keeping city and product rankings informational; supported category and kitchen drilldowns remain.
- Next.js production build uses the existing generated Prisma client. `npm run build` regeneration hit a Windows lock on the existing query-engine DLL; no schema or generated-client changes were needed.
- Changes remain local on `feat/claims-overview`; no publication or database writes.

## Review focus

- Multiple selected parts must never inflate case counts within a category or item.
- ARC contracts sharing a technical upload Kitchen must stay separate.
- A claim first created outside the selected period must not become a new case because of a follow-up.
- Missing metadata and empty filters must produce honest zero/unknown states.
- Rankings rendered through helper components must retain CSS on desktop and mobile.
