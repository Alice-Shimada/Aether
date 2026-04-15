# Model Routing Map

## 1. Existing registries

### IPK
- Backend registry: `packages/opencode/src/ipk/model.ts`
- Backend call site wrapper: `packages/opencode/src/ipk/llm.ts`
- API route: `packages/opencode/src/server/routes/ipk.ts` (`GET/POST /ipk/model`)
- Frontend context types/API: `packages/app/src/context/ipk.tsx`
- Frontend selector UI: `packages/app/src/components/ipk-model-settings-dialog.tsx`

Current kinds:
- `summarize`
- `revise`
- `search`
- `associate`

### Adaptation
- Backend registry: `packages/opencode/src/adaptation/model.ts`
- Typical call site: `packages/opencode/src/adaptation/*`
- API route: `packages/opencode/src/server/routes/adaptation.ts` (`GET/POST /adaptation/model`)
- Frontend context types/API: `packages/app/src/context/adaptation.tsx`
- Frontend selector UI: `packages/app/src/components/adaptation-model-settings-dialog.tsx`

Current kinds:
- `signal_extract`
- `summary_aggregate`
- `proposal_generate`
- `semantic_merge`
- `scope_match`

## 2. Routing decision order

1. Reuse existing kind in the same domain when semantics match.
2. Reuse existing wrapper/helper (`IpkLLM`, `AdaptationModel.pick`) instead of direct free-form model calls.
3. Add a new model kind only when all existing kinds are clearly semantically mismatched.

## 3. New kind minimum touchpoints (only if necessary)

### IPK new kind
1. `packages/opencode/src/ipk/model.ts` enum/map
2. `packages/app/src/context/ipk.tsx` type map
3. `packages/app/src/components/ipk-model-settings-dialog.tsx` selector row
4. Related docs in `docs/IPK/01-ipk-content-system/*`

### Adaptation new kind
1. `packages/opencode/src/adaptation/model.ts` enum/map
2. `packages/app/src/context/adaptation.tsx` type map
3. `packages/app/src/components/adaptation-model-settings-dialog.tsx` selector row
4. Related docs in `docs/IPK/02-user-adaptation-system/*`

## 4. Must report when unresolved

When no existing kind fits, report:
- New call site path
- Why existing kinds mismatch
- Proposed new kind name
- Exact files updated for backend + frontend + docs
