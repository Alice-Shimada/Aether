# Wolfram Agent Workbench Design

Date: 2026-04-23

## Purpose

Design a notebook-style workbench that lets an AI agent and a human collaboratively use Mathematica/Wolfram Language without requiring control of the native Mathematica front end.

The workbench should support:

- Stepwise execution across multiple cells
- Switching between cells and rerunning selected ranges
- User takeover at any time
- Background agent execution that does not steal the user's active window
- Local and remote Wolfram kernels, including remote environments with no front end

## Problem

Today's AI agents can usually call shell commands or structured tools, but Mathematica usage is still awkward:

- Native `.nb` notebooks are rich and interactive, but hard for generic agents to manipulate safely
- Native front-end automation is fragile and requires window focus
- Remote Mathematica deployments often have no front end at all
- LSP-style editor features and runtime execution are different problems, but are often conflated

The goal is not to clone the native Mathematica notebook UI. The goal is to provide a controlled, notebook-like environment that is easier for agents to drive and easier for users to take over.

## Goals

- Use a markdown-first document model instead of native `.nb`
- Treat fenced `wl` code blocks as executable cells
- Keep a persistent Wolfram runtime session for notebook-like execution semantics
- Allow agent and user to share one document while only one actor holds execution control at a time
- Support both local and remote kernels through one runtime interface
- Reuse Wolfram's built-in `LSPServer` where it helps

## Non-Goals

- Full fidelity compatibility with Mathematica `.nb` box structures
- Native front-end window automation as the primary control path
- Reproducing every Mathematica notebook feature in v1
- Running LSP and runtime execution inside the same kernel process

## Approaches Considered

### 1. Native Front End Automation

Drive the existing Mathematica front end through notebook commands or GUI automation.

Pros:

- Closest to the existing Mathematica experience
- Can reuse some native notebook behaviors directly

Cons:

- Fragile
- Requires front-end availability
- Hard to keep in the background without stealing focus
- Poor fit for remote headless servers

Decision: rejected for v1.

### 2. Text `.wl/.m` Notebook Emulation

Store cell boundaries in a plain Wolfram Language source file and build notebook controls around it.

Pros:

- Simple storage
- Works well with version control
- Easy for agents to edit

Cons:

- Weak support for narrative text and mixed analysis
- Less natural as a collaborative notebook medium

Decision: acceptable fallback, but not the preferred primary format.

### 3. Markdown Workbench with Wolfram Code Blocks

Use markdown as the source document and treat fenced `wl` blocks as cells. Pair this with a persistent runtime and a separate LSP service.

Pros:

- Strong fit for human plus agent collaboration
- Easy to diff, review, and version
- Supports mixed prose and computation naturally
- Works with local and remote kernels
- Avoids native notebook complexity

Cons:

- Requires a custom execution state layer
- Not directly compatible with `.nb`

Decision: recommended.

## Recommended Architecture

The system is split into three layers:

1. Markdown Workbench
2. Wolfram LSP Adapter
3. Wolfram Runtime Adapter

The workbench is the only user-facing document model. It owns markdown parsing, cell identity, execution status, rendered outputs, and agent/user control state.

The LSP adapter provides editor intelligence only.

The runtime adapter provides execution only.

These two backends must remain separate.

## Document Model

The primary document is a markdown file.

Narrative content stays as normal markdown. Executable Mathematica content is represented as fenced `wl` blocks.

Example:

````md
# Setup

```wl init name=setup
ClearAll["Global`*"];
$HistoryLength = 10;
```

# Experiment

```wl name=expand-test
Expand[(x + y)^8]
```

```wl name=factor-test
Factor[%]
```
````

Each `wl` block is treated as one executable cell.

The v1 metadata surface is intentionally small:

- `name=<id>`: stable human-readable cell identifier
- `init`: initialization cell
- `hidden`: execute but collapse by default

If a cell has no explicit name, the workbench assigns a stable generated ID.

## Execution Semantics

Execution should feel notebook-like, not file-like.

The runtime maintains a persistent session for a document. Running a cell does not restart the kernel by default.

Core actions:

- `run_cell(cell_id)`
- `run_above(cell_id)`
- `run_to(cell_id)`
- `run_selection(cell_ids)`
- `interrupt()`
- `restart_kernel()`
- `restart_and_run_to(cell_id)`

Cell states:

- `idle`
- `queued`
- `running`
- `success`
- `error`
- `interrupted`
- `stale`

Changing an upstream cell marks downstream cells as `stale`, but does not automatically rerun them.

Notebook-like sequential constructs such as `%`, `%%`, and `Out[n]` remain supported because they are part of Wolfram Language usage, but the UI should visibly mark such cells as order-sensitive.

## Source vs Runtime State

The markdown source file remains clean and reviewable.

Outputs, messages, graphics metadata, timing, stale state, and session metadata are stored outside the source document in runtime state.

Suggested shape:

```text
notes.md
.wolfram-workbench/session/<session_id>.json
```

Runtime state should include:

- cell outputs
- messages and warnings
- execution timestamps and duration
- cell hashes
- stale relationships
- current kernel session ID
- current execution lease owner

This separation avoids noisy source-file churn while still allowing notebook-style rendering.

## Agent and User Control Model

The system uses single execution ownership with shared editing.

Both the user and the agent may edit the markdown document.

Only one actor at a time may hold the execution lease for the runtime session.

States:

- `idle`
- `agent-active`
- `user-active`
- `interrupting`
- `resync-required`

Rules:

- Agent execution must happen in the background runtime, not through OS window focus
- User takeover immediately prevents the agent from issuing new execution commands
- The user may allow the current cell to finish, interrupt it, or restart from a clean kernel
- While the user holds execution control, the agent can still suggest edits, next steps, or patches, but cannot execute them

This provides the desired behavior: the agent can work autonomously without stealing the screen, while the user can take control whenever needed.

## Local and Remote Runtime Adapters

The front end and agent always speak to one abstract runtime interface. The runtime implementation decides whether execution is local or remote.

Planned runtime types:

### `local-process`

Launch a local `WolframKernel` or `wolframscript` process and keep it alive for the session.

### `remote-process`

Run a sidecar service near the remote kernel, usually over SSH or a thin HTTP/WebSocket bridge.

### `persistent-service`

Connect to a long-lived Wolfram runtime manager, potentially backed by WSTPServer or another session pool.

All runtime adapters should support the same high-level control surface:

- open document session
- list cells
- run selected cells
- interrupt
- restart
- query outputs
- query lightweight symbol snapshot
- acquire or release execution lease

## Reuse of Wolfram LSP

Wolfram ships an official `LSPServer` paclet and documentation for `StartServer[]`.

This is worth reusing, but only as an editor-intelligence layer.

Confirmed reusable capabilities include:

- completion
- hover
- definitions
- references
- formatting
- document symbols
- folding ranges
- selection ranges
- semantic tokens
- diagnostics and scoping analysis

Important limitation:

- `LSPServer` is an editor protocol implementation, not a notebook execution runtime
- its `workspace/executeCommand` surface is minimal and debug-oriented
- it explicitly does not run inside a notebook session

Design decision:

- Use `LSPServer` in a dedicated LSP sidecar
- Do not try to use the LSP kernel as the notebook execution kernel

## Mapping Markdown Cells to LSP

The workbench should expose each `wl` code block to the LSP adapter as a virtual or temporary Wolfram source document.

This allows editor features to work without making markdown itself the language-server target.

The workbench is responsible for:

- extracting `wl` block text
- maintaining block-to-document mapping
- translating positions between markdown and virtual Wolfram documents
- merging LSP results back into the markdown UI

## Error Handling

The runtime layer should distinguish at least these failure classes:

- syntax or parse errors in a cell
- runtime messages and failures from Wolfram execution
- interrupted execution
- runtime transport failure
- remote session disconnect
- stale session state after takeover or restart

The UI should present errors at the cell level, not as one global session blob.

When disconnects or restarts invalidate prior assumptions, the session enters `resync-required` until the user or agent explicitly chooses how to continue.

## Validation Strategy

The design should be validated in three stages:

### 1. LSP Feasibility

- Start Wolfram `LSPServer`
- Feed extracted `wl` blocks as virtual documents
- Verify completion, hover, formatting, and diagnostics work on representative Wolfram code

### 2. Runtime Feasibility

- Keep a persistent local kernel session alive
- Run multiple cells sequentially
- Verify `%`, symbol definitions, and rerun behavior
- Verify interrupt and restart flows

### 3. Collaboration Feasibility

- Simulate agent-owned execution
- Simulate user takeover mid-session
- Verify that background execution does not require UI focus
- Verify stale-marking and resync behavior after edits

## v1 Scope

v1 should include:

- Markdown document support
- `wl` fenced code block execution
- Persistent local runtime
- Runtime-side outputs stored outside source
- Agent/user execution lease
- LSP-backed code intelligence

v1 should not include:

- Native `.nb` import or export
- Front-end box editing
- Mathematica front-end window control
- Full remote orchestration UI
- Multi-user collaborative editing

## Open Questions Resolved

- Use markdown instead of native `.nb`: yes
- Separate runtime execution from LSP: yes
- Prioritize local plus remote-capable runtime over native FE automation: yes
- Support remote headless kernels as a first-class design target: yes

## Summary

The recommended design is a markdown-based Wolfram workbench with two distinct backend services:

- an official-Wolfram-backed LSP service for editing intelligence
- a separate persistent runtime service for notebook-style execution

This gives the agent a safe, structured environment to operate in, gives the user immediate takeover without window theft, and keeps the architecture compatible with both local Mathematica and remote headless Wolfram kernels.
