# Dungeons Crawl — Development Setup

A Castle of the Winds remake built with TypeScript, Lit, and Greenwood,
optionally wrapped in a native desktop window via Tauri.

---

## Two ways to run it

| Mode | Command | What you need |
|------|---------|---------------|
| **Web (browser)** | `mise run web` | Node, pnpm — that's it |
| **Native app** | `mise run dev` | Node, pnpm, Rust, + Linux system libs |

**Start with the web mode.** It's identical for development — same hot-reload,
same game. The native Tauri window only adds a desktop app wrapper and is
optional for most work.

---

## Step 1 — System packages

### Ubuntu / Debian / Chrome OS Linux

```bash
sudo apt update && sudo apt install -y \
  build-essential \
  curl \
  git
```

If you plan to build the **native app** (optional), also install the Tauri
system libraries:

```bash
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  file \
  wget
```

> **Chrome OS note:** Chrome OS Linux is Debian-based. If `libwebkit2gtk-4.1-dev`
> is not found, try `libwebkit2gtk-4.0-dev` (older Debian releases ship 4.0).
> The web-only mode does not need either.

### macOS

```bash
xcode-select --install
```

Rust and Node are installed via mise in Step 2; no other system packages needed.

---

## Step 2 — Install mise

[mise](https://mise.jdx.dev/) manages the exact versions of Node, pnpm, and
Rust that the project requires. You do **not** need to install those manually.

```bash
curl https://mise.run | sh
```

Then add mise to your shell (follow the output instructions, or do it manually):

```bash
# bash
echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc
source ~/.bashrc

# zsh
echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc
source ~/.zshrc
```

Verify:

```bash
mise --version
```

---

## Step 3 — Clone and install

```bash
git clone <repo-url> dungeons-crawl-game
cd dungeons-crawl-game

# Clone the rot-js fork (linked as a local dependency)
git clone -b feature/irregular-dungeon git@github.com:lschierer/rot.js.git ../rot-js-fork

# Install the exact tool versions declared in mise.toml
# (Node 24, pnpm 11, Rust 1.91, jq, yq, watchexec)
mise install

# Install JavaScript dependencies
pnpm install
```

---

## Step 4 — Download sprites

The original Castle of the Winds sprites are not in this repository.
Download them once from castleofthewinds.com:

```bash
bash scripts/download-sprites.sh
```

This downloads ~300 PNG files into `src/assets/sprites/` and skips any that
are already present, so it is safe to re-run.

---

## Step 5 — Run the game

```bash
# Web-only (opens http://localhost:8080 in your browser)
mise run web

# Native desktop app (requires Tauri system libs from Step 1)
mise run dev
```

---

## All available commands

| Command | What it does |
|---------|-------------|
| `mise run web` | Greenwood dev server, open `http://localhost:8080` |
| `mise run dev` | Tauri dev: web server + native window with hot-reload |
| `mise run build` | Production build of the native app |
| `mise run lint` | ESLint |
| `mise run typecheck` | TypeScript type-check (no output = all good) |
| `mise run download-sprites` | Download/update sprite assets |
| `pnpm tsc --noEmit` | Same as typecheck, run directly |

---

## Tool versions (managed by mise)

These are pinned in `mise.toml` — `mise install` gets exactly these:

| Tool | Version |
|------|---------|
| Node.js | 24 |
| pnpm | 11 |
| Rust | 1.91 |
| jq | latest |
| yq | latest |
| watchexec | latest |

> **Why Node 24?** The project uses `engines: { node: ">=24.14.1" }` in
> `package.json`. The version in apt (`nodejs`) is typically much older.
> Always use mise rather than the system Node.

---

## Troubleshooting

**`mise: command not found` after install**
Run `source ~/.bashrc` (or restart your terminal) after adding the `eval` line.

**`pnpm: command not found`**
Run `mise install` first — pnpm is installed by mise, not apt.

**`error: linking with cc failed` during Rust build**
You're missing `build-essential`. Run:
```bash
sudo apt install -y build-essential
```

**`error[E0463]: can't find crate for ...` or webkit/GTK errors**
Install the Tauri system libraries from Step 1. Or just use `mise run web`
and skip native build entirely.

**`libwebkit2gtk-4.1-dev: Package not found`**
Your Debian/Ubuntu release may be too old. Try:
```bash
sudo apt install libwebkit2gtk-4.0-dev
```
Or upgrade to Debian Bookworm / Ubuntu 22.04+.

**Sprites not loading (grey boxes in game)**
Run `bash scripts/download-sprites.sh`.
