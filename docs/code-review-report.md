# Pre-Release Code Review & Quality Assurance Report

**Repository**: `system-design-study-app`  
**Review Tracks**:
- **Track A (`reviewer-core-ui`)**: Core State Persistence (`StudyContext.tsx`), Types (`src/types/index.ts`), Layout Shell (`Navbar.tsx`, `Sidebar.tsx`, `CommandPalette.tsx`), and View Modules (`DashboardView.tsx`, `PatternsCatalogView.tsx`, `TradeoffsExplorerView.tsx`, `MatrixComparisonView.tsx`, `CaseStudiesView.tsx`, `ActiveRecallView.tsx`, `ContentStudioView.tsx`, `App.tsx`)
- **Track B (`reviewer-diagrams-data`)**: Interactive SVG Simulators & Visualizers (`PatternSimulators.tsx`, `TradeoffSimulators.tsx`, `TradeoffRadar.tsx`, `ArchitectureVisualizer.tsx`), Curriculum Data Registries (`src/data/*.ts`), and Automated CLI Validation (`scripts/validate-content.mjs`)

---

## 1. Executive Summary

| Severity Level | Issues Identified | Issues Resolved | Verification Status |
| :--- | :---: | :---: | :---: |
| **High** | 3 | 3 | Verified (`0` errors) |
| **Medium** | 6 | 6 | Verified (`0` errors) |
| **Low** | 1 | 1 | Verified (`0` errors) |
| **Total** | **10** | **10** | **100% Resolved** |

---

## 2. Track A: Core State, Layout & Views (`reviewer-core-ui`)

### [A-1] High — React 18 Automatic Batching Return Bug in `installContentPack`
- **File**: `src/context/StudyContext.tsx`
- **Root Cause**: `installContentPack` declared local counters (`let addedTopics = 0; let addedCards = 0;`), mutated them inside the `setPersisted((prev) => ...)` state updater callback, and synchronously returned `{ addedTopics, addedCards }`. Under React 18/19 automatic batching, functional state updaters are queued and may not run before `installContentPack` returns, causing callers (`ContentStudioView`) to receive `{ addedTopics: 0, addedCards: 0 }`.
- **Fix Applied**: Computed `addedTopics` and `addedCards` deterministically from `persisted.customTopics` and `persisted.customFlashcards` before calling `setPersisted`, while keeping deduplication inside the state updater pure.

### [A-2] Medium — TypeScript `any` Casts & Global Keydown Conflict Guards
- **File**: `src/components/views/ActiveRecallView.tsx`
- **Root Cause**:
  1. Used `(studyContext as any).customFlashcards` and `(c: any)` casts instead of the typed `StudyContextType` contract.
  2. The `window` keydown listener (`Space`, `1–4`, `ArrowLeft`/`ArrowRight`) could fire while `CommandPalette` (`Ctrl+K`) was open, when modifier keys (`Ctrl`/`Meta`/`Alt`) were held, when `<select>` or `contenteditable` elements were focused, or when `Space` was pressed on a focused `<button>` (causing double-invocation).
- **Fix Applied**: Removed all `any` casts, destructured `customFlashcards` and `isCommandPaletteOpen` directly from `useStudy()`, and guarded `handleKeyDown` against `isCommandPaletteOpen`, modifier keys (`e.metaKey || e.ctrlKey || e.altKey`), `INPUT`/`TEXTAREA`/`SELECT`/`isContentEditable` targets, and `Space` on focused `BUTTON` elements.

### [A-3] Medium — Deep-Link `selectedItemId` Synchronization & Filter Reset
- **Files**: `src/components/views/ContentStudioView.tsx`, `src/components/views/PatternsCatalogView.tsx`, `src/components/views/TradeoffsExplorerView.tsx`, `src/components/layout/CommandPalette.tsx`
- **Root Cause**:
  1. Deep-linking to a custom/pack topic via `CommandPalette` (`navigateToItem('studio', id)`) or `DashboardView` opened `ContentStudioView` on the default `'catalog'` tab without switching to `'library'` or highlighting the selected topic.
  2. In `PatternsCatalogView` and `TradeoffsExplorerView`, active search queries or category filters were not cleared when navigating via `selectedItemId`, which could hide the target item.
  3. `CommandPalette` lacked a filter pill for custom/pack items (`studio`).
- **Fix Applied**: Added `selectedItemId` synchronization in `ContentStudioView` to switch to the `'library'` tab and highlight the target custom topic card; reset active search/category filters in `PatternsCatalogView` and `TradeoffsExplorerView` upon `selectedItemId` navigation; and added a `Custom / Packs` filter pill in `CommandPalette`.

### [A-4] Medium — Pure State Updaters & Transient `setTimeout` Cleanup
- **Files**: `src/components/views/CaseStudiesView.tsx`, `src/components/views/DashboardView.tsx`, `src/components/views/TradeoffsExplorerView.tsx`, `src/components/views/ContentStudioView.tsx`, `src/components/layout/CommandPalette.tsx`
- **Root Cause**: `CaseStudiesView` invoked `setTimerRunning(false)` inside the `setSecondsLeft` functional updater (side effect inside a pure updater). Transient `setTimeout` timers in `DashboardView`, `TradeoffsExplorerView`, `ContentStudioView`, and `CommandPalette` were not tracked or cleared on unmount.
- **Fix Applied**: Made `setSecondsLeft` pure and added a dedicated `useEffect` to stop `timerRunning` when `secondsLeft === 0`. Stored transient timeout IDs in `useRef` and cleared them on re-trigger and component unmount. Also updated `DashboardView` `bookmarkedItems` and `flashcardStats` to include custom/pack topics and flashcards.

### [A-5] Low — Interactive Semantics & ARIA Attributes
- **Files**: `src/components/layout/Navbar.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/CommandPalette.tsx`, `src/components/views/MatrixComparisonView.tsx`, `src/components/views/CaseStudiesView.tsx`, `src/components/views/ContentStudioView.tsx`
- **Root Cause**: The curriculum mastery pill in `Navbar` used a clickable `<div>` instead of a `<button>`, `CommandPalette` lacked dialog ARIA attributes, and several icon-only buttons lacked `aria-label` or `type="button"`.
- **Fix Applied**: Converted the `Navbar` mastery pill to `<button type="button">`, added `role="dialog"` and `aria-modal="true"` to `CommandPalette`, and added `aria-label` and `type="button"` across all icon-only controls.

---

## 3. Track B: Interactive Diagrams, Simulators & Data Registries (`reviewer-diagrams-data`)

### [B-1] High — Dangling `relatedPatternIds` Cross-Reference & CLI Referential Integrity Validation
- **Files**: `src/data/softwarePatterns.ts`, `scripts/validate-content.mjs`
- **Root Cause**: In `src/data/softwarePatterns.ts`, `pattern-facade.relatedPatternIds` referenced `'pattern-mediator'`, which was not a defined ID in `SOFTWARE_PATTERNS`. Furthermore, `scripts/validate-content.mjs` only checked top-level required fields and ID uniqueness without verifying cross-entity links.
- **Fix Applied**:
  1. Updated `pattern-facade.relatedPatternIds` to `['pattern-adapter', 'pattern-proxy', 'pattern-decorator']`.
  2. Enhanced `scripts/validate-content.mjs` to enforce full referential integrity across all 7 exports:
     - `SOFTWARE_PATTERNS`: verifies `relatedPatternIds` exist in `SOFTWARE_PATTERNS` and do not self-reference.
     - `DISTRIBUTED_PATTERNS` & `SYSTEM_TRADEOFFS`: validates `simulatorId` and `simulatorType` against registered union types.
     - `FRAMEWORK_MATRICES`: validates contender ID uniqueness, numeric `0–100` axis scores, dimension coverage for every contender ID, and `decisionScenarios` (`recommendedId` and `runnerUpId` must exist in `matrix.contenders` and be distinct).
     - `CASE_STUDIES`: validates node ID uniqueness, `tier` and `pathType` enums, and ensures every `edge.from` and `edge.to` references a valid node ID in that case study without self-loops.
     - `QUIZ_QUESTIONS`: verifies `correctIndex` is an integer within `[0, options.length - 1]`.

### [B-2] High — Invalid Tailwind `grid-cols-16` Class & Impure State Updater in `PatternSimulators.tsx`
- **File**: `src/components/diagrams/PatternSimulators.tsx`
- **Root Cause**:
  1. The Retry Storm Visualizer bar chart used `grid-cols-16`, which is not a standard Tailwind CSS utility class (default scale ends at `grid-cols-12`), causing the 16 time-bucket bars to stack vertically instead of rendering side-by-side.
  2. In `RateLimiterLab.advanceTimeTick`, `setPrevWindowCount(currWindowCount)` and `setCurrWindowCount(0)` were called inside the `setWindowProgressPct((pct) => ...)` state updater function, violating React updater purity in `<React.StrictMode>`.
  3. Lowering `failureThreshold` or `cooldownSeconds` sliders in `CircuitBreakerLab` did not clamp `remainingCooldown` or check if accumulated failures already met the lowered threshold.
- **Fix Applied**: Added explicit `style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}` on the 16-bar chart container; refactored `advanceTimeTick` to update state cleanly without nested `setState` calls inside updater functions; clamped `remainingCooldown` and evaluated `failureThreshold` on slider changes; and guarded `keys.length` division-by-zero in `ConsistentHashingLab`.

### [B-3] Medium — Raw Unrendered LaTeX Strings, Topic Switch Reset & Division Guards in `TradeoffSimulators.tsx`
- **File**: `src/components/diagrams/TradeoffSimulators.tsx`
- **Root Cause**: Labels in `LatencyThroughputSimulator`, `ReplicationQuorumSimulator`, and `ShardingLbSimulator` contained literal LaTeX syntax (`$\rho$`, `$\lambda$`, `$S + W_q$`, `$1 - (1 - p)^{N}$`) without a math renderer. Additionally, `overrideTab` only reset when `activeSimulatorType` changed, not when `topicId` changed between topics sharing the same simulator.
- **Fix Applied**: Replaced all raw LaTeX strings with clean Unicode mathematical symbols (`ρ`, `λ`, `S + Wq`, `1 − (1 − p)^N`, `L = λ × W`), added defensive bounds against division-by-zero on `rho`, `baseServiceMs`, and `saltFactor`, and included `topicId` in the `useEffect` dependency array to reset `overrideTab`.

### [B-4] Medium — Radar Chart Dimming Bug on Deselected Contenders & SVG `viewBox` Label Clipping
- **File**: `src/components/diagrams/TradeoffRadar.tsx`
- **Root Cause**: Hovering an unselected contender button in the legend (or clicking an active contender to toggle it off while hovered) kept `hoveredContenderId` set to an inactive contender ID, dimming all active polygons on the radar chart to `opacity: 0.2`. Long axis labels at 30°/150°/210°/330° could also clip horizontally inside a `340x340` `viewBox`.
- **Fix Applied**: Computed `activeHoveredContenderId` so polygon dimming only triggers when the hovered contender is currently active; reset `hoveredAxis` and `hoveredContenderId` when switching matrices; and widened the SVG `viewBox` to `-28 0 396 340`.

### [B-5] Medium — Stale Node/Outage State on Case Study Switch & Vertical Edge Label Positioning
- **File**: `src/components/diagrams/ArchitectureVisualizer.tsx`
- **Root Cause**: Switching case studies while in `'outage'` flow mode kept `flowMode` stuck in `'outage'` and retained the previous case study's `selectedNodeId`. Same-tier vertical edges also calculated midpoint badge coordinates from horizontal port coordinates rather than the vertical path endpoints.
- **Fix Applied**: Added a `useEffect` keyed on `[caseStudy.id, caseStudy.nodes]` to reset `selectedNodeId` to `caseStudy.nodes[0]?.id ?? ''` and `flowMode` to `'all'` upon switching case studies, and unified `startX/startY/endX/endY` coordinates for both vertical and cross-tier cubic Bezier edges.

---

## 4. Automated Verification Results

1. **Curriculum Health, Schema & Referential Integrity (`npm run validate:content`)**:
   - **93 validated curriculum entities** across 7 exports (`SOFTWARE_PATTERNS`: 15, `DISTRIBUTED_PATTERNS`: 13, `SYSTEM_TRADEOFFS`: 8, `FRAMEWORK_MATRICES`: 7, `CASE_STUDIES`: 7, `FLASHCARDS`: 27, `QUIZ_QUESTIONS`: 16) — **PASS (`0` errors)**.
2. **TypeScript Compiler (`npx tsc --noEmit`)**:
   - **0 type errors** across all source files.
3. **Production Bundle (`npm run build`)**:
   - `tsc -b && vite build` completed cleanly with **0 errors**.
