# Frontend Performance Improvements

Documents every optimisation applied on the `perf/frontend-bundle-optimisation` branch, why it was needed, and what it changed. See [PERFORMANCE.md](PERFORMANCE.md) for the original problem analysis.

---

## Results Summary

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Entry bundle (gzip) | ~621 KB | ~198 KB | **−68%** |
| Lighthouse Performance | 0.62–0.68 | target ≥ 0.80 | ↑ |
| Lighthouse Accessibility | 0.93 | target ≥ 0.90 | ✓ |
| Lighthouse Best Practices | 0.96 | ≥ 0.90 | ✓ |
| Lighthouse SEO | failing | ≥ 0.90 | ✓ |

---

## 1. Non-Blocking Google Fonts

**Files:** [`frontend/index.html`](../frontend/index.html), [`frontend/src/index.css`](../frontend/src/index.css)

**Problem:** The font was loaded via a CSS `@import` inside `index.css`. CSS `@import` is render-blocking — the browser cannot build the CSSOM until the external stylesheet resolves. This added 200–600 ms to FCP on a cold connection.

**Fix:** Removed the `@import` from `index.css` and added a `<link>` in `index.html` using the `media="print"` trick:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:..."
  media="print"
  onload="this.media='all'"
/>
<noscript>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?..." />
</noscript>
```

Setting `media="print"` means the browser fetches the stylesheet without blocking rendering. `onload` swaps it to `media="all"` once it arrives. The `<noscript>` fallback covers browsers with JavaScript disabled.

**Impact:** Eliminated a render-blocking external round-trip from the critical path. Also added two `preconnect` hints so the DNS lookup and TLS handshake for `fonts.googleapis.com` and `fonts.gstatic.com` happen in parallel with other work.

---

## 2. Route-Level Code Splitting

**Files:** [`frontend/src/routes/index.tsx`](../frontend/src/routes/index.tsx), [`frontend/src/components/PageLoader.tsx`](../frontend/src/components/PageLoader.tsx)

**Problem:** All 22 pages were statically imported at the top of `routes/index.tsx`. Every visitor downloaded the code for `AdminPage`, `CheckInScannerPage`, `EventInsightsPage`, and every other page on their first visit to the home page — even if they would never navigate there.

**Fix:** Converted all page imports to `React.lazy()` via a shared helper:

```tsx
import { lazy, Suspense, ComponentType } from 'react'
import { PageLoader } from '@/components/PageLoader'

function lazy_page(
  factory: () => Promise<Record<string, ComponentType>>,
  name: string,
) {
  const Comp = lazy(() => factory().then(mod => ({ default: mod[name] })))
  return <Suspense fallback={<PageLoader />}><Comp /></Suspense>
}

// Usage:
{ index: true, element: lazy_page(() => import('@/pages/HomePage'), 'HomePage') }
```

`PageLoader` is a minimal CSS spinner (no dependencies) used as the Suspense fallback to avoid importing any heavy library into the fallback path.

Vite/Rollup automatically splits each dynamic `import()` call into its own chunk, downloaded only when the user first visits that route.

**Impact:** Primary driver of the 68% entry bundle reduction. Heavy pages like `CheckInScannerPage` (QR scanner, 109 KB gzip) and `OrganizerDashboardPage` (56 KB) are now only downloaded by users who actually need them.

---

## 3. Deferred AWS Amplify Initialisation

**Files:** [`frontend/src/App.tsx`](../frontend/src/App.tsx), [`frontend/src/main.tsx`](../frontend/src/main.tsx)

**Problem:** `import './lib/amplify'` was called in `main.tsx`, pulling the entire `aws-amplify` ecosystem (~80 KB gzip) into the entry bundle and blocking app boot while Amplify configured itself.

**Fix:** Moved the `Amplify.configure()` call into a dynamic import chain inside `App.tsx`'s `useEffect`:

```tsx
useEffect(() => {
  let cancelled = false

  import('./lib/amplify')          // configures Amplify
    .then(() => import('aws-amplify/auth'))
    .then(({ fetchAuthSession }) => fetchAuthSession())
    .then((session) => {
      if (cancelled) return
      if (session.tokens?.idToken) return fetchAppProfile()
      setUser(null)
    })
    ...
    .finally(() => { if (!cancelled) setHydrated() })

  return () => { cancelled = true }
}, [setUser, setHydrated])
```

The `cancelled` flag prevents React StrictMode's intentional double-invocation (mount → unmount → mount) from firing two simultaneous `/api/auth/me` requests, which was causing 429 (Too Many Requests) errors from the backend rate limiter.

**Impact:** `aws-amplify` removed from the entry bundle. The `cancelled` guard eliminates the StrictMode-induced 429 errors.

---

## 4. Rollup Manual Chunks for Heavy Vendor Libraries

**File:** [`frontend/vite.config.ts`](../frontend/vite.config.ts)

**Problem:** Without `manualChunks`, Rollup's default heuristic promotes any package imported by more than one lazy chunk into the entry chunk. `framer-motion` (~42 KB gzip) and the `react-markdown` / unified ecosystem (~47 KB gzip) were both shared across multiple lazy pages, pulling them into the entry bundle and defeating code splitting.

**Fix:** Added targeted `manualChunks` for only these two self-contained package groups:

```ts
manualChunks(id) {
  if (!id.includes('node_modules')) return

  if (id.includes('framer-motion')) return 'vendor-motion'

  if (
    id.includes('react-markdown') ||
    id.includes('remark-') ||
    id.includes('rehype-') ||
    id.includes('micromark') ||
    id.includes('/mdast-') ||
    id.includes('/hast-') ||
    id.includes('/unist-')
  )
    return 'vendor-markdown'
}
```

Only self-contained packages are listed — packages with circular import relationships (e.g. `aws-amplify` ↔ `react-dom`) cannot be placed in a `manualChunks` group without causing Rollup circular dependency errors and a broken build.

**Impact:** `vendor-motion` and `vendor-markdown` are loaded as deferred named chunks, not preloaded with the entry. Pages that don't use Markdown or Framer Motion never download these chunks.

---

## 5. Modern JavaScript Target

**File:** [`frontend/vite.config.ts`](../frontend/vite.config.ts)

**Problem:** Vite's default `build.target` is `'modules'` which targets ES2015. The esbuild transpiler adds compatibility shims (e.g. optional chaining polyfills, class field transforms) that inflate bundle size and slow parse time.

**Fix:**

```ts
build: {
  target: 'es2020',
}
```

ES2020 is supported by all browsers released since late 2020 (>97% global usage). With this target, esbuild can emit native optional chaining, nullish coalescing, and class fields without transformation.

**Impact:** Smaller output, faster parse, no legacy polyfills injected into the bundle.

---

## 6. CSS Page Transitions (Replaced Framer Motion in Layout)

**Files:** [`frontend/src/layouts/RootLayout.tsx`](../frontend/src/layouts/RootLayout.tsx), [`frontend/src/index.css`](../frontend/src/index.css)

**Problem:** `RootLayout` used `<motion.div>` from `framer-motion` for the page fade-in animation. Since `RootLayout` is part of the app shell (not a lazy chunk), this import kept `framer-motion` in the entry bundle.

**Fix:** Replaced `<motion.div>` with a plain `<div>` using a CSS keyframe:

```css
/* index.css */
@keyframes page-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@layer utilities {
  .animate-page-in { animation: page-in 0.2s ease-out both; }
}
```

```tsx
// RootLayout.tsx
<div key={pathname} className="animate-page-in">
  <Outlet />
</div>
```

**Impact:** `framer-motion` removed from the app shell import chain. The animation is now a pure CSS operation with zero JS overhead.

---

## 7. Navbar Critical-Path Optimisations

**Files:** [`frontend/src/components/Navbar.tsx`](../frontend/src/components/Navbar.tsx), [`frontend/src/index.css`](../frontend/src/index.css)

The Navbar is in the app shell (always loaded), so its imports directly affect FCP. Four issues were addressed:

### 7a. Framer Motion Removed from Navbar

`<motion.header>` and `AnimatePresence`/`motion.span` (hamburger icon toggle) were replaced with CSS:

```css
@keyframes navbar-in {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-navbar-in { animation: navbar-in 0.4s ease-out both; }
```

```tsx
<header className="... animate-navbar-in">
  ...
  <span className={`transition-transform duration-150 ${mobileOpen ? 'rotate-90' : 'rotate-0'}`}>
    {mobileOpen ? <X /> : <Menu />}
  </span>
```

### 7b. NotificationBell Lazy-Loaded

`NotificationBell` was statically imported, triggering an API call to `/api/notifications` as part of the initial render chain — directly contributing to the 1,265 ms critical path depth measured in Lighthouse.

```tsx
const NotificationBell = lazy(() =>
  import('@/components/NotificationBell').then((m) => ({ default: m.NotificationBell })),
)

// In JSX:
<Suspense fallback={<div className="h-8 w-8" />}>
  <NotificationBell transparent={isTransparent} />
</Suspense>
```

`NotificationBell` is now a 2.45 KB chunk downloaded after first paint.

### 7c. Dynamic Import for signOut

`signOut` was statically imported from `aws-amplify/auth`, keeping that module in the Navbar's import graph. It is now dynamically imported only when the user actually clicks Sign Out:

```ts
async function handleLogout() {
  logout()
  const { signOut } = await import('aws-amplify/auth')
  await signOut()
  navigate('/')
}
```

### 7d. Accessibility Fix — Account Menu Button

The avatar dropdown trigger button had no accessible name, causing a Lighthouse accessibility failure ("Buttons do not have an accessible name"):

```tsx
<button aria-label="Account menu" className="...">
```

**Impact:** Removed `framer-motion` and `aws-amplify/auth` from the Navbar's static import chain. Eliminated the `NotificationBell` → `/api/notifications` call from the critical render path. Fixed the accessibility audit failure.

---

## 8. ReactQueryDevtools Excluded from Production

**File:** [`frontend/src/App.tsx`](../frontend/src/App.tsx)

**Problem:** `ReactQueryDevtools` was rendered unconditionally. In production, the import was tree-shaken by React Query's own `process.env.NODE_ENV` guard, but only partially — the import statement itself was retained.

**Fix:**

```tsx
{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
```

Vite replaces `import.meta.env.DEV` with `false` at build time, allowing Rollup to fully tree-shake the devtools module from the production bundle.

---

## 9. Axios Interceptor — Auth Race Condition and Logout Bug Fixes

**File:** [`frontend/src/api/axios.ts`](../frontend/src/api/axios.ts)

### 9a. Dynamic Import Eliminates Race Condition

**Problem:** `fetchAuthSession` was statically imported from `aws-amplify/auth` at the top of `axios.ts`. Because Amplify is lazy-initialised (see §3), a request made before `Amplify.configure()` ran would cause `fetchAuthSession()` to throw. The request would proceed without an `Authorization` header, the backend would return 401, and the global logout handler would clear the Cognito session from `localStorage` — logging the user out.

**Fix:**

```ts
api.interceptors.request.use(async (config) => {
  try {
    const { fetchAuthSession } = await import('aws-amplify/auth')
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {
    // No session or Amplify not yet configured — proceed unauthenticated
  }
  return config
})
```

### 9b. 401 Handler Only Triggers on Authenticated Requests

**Problem:** The response interceptor called `await signOut()` on any 401, even if no `Authorization` header was sent. When Lighthouse runs via Chrome DevTools it shares `localStorage` with the real browser — a spurious 401 (from the race above) would call Cognito's signout and wipe the real user's session.

**Fix:** Guard logout behind a check that the request actually carried a token:

```ts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      error.config?.headers?.Authorization
    ) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
```

`signOut()` (Cognito API call) was also removed entirely — clearing local state and redirecting is sufficient; the Cognito session token will expire naturally.

**Impact:** Eliminated spurious logouts during development Lighthouse runs and on first page load before Amplify finishes initialising.

---

## 10. OAuth Redirect URLs Use Runtime Origin

**File:** [`frontend/src/lib/amplify.ts`](../frontend/src/lib/amplify.ts)

**Problem:** The OAuth callback and sign-out redirect URLs were hardcoded to `http://localhost:5173`. When running the preview build (`:4173`) or in production, Cognito would redirect back to the wrong port, breaking social login.

**Fix:**

```ts
redirectSignIn:  [`${window.location.origin}/auth/callback`],
redirectSignOut: [`${window.location.origin}/`],
```

`window.location.origin` resolves to the actual origin at runtime — `:5173` in dev, `:4173` in preview, and the production domain in deployment.

**Note:** All origins used must be listed in the **Allowed callback URLs** of the Cognito App Client in the AWS Console.

---

## 11. Accessibility — Color Contrast

**File:** [`frontend/src/index.css`](../frontend/src/index.css)

**Problem:** `--muted-foreground` was set to 45% lightness against a near-white background, giving a contrast ratio of ~4.1:1 — below the WCAG AA minimum of 4.5:1 for normal text.

**Fix:**

```css
--muted-foreground: 25 8% 40%;  /* was 45% */
```

At 40% lightness the ratio is ~4.9:1, passing WCAG AA for all text sizes.

---

## 12. SEO — robots.txt

**File:** [`frontend/public/robots.txt`](../frontend/public/robots.txt)

**Problem:** The Lighthouse SEO audit failed with "Page is blocked from indexing" because there was no `robots.txt`. Some crawlers interpret a missing robots.txt as a signal to not index the site.

**Fix:** Added a permissive `robots.txt`:

```
User-agent: *
Allow: /
```

---

## 13. Lighthouse CI in GitHub Actions

**Files:** [`frontend/lighthouserc.json`](../frontend/lighthouserc.json), [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

Added a `lighthouse` job to the CI pipeline that:

1. Builds the frontend with placeholder Cognito env vars
2. Starts `vite preview` and waits for the server to be ready
3. Runs `@lhci/cli` against `/` and `/events` (2 runs each)
4. Asserts category scores: Performance ≥ 0.80 (warn), Accessibility/Best Practices/SEO ≥ 0.90 (error)
5. Uploads results to `temporary-public-storage` for diffing in PRs

Assertions target category scores only (not individual audits) to avoid false positives from audits that are inherently noisy for SPAs (e.g. `unused-css-rules`, `unused-javascript`).

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance":    ["warn",  { "minScore": 0.8 }],
        "categories:accessibility":  ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo":            ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

The `LHCI_GITHUB_APP_TOKEN` is stored as a GitHub Actions secret to enable PR status annotations.
