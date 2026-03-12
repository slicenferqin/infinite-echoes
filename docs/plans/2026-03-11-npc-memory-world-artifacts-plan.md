# NPC Memory, World Events, and Artifacts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为《无尽回响》补齐下一阶段的三条主干能力：`NPC 记忆分层`、`NPC 之间低频互动事件引擎`、`通关后内容产物与主角经历沉淀`。

**Architecture:** 不做“所有 NPC 实时群聊”或“每次通关直接生成长篇小说”的高噪声方案，而是采用三层结构：先把事件和记忆做成结构化状态，再从这些状态生成短内容产物，最后在异步层按需长篇化。这样能同时保证世界可信度、成本可控性和后续内容扩展性。

**Tech Stack:** Next.js App Router、TypeScript、SQLite (`better-sqlite3`)、现有 `MetaWorldState`、`GameState`、`runtime hooks`、`/api/submit` 结算链路

---

## 0. 实施边界

### 本轮要实现

- 副本内 NPC 的分层记忆结构与检索
- 时段推进下的 NPC 互动事件引擎（结构化结果，不是全量对白）
- 通关后自动生成三类短内容：
  - 档案摘要
  - 世界日报
  - 碎片日志
- 主角经历库（Chronicle）数据结构与持久化
- 为“小说化回顾”预留异步任务与提纲结构

### 本轮明确不做

- 元世界开放地图
- 常驻 NPC 可视化对话页
- 全量 agent 自主社会模拟
- 直接同步生成 5~10 章长篇正文
- 新增完整测试框架

### 验收原则

- 世界状态先成立，再叙事化
- 记忆只保留“有后果的事”，不保无限全文
- NPC 互动先产出结构化事件，再由文本层翻译
- 长篇回顾必须异步或按需，不阻塞通关链路

---

## Task 1: 建立 NPC 记忆类型与仓储

**Files:**
- Create: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/npc-memory/types.ts`
- Create: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/npc-memory/defaults.ts`
- Create: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/npc-memory/repo.ts`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/types.ts`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/db/sqlite.ts`

**设计内容：**
- 新增 `NpcMemoryEntry`
  - `id`
  - `ownerNpcId`
  - `kind: dialogue | event | relationship | institution | trauma`
  - `aboutNpcId?`
  - `aboutPlayer?`
  - `episodeId`
  - `summary`
  - `emotionTag`
  - `weight`
  - `confidence`
  - `visibility: public | private | secret`
  - `createdAt`
  - `lastRecalledAt`
- 新增 `NpcMemoryState`
  - `entries`
  - `summary`
  - `lastUpdatedAt`
- 在 SQLite 中新增：
  - `npc_memories`
    - `id TEXT PK`
    - `user_id TEXT`
    - `episode_id TEXT`
    - `owner_npc_id TEXT`
    - `state_json TEXT`
    - `updated_at INTEGER`

**关键约束：**
- 一个用户、一个副本、一个 NPC，对应一份聚合记忆状态
- 不直接持久化无限对话全文
- 记忆状态允许被压缩与重写

**验证：**
- `npm run lint`
- `npm run build`

---

## Task 2: 做 NPC 记忆检索与 Prompt 注入

**Files:**
- Create: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/npc-memory/selectors.ts`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/agents/npc.ts`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/app/api/action/route.ts`

**设计内容：**
- 新增 `selectRelevantNpcMemories(params)`：
  - 输入：`npcId`、`playerInput`、`currentLocation`、`presentedClueId?`
  - 输出：最相关 `5~8` 条记忆摘要
- 检索排序因子：
  - 当前对话关键词相关度
  - 最近发生时间
  - 权重 `weight`
  - 与当前目标实体的关系
  - 是否仍未解决
- 在 `buildNpcSystemPrompt` 中新增“当前被唤起的相关记忆”片段

**写入规则：**
- `talk` 完成后，若本轮满足以下条件，则写入记忆：
  - 玩家让 NPC 态度显著变化
  - 玩家出示关键证据
  - 玩家触发谎言分层跃迁
  - 玩家与 NPC 谈崩

**不要做：**
- 不把整段原文全部塞入 prompt
- 不把每轮对话都无脑写成记忆

**验证：**
- 使用一个现有副本对话链做本地手动 smoke：
  - 同一 NPC 再次对话时能体现“记得之前发生过什么”

---

## Task 3: 建立 NPC 互动事件模型（Shadow Simulation）

**Files:**
- Create: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/world-events/types.ts`
- Create: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/world-events/engine.ts`
- Create: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/world-events/repo.ts`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/db/sqlite.ts`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/engine/runtime.ts`

**设计内容：**
- 新增 `WorldEventLog`
  - `id`
  - `userId`
  - `episodeId`
  - `day`
  - `slot`
  - `type`
  - `participants`
  - `summary`
  - `effects`
  - `createdAt`
- SQLite 新增表：
  - `world_event_logs`
    - `id TEXT PK`
    - `user_id TEXT`
    - `episode_id TEXT`
    - `event_json TEXT`
    - `created_at INTEGER`

**第一批事件类型：**
- `private_confrontation`
- `rumor_spread`
- `evidence_hidden`
- `temporary_alliance`
- `cover_up`
- `public_pressure_shift`
- `request_rejected`

**事件输出只包含结构化结果：**
- `trustDeltaByNpc`
- `threatDeltaByNpc`
- `moodShiftByNpc`
- `flagChanges`
- `clueAvailabilityChanges`
- `fragmentSeeds`

**触发时机：**
- 时段切换后
- 关键 flag 变化后
- 某个 NPC 冷却/失踪/改口节点出现时

**关键约束：**
- 每次时段推进最多产生 `1~3` 条世界事件
- 只选择“有关系边 + 有压力源”的 NPC 对
- 不做全员实时演化

**验证：**
- 同一副本里不操作若干时段后，世界状态应有可观测变化

---

## Task 4: 将世界事件接入副本运行时

**Files:**
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/app/api/action/route.ts`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/episodes/ep01/runtime.ts`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/episodes/ep02/runtime.ts`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/episodes/ep03/runtime.ts`

**设计内容：**
- 在 `onTimeSlotAdvanced` 后调用 `world-events/engine`
- 对副本状态做最小影响：
  - `npcStates` 变化
  - `flags` 变化
  - 搜查窗口收缩
  - 口供保守化
- 将事件以结构化形式落库，并选择性转为系统提示

**文案原则：**
- 不直接说“NPC A 和 B 完成了一次模拟”
- 只给世界内可观察表象
  - “港口今天口风忽然统一了”
  - “村里开始传某种说法”
  - “有人已经先一步动过那处抽屉”

**验证：**
- 玩家不与关键 NPC 对话，世界仍会推进到更不利状态
- 纯搜查路径应进一步趋向 BE

---

## Task 5: 建立通关后三类短内容产物

**Files:**
- Create: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/artifacts/types.ts`
- Create: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/artifacts/repo.ts`
- Create: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/artifacts/generator.ts`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/db/sqlite.ts`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/app/api/submit/route.ts`

**设计内容：**
- 新增统一产物类型 `ArtifactDocument`
  - `id`
  - `userId`
  - `episodeId`
  - `routeId`
  - `kind: archive_summary | world_bulletin | fragment_log | chronicle_outline | novel_chapter`
  - `title`
  - `body`
  - `meta_json`
  - `createdAt`
- SQLite 新增表：
  - `artifact_documents`

**通关同步生成：**
- `archive_summary`
  - 200~500 字
- `world_bulletin`
  - 300~800 字
- `fragment_log`
  - 3~6 条，单条 150~500 字

**生成输入：**
- route
- discovered clues
- key flags
- world event logs
- meta world changes
- core NPCs involved

**关键约束：**
- 这三类文本必须基于结构化输入生成，不允许完全脱离状态胡写
- `fragment_log` 优先写“未说出口的东西”，而不是复述结局

**验证：**
- 一次结算后数据库中能看到 1 条摘要、1 条日报、若干碎片日志

---

## Task 6: 建立主角经历库（Chronicle）

**Files:**
- Create: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/chronicle/types.ts`
- Create: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/chronicle/repo.ts`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/db/sqlite.ts`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/app/api/submit/route.ts`

**设计内容：**
- 新增 `ChronicleEntry`
  - `id`
  - `userId`
  - `episodeId`
  - `routeId`
  - `routeType`
  - `title`
  - `emotionalTheme`
  - `majorChoices`
  - `peopleRemembered`
  - `truthsLearned`
  - `woundsLeft`
  - `anomaliesWitnessed`
  - `artifactIds`
  - `createdAt`
- SQLite 新增表：
  - `chronicle_entries`

**作用：**
- 玩家沉淀的不是“成绩”，而是“经历”
- 后续元世界页面、档案馆页面、小说化回顾都从这里取索引

**验证：**
- 每次通关都能形成一个独立 `ChronicleEntry`

---

## Task 7: 为长篇小说化回顾预留异步管线

**Files:**
- Create: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/novelization/types.ts`
- Create: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/novelization/repo.ts`
- Create: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/novelization/planner.ts`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/lib/db/sqlite.ts`

**设计内容：**
- 不生成全文，只生成 `NovelProject`
  - `id`
  - `chronicleEntryId`
  - `status: pending | outlined | generating | completed | failed`
  - `chapterPlanJson`
  - `targetChapterCount`
  - `targetWordsPerChapter`
  - `createdAt`
- 第一次只生成 `5~10` 章提纲

**为什么只做提纲：**
- 控制时延
- 控制成本
- 保留后续人工/异步生成入口

**提纲内容：**
- 每章标题
- 本章 POV
- 冲突核心
- 关键事件引用
- 本章情绪落点

**验证：**
- 通关后可为一条 `ChronicleEntry` 生成小说项目提纲

---

## Task 8: 首页和结算页补最小展示

**Files:**
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/app/page.tsx`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/components/GameView.tsx`
- Modify: `/Users/slicenfer/Development/projects/self/infinite-echoes/app/src/app/api/auth/session/route.ts`

**设计内容：**
- 首页增加：
  - 最新档案摘要
  - 最近一次世界日报标题
  - 最近一次主角经历条目
- 结算后增加：
  - `【档案更新】`
  - `【世界日报】`
  - `【碎片日志】`
  - `【主角经历已收录】`

**展示原则：**
- 先展示标题和短摘要
- 不在结算页直接塞 1 万字长文

**验证：**
- 通关后用户能明确感知“这次经历被世界记住并被整理了”

---

## Task 9: 最小回归与线上验收

**Files:**
- 无新增文件；执行验证命令并记录结果

**验证命令：**
- `npm run lint`
- `npm run build`

**本地验收脚本：**
- 注册登录
- 进入 `ep01`
- 完成一次结算
- 检查：
  - `meta_world_states` 已更新
  - `npc_memories` 有记录
  - `world_event_logs` 有记录
  - `artifact_documents` 有产物
  - `chronicle_entries` 有条目

**线上 smoke：**
- 登录后首页能看到“回响之间近况”
- 通关后能看到新增产物提示

---

## 推荐执行顺序

1. **Task 1-2**：先把 NPC 记忆成立  
2. **Task 3-4**：再把世界事件成立  
3. **Task 5-6**：接通产物与主角经历  
4. **Task 7**：最后补小说化回顾提纲层  
5. **Task 8-9**：做用户可见展示与验证

---

## 关键决策（锁定）

- NPC 记忆采用“结构化摘要 + 检索注入”，不采用无限全文持久化
- NPC 互动采用“低频世界事件”，不采用全量实时群聊
- 通关后先生成短内容产物，再做长篇化
- 长篇小说化回顾只做提纲与异步任务，不阻塞结算
- 主角经历库是正式系统，不是临时文案集合

---

## 交付结果定义

完成本计划后，《无尽回响》将从“副本完成后只有一段结算文案”升级为：

- NPC 真的记得你做过什么
- NPC 之间真的会在你不在时发生事
- 世界真的会留下公报、私记和残片
- 主角真的拥有一部逐步成形的经历史

这一步完成后，后续再去做元世界页、档案馆、常驻 NPC 深度对话、小说化长篇，才有稳定底座。
