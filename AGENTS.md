# PeerChat — Agent Instructions

## Project Overview

PeerChat is a serverless, ephemeral P2P chat app built with React + TypeScript + PeerJS/WebRTC.
It has **no backend** — all signalling goes through PeerJS cloud servers; all chat/video is peer-to-peer.

**Hybrid network topology (critical insight):**
- Chat messages: relayed through the host via `broadcast()` (star topology)
- Video: direct mesh P2P via `peer.call(peerId, stream)` (mesh topology)
- Chat and video can fail independently

## Project Structure

```
peerchat/
├── components/          # React UI components (ChatRoom, Landing, Logo) + *.spec.tsx
├── hooks/               # usePeerChat.ts — all P2P state & network logic
│   └── __tests__/       # unit + integration tests for the hook
├── e2e/                 # Playwright BDD end-to-end tests
│   ├── peerchat.feature # Gherkin scenarios (single source of truth)
│   ├── fixtures/        # Custom Playwright test fixture (world state)
│   ├── steps/           # Step definitions per category
│   └── support/         # helpers.ts — shared browser/room setup utilities
├── types.ts             # Shared TypeScript types (Message, PeerUser, ChatState…)
├── constants.ts         # APP_PREFIX for PeerJS peer IDs
├── utils.ts             # generateRoomCode, generateRandomName, formatTime…
├── App.tsx              # Root — purely state-driven navigation (no URL router)
├── playwright.config.ts
└── vite.config.ts / vitest.config.ts
```

## Commands

```bash
# Development
npm run dev              # Start Vite dev server on :5174

# Build
npm run build            # tsc + vite build

# Unit / integration tests (Vitest)
npm test                 # watch mode
npm run test:run         # single run, no watch
npm run test:ui          # Vitest UI

# Run a single test file
npx vitest run hooks/__tests__/usePeerChat.test.ts

# Run tests matching a pattern
npx vitest run -t "should send message"

# E2E tests (Playwright + playwright-bdd)
npm run playwright:install  # first time only — installs Chromium in .playwright/
npm run test:e2e             # bddgen + playwright test
npm run test:e2e:ui          # interactive Playwright UI
npm run test:e2e:report      # open HTML report

# Run a single E2E scenario by tag
PLAYWRIGHT_BROWSERS_PATH=.playwright npx bddgen && \
  PLAYWRIGHT_BROWSERS_PATH=.playwright npx playwright test --grep "@multi-user"

# Run a single feature scenario by name substring
PLAYWRIGHT_BROWSERS_PATH=.playwright npx playwright test \
  --grep "Host creates a room"
```

## Code Style

### TypeScript
- Strict typing — no `any` unless unavoidable (e.g., third-party interop)
- Use `type` for data shapes; `interface` for contracts/protocols
- Prefer `namespace` to scope companion types within a module
- No explicit type annotations when inference is clear

### Functions
- Small, single-purpose functions — a few lines is ideal
- Max 2–3 parameters; use an options object for more
- Function names describe the action: `sendMessage`, `hostCreateRoom`
- Always add TSDoc on exported functions (purpose, `@param`, `@returns`)
- No inline `// comments` unless adding information not obvious from the code

### React Components
- Functional components only — no class components
- Props typed with inline `interface`, not exported unless reused
- Destructure props at the function signature
- Use `data-testid` for E2E-reachable elements; use `aria-label` for icon-only buttons

### Imports
- External libraries first, then internal modules
- No barrel `index.ts` re-exports in this project (flat structure)
- Relative imports — no path aliases configured

### Naming
- PascalCase: React components, TypeScript types/interfaces
- camelCase: variables, functions, hooks
- SCREAMING_SNAKE_CASE: top-level constants (`APP_PREFIX`)
- kebab-case: file names (`usePeerChat.ts`, `ChatRoom.tsx`)

## Testing Conventions

### Unit / Integration (Vitest + Testing Library)
- Test files: `*.spec.ts` / `*.spec.tsx`, co-located with source
- `makeSut()` factory pattern for setup — one per `describe` block
- Describe blocks: feature or component name; `it('should ...')`
- Use test doubles (spies/mocks/stubs) — mock PeerJS at boundary
- Never hardcode fake data — generate with helpers or faker

### E2E (Playwright + playwright-bdd)
- Feature file: `e2e/peerchat.feature` — the single source of truth for scenarios
- Step definitions: one file per category in `e2e/steps/`
- Multi-page scenarios use `world.hostPage` / `world.guestPage` / `world.guest2Page`
- `world.page` = the "I/me" actor in single-user scenarios
- Selectors in priority order: `aria-label` → `role` → `data-testid` → text
- Browsers are stored in `.playwright/` (never system-wide)
- Tags: `@multi-user`, `@media-permissions`, `@disconnection`, `@race-condition`,
  `@security`, `@video`, `@slow`

## Architecture Constraints

- **No backend** — do not introduce server-side dependencies
- **No URL router** — navigation is purely React state (`status === 'connected'`)
- **PeerJS peer ID format**: `peer-chat-secure-v2-7x9d2-{4-digit-code}` (see `constants.ts`)
- Room codes are 4 random digits generated by the host; guests cannot control them
- Only the host can rename the room (`renameRoom` guards with `if (state.isHost)`)
- `cleanup()` must be called on every exit path (Leave, host close, guest disconnect)

## Commit Conventions

- Do not add "Generated by Claude Code" or Co-Author tags in commits
- Commit messages: imperative mood, concise, focused on "why" not "what"

## Security

- Never hardcode API keys, tokens, or room codes in source or tests
- All user-provided message content is rendered via React text nodes (no `dangerouslySetInnerHTML`)
- Clipboard access requires explicit `aria-label="Copy room code"` on the trigger button
