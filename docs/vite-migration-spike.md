# Spike: migrate Greenwood → Vite (+ Lit, + Tauri)

Status: **investigation only — no code changed.** Decision-ready estimate.

## TL;DR

- **Recommendation: yes, Vite is the more natural fit** — but it's a convenience/DX
  move, not a correctness one. Greenwood works today.
- **Effort: ~half a day** (4–6 focused hours), dominated by *verification*, not edits.
- **The tell:** all three custom Greenwood plugins exist to patch things Vite does
  out of the box. Migrating *deletes* `greenwood.config.ts` (~130 lines, 3 plugins)
  rather than porting it.
- **Code that changes:** build config, 3 HTML entry files, one `git mv` of assets,
  `tauri.conf.json` (one line), `.gitignore` (one line). **Zero** changes to
  `engine/`, `model/`, `data/*.ts` logic, or any component's behavior.
- **Two real risks to retire on day one** (below): `.ts` import extensions and the
  linked `rot-js-fork`. If both resolve cleanly in the first 30 minutes, the rest is
  mechanical.

## Why it fits (the 3-plugins observation)

| Greenwood needs a custom plugin for… | In Vite this is… |
|---|---|
| `loglevel` CJS/UMD → ESM shim (resource plugin) | `optimizeDeps` CJS pre-bundling — **automatic** |
| Serving `data/binary-maps/*.json` from outside `src/` | Native JSON import; files are inside the Vite root — **automatic** |
| `useTsc: true` to transpile Lit's TC39 decorators (Terser can't parse `@`) | esbuild honours `experimentalDecorators` from tsconfig — **automatic** |

Three bespoke workarounds collapse to defaults. That's the strongest evidence the app
was fighting the framework's grain.

Also: `tauri.conf.json`'s `beforeDevCommand` and the `[tasks.dev]` mise description
already *say* "Vite" — the Tauri scaffold assumed it. Tauri's first-class pairing is
Vite (`devUrl` + `frontendDist` model maps directly).

## Current surface (measured)

- 3 pages, clean-URL nav: `/`, `/create/`, `/game/`, `/game/?new=1` (hard-coded in
  `landing-page.ts`, `character-creation.ts`, `game-world.ts`).
- 767 files under `src/assets`, referenced by **148 unique `/assets/…` absolute URLs**
  in TS. These strings must keep resolving at `/assets/…`.
- `theme.css` linked from the 3 HTML files via `../styles/theme.css`.
- tsconfig: `moduleResolution: bundler`, `allowImportingTsExtensions: true`,
  `experimentalDecorators: true`, `useDefineForClassFields: false`,
  `verbatimModuleSyntax: true`. **Imports use explicit `.ts` extensions everywhere.**
- `rot-js` via `link:../rot-js-fork` (sibling dir, outside the repo).
- `public/` is **gitignored** — it's Greenwood's build output (795 files).
- Tauri: `beforeDevCommand: pnpm dev`, `beforeBuildCommand: pnpm build`,
  `devUrl: http://localhost:1984`, `frontendDist: ../public`.

## Plan (exact changes)

### 1. Entry points → directory layout (preserves clean URLs, zero nav-string edits)
Move and repoint the three HTML files so `/create/` and `/game/` resolve as-is:
- `src/pages/index.html`  → `index.html`        (repo root)
- `src/pages/create.html` → `create/index.html`
- `src/pages/game.html`   → `game/index.html`

In each, switch to root-absolute specifiers Vite prefers:
```html
<link rel="stylesheet" href="/src/styles/theme.css" />
<script type="module" src="/src/components/game-world.ts"></script>
```
All `window.location.href = '/create/'` / `'/game/?new=1'` strings stay untouched.

### 2. Assets → tracked `public/` (preserves every `/assets/…` URL)
```
git mv src/assets public/assets      # 767 files; runtime /assets/… URLs unchanged
```
Vite serves `public/` at `/`, so `public/assets/sprites/x.png` → `/assets/sprites/x.png`.
The 148 URL references need **no** edits.

### 3. `.gitignore`
Remove the `public` line (it was Greenwood's output; now it's tracked Vite static
source). `dist/` is already ignored — that becomes the new build output.

### 4. `vite.config.ts` (replaces `greenwood.config.ts`)
```ts
import { defineConfig } from 'vite';
export default defineConfig({
  server: { port: 1984, fs: { allow: ['..'] } },  // ../rot-js-fork + data/ at root
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:   'index.html',
        create: 'create/index.html',
        game:   'game/index.html',
      },
    },
  },
  optimizeDeps: { include: ['loglevel'] },  // verify; may be auto
});
```
Delete `greenwood.config.ts` (and its 3 plugins).

### 5. `package.json` scripts + deps
```jsonc
"dev": "vite",            // serves on 1984 via config
"build": "vite build",
"preview": "vite preview",
"typecheck": "tsc --noEmit"   // unchanged
```
Remove `@greenwood/cli`; add `vite`. Keep `lit`, `loglevel`, `rot-js` link.

### 6. `src-tauri/tauri.conf.json` — one line
```
"frontendDist": "../public"  →  "../dist"
```
`beforeDevCommand: pnpm dev` and `beforeBuildCommand: pnpm build` and `devUrl: :1984`
all stay (their behavior changes, the strings don't). Update the stale mise
`[tasks.dev]` description while we're there (it already claims "Vite").

### 7. tsconfig
Add `"vite/client"` (and existing `node`, `trusted-types`) to `types`. Otherwise
unchanged — `allowImportingTsExtensions` + `bundler` resolution are exactly what Vite
expects.

## What breaks / risk register (verify in this order)

1. **`.ts` import extensions** — *highest-impact unknown.* The codebase imports
   `'../data/items.ts'` etc. Vite/esbuild should resolve these (it's why
   `allowImportingTsExtensions` exists), but **test in the first 30 min**: if it fails,
   the fallback is an extensionless-import codemod across ~40 files — the one change
   that could turn a half-day into a full day. *Retire this risk before doing anything
   else.*
2. **`rot-js-fork` linked package** — `link:../rot-js-fork` lives outside the repo.
   Needs `server.fs.allow: ['..']` (above) and may need `optimizeDeps.include`/`exclude`
   depending on whether the fork ships ESM or raw TS. Verify a dungeon generates.
3. **Decorators via esbuild** — `experimentalDecorators` + `useDefineForClassFields:false`.
   Modern esbuild (Vite 5) supports this; verify a component renders. Fallback if not:
   an SWC/tsc decorator plugin (adds ~15 min, no code change).
4. **`import … with { type: 'json' }`** on the 7 binary-map imports. Vite imports JSON
   natively; the import-attribute syntax should pass through. Trivial fallback: drop
   ` with { type: 'json' }` (7 lines) since Vite doesn't require it.

Note: HMR will actually *improve* (Lit components hot-reload under Vite; Greenwood does
full reloads). The `?new=1` query and localStorage flow are origin-based and unaffected.

## Verification checklist (same bar as the Wave-2 smoke test)
- `pnpm dev` boots on :1984; `/`, `/create/`, `/game/` all load.
- New-game flow: create → `/game/?new=1` → playable.
- Load-from-save (the 3.5 MB save path), movement, overlays, spell targeting.
- A dungeon floor generates (exercises rot-js-fork).
- Binary maps load (exercises JSON imports).
- `pnpm build` → `dist/`; `pnpm preview` serves it.
- `pnpm tauri dev` opens the native window against :1984.
- `pnpm typecheck` green.

## Rollback
Single squashed commit on a branch; revert = `git checkout main`. Greenwood config and
`public/` output are untouched on `main`. Zero risk to the working setup.

## Effort estimate
| Phase | Time |
|---|---|
| Retire risks #1–#2 (the spike-within-the-spike) | 0.5–1 h |
| Config, scripts, entry files, asset move, Tauri/gitignore | 1–1.5 h |
| Full verification checklist + fixups | 2–3 h |
| **Total** | **~4–6 h (half a day)** |

Bounded because the Wave-2 decomposition already made `engine/`/`model/`/components
framework-agnostic. The framework only ever touched the thin outer edge — which is
exactly the part this migration replaces.
