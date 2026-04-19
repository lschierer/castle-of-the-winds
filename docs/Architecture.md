# Architecture Decisions

## Project Layout

```
/
├── config/               # Server-side runtime configuration
│   └── logging.yaml      # Log levels per package
├── docs/                 # Project documentation
├── infrastructure/       # AWS CDK deployment (separate pnpm workspace)
│   ├── bin/app.ts        # CDK app entry — defines dev + prod stacks
│   └── lib/game-stack.ts # EC2 stack construct
├── src/
│   ├── api/              # Greenwood API routes (server-side, Node.js)
│   │   ├── log-config.ts # GET  /api/log-config — serves logging.yaml as JSON
│   │   └── log.ts        # POST /api/log       — writes browser logs to file
│   ├── components/       # Lit custom elements
│   │   └── game-app.ts   # Root application element
│   ├── game/             # Shared game logic (runs in browser)
│   │   └── logging.ts    # loglevel initialization + getLogger helper
│   └── pages/            # Greenwood pages
│       └── index.html    # Entry page; mounts <game-app>
├── greenwood.config.ts   # Greenwood framework configuration
├── mise.toml             # Tool versions + task runner
├── package.json          # Root package (Greenwood app)
├── pnpm-workspace.yaml   # Monorepo workspace definition
└── tsconfig.json         # TypeScript configuration
```

## Technology Choices

### Framework: Greenwood
Greenwood is a lightweight full-stack web framework built on web standards.  It
supports static pages, SSR pages, and API routes in the same project without
requiring a separate backend service.  API routes are used here for server-side
logging only; the game itself runs entirely in the browser.

### UI: Lit
Lit custom elements integrate naturally with Greenwood's web-components-first
approach.  Each UI area of the game will be a separate element, keeping
concerns separated and enabling incremental rendering.

### TypeScript / ES Modules
The browser-facing code (`src/`) targets `ESNext` modules with
`moduleResolution: "bundler"` so that imports work both with Greenwood's Rollup
bundler and with native browser ES modules.

The infrastructure package (`infrastructure/`) uses `module: "CommonJS"` because
the CDK CLI (`cdk`) executes the compiled JS directly with Node.js, and CDK's
compatibility with pure ESM is still limited.

### Monorepo Structure
`pnpm-workspace.yaml` declares `infrastructure/` as a workspace package.  This
keeps CDK dependencies isolated from the browser bundle while sharing a single
`node` / `pnpm` toolchain managed by mise.

### Logging: loglevel
`loglevel` was chosen because it works identically in browser and Node.js, ships
with TypeScript types, and supports named loggers (`log.getLogger`) for
per-package granularity.

**Flow:**
1. At browser startup `initLogging()` fetches `/api/log-config`, which reads
   `config/logging.yaml` and returns the default level plus any per-package
   overrides.
2. `getLogger(name)` returns a named logger with the correct level applied.
3. `sendToServer(entry)` can be called to forward individual entries to
   `POST /api/log`, which writes them to `$LOG_DIR/app.log` (default `./logs/`)
   and to stdout.  On the EC2 instance stdout is captured by systemd and
   available via `journalctl`.

Changing a package's log level in `config/logging.yaml` and restarting the
server is sufficient to adjust verbosity without a code change.

### Save / Load: YAML
Game state will be serialised as YAML (via `js-yaml`) so that saved game files
are human-readable and can be inspected when debugging.  JSON is available as a
fallback for any data that YAML cannot represent cleanly.

### Deployment: AWS CDK + EC2
Two CloudFormation stacks share the same `GameStack` construct:

| Stack | Instance type | AZs | NAT |
|---|---|---|---|
| `DungeonsDevStack` | t3.micro | 1 | none |
| `DungeonsProdStack` | t3.small | 2 | none |

Both instances are placed in public subnets (no NAT gateway to minimise cost).
SSH access is not opened; operators connect via **SSM Session Manager** instead
(no inbound port 22 required).

The Greenwood SSR server runs on port 8080 behind an nginx reverse proxy on
port 80.  A systemd unit (`dungeons-crawl.service`) manages the process and
restarts it on failure.

Application artefacts are deployed separately (e.g. `rsync` from CI or
CodeDeploy) — the CDK stack only provisions infrastructure.

`mise run deploy-dev` and `mise run deploy-prod` compile the CDK TypeScript and
run `cdk deploy` for the respective stack.
