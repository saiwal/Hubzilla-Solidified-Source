# hubzilla-spa

A [Solid.js](https://www.solidjs.com/) single-page application (SPA) for [Hubzilla](https://framagit.org/hubzilla/core), a federated social networking platform. Built as part of the [Solidified](https://github.com/saiwal/Utsukta-hub-themes/tree/dev/solidified) theme.

Features are organized as pluggable modules that register their own routes, navigation items, and UI slots — making the app easy to extend without touching the core layout.

## Requirements

- Node.js 18+
- A running Hubzilla instance (the dev server proxies to `https://hz-ddev.ddev.site` by default)

## Getting Started

```bash
npm install
npm run dev       # Start dev server with API proxy
```

The dev server at `http://localhost:5173` proxies `/api` and `/perfstats` requests to the configured Hubzilla backend.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build (`tsc -b && vite build`) |
| `npm run build:all` | Production build + service worker |
| `npm run build:sw` | Build service worker only |
| `npm run watch` | Watch mode build |
| `npm run typecheck` | Type-check with watch |

## Architecture

### Module System

Each feature is a self-contained module registered via `registerModule()`:

```typescript
registerModule({
  id: "channel",
  routes: [{ path: "/channel/:nick", component: () => import("./views/ChannelView") }],
  navItem: { label: "Channel", icon: "home", path: "/channel", href: "/channel/:nick" },
  slots: { right: [widget1, widget2] }
});
```

Modules are auto-imported via `import.meta.glob()` in `App.tsx`. Each module lives under `src/modules/` and follows the folder convention: `views/`, `store/`, `api/`, `widgets/`.

### Slot System

Modules can inject components into layout regions:

- `right` — right sidebar (global + module-specific)
- `leftBottom` — left sidebar bottom
- `mainTop` — main content top
- `rightVisitor` — right sidebar for unauthenticated users
- `help` — help overlay integration

### Routing

Built on `@solidjs/router`. Routes are lazily loaded and the list is reactive, so modules added at runtime are reflected immediately. The root layout (`src/Layout.tsx`) manages navigation, sidebars, mobile tab bar, offline banner, and scroll-to-top.

### State

Uses Solid's reactive primitives (signals, memos, effects). Stores are scoped to modules or shared utilities under `src/shared/store/` — no single global store.

### API

All API calls go to `/api/z/1.0/` (Hubzilla REST API) plus a custom `/api/` namespace served by the PHP backend in `src/Api/`. Utility wrappers:

- `apiGet<T>(endpoint)` — Hubzilla API GET
- `moduleGet<T>(endpoint)`, `modulePost<T>(endpoint, body)` — app-specific endpoints

All requests include credentials (`credentials: "include"`) and CSRF tokens on mutations.

### i18n

Powered by `@solid-primitives/i18n`. Locale preference is saved to localStorage (`hz-locale`). Add translations to `src/i18n/locales/`.

```typescript
const { t, locale, setLocale } = useI18n();
```

### Theming

Tailwind CSS v4. Theme is applied as `data-theme` on `<html>` and stored in two places:

- **localStorage** (`hz-theme`) — restored immediately on page load before any API call, preventing a flash of the wrong theme
- **Server user config** (`POST /api/settings/display`) — persisted so the preference follows the user across devices and sessions

On login, `initTheme()` is called with the server-side `color_scheme` value, which takes precedence and syncs localStorage. Switching themes writes to both locations simultaneously.

A `custom` theme mode is also supported: users pick base/text/accent colors which are stored in localStorage (`hz-custom-theme`) and synced to the server as a JSON blob. The CSS variables are injected dynamically via a `<style>` tag.

Available preset themes: `light`, `dark`, `nord`, `dracula`, `monokai`, `gruvbox-dark`, `catppuccin-mocha`, `solarized-dark`, `tokyo-night`, `one-dark`, `cyberpunk`, `matrix`, `rose-pine`.

### PWA / Service Worker

Service worker built separately via `build-sw.mjs` using Workbox. `src/pwa.ts` detects updates and shows a reload toast. Push notification support is included.

## Build Output

Vite outputs to `../hz-ddev/core/extend/theme/utsukta-themes/solidified/assets/` (configurable in `vite.config.ts`):

- `app.js` — main entry
- `app-[name].js` — code-split chunks
- `app.css` — styles
- `/docs` — static docs (copied via `vite-plugin-static-copy`)

## PHP Backend (`src/Api/`)

A PHP API layer lives alongside the SPA as `Theme\Solidified\Api`. It is deployed with the Hubzilla theme and serves the SPA's custom `/api/` routes.

Key handlers: `Network`, `Channel`, `Item`, `Nav`, `Settings`, `Profile`, `Photos`, `Files`, `Articles`, `Chat`, `Cal`, `Admin`, and more — see `src/Api/Handlers/` for the full list.

All responses follow a uniform JSON envelope via `Response::send()` / `Response::paginate()` / `Response::error()`.

## Project Structure

```
src/
├── App.tsx             # Root component, module auto-import
├── Layout.tsx          # Main layout (nav, sidebars, mobile tab)
├── index.tsx           # Entry point (PWA, theme setup)
├── router.tsx          # Router setup
├── pwa.ts              # PWA update detection
├── i18n/               # i18n provider and locale files
├── modules/            # Feature modules (22+ directories)
├── shared/
│   ├── lib/            # Utilities (API, module registry, BBCode, CSRF)
│   ├── store/          # Global state (auth, config, nav)
│   ├── types/          # Shared TypeScript types
│   ├── views/          # Shared UI components
│   ├── widgets/        # Shared widget components
│   ├── editor/         # Rich text editor
│   └── stream/         # Stream/feed components
└── Api/                # PHP backend handlers
```

## License

See [LICENSE](LICENSE).
