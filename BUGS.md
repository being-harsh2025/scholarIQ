# BUGS.md — EduPredict AI Bug Tracker

## Bug Tracking Log

| Bug ID | Description | Severity | Component | Status | Root Cause & Resolution |
|---|---|---|---|---|---|
| BUG-001 | TypeScript TS2305: Missing DatasetDetail type export in frontend/src/types/index.ts | Low | Frontend Types | Resolved | Exported `type DatasetDetail = Dataset;` in types/index.ts |
| BUG-002 | TypeScript TS2339: Property 'env' does not exist on type 'ImportMeta' in api.ts | Low | Frontend Config | Resolved | Added `"types": ["vite/client"]` in tsconfig.json and safe cast in api.ts |
| BUG-003 | PostCSS error: The `shadow-xs` class does not exist in Tailwind CSS v3 | Low | Styling | Resolved | Replaced `shadow-xs` with standard Tailwind v3 `shadow-sm` in index.css and components |

## Verification Checkpoints
- [x] No hardcoded metrics in frontend or backend
- [x] Zero unhandled NaN / infinite values in regression metrics
- [x] Proper error reporting for unknown categories in test or prediction data
- [x] Safe CSV parsing that does not crash on malformed rows
- [x] Strict prevention of target leakage during feature selection and training
- [x] 100% test pass rate in Pytest (11/11 tests passed)
- [x] 100% test pass rate in Vitest (4/4 tests passed)
- [x] Production bundle builds successfully with zero TypeScript or styling errors
