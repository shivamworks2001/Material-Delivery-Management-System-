# Sunshine Engineering — implementation plan

Inspection: the workspace contained empty outputs and work directories; there was no application or existing functionality to preserve.

## Architecture

Next.js App Router, React, TypeScript and Tailwind; PostgreSQL with Prisma. Server-only modules own database access and authorization. Opaque, hashed database sessions use HTTP-only cookies. Passwords use scrypt. All writes validate inputs and require same-origin requests. Roles: ADMIN, OFFICE, DELIVERY. Delivery staff will only see assigned deliveries. No public registration. Bootstrap the first administrator through a local CLI.

Modules: identity, customers, projects/sites, materials, fleet, challans, proof-of-delivery, synchronization, reports and settings. All APIs enforce permissions independently of navigation.

## Ordered phases and acceptance gates

1. Foundation: authentication, roles, protected dashboard, user administration, migrations, automated security tests and responsive layout. Approval required before phase 2.
2. Master data: customer/project/site/material/vehicle/driver CRUD, validation, deactivation and search; verify relationships and permissions.
3. Challans: transactional numbering, line items and guarded state transitions; test concurrent numbering and cancellation audit records.
4. Delivery evidence: GPS, private photo uploads, signature and shortage/damage records; validate MIME signatures, ownership and capture failure states.
5. Offline: IndexedDB records and blobs, durable outbox, UUID idempotency, retry/backoff and explicit conflict resolution. Never discard queued data on logout; isolate per user and require reauthentication before sync. Test interruption, duplicate submission and storage pressure.
6. Analytics/history: database aggregates, filters, PDF with acknowledgement, CSV exports; verify totals and authorization.
7. Hardening: integration/end-to-end tests, accessibility, performance, backups, monitoring and deployment runbook.

## Planned normalized data model

User → Session, AuditLog; Customer → Project → Site; Material → DeliveryItem; Vehicle and Driver → DeliveryChallan; DeliveryChallan → DeliveryItem, DeliveryPhoto, ReceiverAcknowledgement, ExceptionRecord, GPSLocation, SynchronizationRecord. CompanySettings owns numbering preferences. Foreign keys restrict deletion of referenced entities; use deactivation. Quantities use decimal values and explicit units. Challans have unique official number and unique client idempotency key. Sync writes and audit records commit in a single transaction. Delivery versions support optimistic concurrency. Uploaded objects remain private and use short-lived authorized URLs.

## Pending business decisions

Timezone, challan prefix/reset policy, mandatory acknowledgement fields, cancellation restrictions, retention policy, delivery staff visibility, units/conversions and branding assets need confirmation before their relevant phases. Never sum unlike material units. No seeded delivery statistics are presented as operational data.

## Current environment

Node.js is available. Docker CLI exists but its daemon is not running. PostgreSQL connectivity and database-dependent verification require a running database; do not call phase 1 approved or fully verified until these checks pass.
