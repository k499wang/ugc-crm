# UGC Creator CRM – Codebase Audit and Fix Guide

This document explains the issues found during a static scan of the codebase and TypeScript build, why they occur, and how to fix them. Each section includes concrete file references and code examples.

Audit performed with:
- repo scan of `app`, `components`, `hooks`, `lib`, `styles`, `scripts`
- TypeScript compiler: `node_modules/.bin/tsc -p . --noEmit`
- manual inspection of affected files

Contents
- TypeScript and Runtime Errors
- API Route Param Typing (Promise misuse)
- Client vs Server usage problems
- Build/Lint configuration issues
- Duplication and Redundancies
- Runtime and UX edge cases
- Security and configuration
- Minor cleanups

---

## TypeScript and Runtime Errors

### 1) creators table stats: incorrect access to joined `videos`
- File: `app/admin/creators/page.tsx:39`

Problem
- The query joins `video_tier_payments` with `videos!inner(creator_id, company_id)` but the follow‑up access uses optional chaining on an assumed array/object shape that TypeScript cannot verify, causing:
  - TS2339 around `tp.videos?.creator_id`

Context (current)
```ts
// app/admin/creators/page.tsx
const [{ data: creators }, { data: videos }, { data: tierPayments }] = await Promise.all([
  supabase.from("creators").select("*")..., // creators
  supabase.from("videos").select("creator_id, views")..., // videos
  supabase
    .from("video_tier_payments")
    .select("payment_amount, paid, videos!inner(creator_id, company_id)")
    .eq("videos.company_id", profile.company_id)
    .eq("paid", true)
    .not("payment_amount", "is", null),
])

const creatorPayments = tierPayments?.filter((tp) => tp.videos?.creator_id === creator.id) || []
```

Fix Options
- Prefer explicit selection alias and typed access, or denormalize before typing:
```ts
// Add a type for clarity (what the join returns)
type TierPaymentJoined = {
  payment_amount: number | null
  paid: boolean
  videos: { creator_id: string; company_id: string }
}

const { data: tierPayments } = await supabase
  .from("video_tier_payments")
  .select("payment_amount, paid, videos:videos!inner(creator_id, company_id)")
  .eq("videos.company_id", profile.company_id)
  .eq("paid", true)
  .not("payment_amount", "is", null)

const creatorPayments = (tierPayments as TierPaymentJoined[] | null)?.filter(
  (tp) => tp.videos.creator_id === creator.id,
) || []
```

Why this works
- Using a local type and selecting `videos:videos!inner(...)` clarifies the shape for TS and avoids optional chaining misassumptions on arrays vs objects.

---

### 2) nullable `invite_token` passed to a function expecting `string`
- File: `components/admin/creators-table.tsx:128,215`

Problem
- `creator.invite_token` is `string | null`, but `copyInviteLink` parameters are `string`.

Context (current)
```tsx
const copyInviteLink = (creatorId: string, inviteToken: string) => {
  // ...
}

// usage
onClick={() => copyInviteLink(creator.id, creator.invite_token)}
```

Fix
- Allow nullable param and guard:
```tsx
const copyInviteLink = (creatorId: string, inviteToken?: string | null) => {
  if (!inviteToken) {
    alert("No invite link yet. Add an email for this creator first.")
    return
  }
  const url = `${window.location.origin}/auth/invite/${inviteToken}`
  navigator.clipboard.writeText(url)
  setCopiedId(creatorId)
  setTimeout(() => setCopiedId(null), 1500)
}
```

---

### 3) Video status typing mismatch in VideoForm
- File: `components/admin/video-form.tsx:243`

Problem
- `formData.status` is `VideoStatus` but `onValueChange` receives `string`. TS2322/typing mismatch.

Context (current)
```tsx
<Select
  value={formData.status}
  onValueChange={(value) => setFormData({ ...formData, status: value })}
>
  <SelectTrigger id="status">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="pending">Pending</SelectItem>
    <SelectItem value="approved">Approved</SelectItem>
    <SelectItem value="rejected">Rejected</SelectItem>
  </SelectContent>
</Select>
```

Fix
- Narrow `value` type and ensure `formData.status` is typed as `VideoStatus`.
```tsx
import type { VideoStatus } from "@/lib/types"

onValueChange={(value: VideoStatus) =>
  setFormData({ ...formData, status: value })
}
```

---

### 4) Creator videos table uses non‑existent `payment_amount`
- File: `components/creator/creator-videos-table.tsx:65`

Problem
- `Video` interface has `base_payment_amount` and `cpm_payment_amount`, not `payment_amount`.

Context (current)
```tsx
<TableCell>
  {video.payment_amount ? `$${video.payment_amount.toFixed(2)}` : "-"}
</TableCell>
```

Fix
- Compute a display payment from available fields:
```tsx
const totalPayment =
  (video.base_payment_amount ?? 0) + (video.cpm_payment_amount ?? 0)

<TableCell>
  {totalPayment > 0 ? `$${totalPayment.toFixed(2)}` : "-"}
</TableCell>
```

---

### 5) Recharts tooltip/legend typing issues
- File: `components/ui/chart.tsx:109,114,182,260,266,278`

Problems
- `payload`, `label` typing on `ChartTooltipContent` and `ChartLegendContent` is too strict compared to Recharts’ actual prop types.
- Mapping over `payload` without narrowing leads to TS errors.

Minimal Fix
- Loosen types and guard before use:
```tsx
// ChartTooltipContent props
function ChartTooltipContent({
  active,
  payload,
  label,
  ...rest
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> & {
  // ensure array form for our component’s internals
  payload?: any[]
  label?: any
  nameKey?: string
  labelKey?: string
  indicator?: 'line' | 'dot' | 'dashed'
  hideLabel?: boolean
  hideIndicator?: boolean
}) {
  if (!active || !payload || payload.length === 0) return null
  // safe iteration
  return (
    <div>{payload.map((item, index) => /* … */)}</div>
  )
}

// ChartLegendContent props
function ChartLegendContent({ payload, ...props }: React.ComponentProps<'div'> & {
  payload?: any[]
  verticalAlign?: 'top' | 'bottom' | 'middle'
  nameKey?: string
}) {
  if (!payload?.length) return null
  return <div>{payload.map((item) => /* … */)}</div>
}
```

Better Fix
- Introduce local interfaces for the Recharts payload items you use (e.g., `{ name?: string; dataKey?: string; color?: string; payload?: Record<string, unknown>; value?: number }`) and use type predicates before accessing nested properties.

Why
- Recharts typings are permissive; explicit narrowing keeps safety and removes TS errors.

---

## API Route Param Typing (Promise misuse)

Problem
- Several route handlers type `params` as a `Promise` and then `await` it. In Next.js App Router, `params` is a plain object.

Files
- `app/api/creators/[id]/route.ts`
- `app/api/videos/[id]/route.ts`
- `app/api/videos/[id]/feedback/route.ts`
- `app/api/feedback/[id]/route.ts`
- Also appears in server pages like `app/auth/invite/[token]/page.tsx`, `app/admin/videos/[id]/edit/page.tsx`.

Context (current)
```ts
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // ...
}
```

Fix
```ts
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  // ...
}
```

Similarly for GET/POST/PUT handlers and for server components that destructure `params`.

Why
- App Router provides `params` synchronously; typing as Promise causes incorrect `await` usage and TS errors.

---

## Client vs Server Usage Problems

### 1) Client component using `redirect()`
- File: `app/auth/signup/page.tsx`

Problem
- Page is a Client Component (`"use client"`) but calls `redirect()` (server-only). This will cause runtime issues.

Fix A (client)
```tsx
"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SignUpPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/auth/login")
  }, [router])
  return null
}
```

Fix B (server)
- Convert to a Server Component by removing `"use client"` and keep `redirect("/auth/login")` at the top.

### 2) Mark server‑only modules and use proper Supabase client for service role
- File: `lib/supabase/serverMaster.ts`

Problems
- Leading `'server only';` string does not enforce server‑only usage.
- Using `@supabase/ssr` with service role key is not ideal; use `@supabase/supabase-js` with `persistSession:false`.

Fix
```ts
// lib/supabase/serverMaster.ts
import "server-only"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "x-server": "true" } },
  })
}
```

Why
- `import "server-only"` ensures the module can’t be imported in client bundles.
- `@supabase/supabase-js` is the direct admin client; SSR helper is meant for browser/server session clients, not service key ops.

---

## Build/Lint Configuration Issues

### 1) TypeScript errors ignored in build
- File: `next.config.mjs`

Problem
- `typescript.ignoreBuildErrors: true` hides real type errors and can ship broken builds.

Fix
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
}
export default nextConfig
```

### 2) ESLint script without ESLint
- File: `package.json`

Problem
- `"lint": "eslint ."` exists, but no `eslint` in devDependencies/config.

Fix A
- Add ESLint and a minimal config.
```json
// package.json (devDependencies)
"eslint": "^9",
"@eslint/js": "^9",
"typescript-eslint": "^8"
```
```js
// eslint.config.js (flat config example)
import js from "@eslint/js"
export default [js.configs.recommended]
```

Fix B
- If you don’t want linting now, remove the `lint` script.

### 3) Multiple lockfiles
- Files: `package-lock.json` and `pnpm-lock.yaml`

Problem
- Having both can confuse tooling and contributors.

Fix
- Choose npm or pnpm and remove the other lockfile. Update documentation accordingly.

---

## Duplication and Redundancies

### 1) Duplicate hooks
- Files:
  - `hooks/use-toast.ts` and `components/ui/use-toast.ts` (same implementation)
  - `hooks/use-mobile.ts` and `components/ui/use-mobile.tsx` (same hook)

Problem
- Two sources of truth make maintenance harder and increase bundle size.

Fix
- Pick one location (recommended: `components/ui/*` for UI hooks) and delete the duplicates. Update imports:
```ts
// replace imports from '@/hooks/use-toast' with '@/components/ui/use-toast'
// replace imports from '@/hooks/use-mobile' with '@/components/ui/use-mobile'
```

### 2) Duplicate `.next` types include
- File: `tsconfig.json`

Problem
- `".next\\dev/types/**/*.ts"` appears twice in `include`.

Fix
- Remove the duplicate entry.

---

## Runtime and UX Edge Cases

### 1) Invite link copy without token
- File: `components/admin/creators-table.tsx`

Fix (guard and notify)
```tsx
const copyInviteLink = (creatorId: string, inviteToken?: string | null) => {
  if (!inviteToken) {
    alert("No invite link yet. Add an email for this creator first.")
    return
  }
  const url = `${window.location.origin}/auth/invite/${inviteToken}`
  navigator.clipboard.writeText(url)
  setCopiedId(creatorId)
  setTimeout(() => setCopiedId(null), 1500)
}
```

### 2) Mojibake characters in warning text
- File: `components/admin/creator-form.tsx:345,368`

Problem
- The warning strings include invalid characters like `??` (encoding issue), resulting in broken UI text.

Fix
```tsx
<p className="text-xs text-amber-600 font-medium">
  Warning: This creator has {paidVideosCount} video{paidVideosCount > 1 ? "s" : ""} already marked as paid.
  Changing the base pay will NOT update the stored payment amounts for those videos. The old amounts will remain.
 </p>
```

### 3) Middleware match scope
- File: `middleware.ts`

Problem
- The matcher intercepts all non‑static paths, which may include APIs or other routes unnecessarily.

Current
```ts
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
```

Suggested (if you only need session refresh on app pages)
```ts
export const config = {
  matcher: [
    // exclude APIs explicitly
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

---

## Security and Configuration

### 1) Service Role key usage
Files touching service role functionality:
- `app/auth/invite/[token]/page.tsx`
- `app/api/creators/[id]/route.ts` (deleting auth users)
- `lib/supabase/serverMaster.ts`

Guidelines
- Ensure these modules stay server‑only (add `import "server-only"`).
- Use `@supabase/supabase-js` for admin calls; set `persistSession:false`.
- Never import these modules from client components.

---

## Minor Cleanups

### 1) Unused ThemeProvider
- File: `components/theme-provider.tsx`

Observation
- Not referenced in `app/layout.tsx`. Either integrate it or remove it.

Integration example
```tsx
// app/layout.tsx
import { ThemeProvider } from "@/components/theme-provider"

<html lang="en">
  <body className={...}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Analytics />
    </ThemeProvider>
  </body>
</html>
```

### 2) Duplicate global styles
- Files: `app/globals.css` and `styles/globals.css`

Observation
- Only `app/globals.css` is used in `app/layout.tsx`. Remove `styles/globals.css` unless you intend dual themes.

---

## Proposed Fix Plan (ordered)

1) Correct API route params and page params
- Replace `params: Promise<...>` with `params: {...}` and remove `await params` in:
  - `app/api/creators/[id]/route.ts`
  - `app/api/videos/[id]/route.ts`
  - `app/api/videos/[id]/feedback/route.ts`
  - `app/api/feedback/[id]/route.ts`
  - `app/auth/invite/[token]/page.tsx`
  - `app/admin/videos/[id]/edit/page.tsx`

2) Fix type errors in components
- `components/admin/video-form.tsx`: narrow `VideoStatus` in `onValueChange`.
- `components/creator/creator-videos-table.tsx`: compute payment from base+CPM.
- `components/admin/creators-table.tsx`: accept nullable `invite_token` and guard.
- `app/admin/creators/page.tsx`: type the joined `tierPayments` and access `videos.creator_id`.
- `components/ui/chart.tsx`: loosen payload types and add guards.

3) Client/Server boundaries
- `app/auth/signup/page.tsx`: use `useRouter().replace()` or convert to server component.
- `lib/supabase/serverMaster.ts`: add `import "server-only"`; consider `@supabase/supabase-js` admin client.

4) Config and tooling
- Remove `typescript.ignoreBuildErrors` from `next.config.mjs`.
- Pick a package manager and delete the other lockfile.
- Either add ESLint and minimal config or remove the `lint` script.
- Remove duplicate include in `tsconfig.json`.

5) Content and UX polish
- Fix mojibake in warning strings in `components/admin/creator-form.tsx`.
- Adjust `middleware.ts` matcher if API exclusion is desired.
- Consolidate duplicate hooks (keep `components/ui/*`).

---

## Verification Checklist

- `tsc -p . --noEmit` passes without errors.
- Build runs without `ignoreBuildErrors`.
- Pages and API routes correctly receive `params` objects.
- Creator and video tables render payment and status correctly.
- Invite link copying handles missing tokens gracefully.
- Admin operations using service key are server‑only.

---

If you’d like, I can apply any or all of these changes as a series of focused patches and run `tsc` again to confirm a clean build.

