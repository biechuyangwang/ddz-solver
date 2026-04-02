# DDZ Solver (斗地主残局求解器)

## What This Is

一个两人斗地主残局求解器 Web 应用。用户输入双方手牌（1-13 代表 A-K，14/15 代表小王大王），系统通过博弈树搜索算法计算出先手方的必胜决策路径，并以交互式树形图和逐步对局模拟两种方式展示结果。

面向斗地主残局爱好者和想研究残局策略的玩家。

## Core Value

给定任意两人残局局面，快速算出先手方必胜的完整决策路径——无论对手怎么出牌，都能赢。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 支持输入双方手牌（1-13 代表 A-K，14 代表小王，15 代表大王）
- [ ] 支持所有标准斗地主牌型：单牌、对子、三带一/二、顺子、连对、飞机带翅膀、四带二、炸弹、火箭
- [ ] 默认用户先手，可选择后手
- [ ] 使用博弈树 Minimax + Alpha-Beta 剪枝搜索必胜路径
- [ ] Web Worker 后台计算，不阻塞 UI
- [ ] 交互式树形图展示完整决策树（可展开/折叠，点击节点查看详情）
- [ ] 逐步对局模拟（一步步展示最优出牌和对局过程）
- [ ] 扑克牌可视化显示（花色+点数图形，非纯数字）

### Out of Scope

- 三人斗地主（仅支持两人残局）
- AI 对战/在线对战（纯求解工具）
- 用户账户系统
- 残局题库/社区分享

## Context

- 斗地主是中国最流行的扑克牌游戏之一，残局问题是经典的博弈论搜索问题
- 两人残局（地主 vs 农民）的搜索空间相对有限，适合前端计算
- 牌型编码：1=A, 2-10=2-10, 11=J, 12=Q, 13=K, 14=小王, 15=大王
- 技术栈：React + TypeScript + Vite + TailwindCSS
- 计算在 Web Worker 中进行，避免阻塞主线程

## Constraints

- **Tech Stack**: React + TypeScript + Vite + TailwindCSS — 用户指定
- **No Backend**: 纯前端应用，所有计算在浏览器中完成
- **Performance**: 两人残局搜索需在合理时间内完成（目标 < 10s）
- **Card Encoding**: 1-13 代表 A-K，14/15 代表大小王

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 纯前端 + Web Worker | 无需后端部署，用户体验更直接 | — Pending |
| 支持全部标准牌型 | 完整的斗地主残局体验 | — Pending |
| 树形图 + 步骤引导双模式 | 树形图适合分析全局策略，步骤引导适合模拟实战 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-03 after initialization*
