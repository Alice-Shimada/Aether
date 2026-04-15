---
name: llm-model-routing-guard
description: Automatically audit new or changed LLM call sites and route them to existing model-setting registries before finishing any code/doc change. Use when edits touch model-invoking code (generateText/streamText/Provider.getLanguage/defaultModel), model enums, model settings routes, or model settings UI in IPK, Adaptation, or other modules.
---

# LLM Model Routing Guard

Run this workflow after each implementation batch (code and docs).

## Required Workflow

1. Run the checker.

```bash
python .opencode/skills/llm-model-routing-guard/scripts/check_model_routing.py --repo /home/bzz/Aether
```

2. Reuse existing model kinds first.
- Route IPK calls through `IpkModel.pick` / `IpkLLM`.
- Route Adaptation calls through `AdaptationModel.pick`.
- Avoid adding a new model option when an existing kind is semantically acceptable.

3. Handle unresolved findings.
- If unresolved exists, inspect `references/routing-map.md`.
- If an existing kind can fit after small refactor, refactor and rerun checker.
- If no existing kind fits, report mismatch reason to user and add one new kind with full touchpoints.

4. Keep registry alignment.
- Keep backend enum, frontend context type, and model-settings dialog rows consistent.
- Rerun checker and typecheck.

## New Kind Policy

- Treat new model kind as last resort.
- Add a new kind only when all existing kinds are clearly mismatched by function.
- When adding, update backend + frontend + docs in the same change.
- State in the final report why reuse was not possible.

## Completion Gate

Before final response:
1. `check_model_routing.py` returns `status: ok`.
2. Relevant `bun typecheck` commands pass.
3. If IPK/adaptation behavior changed, docs are synced and audit is run.
