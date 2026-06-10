# Link Local — Admin Portal

React 19 + Vite + TypeScript + Tailwind CSS v4 + TanStack Router/Query.

## Getting started
```bash
npm install
npm run dev      # http://localhost:5173  (proxies /api → http://localhost:4000)
```
The backend must be running on port 4000. Log in with the seeded admin:
`admin@linklocal.app` / `admin123`.

## Scripts
- `npm run dev` — dev server with API proxy
- `npm run build` — type-check + production build
- `npm run typecheck` — type-check only
- `npm run preview` — preview the production build

## Structure
```
src/
  lib/        api (axios), auth (context), utils (cn, dates)
  components/
    ui/       button, input, card, badge, modal, data-table
    layout/   sidebar, app-layout, page-header
  pages/
    login, dashboard, masters (hub), addresses (Address Capture),
    members, master-crud (generic), master-configs, placeholder
  router.tsx  code-based TanStack Router (auth-guarded layout)
  main.tsx    providers (QueryClient, Auth, Router)
```

## Screens
- **Login** — admin auth (JWT)
- **Dashboard** — live counters (members, SPs, events, groups, pending verifications)
- **Masters & Controls** — hub of master-data sections (matches Figma)
- **Address Capture** — searchable, paginated, status-filtered addresses table
- **Members** — residents/SPs with verify & block actions
- **Master CRUD** — Whitelisted Cities, Service Categories, Coupons, Education,
  Document Types, Profile Tags, Referral Sources, Permissions
- Placeholders wired into nav: Service Providers, Events, Groups, Reports, Activity Logs

Path alias `@/*` → `src/*` (configured in both `tsconfig.json` and `vite.config.ts`).
