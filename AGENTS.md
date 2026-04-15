- To regenerate the JavaScript SDK, run `./packages/sdk/js/script/build.ts`.
- ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE.
- The default branch in this repo is `dev`.
- Local `main` ref may not exist; use `dev` or `origin/dev` for diffs.
- Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety/irreversibility.

## Style Guide

### General Principles

- Keep things in one function unless composable or reusable
- Avoid `try`/`catch` where possible
- Avoid using the `any` type
- Prefer single word variable names where possible
- Use Bun APIs when possible, like `Bun.file()`
- Rely on type inference when possible; avoid explicit type annotations or interfaces unless necessary for exports or clarity
- Prefer functional array methods (flatMap, filter, map) over for loops; use type guards on filter to maintain type inference downstream

### Naming

Prefer single word names for variables and functions. Only use multiple words if necessary.

### Naming Enforcement (Read This)

THIS RULE IS MANDATORY FOR AGENT WRITTEN CODE.

- Use single word names by default for new locals, params, and helper functions.
- Multi-word names are allowed only when a single word would be unclear or ambiguous.
- Do not introduce new camelCase compounds when a short single-word alternative is clear.
- Before finishing edits, review touched lines and shorten newly introduced identifiers where possible.
- Good short names to prefer: `pid`, `cfg`, `err`, `opts`, `dir`, `root`, `child`, `state`, `timeout`.
- Examples to avoid unless truly required: `inputPID`, `existingClient`, `connectTimeout`, `workerPath`.

```ts
// Good
const foo = 1
function journal(dir: string) {}

// Bad
const fooBar = 1
function prepareJournal(dir: string) {}
```

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

### Destructuring

Avoid unnecessary destructuring. Use dot notation to preserve context.

```ts
// Good
obj.a
obj.b

// Bad
const { a, b } = obj
```

### Variables

Prefer `const` over `let`. Use ternaries or early returns instead of reassignment.

```ts
// Good
const foo = condition ? 1 : 2

// Bad
let foo
if (condition) foo = 1
else foo = 2
```

### Control Flow

Avoid `else` statements. Prefer early returns.

```ts
// Good
function foo() {
  if (condition) return 1
  return 2
}

// Bad
function foo() {
  if (condition) return 1
  else return 2
}
```

### Schema Definitions (Drizzle)

Use snake_case for field names so column names don't need to be redefined as strings.

```ts
// Good
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})

// Bad
const table = sqliteTable("session", {
  id: text("id").primaryKey(),
  projectID: text("project_id").notNull(),
  createdAt: integer("created_at").notNull(),
})
```

## Testing

- Avoid mocks as much as possible
- Test actual implementation, do not duplicate logic into tests
- Tests cannot run from repo root (guard: `do-not-run-tests-from-root`); run from package dirs like `packages/opencode`.

## Type Checking

- Always run `bun typecheck` from package directories (e.g., `packages/opencode`), never `tsc` directly.

## LLM Model Routing Guard

- After each code/doc edit batch, run:
  - `python /home/bzz/Aether/.opencode/skills/llm-model-routing-guard/scripts/check_model_routing.py --repo /home/bzz/Aether`
- Automatically map new/changed LLM call sites to existing model-setting kinds first.
- Unless absolutely necessary, do not add a new model option.
- If no existing kind fits, explicitly report why, then add one new model kind with aligned backend enum, frontend context type, settings dialog row, and synced docs.

## IPK Doc Sync

- For any IPK-related implementation change, always run the `ipk-doc-sync` workflow and keep `/home/bzz/Aether/docs/IPK` in sync in the same change.
- Trigger with `Use $ipk-doc-sync ...` (or equivalent Chinese request) and include its sync report in the final response.
- Audit command:
  - `python /home/bzz/Aether/.opencode/skills/ipk-doc-sync/scripts/ipk-doc-sync-audit.py --repo /home/bzz/Aether --base dev --scan-content --strict`

## Project Planning Discussion Sync

- During project planning, architecture, system design, or implementation-plan discussions, automatically persist accepted decisions into the relevant design docs.
- Put settled constraints and user-approved choices into files such as `implementation-decisions`, schema, integration, implementation guides, or equivalent authoritative docs.
- Put all possible improvements, AI/user-proposed future directions, unresolved questions, tradeoffs, and v1-deferred ideas into the relevant `open-questions` document.
- After any planning, design-doc, or implementation-guide update, audit the relevant `open-questions` document before finishing.
- Remove or rewrite `open-questions` entries that were resolved by the new decision, code change, or doc update.
- If an entry is partly resolved, move the settled part into the authoritative docs and leave only the remaining unresolved part in `open-questions`.
- If a once-open item becomes obsolete, delete it or explicitly rewrite it as a vNext/tuning item with a current reason.
- Include the open-questions cleanup result in the final report when planning docs changed.
- Do this proactively when the user accepts or rejects a direction; do not wait for the user to explicitly say "update the docs" each time.
- This rule is scoped to planning/building projects. Do not apply it to unrelated learning, casual Q&A, or one-off execution tasks unless the user asks.
