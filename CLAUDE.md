# CLAUDE.md — Project Instructions

> Project-scoped guidance for AI agents working in this repository. This project is being built from scratch. These instructions define architectural principles, development standards, and expectations for all AI-assisted development.

## Your responsibility

Build and maintain a modern booking website with an integrated admin panel.

The project uses Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase, and Vercel.

The application includes:

- Public website with service information, pricing, gallery, reviews, and contacts.
- Interactive booking calendar with available and occupied time slots.
- Booking management through an admin panel.
- Supabase PostgreSQL as the source of truth.
- Telegram notifications about new bookings.
- PWA support for mobile installation and offline functionality.

The project starts from zero. Establish a clean, scalable architecture without introducing unnecessary complexity.

**The repository is the source of truth. Documentation must always reflect the actual implementation.**

---

## Start every session by reading

1. `docs/PROJECT.md` — project purpose, scope, and current requirements.
2. `docs/ARCHITECTURE.md` — application architecture and technical decisions.
3. `docs/DEVELOPMENT.md` — development workflow and conventions.
4. `docs/ROADMAP.md` — implementation stages, completed work, and next tasks.
5. `docs/handoff/latest.md` — latest development handoff and current state.
6. `docs/decisions/README.md` — the index of decisions taken and, for each, what was
   rejected and why. Read this before proposing a change to the data model: most of
   what looks like an oversight has already been argued once.

Then read the relevant feature documentation and actual source files before making changes.

If documentation does not exist yet, establish it before implementing major functionality.

Do not assume that documented functionality is already implemented. Always verify the actual source code.

---

## Technology stack

| Area            | Technology                       |
| --------------- | -------------------------------- |
| Framework       | Next.js (App Router)             |
| Language        | TypeScript                       |
| Styling         | Tailwind CSS                     |
| UI components   | shadcn/ui                        |
| Database        | Supabase PostgreSQL              |
| Authentication  | Supabase Auth                    |
| File storage    | Supabase Storage                 |
| Realtime        | Supabase Realtime                |
| PWA             | Serwist                          |
| Calendar        | FullCalendar or react-day-picker |
| Notifications   | Telegram Bot API                 |
| Deployment      | Vercel                           |
| Version control | Git                              |

Use the existing project dependencies and conventions. Do not introduce additional libraries without a clear technical reason.

---

## Core architectural principles

### 1. Next.js

- Use the App Router.
- Prefer React Server Components by default.
- Use Client Components only when browser APIs, local interactions, or client-side state are required.
- Keep `'use client'` boundaries as small as possible.
- Use Server Actions or Route Handlers for appropriate server-side operations.
- Never expose server-side secrets to the browser.
- Use Next.js metadata API for SEO.
- Use loading, error, and not-found boundaries where appropriate.
- Avoid unnecessary client-side data fetching.

### 2. TypeScript

- Strict TypeScript is mandatory.
- Avoid `any`. Use explicit types or `unknown` with proper narrowing.
- Avoid unnecessary type assertions.
- Reuse shared types instead of duplicating interfaces.
- Keep domain models separate from UI-specific types.
- Use generated Supabase database types whenever possible.

### 3. Components and UI

- Use shadcn/ui as the foundation for reusable interface components.
- Use Tailwind CSS for styling.
- Follow consistent spacing, typography, colors, and responsive behavior.
- Avoid duplicating UI logic.
- Keep components focused on a single responsibility.
- Extract reusable components only when there is a real reuse or maintainability benefit.
- Do not build abstractions prematurely.
- Support mobile, tablet, and desktop layouts.

### 4. Application structure

Keep public website functionality and admin functionality logically separated.

Suggested routing:

- `/` — homepage
- `/pricing` — services and prices
- `/gallery` — photo gallery
- `/reviews` — customer reviews
- `/contacts` — contact information
- `/booking` — booking calendar and form
- `/admin` — admin dashboard
- `/admin/bookings` — booking management
- `/admin/prices` — pricing management
- `/admin/gallery` — gallery management
- `/admin/reviews` — review moderation
- `/admin/settings` — website settings

Use route groups and layouts where they improve organization.

Suggested source structure:

```text
src/
  app/
    (public)/
    admin/
    api/
  components/
    ui/
    shared/
    public/
    admin/
  features/
    bookings/
    pricing/
    gallery/
    reviews/
    settings/
    auth/
  lib/
    supabase/
    telegram/
    utils/
  types/
  config/

supabase/
  migrations/
  seed.sql/

public/
  icons/

docs/
  PROJECT.md
  ARCHITECTURE.md
  DEVELOPMENT.md
  ROADMAP.md
  DATABASE.md
  SECURITY.md
  FEATURES/
  decisions/
  handoff/
    latest.md
```

This is a starting structure, not a requirement to create every directory immediately.

---

## Database and Supabase

Supabase PostgreSQL is the source of truth for application data.

### Core tables

The initial database should include:

- `bookings` — customer bookings.
- `prices` — services and pricing.
- `gallery` — images and display order.
- `reviews` — customer reviews and moderation status.
- `settings` — website content, background, contacts, and configuration.

Additional tables can be introduced when justified by actual requirements.

### Database rules

- All database schema changes must be implemented through Supabase migrations.
- Never modify the production database schema manually without creating a corresponding migration.
- Use foreign keys, indexes, unique constraints, and check constraints where appropriate.
- Use appropriate timestamps (`created_at`, `updated_at`).
- Use UUID primary keys unless there is a specific reason not to.
- Use database-generated types.
- Keep migrations small and logically separated.
- Do not delete or rewrite existing migrations that have already been applied.

### Booking integrity

Booking conflicts must be prevented at the PostgreSQL level.

Never rely exclusively on frontend validation to prevent double bookings.

Use PostgreSQL exclusion constraints with `tstzrange` and `btree_gist` where appropriate.

Requirements:

- A booking must have a valid start and end time.
- Overlapping active bookings must be rejected.
- Cancelled bookings must not block availability.
- Booking creation and status changes must be atomic.
- All booking times must use a clearly defined timezone strategy.
- Availability must be calculated using actual database data.
- Handle concurrent booking requests safely.

The exact booking model (service duration, buffers, working hours, and booking statuses) must be documented before implementing the calendar.

### Supabase security

- Enable Row Level Security (RLS) on all exposed tables.
- Define explicit policies for public and authenticated operations.
- Public users must not have unrestricted access to customer booking information.
- Admin operations must require authenticated and authorized admin access.
- Never rely on hiding admin UI as an authorization mechanism.
- Never expose the Supabase service role key.
- Use server-side authorization for privileged operations.
- Validate and sanitize all external input.

---

## Authentication and administration

The admin panel is a protected part of the application.

Requirements:

- Use Supabase Auth.
- Protect all `/admin` routes.
- Verify authorization on the server, not only in middleware or client components.
- Separate authentication from authorization.
- Do not allow public registration for administrators unless explicitly required.
- Handle expired sessions and logout correctly.
- Keep admin-only operations inaccessible to public users.

The initial implementation can support one administrator. Avoid building a complex role management system unless the requirements change.

---

## Booking system

The booking system is one of the most important parts of the application.

### Public booking flow

1. Display available dates.
2. Display available time slots.
3. Allow the customer to select a date and time.
4. Collect the required customer information.
5. Validate the booking on the server.
6. Create the booking in PostgreSQL.
7. Notify the owner through Telegram.
8. Show the booking result to the customer.

### Booking statuses

Use an enum for the closed set of booking statuses.

Initial statuses:

- `PENDING`
- `CONFIRMED`
- `CANCELLED`

Do not introduce arbitrary string values.

### Important rules

- PostgreSQL is the final authority on availability.
- Always revalidate availability during booking creation.
- Handle race conditions and duplicate submissions.
- Do not expose personal customer information through public calendar queries.
- Admins must be able to confirm and cancel bookings.
- Realtime updates should refresh calendar availability across connected clients.
- Telegram notification failures must not silently invalidate a successfully created booking.

---

## Telegram integration

Telegram Bot API is used for owner notifications.

Requirements:

- Send notifications after successful booking creation.
- Keep bot tokens in server-side environment variables.
- Never expose Telegram credentials in client-side code.
- Handle Telegram API errors and timeouts.
- Log notification failures without exposing sensitive customer data.
- Do not make booking creation dependent on Telegram availability.
- Avoid sending duplicate notifications when requests are retried.

Suggested environment variables:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

---

## File storage and gallery

Use Supabase Storage for:

- Gallery images.
- Website backgrounds.
- Other uploaded visual assets.

Requirements:

- Validate file types and sizes.
- Use unique filenames.
- Avoid loading unnecessarily large images.
- Use optimized image formats where appropriate.
- Keep storage permissions explicit.
- Restrict uploads and deletions to authorized administrators.
- Store file references in PostgreSQL, not image binaries.
- Handle deletion of both database records and storage objects safely.

---

## PWA

Use Serwist for PWA functionality.

Requirements:

- Provide a valid web app manifest.
- Configure application icons.
- Support installation on compatible mobile devices.
- Implement sensible offline caching.
- Avoid caching sensitive admin pages or customer data.
- Do not serve stale availability. A cached calendar that shows a slot as free after
  it has been taken is worse than no offline support at all.
- Keep the service worker's scope and update strategy explicit, so a stale shell cannot
  outlive a deployment.

---

## Verification

Nothing is done until it has been checked. Claims of completion without evidence are
worse than an admission that something is untested.

- Run `npm run typecheck && npm run lint && npm run build` before calling work finished.
- **A green build is not proof that a page works.** It has already happened on this
  project that all routes prerendered successfully while a page rendered nothing but
  its error boundary. Open the page.
- Database work is verified against a real PostgreSQL, not by reading the SQL. Two
  genuine defects on this project were caught that way and would not have been caught
  by review.
- Verify behaviour, not only syntax: that an overlapping booking is rejected, that a
  cancelled one frees its slot, that an anonymous client cannot read customer data.
- When something cannot be verified, say so plainly and say why.

---

## Migrations

- Migrations are applied through the Supabase SQL editor; the CLI is not linked.
- Run every migration against a throwaway PostgreSQL container first. See
  `docs/DEVELOPMENT.md` for the recipe.
- Supabase warns that almost every script is "destructive" because the scripts contain
  `drop policy if exists` and `drop trigger if exists`. Read the script before
  dismissing the warning — sometimes it is right.
- Never edit a migration that has already been applied. Add a new one.

---

## Documentation and decisions

The repository is the source of truth for what exists; `docs/` is the source of truth
for what is intended.

- Update the affected document in the same change as the behaviour.
- A non-obvious choice, especially one where the obvious alternative was rejected, gets
  a file in `docs/decisions/`: context, decision, why, what was rejected, consequences.
- A deferred thing goes in `docs/BACKLOG.md` with the condition for picking it up.
- Finish a working session by updating `docs/handoff/latest.md`.
- Never document something as done before it works.

---

## Git

- `main` is the branch; the remote is `github.com/atmoroz/bania`.
- Commit messages explain **why**, not what the diff already shows.
- Never commit `.env.local`, tokens or keys. Check before staging.
- `docs/` and `project-documentation/` are intentionally not tracked.

---

## When requirements and this file disagree

The sections below have been superseded by decisions taken during the work. They are
left in place as history; the decision records are authoritative.

| Section | Superseded by |
| --- | --- |
| Public booking flow (visitors create bookings) | `docs/decisions/0001-phone-confirmed-booking.md` — the calendar shows free/busy and the administrator records bookings by phone |
| Booking statuses including `PENDING` | `docs/decisions/0004-no-pending-status.md` — `CONFIRMED` and `CANCELLED` only |
| Telegram integration | `docs/BACKLOG.md` — nothing to notify when the administrator enters the booking |
| Core tables and the suggested source structure | `docs/DATABASE.md`, plus the records listed in `docs/decisions/README.md` |

If a future instruction conflicts with a decision record, raise it rather than silently
following either one.
