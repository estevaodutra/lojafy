# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # dev server on http://localhost:8080
npm run build     # production build
npm run lint      # ESLint
npm run preview   # preview production build
```

No test runner is configured. The project uses **npm** (Bun lockfile is present but `bun` may not be installed).

Remove `@tailwindcss/line-clamp` from `tailwind.config.ts` plugins — it is now built into Tailwind v3.3 and causes a console warning.

## Architecture

### 5-Role Access Model

Every authenticated user has a `role` in the `profiles` table: `super_admin`, `admin`, `supplier`, `reseller`, or `customer`. This drives the entire routing and permission model.

- **`RoleBasedRoute`** (`src/components/auth/RoleBasedRoute.tsx`) — wraps layout routes; redirects to `/auth` if not authenticated or to `/` if wrong role.
- **`useUserRole`** (`src/hooks/useUserRole.ts`) — reads `profile.role` from `AuthContext`.
- **`FeatureRoute` / `useFeature`** — calls the `user_has_feature(user_id, feature_slug)` Supabase RPC to gate optional paid features (`lojafy_academy`, `top_10_produtos`, `lojafy_integra`). `super_admin` always bypasses feature checks.

### 6 Distinct Portals

Each portal has its own layout and pages folder:

| Path | Layout | Roles |
|---|---|---|
| `/` | `Header`/`Footer` | public |
| `/minha-conta` | `CustomerLayout` | any authenticated |
| `/admin` | `AdminLayout` | admin, super_admin |
| `/super-admin` | `SuperAdminLayout` | super_admin |
| `/supplier` | `SupplierLayout` | supplier |
| `/reseller` | `ResellerLayout` | reseller |
| `/loja/:slug` | `PublicStoreProviderRoute` | public (multi-tenant) |

### Authentication & Profile (`src/contexts/AuthContext.tsx`)

`AuthContext` wraps Supabase Auth and additionally:
- Fetches `profiles` row on every auth state change to expose `profile.role`.
- Sends all auth events (signup, login, logout, token refresh) to the `webhook-auth-events` Edge Function for n8n processing.
- Supports **admin impersonation** stored in `sessionStorage` under `impersonation_data`. Use `getEffectiveUserId()` / `getEffectiveProfile()` (not `user.id` / `profile` directly) in any code that must respect impersonation.

### Public Store — Multi-Tenant Reseller Stores

Routes under `/loja/:slug` are fully isolated white-label stores for resellers.

- `PublicStoreProviderRoute` (`src/components/public-store/PublicStoreProviderRoute.tsx`) resolves the `:slug` to a `reseller_stores` row and injects `--primary`, `--secondary`, `--accent` CSS custom properties for per-store theming.
- Store data flows via `PublicStoreContext` (`src/hooks/usePublicStoreContext.ts`); read it with `usePublicStoreContext()` inside public store pages — never fetch directly.
- These routes intentionally skip the global `useDocumentTitle` hook; each public store page manages its own title.

### Supabase Integration

- Client: `src/integrations/supabase/client.ts` — credentials are hardcoded (Lovable pattern). The anon key is public-safe, but moving to env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) is preferred.
- Types: `src/integrations/supabase/types.ts` — auto-generated. Do not edit manually; regenerate via `supabase gen types typescript`.
- Edge Functions: `supabase/functions/*/index.ts` — Deno runtime. Use `SUPABASE_SERVICE_ROLE_KEY` (never anon key) and validate `N8N_WEBHOOK_SECRET` header for n8n-facing functions.
- Migrations: `supabase/migrations/` — plain SQL, applied in filename order.

### n8n Integration

n8n orchestrates: product catalog automation (supplier spreadsheets → RapidAPI Amazon → DB), payment callbacks, and auth event tracking. The integration is entirely webhook-based — the frontend calls Edge Functions, which forward to n8n or consume n8n callbacks:

- `webhook-auth-events` — receives login/signup/logout events from `AuthContext`.
- `webhook-n8n-payment` — n8n calls this after Mercado Pago confirms PIX payment; atomically updates `orders.payment_status` and dispatches `order.paid` via `dispatch-webhook`.
- `dispatch-webhook` — fan-out: sends webhook events to all registered endpoints in the DB.

### React Query Configuration

Global defaults in `App.tsx` (lines 140–148): `staleTime: 2min`, `gcTime: 5min`, `refetchOnWindowFocus: false`, `retry: 1`. Override per query only when there is a clear reason (e.g. real-time data).

### Global Modals

Two app-wide modals render above all routes inside `AppWithNotifications`:
1. **WhatsApp enforcement** (`WhatsAppRequiredModal`) — has priority; blocks all other modals until the user provides a WhatsApp number.
2. **Mandatory notifications** (`MandatoryNotificationModal`) — shown only after WhatsApp is resolved.

### Alias

`@` maps to `src/` in both TypeScript and Vite. Always import using `@/` paths.
