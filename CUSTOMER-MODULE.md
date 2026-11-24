# Customer Management module

## Architecture and implementation

The existing ERP had Next.js 16, React 19, TypeScript, Tailwind/CSS, Prisma 6, PostgreSQL/Supabase, opaque database sessions, and ADMIN/OFFICE/DELIVERY roles. Only dashboard, identity and team administration existed. No customer, project, site or challan module existed. This implementation reuses the Shell, colors, cards, inputs, session authentication and same-origin write checks.

Routes: `/customers` for listing, sectioned editing and detail view; `/projects` for a separate project master. Customer APIs provide database pagination (20 rows), sorting, name/code/GSTIN/mobile/email search, type/category/status filters, counts, create/update/status operations, private document upload/download and active-only delivery options. The customer code is allocated transactionally as CUS-000001; PostgreSQL unique constraints prevent duplicates. Concurrent edits use a version check and reject stale saves.

Normalized tables: Customer, CustomerContact, CustomerAddress, CustomerFinancial, CustomerProject, CustomerLocation, CustomerDocument, CustomerHistory and CustomerSequence. Creator/editor/uploader/audit actors reference Users. Composite foreign keys prevent cross-customer project/location links. Removed locations are soft-removed, never deleted through the UI. Customers and projects are deactivated. Audit events record actor/time/action; this is an activity history, not complete before/after snapshots.

## Permissions and business defaults

| Operation | Admin | Office | Delivery |
|---|---|---|---|
| View/create/edit customers and locations | Yes | Yes | No |
| Activate/deactivate customers | Yes | No | No |
| View/change financial details | Yes | No | No |
| Manage projects | Yes | Yes | No |

These defaults are centralized in customerPermissions and require business review. Financial fields are omitted from unauthorized API responses and rejected on unauthorized writes. Documents require authenticated Customer Master access. New tables revoke access from PUBLIC and Supabase anon/authenticated roles. Existing authentication tables are not changed.

Duplicate rule: unique nonempty GSTIN, plus normalized case/whitespace customer name combined with the submitted mobile number. Shared emails/mobile numbers alone are allowed; PAN is not unique because multiple GST registrations may share it. GSTIN/PAN validation checks format and PAN/GSTIN consistency, not tax registration status or an external government lookup. PIN validation assumes India; international postal formats need a later configurable rule. Names/categories/groups/industries/salesperson/source are editable text until controlled business vocabularies are agreed. Company legal name is cleared for Individuals; tax identifiers remain optional. No draft subsystem existed, so no draft saving was added.

## Documents

PDF, JPEG and PNG are accepted with byte-signature/MIME checks, safe filenames and a 2 MB per-file limit. Maximum 20 documents per customer. Content is stored in PostgreSQL BYTEA so it works on Vercel without local disk or a new storage credential. Downloads force attachment and no-store. No malware scanner is configured. Consider private object storage for greater document volume. Partial upload failure preserves remaining files for retry; the UI explicitly says the customer was already saved.

## Delivery Challan integration boundary

There is no existing challan creation form or challan persistence to integrate with. `CustomerSelector` is a reusable client component and `/api/customer-options` provides active customer/project/location selection and receiver/address payloads. Projects are selected from linked records, never created implicitly. The component clears stale selections on customer/project changes. It must be mounted in the future challan creation form, whose backend must revalidate active status and ownership at save time. No completed challan integration or end-to-end challan save is claimed. Inline customer creation from a challan is deferred because that workflow does not exist.

## Verification

- Unit tests: company/individual data, required fields, GSTIN/PAN/PIN/email, conditional shipping/payment/TDS rules, permissions and duplicate normalization.
- Isolated PostgreSQL integration: company/individual creation, duplicate rejection, invalid GSTIN, same-as-billing, editing, location soft removal, separate projects, project ownership filtering, receiver/address selection, office financial denial, delivery access denial, customer status permissions, stale-edit rejection, search/filter, multi-page pagination, cross-origin rejection, private document upload/download and audit history.
- Existing identity integration tests rerun for regression coverage.
- Desktop browser: create and view a customer; validation preserves inputs. Mobile form visually inspected at 390x844.
- No test customers or dummy records were inserted in Supabase. Test fixtures use the isolated local sunshine_customer_test database. A local browser-QA fixture may remain there only.

Run `npm test`, `npm run lint`, `npm run build`. For API tests start the app on port 3001 with APP_ORIGIN=http://localhost:3001 and DATABASE_URL pointing to local sunshine_customer_test, then run `npx tsx tests/customer-integration.ts`. The test refuses other targets. Migrations use `npm run db:migrate`; deployment uses the existing Vercel build command. Both customer migrations have been applied to Supabase.
