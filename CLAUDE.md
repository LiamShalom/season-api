# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Dev server with hot reload (tsx watch)
npm run build     # Compile TypeScript → dist/
npm start         # Run compiled server (dist/server.js)
npm run migrate   # Run pending database migrations
```

No lint/test tooling is configured yet.

## Architecture

Fastify 5 REST API for a social food/recipe sharing app. Three-layer module structure:

```
Routes → Service → Repository → PostgreSQL (raw SQL, no ORM)
```

Each module under `src/modules/{name}/` has three files: `.routes.ts`, `.service.ts`, `.repository.ts`.

**Shared utilities** (`src/shared/`):
- `db.ts` — pg Pool (max 20 connections)
- `errors.ts` — `AppError` class; all errors must go through this
- `auth.middleware.ts` — `requireAuth` / `optionalAuth` JWT decorators
- `pagination.ts` — cursor/offset pagination helpers

**External services:**
- PostgreSQL — primary store; pg_trgm extension for TRGM GIN full-text search on `users.username` and `posts.dish_name`
- Cloudflare R2 — media storage via presigned URLs (client uploads directly; server only generates URLs)
- Google Gemini API — planned for `POST /recipes/import` (currently returns 503)

**Auth flow:** JWT access tokens + hashed refresh tokens stored in `refresh_tokens` table (7-day TTL). Bcrypt at 12 rounds.

**Migrations:** Custom runner in `scripts/migrate.ts` tracks applied files in `schema_migrations` table. Add new numbered SQL files under `migrations/` and run `npm run migrate`.

## Key Schema Facts

- All primary keys are UUIDs (pgcrypto `gen_random_uuid()`)
- `post_visibility` enum: `public | friends | private`
- `reaction_type` enum: `love_it | want_to_try | made_it`
- `tag_category` enum: `cuisine | dietary | meal_type | difficulty`
- Tags are seeded (not user-created); posts reference tags via `post_tags` junction table
- `posts.star_rating` is `NUMERIC(2,1)` constrained `0.5–5.0`
- `posts.photo_urls` is a `TEXT[]` array

## Environment Variables

```
DATABASE_URL          # PostgreSQL connection string
JWT_SECRET            # JWT signing secret
PORT                  # Default: 3000
HOST                  # Default: 0.0.0.0
NODE_ENV              # 'production' switches Pino to JSON logging
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
```

## Deployment

Railway.app with Nixpacks. Build: `npm run build`. Start: `npm start`. Restart on failure (max 10 retries). Run `npm run migrate` before deploying schema changes.
