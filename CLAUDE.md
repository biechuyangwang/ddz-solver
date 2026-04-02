<!-- GSD:project-start source:PROJECT.md -->
## Project

**DDZ Solver (斗地主残局求解器)**

一个两人斗地主残局求解器 Web 应用。用户输入双方手牌（1-13 代表 A-K，14/15 代表小王大王），系统通过博弈树搜索算法计算出先手方的必胜决策路径，并以交互式树形图和逐步对局模拟两种方式展示结果。

面向斗地主残局爱好者和想研究残局策略的玩家。

**Core Value:** 给定任意两人残局局面，快速算出先手方必胜的完整决策路径——无论对手怎么出牌，都能赢。

### Constraints

- **Tech Stack**: React + TypeScript + Vite + TailwindCSS — 用户指定
- **No Backend**: 纯前端应用，所有计算在浏览器中完成
- **Performance**: 两人残局搜索需在合理时间内完成（目标 < 10s）
- **Card Encoding**: 1-13 代表 A-K，14/15 代表大小王
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| React | 19.2.x | UI framework | Specified by user. React 19 is current stable. Functional components + hooks are the standard pattern. No server components needed for this pure-client app. | HIGH |
| TypeScript | 6.0.x | Type safety | Specified by user. Essential for a game solver -- card types, hand types, move types, game state all benefit from strict typing. Prevents bugs in complex search logic. | HIGH |
| Vite | 8.0.x | Build tool / dev server | Specified by user. Fastest dev experience. Native Web Worker support (critical for offloading search computation). HMR keeps iteration fast. | HIGH |
| TailwindCSS | 4.2.x | Styling | Specified by user. v4 uses CSS-first config, no `tailwind.config.js` needed. Faster builds with Rust engine. Utility-first approach is ideal for card game UIs with lots of conditional styling. | HIGH |
### Supporting Libraries
| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| Comlink | 4.4.x | Web Worker communication abstraction | Used to wrap the solver Worker. Eliminates `postMessage` boilerplate. The solver algorithm runs in a Worker to avoid blocking UI; Comlink makes calling it feel like a local function. Essential for this project. | HIGH |
| @tailwindcss/vite | 4.2.x | Tailwind v4 Vite integration | Required for Tailwind v4. Replaces the old PostCSS plugin approach. Zero-config content detection. | HIGH |
| @xyflow/react (React Flow) | 12.10.x | Interactive decision tree visualization | For the interactive tree diagram that shows the complete game decision tree. Supports expand/collapse, custom node rendering, pan/zoom. This is the strongest option for an interactive tree the user can explore. | MEDIUM |
| clsx | 2.1.x | Conditional CSS class composition | For combining Tailwind classes conditionally (e.g., card selected state, suit colors). Lightweight, no runtime cost. | HIGH |
| tailwind-merge | 3.5.x | Intelligent Tailwind class merging | Used with clsx to resolve conflicting Tailwind utilities (e.g., `px-2` vs `px-4`). Prevents specificity bugs when composing card component styles. | HIGH |
| lucide-react | 1.7.x | Icon library | For UI icons (settings gear, play/pause, expand/collapse, info tooltips). Tree-shakeable, consistent design, works well with Tailwind. | HIGH |
| zustand | 5.0.x | Client state management | For managing app state: current game state, solver progress, tree expansion state, UI mode (tree view vs step simulation). Minimal boilerhead, no providers needed, works naturally with React 19. | HIGH |
| framer-motion | 12.38.x | Animation library | For card dealing animations, card play transitions, and tree node expand/collapse animations. Makes the solver feel polished rather than clinical. | MEDIUM |
| vite-plugin-comlink | 5.3.x | Vite plugin for Comlink integration | Simplifies Worker + Comlink setup in Vite. Handles Worker bundling automatically so you import the solver as a normal module. | MEDIUM |
### Development Tools
| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| @vitejs/plugin-react | 6.0.x | React Fast Refresh in Vite | Required for HMR with React. Use the automatic JSX runtime. |
| Vitest | 4.1.x | Unit/integration testing | Native Vite integration. Use for testing card type detection, move validation, and solver algorithm correctness. Critical for a solver -- every hand type rule needs tests. |
| @testing-library/react | 16.3.x | React component testing | For testing card input UI, tree visualization interactions, step simulation controls. |
| jsdom | 29.0.x | DOM environment for tests | Used as Vitest environment for component tests. |
| ESLint | 9.x | Code linting | Flat config format (eslint.config.js). Keeps code consistent. |
| typescript-eslint | 8.58.x | TypeScript-aware ESLint rules | Essential for catching TypeScript-specific issues. |
| eslint-plugin-react-hooks | 7.0.x | React hooks linting rules | Catches dependency array bugs, which matters for the solver UI with complex state effects. |
| eslint-plugin-react-refresh | 0.5.x | React Refresh linting | Ensures components are compatible with Fast Refresh. |
| Prettier | 3.8.x | Code formatting | Consistent style, no debates. |
## Installation
# Create project with Vite
# Core dependencies
# Tailwind v4 (Vite plugin approach -- no PostCSS needed)
# Web Worker + Comlink Vite integration
# Dev dependencies
## TailwindCSS v4 Setup Notes
- No `tailwind.config.js` -- use `@theme` in CSS
- No `content` array -- automatic content detection
- No PostCSS plugin needed -- `@tailwindcss/vite` handles everything
- Class names are the same; most utilities work identically
## Web Worker Architecture for Solver
## Decision Tree Visualization
### Option A: @xyflow/react (React Flow) -- RECOMMENDED
- The decision tree for a DDZ endgame is not a simple binary tree -- branches have varying widths
- React Flow handles custom node rendering (show card hands inside nodes)
- Built-in pan/zoom/selection
- Expand/collapse via custom node click handlers
- Minimap for navigation in large trees
- Active maintenance, large community
### Option B: react-d3-tree
- Less customizable node rendering
- Harder to embed interactive card visuals inside nodes
- Smaller community, less frequent updates
- Better only if the tree were purely hierarchical text
## Alternatives Considered
| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| State management | zustand | Jotai | If you prefer atom-based over store-based state. Jotai is fine but zustand's single-store model maps better to the game state (one unified game state object). |
| State management | zustand | Redux Toolkit | Overkill for this project. Redux adds boilerplate that is unnecessary for a single-page solver with no server sync. |
| Worker communication | Comlink | raw postMessage | If Comlink adds problematic overhead or the message protocol is simple enough. For this project, Comlink's DX benefit is worth it. |
| Tree visualization | @xyflow/react | react-d3-tree | If you need a simpler, purely hierarchical tree with no custom node interactivity. Not recommended for this project. |
| Tree visualization | @xyflow/react | D3 raw | Only if you need maximum control and are willing to manage DOM + React reconciliation. Massive DX cost for marginal benefit. |
| Tree layout | elkjs | dagre | If tree is small (< 50 nodes). dagre is simpler but less performant and less configurable for large trees. ELK handles edge routing and labels better. |
| Styling | TailwindCSS | CSS Modules | If you strongly oppose utility CSS. CSS Modules are fine but slower to iterate on a card game UI with many conditional states. |
| Animation | framer-motion | CSS transitions | For simple hover/press effects only. Card dealing and play animations need orchestrated sequences, which CSS transitions cannot coordinate. |
| Icons | lucide-react | heroicons | Both are good. Lucide has slightly more icons relevant to card games (dice, cards, etc.) and is more tree-shakeable. |
| Testing | Vitest | Jest | Vitest is the standard for Vite projects. Jest requires extra config to work with Vite's module resolution. No reason to use Jest here. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| tailwind.config.js (Tailwind v3 style) | Tailwind v4 moved to CSS-first config via `@theme`. The old config file is ignored by v4. | `@theme` directive in your CSS file |
| PostCSS + autoprefixer for Tailwind | `@tailwindcss/vite` handles Tailwind directly in Vite. PostCSS is unnecessary overhead for v4. | `@tailwindcss/vite` plugin |
| Redux / MobX | Over-engineered for a single-page solver with no server state, no real-time sync, no complex derived data. | zustand (minimal, sufficient) |
| @tanstack/react-query | No server requests in this app. React Query solves server state caching, which is irrelevant for a pure client-side solver. | zustand for client state only |
| Web Workers without Comlink | Raw `postMessage` protocol is error-prone and verbose. You will need typed message passing for the solver's complex request/response data. | Comlink for type-safe Worker RPC |
| className string concatenation | Manual string concatenation for conditional classes leads to whitespace bugs and conflicts. | `clsx()` + `tailwind-merge()` |
| moment.js / date-fns | No date handling needed in a card game solver. | N/A |
| CSS-in-JS (styled-components, emotion) | Adds runtime overhead. Conflicts with Tailwind's utility approach. Doubles the styling paradigm. | Tailwind utilities only |
## Stack Patterns by Variant
- Add a progress reporting mechanism via Comlink callbacks
- Consider transferable ArrayBuffers for large state snapshots
- Add a Web Worker pool (multiple workers for parallel subtree search)
- Display a progress bar with estimated remaining time
- Use virtualization (only render visible nodes) -- React Flow supports this natively
- Use elkjs instead of dagre for layout (better performance at scale)
- Implement lazy tree expansion (compute subtrees on demand)
- Add a search/filter function to find specific branches
- React Flow is desktop-focused; on mobile, consider a simplified list-based step view
- Card input may need a picker wheel instead of text input on small screens
- Touch gestures for tree pan/zoom work out of the box with React Flow
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @tailwindcss/vite 4.2.x | Vite >= 5.2 (including 6, 7, 8) | Peer dependency verified via npm |
| @xyflow/react 12.x | React >= 17 (including 19) | Peer dependency verified via npm |
| vite-plugin-comlink 5.3.x | Vite 5+ | Should work with Vite 8; verify during setup |
| react-d3-tree 3.x | React 16-19 | Verified via npm peer dependencies |
| comlink 4.x | Any Worker environment | No framework dependency |
| zustand 5.x | React 18-19 | Uses useSyncExternalStore under the hood |
| framer-motion 12.x | React 19 | Version 12+ explicitly supports React 19 |
## Sources
- npm registry (via `npm view`) -- All version numbers verified directly from npm on 2026-04-03
- [TailwindCSS v4 documentation](https://tailwindcss.com/docs) -- CSS-first config approach, @tailwindcss/vite plugin -- MEDIUM confidence (could not access live docs due to rate limits, based on release knowledge)
- [React Flow (@xyflow/react) documentation](https://reactflow.dev) -- Custom nodes, layout integration -- MEDIUM confidence
- [Comlink GitHub](https://github.com/GoogleChromeLabs/comlink) -- Worker RPC pattern -- HIGH confidence
- [Vite documentation](https://vitejs.dev) -- Web Worker support, plugin ecosystem -- HIGH confidence
- [zustand documentation](https://zustand.docs.pmnd.rs) -- React state management -- HIGH confidence
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
