# IPK Content System Details

## 1. Purpose of This Document

This file is not the presentation version and not a new planning document.  
It is the consolidated detailed reference for the `IPK` content system.

Its purpose is to pull the main design back into one coherent place from the many specialized files in this directory.

It mainly answers questions like:

- what this system is and is not
- why `piece` must be the unified minimum unit
- what `piece.md / meta.json / surface.json / links.json` each do
- why surface must be layered and why maps cannot replace surface
- how ingestion, review, indexing, and runtime use fit together
- how this system relates to `Skill`, the user adaptation system, and Aether

If someone asks:

- why IPK is not just a notes library
- why keyword search cannot be the primary entry
- why a `piece` should not become a skill
- why there are `catalog / retrieve / associate` surfaces
- why maps and multi-layer navigation are needed
- how ordinary Q&A may connect to IPK in the long term

this document should be the first place to look.

This document:

- consolidates the current design
- does not replace the specialized technical documents
- does not rewrite the responsibility of the planning or workflow documents

## 2. The Current System Definition

The `IPK` content system is not a normal notes feature, and it is not just "put all content into a knowledge base."

It is better described as:

- a long-term content system
- a content library organized around `piece`
- a content foundation that serves explicit IPK use and leaves room for future ordinary-Q&A extension
- a system that turns raw content into reusable material through surfaces, links, maps, and navigation

In other words, it does not primarily manage:

- user style preferences
- answer preferences
- long-term interaction policy

Those belong to:

- [user-adaptation-system-readme.md](/home/bzz/Aether/docs/IPK/02-user-adaptation-system/user-adaptation-system-readme.md)

IPK focuses on content itself and on how that content can be preserved, organized, found, verified, and reused over time.

## 3. System Boundary

### 3.1 What this system stores

This system stores long-term cognitive material.

That includes:

- ideas
- knowledge
- discussion summaries
- reflections
- project-related fragments
- plans
- structural relations between pieces
- AI-facing surfaces for routing, judging, retrieving, and associating
- precompiled maps and indexes for large-scale navigation

### 3.2 What this system does not directly store

It does not directly own:

- user style profiles
- answer preferences
- work order and operational habits
- response or execution policy

Those belong to the user adaptation system, not to the content system itself.

It also should not be used to:

- turn large numbers of `piece` objects into skills
- stuff all runtime behavior into one huge system prompt
- force the user to hand-maintain low-level schema, indexes, or retrieval structures

## 4. Core Principles

### 4.1 The human owns content, the AI owns structure

One of the most important principles is:

- the user provides the actual content worth preserving
- the AI turns that content into a structure that can be reused later

The user should mainly:

- express ideas, questions, judgments, and materials
- inspect whether the generated body says the right thing
- request revision when needed

The user should not have to decide:

- `id`
- `type`
- `surface` fields
- how `links` are extracted
- how maps are compiled
- how retrieval is organized

### 4.2 `piece` stores content, `skill` stores method

A `piece` should not become a skill.

The cleaner split is:

- `piece`
  stores the user's content

- `skill`
  stores the workflow method for capture, routing, retrieval, association, or synthesis

- `tool / query`
  performs the actual reading, searching, routing, and local expansion

### 4.3 Maps guide, surface judges, body confirms

This is the key structural division inside IPK.

- maps tell the AI where to look first
- surface tells the AI whether something is worth going deeper into
- the full body provides the actual content, detail, and evidence

These layers must not collapse into one another.

### 4.4 Long-term direction: how ordinary Q&A may connect to IPK

IPK should not remain a library that only works when the user explicitly opens it.

But this is a long-term direction, not the first-pass default behavior.

The better long-term target is:

- the user asks a normal question
- the system decides in a future extension whether IPK is relevant
- it first routes through maps and surfaces
- then decides whether body access is needed

So IPK should eventually become one of the long-term cognitive backends of the conversation system.

## 5. `piece` as the Unified Minimum Unit

The most important structural conclusion is:

- `piece` should be the unified minimum unit

This is the right choice because:

- it is neutral enough
- it does not pre-assume a note, a paper summary, or a diary-like object
- it supports unified indexing
- it supports a unified relation graph
- it scales well to multiple future types

The current recommended first-pass types are:

- `idea`
- `knowledge`
- `thread`
- `review`
- `plan`
- `project`

It is important to distinguish:

- `type` says what the piece is
- `status` says how mature it currently is

## 6. The File Structure of a `piece`

The currently recommended piece structure is:

```text
piece_xxx/
  piece.md
  meta.json
  surface.json
  links.json
```

Each file has a different role.

### 6.1 `piece.md`

This is the body layer and the truth layer of the piece.

It is suitable for:

- original ideas
- discussion organization
- derivation fragments
- research judgments
- reflections
- unresolved questions
- later extensions

It will often also include a user-facing `body_summary`.

### 6.2 `meta.json`

This is the structural identity card.

It is relatively stable and should store things like:

- `id`
- `type`
- `title`
- timestamps
- origin
- `status`
- domain, method, context, and project classification

### 6.3 `surface.json`

This is the AI work surface.

It is not just a body summary.  
It is the structured exposure layer used by the AI for routing, judging, retrieving, and associating.

The most coherent first-pass top-level shape is:

```json
{
  "human": {
    "body_summary": "..."
  },
  "catalog": {
    "...": "..."
  },
  "retrieve": {
    "...": "..."
  },
  "associate": {
    "...": "..."
  }
}
```

### 6.4 `links.json`

This is the relation layer.

It stores structured links instead of flattening every relation into tags.

It should be able to express:

- reference relationships
- development relationships
- method similarity
- problem extension
- project membership or upstream/downstream relations

## 7. Why the body, surface, and links must be separated

Without this separation, several things go wrong.

### 7.1 The body is too heavy

If the AI always reads the body first:

- cost rises
- latency rises
- context overflows easily
- much of the content is irrelevant to the current question

### 7.2 Retrieval and association collapse into one layer

If there is only one summary:

- the system cannot reliably distinguish strong hits
- from weak but potentially useful associations

### 7.3 Relations degrade into tag piles

Without `links.json`:

- many important structural relations are hard to express
- tags become overloaded

So layering is not cosmetic. It is necessary for scalability and accuracy.

## 8. The Three Surface Layers

The most coherent current surface split is:

- `catalog`
- `retrieve`
- `associate`

### 8.1 `catalog`

`catalog` is responsible for:

- first-pass candidate filtering
- map compilation
- lightweight listing

It must be:

- short
- stable
- directionally clear

But it does not carry precise explanation.

### 8.2 `retrieve`

`retrieve` is responsible for:

- deciding whether a piece is truly relevant to the current question
- deciding whether it is evidence, background, counterexample, method hint, or problem trace
- deciding whether body reading should continue

This is the layer with the highest accuracy requirement.

### 8.3 `associate`

`associate` is responsible for:

- weak connections
- analogy
- method transfer
- heuristic expansion

This layer must not pretend to be a factual hit.

## 9. Why keyword search cannot be the main entry

Keyword search is useful, but it cannot be the main route.

Reasons include:

- many pieces are valuable because of question shape, not wording
- research relevance often comes from method similarity rather than textual overlap
- many historical materials are written in the language of the user's actual thinking, not textbook language
- keyword-only systems are weak at analogy and cross-topic transfer

So the more robust structure is:

- keywords are one tool
- the main pipeline is maps + surface + progressive drilling

## 10. Maps and Multi-layer Navigation

Once the number of pieces grows, the system cannot search the whole library blindly every time.

So it needs many precompiled maps and it needs multi-layer navigation.

### 10.1 Maps are a family, not a single object

At minimum, the system should support dimensions like:

- project
- time
- domain
- method
- problem
- relation

### 10.2 Maps are not answer summaries

Maps do not answer the user's question directly.

They are better understood as:

- a highly compressed entry layer
- a routing prior that says where to look next

### 10.3 Why multi-layer navigation matters

Multi-layer navigation means the system does not:

- jump to full bodies immediately
- or ask the AI to blind-search the whole library

The better route is:

1. enter an appropriate map
2. move into a candidate region
3. inspect `catalog / retrieve / associate`
4. only then decide whether to read the body

## 11. Ingestion and Review Workflow

The ideal IPK ingestion workflow is not a manual form-filling process.  
It is an automated pipeline.

The current recommended high-level workflow is:

```text
select
  -> capture
  -> draft
  -> structure
  -> quality
  -> review
  -> commit
  -> reindex
```

### 11.1 Input sources

Inputs may come from:

- a full chat
- a selected message range in a chat
- a WeChat exchange and its extension
- a manually entered raw note

### 11.2 Automatic draft generation

The system should automatically generate:

- `title`
- `body_summary`
- `piece.md`
- `meta.json`
- `surface.json`
- `links.json`

### 11.3 User review boundary

The user should mainly review:

- `title`
- `body_summary`
- `piece.md`

That is, the user reviews whether the content was captured correctly, not whether the retrieval structure is perfect.

### 11.4 Final commit

After confirmation, the system should:

- commit the piece
- update links
- rebuild or incrementally update indexes
- recompile related maps

## 12. Two Different Summaries

This distinction is crucial.

### 12.1 `body_summary`

This is the human-facing summary.

It answers questions like:

- what this piece is actually about
- what the discussion preserved
- whether the user can confirm it quickly

### 12.2 `surface.summary`

This is the AI-facing working summary.

It is a compact, standardized, relevance-oriented description used for routing and judgment.

So:

- `body_summary` is for human review
- `surface.summary` is for AI retrieval and routing

They should not be forced to be identical.

## 13. Runtime Use

If IPK is later connected to ordinary Q&A, the recommended runtime flow is:

1. decide whether IPK is needed
2. if yes, choose a map entry
3. inspect candidate `catalog` surfaces
4. then inspect a small amount of `retrieve`
5. use `associate` only when expansion is helpful
6. read the body only when evidence is still insufficient
7. then synthesize the final answer

The critical hard rules are:

- never answer from maps alone
- never answer from association alone
- if `retrieve` is still insufficient, read the body or narrow the question

## 14. The Role of `Skill`

`Skill` should not directly carry piece data.

The more coherent roles are:

- `ipk-capture`
  turns raw input into a piece draft

- `ipk-route`
  chooses a map or navigation entry

- `ipk-retrieve`
  performs accurate retrieval and candidate narrowing

- `ipk-associate`
  performs weak-association expansion

- `ipk-synthesize`
  integrates matched content into an answer or summary

So:

- IPK is the content layer
- skill is the workflow layer

## 15. Relationship to the User Adaptation System

The two systems collaborate closely, but their boundary must remain clear.

### The IPK content system is responsible for:

- what content exists
- how content connects to other content
- how content is surfaced to the AI
- how the system finds, verifies, and drills into content

### The user adaptation system is responsible for:

- how the AI should understand the user
- how the AI should understand the task and artifact
- what response and execution strategy should be used

So the relationship is:

- IPK provides reusable long-term content
- adaptation determines how that content should be used for this user and this task

## 16. Where It Fits Into Aether

From the current Aether architecture, the natural IPK landing points are:

- backend `packages/opencode/src/ipk/`
- frontend `packages/app/src/context/ipk.tsx`
- the future ordinary-Q&A prompt hook in `SessionPrompt.prompt()`
- post-processing and event reuse for ingestion and indexing

At a high level:

```text
raw input
  -> IPK ingest
  -> piece / surface / links
  -> maps / indexes
  -> runtime route + retrieve
  -> answer / review / research reuse
```

## 17. The Role of the Specialized Documents in This Directory

This details file unifies the main storyline.  
The specialized documents still keep their own responsibilities:

- [ipk-content-system-piece-and-retrieval.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-piece-and-retrieval.md)
  explains `piece`, storage, layered retrieval, and skill roles.
- [ipk-content-system-piece-schema-and-surface.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-piece-schema-and-surface.md)
  explains piece fields and surface exposure.
- [ipk-content-system-surface-schema-and-quality.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-surface-schema-and-quality.md)
  explains the formal three-surface schema and quality requirements.
- [ipk-content-system-ingestion-and-indexes.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-ingestion-and-indexes.md)
  explains automatic piece generation, review boundary, and first-pass indexes.
- [ipk-content-system-ingestion-workflow-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-ingestion-workflow-v1.md)
  explains the ingestion workflow and state machine.
- [ipk-content-system-map-quality-and-routing.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-map-quality-and-routing.md)
  explains map quality, surface quality, and routing logic.
- [ipk-content-system-multi-layer-maps-and-navigation.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-multi-layer-maps-and-navigation.md)
  explains multi-layer maps and navigation.
- [ipk-content-system-schema-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-schema-v1.md)
  defines the formal schema.
- [ipk-content-system-aether-integration-v1.md](/home/bzz/Aether/docs/IPK/01-ipk-content-system/ipk-content-system-aether-integration-v1.md)
  explains Aether integration.

## 18. The Most Important Current Design Conclusions

The most important conclusions are not about one field. They are these:

1. IPK is not a normal notes library. It is a long-term content system.
2. `piece` must be the unified minimum unit.
3. `piece` stores content, while `skill` stores method. They must not be merged.
4. `piece.md / meta.json / surface.json / links.json` should remain clearly separated.
5. `catalog / retrieve / associate` must remain distinct layers.
6. Maps guide, surface judges, and body confirms.
7. Ordinary Q&A may connect to IPK in the long term, but the first pass only uses IPK when the user explicitly asks for it.
8. The IPK content system and the user adaptation system should cooperate closely, but their boundaries must stay clear.
