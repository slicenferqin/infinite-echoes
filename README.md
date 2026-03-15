# Infinite Echoes / 无尽回响

`无尽回响` 不是一个“套了模型的文字游戏”，也不是一个传统 RPG。

它是一个 **text-first 的多 Agent 世界探索 / 叙事冒险项目**：  
玩家以“外来冒险者”的身份进入一个正在出事的世界切片，通过 **对话、调查、建立关系、承担判断后果** 去推动故事。  
这里真正重要的，不是刷数值或点选项，而是：

- 关系如何被建立、误解和修复
- NPC 如何带着记忆、立场和谎言继续活下去
- 制度、共同体和历史后果如何压到个体身上
- 玩家离开之后，世界是否真的被改变

这个仓库开源，不是为了“大家随便提点子”，而是为了发出一份 **共同创作邀请**。

## 我们在搭一个怎样的世界

`无尽回响` 的核心不是单个案件，而是 **一个能持续长出新副本的统一世界**。

- 多个 Episode 共享同一条世界线，不是互不相干的关卡拼盘
- 每个副本都是一个社会切片：亲情、乡评、阶级、秩序、自由、神明、生命意义
- NPC 不是一次性功能角色，而是带着记忆、恐惧、依赖、谎言层和历史负担的人
- AI 在这个世界里也不是纯反派，它可能是秩序、防线、记录者、压制者、合作者
- 玩家不只是“通关”，而是在这个世界里留下档案、日报、日志、回顾、关系余波

目标不是做一个短期消费品，而是验证一件更难的事：

> **多 Agent 世界，能不能持续产出真正可玩的、可记住的、能讨论社会与人性的内容。**

## 为什么值得一起做

这个项目值得做，不是因为“AI 游戏”这个标签新鲜，而是因为它卡在一个非常具体、也非常稀缺的问题上：

- 能不能让 NPC 不只会说话，而是真的 **带着记忆和立场活着**
- 能不能让推理不只等于找答案，而是要 **承担关系和制度的后果**
- 能不能让世界不只是设定，而是玩家离开后仍然留下 **历史余波**
- 能不能让中文语境里的亲情、乡里、体面、公义、沉默、连坐这些东西，被真正写进可玩的系统

开源在这里的价值，不是免费劳动力。  
真正的价值是：让这个世界开始拥有比单个创作者更宽的脑回路。

## 这不是“谁都可以来贡献”

这个项目不是“欢迎任意 PR”的那种开源仓库。

方向、审美、世界线、叙事原则，都会被严格收口。  
这里需要的是 **能看懂问题、说清问题、并愿意一起把问题做深的人**。

不适合的参与方式：

- 路过式点子投喂
- 不理解方向就直接改大结构
- 把它当成普通聊天产品、普通 RPG、普通套壳 Agent 项目
- 只关心“能不能加功能”，不关心“这个世界到底在表达什么”

适合的参与方式：

- 先理解项目，再选一个具体问题下手
- 先给出有判断力的反馈，再谈具体改动
- 能解释“为什么这样改”，而不只是“我想这么改”

## 我们现在最需要的共同作者

### 1. 世界 / 叙事设计型

这类人不一定代码最强，但当前阶段非常重要。

他们可能擅长：

- 角色塑造
- 场景戏剧性
- 世界观补完
- 社会关系结构
- 任务与线索设计

这类作者对项目的帮助，现阶段往往 **不低于一个纯工程实现者**。

### 2. 系统 / Agent 设计型

这类人关心的不是一句台词，而是整个世界如何不塌。

他们通常会盯这些问题：

- 状态系统怎么跑
- NPC 如何持续记忆
- 世界如何保持一致性
- 多角色互动如何避免塌陷
- 导演层 / 调度层怎么做

这类作者能帮项目把“有感觉的想法”压成“能持续运行的结构”。

### 3. 内容副产物 / 产品化型

这类人关心的是：世界运行之后，能长出什么真正值得被看见的东西。

他们会盯这些问题：

- 世界日报、碎片日志、通关档案、回放怎么设计
- 玩家体验路径怎么更顺
- 哪些内容值得沉淀、传播、收录
- 这个项目如何从“实验”走向“作品 / 产品”

这类作者很适合把 `无尽回响` 从系统原型推向更完整的体验闭环。

### 4. 真正能下场实现的人

包括但不限于：

- 前端 / 交互
- 后端 / 数据
- Prompt / Agent 工程
- 工具链 / 自动化
- UI / 体验打磨

这类实现者当然重要。  
但如果前面三类缺位，纯实现者进来后，往往不知道自己到底在帮一个什么东西。

## 当前最缺的，不是功能，而是这些能力

项目现在已经有了基础骨架：

- `ep01` / `ep02` / `ep03` 已接入
- 实时天机制、身份池、社交 lead、非 BE 门槛已跑通
- 账号、进度、结算、元世界入口已接好
- OpenAI / Anthropic 双协议 LLM 接入 + mock 模式已可用

但真正缺的仍然是：

- **更强的情感穿透力**：尤其是 EP01 入口戏和关系张力
- **更稳的 NPC 记忆与 NPC 间互动**
- **更清晰的导演层 / 调度层 / 世界一致性控制**
- **更强的内容沉淀能力**：档案、日报、日志、通关回顾、小说化产物
- **更成熟的产品化判断**：怎么让体验更顺、传播更自然、协作更低摩擦

## 如果你要加入，先这样开始

不是先写一大坨代码。

先做这几件事：

```bash
npm install
cp .env.local.example .env.local
npm run doctor
npm run db:reset
npm run smoke:mock
npm run dev
```

然后再选一个具体方向：

- 重写一个场景 / 一段人物关系
- 设计一层 NPC 记忆结构
- 改一个副本的 lead / 搜查门槛
- 设计一类世界副产物（日报 / 日志 / 回顾 / 档案）
- 做一段更顺的交互流程

这里更看重的不是“改了多少”，而是：

> **你能不能把一个问题讲清楚，并把它往前推一小步。**

## Project Status

- `ep01`：默认解锁
- `ep02`：通关 `ep01`（HE / TE / SE 任一）后解锁
- `ep03`：通关 `ep02`（HE / TE / SE 任一）后解锁
- LLM 接入支持 `mock / live` 与 `openai / anthropic` 两种协议风格
- 当前协作者本地链路已具备：配置检查、数据库重置、mock 冒烟验证

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- SQLite (`better-sqlite3`)
- Zod validation
- bcryptjs password hash
- Mock / Live 双模式 LLM
- OpenAI / Anthropic 协议兼容

## Environment Variables

Create `.env.local` from `.env.local.example`:

```bash
LLM_MODE=mock
LLM_API_STYLE=openai
APP_DB_PATH=./data/dev.sqlite
AUTH_COOKIE_SECURE=false
```

Notes:

- 默认 `LLM_MODE=mock`，复制配置后即可直接启动
- 切到 `LLM_MODE=live` 时，必须同时提供 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL`
- `LLM_API_STYLE` 仅支持 `openai` 或 `anthropic`
- 当 `LLM_API_STYLE=openai` 时，`LLM_BASE_URL` 必须兼容 OpenAI `chat.completions`
- 当 `LLM_API_STYLE=anthropic` 时，`LLM_BASE_URL` 必须兼容 Anthropic `v1/messages`
- 如果你的网关不校验 key，`LLM_API_KEY` 也要填一个非空占位值，例如 `dummy`
- Production should set `AUTH_COOKIE_SECURE=true`
- `APP_DB_PATH` should point to a persistent disk path in production

## Scripts

```bash
npm run doctor
npm run db:reset
npm run smoke:mock
npm run dev
npm run lint
npm run build
npm run start
```

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

## Collaboration Notes

更细的协作约定、启动要求和提交前自检见 `CONTRIBUTING.md`。
