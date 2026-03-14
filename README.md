# Infinite Echoes

AI 叙事推理游戏，核心是“可对话世界”而不是“固定谜题表单”。

玩家通过与 NPC 对话、建立信任、解锁社交 lead，再进入关键搜查点推进案件。  
目前已完成 EP01 / EP02 / EP03 结构，并支持账号隔离、进度持久化、实时天机制与身份池玩法。

## Core Features

- Server Authoritative 会话：客户端只提交 action/submission，状态由服务端持有。
- 强社交推理：非 BE 路线有社交资格门槛，纯跑图默认趋向 BE。
- 实时天机制：按副本配置推进时段事件与不可逆窗口。
- 身份池系统：开局随机身份，无重抽，影响对话偏置、硬权限和风险代价。
- 多副本注册中心：按通关进度解锁后续副本（ep01 -> ep02 -> ep03）。
- 账号与进度持久化：用户名密码登录，SQLite 存储，支持续玩与结算记录。
- 前端交互优化：行动即时反馈、路线进度可视化、结算去泄漏。

## Episode Progression

- `ep01`：默认解锁。
- `ep02`：通关 `ep01`（HE/TE/SE 任一）后解锁。
- `ep03`：通关 `ep02`（HE/TE/SE 任一）后解锁。

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- SQLite (`better-sqlite3`)
- Zod validation
- bcryptjs password hash
- OpenAI-compatible LLM gateway
- Mock / Live 双模式启动

## Quick Start

```bash
npm install
cp .env.local.example .env.local
npm run doctor
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Create `.env.local` from `.env.local.example`:

```bash
LLM_MODE=mock
APP_DB_PATH=./data/dev.sqlite
AUTH_COOKIE_SECURE=false
```

Notes:
- 默认 `LLM_MODE=mock`，贡献者复制配置后即可直接启动，不需要先接真实模型。
- 切到 `LLM_MODE=live` 时，必须同时提供 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL`。
- `LLM_BASE_URL` 必须兼容 OpenAI `chat.completions`。
- 如果你的网关不校验 key，`LLM_API_KEY` 也要填一个非空占位值，例如 `dummy`。
- Production should set `AUTH_COOKIE_SECURE=true`.
- `APP_DB_PATH` should point to a persistent disk path in production.

## Scripts

```bash
npm run doctor
npm run dev
npm run lint
npm run build
npm run start
```

## Contributor Onboarding

- 默认推荐先用 `mock` 模式接入，先验证登录、选本、进度、数据库、交互流程。
- 只有在需要调 NPC 表现、搜查文本、结算质量时，再切 `live` 模式。
- 详细约定见 `CONTRIBUTING.md`

## Project Structure

```text
src/
  app/               # UI + API routes
  components/        # game UI
  lib/
    agents/          # GM/NPC prompts + parser
    engine/          # state engine + settlement routing
    episodes/        # ep01/ep02/ep03 definitions
    identity/        # identity pool + risk/unlock hooks
    social/          # social lead + eligibility audit
    timeline/        # realtime day pacing
    auth/            # login/session guard
    db/              # SQLite access
```

## Current Status

- lint/build passing locally
- ep01 + ep02 + ep03 integrated
- unlock chain and session ownership checks enabled
- route progress and governance indicators integrated in UI
