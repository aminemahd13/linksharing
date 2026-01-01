## Linksharing — one-time WhatsApp invite links

Next.js (App Router) + TypeScript + Tailwind/shadcn/ui + Prisma + NextAuth. Generates single-use WhatsApp invite links, emails them, and gives admins RBAC, audit logs, dashboards, and link controls.

### Prereqs
- Node 18+
- Docker (optional; compose recipe included)

### Environment
Copy and edit envs:
```bash
cp .env.example .env
# set AUTH_SECRET, TOKEN_PEPPER, AUTH_EMAIL_FROM, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL
# DATABASE_URL defaults to the compose Postgres service; adjust if using an external DB
```
Default seed admin: `admin@example.com` / `SEED_ADMIN_PASSWORD` (default `ChangeMe123!`).

### Run with Docker (recommended)
```bash
# 1) start db
docker compose --project-name linksharing up -d linksharing-db

# 2) install deps + migrate + generate + seed (one-shot)
docker compose --project-name linksharing run --rm --entrypoint /bin/sh linksharing-app -c "npm install"
docker compose --project-name linksharing run --rm --entrypoint /bin/sh linksharing-app -c "npx prisma migrate dev --name admin-campaign-access"
docker compose --project-name linksharing run --rm --entrypoint /bin/sh linksharing-app -c "npm run prisma:generate"
docker compose --project-name linksharing run --rm --entrypoint /bin/sh linksharing-app -c "npm run prisma:seed"
docker compose --project-name linksharing up -d linksharing-app

# 3) start app
docker compose --project-name linksharing up -d linksharing-app

# optional: reset admin password
docker compose --project-name linksharing exec linksharing-app node scripts/reset-admin.js
```
- Postgres container: `linksharing-db` (exposed on host 5445, internal 5432)
- App container: `linksharing-app-dev` on port 3000
- If running the app outside Docker, point `DATABASE_URL` to `postgresql://linksharing:linksharing@localhost:5445/linksharing` or your own DB URL.



### Run locally (without Docker)
```bash
npm install
npm run prisma:migrate -- --name init
npm run prisma:generate
npm run prisma:seed
npm run dev
```

### Core flows
- Admin login: /admin/login (NextAuth credentials; roles OWNER/ADMIN/VIEWER)
- Dashboard: /admin/dashboard (metrics, recent activity)
- Groups: /admin/groups (store WhatsApp invite URLs)
- Campaigns: /admin/campaigns (create, upload recipient CSV, send one-time links)
- Campaigns now also support manual/bulk emails (no CSV) and per-recipient link creation with optional immediate send.
- Links: /admin/links (filter, deactivate/reactivate, resend, regenerate, copy links)
- Public: /l/[token] → one-time consume → redirect to WhatsApp; expired view at /l/[token]/expired

### Data model (Prisma)
- admins, organizations, whatsapp_groups, invite_rotation_history
- campaigns (DRAFT/SENT/ARCHIVED)
- recipients (email, tags)
- invite_links (SHA-256(token + pepper) stored; status ACTIVE/USED/DISABLED/EXPIRED; audit fields)
- audit_logs (who did what, when)

### Security & behavior
- Tokens emailed raw; only hashed + peppered token is stored.
- Consume endpoint is transactional to prevent double-use; simple in-memory rate limit guards abuse.
- Admin actions write to audit_logs; RBAC enforced in server routes/middleware.

### Email
- SMTP only: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, and `AUTH_EMAIL_FROM` (e.g., noreply@mathmaroc.org).

### Useful scripts
- `npm run prisma:generate` – regen Prisma client
- `npm run prisma:migrate -- --name <msg>` – apply migrations
- `npm run prisma:seed` – seed default admin/org
- `npm run lint` – lint
- `npm run dev` – start app
