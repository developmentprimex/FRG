# Visitor journeys

Fragmento Visitors (`/admin/contract-access`) now includes visits before a contract
is entered, the last confirmed screen/action, the furthest confirmed step, and a
chronological visit history in the existing visitors table. New linked contract
accesses enrich their visit row; historical access records remain individual rows
with no inferred progress. One set of date filters and pagination covers both.
Claims Visitors has the corresponding Service flow above its existing claims report.

Each browser has a random visitor ID and separate FRG/ASC visit IDs. A visit renews
while the user interacts and starts again after 30 minutes without interaction.
The visitor cookie lasts 90 days. These identifiers are for analytics, never for
authentication. A verified contract identifies a contract, not an individual.
Direct kitchen links are associated only after server-side contract validation.

Screen transitions are recorded by the client. Contract results, registration
verification, saved orders, created payment sessions and successful payments are
recorded by the server. Creating a payment session does not prove that the hosted
Stripe screen was displayed. Stripe payment milestones require a confirmed paid
or no-payment-required status and are idempotent across webhook retries.

Pending client events are stored separately by event ID in localStorage and
retried on connectivity changes, page visibility changes, navigation and every
10 seconds. The queue holds up to 200 events for up to 24 hours. Events are
deduplicated by ID in PostgreSQL and ordered by occurrence time and sequence.
Pending or blocked tracking, device changes, clock differences and abrupt browser
termination can leave gaps. Inactivity is not labelled as confirmed abandonment.
DNT/GPC opt-out is respected. No customer address, email, form text or URL query
parameters are stored by this tracker.

Visit data expires after `VISIT_TRACKING_RETENTION_DAYS` (default 90, range 1–365).
Cleanup runs at most hourly when events are ingested, deleting expired visits and
their events together. Historical access records follow their existing policy.
Admins without test-contract access cannot see test visits or their history.
Date filters apply to the last recorded activity; history shows the entire selected
visit. Visits are paginated in groups of 50, with history loaded only on request.

Deploy `20261105120000_visit_journeys` and `20261105121000_visit_journey_contract_context` before serving the new code and regenerate
the Prisma client. The usual Netlify build already runs `prisma migrate deploy`.
For local databases with divergent migration histories, inspect migration status
and apply only these two additive migrations; do not reset the database.

Verification:

```powershell
node --test frontend/test/visit-journey.test.mjs frontend/test/public-visit-reports.test.js
node frontend/test/visit-journey-local-db.mjs
# With the local dev server running on port 3000:
node frontend/test/visit-journey-local-http.mjs
```

The local database checks cover idempotency, delayed arrival, server contract
linking, visitor isolation, Stripe retries, test permissions and opt-out.
Data begins at activation; missing historical screen transitions are not inferred.
