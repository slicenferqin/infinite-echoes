# Meta World State Design

**Goal:** 为《无尽回响》补齐“元世界状态层”，让跨副本连续性不再停留在文案暗示，而成为可持久化、可查询、可驱动后续内容的系统能力。

**Architecture:** 在现有 `user_progress` 与 `game_sessions` 之外，新建独立的 `MetaWorldState` 持久层。副本仍然独立运行，但在结算时把“异常、认知、常驻 NPC 关系、档案记录”等结果写回元世界。这样既保留多副本独立世界的可玩性，又建立真正的主线宇宙连续性。

**Tech Stack:** Next.js App Router、TypeScript、SQLite (`better-sqlite3`)、现有 `episode registry + progression + session store`

---

## 1. 设计目标

当前系统已经具备：

- 用户账号与持久化进度
- 单局游戏状态 `GameState`
- 副本解锁链
- 副本结算与路线判定
- 元叙事文本钩子

但当前跨副本连续性仍然有三个明显断层：

1. **元世界角色没有真正持久状态**  
   阿寂、林鹿、老赵、兜帽人目前主要存在于文档与零散文案，没有“每个用户自己的关系状态”。

2. **异常与认知没有结构化累积**  
   玩家看到了“回响柱异常”“记录被改写”等内容，但系统没有记录“这个玩家目前已经知道到哪一步”。

3. **副本后果不会真正反哺元世界**  
   当前结算只更新 `user_progress` 和 `episode_outcomes`，不会改变玩家的元世界主线位置。

因此，`MetaWorldState` 的目标不是替代现有会话系统，而是补上一层**长期世界记忆**。

---

## 2. 非目标

本轮不做以下内容：

- 完整元世界可探索地图
- 元世界实时对话场景
- 大规模常驻 NPC 社会模拟
- 跨副本数值养成系统
- 多槽位世界存档
- 完整经济系统或记忆商店实现

也就是说，本轮重点是：**先把“世界会记住你做过什么”做出来。**

---

## 3. 总体架构

建议保留现有三层状态模型，并新增第四类状态：

### 3.1 现有状态

- `user_progress`  
  只回答“副本是否解锁、是否通关”

- `game_sessions.state_json`  
  只回答“当前这一局副本进行到哪里”

- `episode_outcomes`  
  只回答“某次结算结果是什么”

### 3.2 新增状态

- `meta_world_states.state_json`  
  回答“这个用户在回响之间到底处于什么主线位置”

这是一个典型的 **bounded context split**：

- `progress` = 产品可见解锁态
- `session` = 单局状态
- `outcome` = 历史结算记录
- `meta world` = 长期世界连续性

这四者不应互相替代。

---

## 4. 核心数据模型

## 4.1 顶层：`MetaWorldState`

建议新增以下 TypeScript 结构：

```ts
export interface MetaWorldState {
  userId: string;
  version: number;
  updatedAt: number;

  worldFlags: Record<string, boolean>;
  unlockedHubAreas: string[];

  persistentNpcStates: Record<string, PersistentNpcState>;
  archive: ArchiveLedgerState;
  anomalies: AnomalyLedgerState;
  cognition: PlayerCognitionState;
}
```

### 字段解释

- `userId`：归属用户
- `version`：为将来 JSON 迁移预留
- `worldFlags`：元世界范围内的布尔状态，例如是否已触发某个主线节点
- `unlockedHubAreas`：后续元世界 UI 区域解锁用
- `persistentNpcStates`：常驻 NPC 的长期关系状态
- `archive`：结算后沉淀的档案摘要
- `anomalies`：异常记录与强度变化
- `cognition`：玩家对真相理解到了哪一步

---

## 4.2 常驻 NPC：`PersistentNpcState`

```ts
export interface PersistentNpcState {
  npcId: string;
  trust: number;
  suspicion: number;
  affinityTags: string[];
  revealedTopics: string[];
  memorySummary: string;
  lastEpisodeId?: string;
  lastUpdatedAt: number;
}
```

### 设计原则

- `trust`：不是普通副本 NPC 的即时信任，而是跨副本累计的长期关系
- `suspicion`：保留“你被谁盯上了/谁不完全信你”的维度
- `affinityTags`：例如 `takes_you_seriously`、`withholds_truth`、`owes_you_answer`
- `revealedTopics`：控制同一主线话题是否已被打开
- `memorySummary`：摘要式记忆，而不是存无限对话日志

### 为什么不用完整对话历史

元世界关系需要持续，但不需要把所有逐字对话永久保存。  
对当前产品阶段，更合理的是：

- 副本内：保细节对话
- 元世界：保摘要与标签

这样既省 token，也更稳定。

---

## 4.3 档案层：`ArchiveLedgerState`

```ts
export interface ArchiveLedgerState {
  entries: ArchiveEntry[];
  unlockedEpisodeIds: string[];
}

export interface ArchiveEntry {
  id: string;
  episodeId: string;
  routeId: string;
  routeType: 'HE' | 'TE' | 'BE' | 'SE';
  title: string;
  summary: string;
  learnedTruths: string[];
  unlockedAt: number;
}
```

### 用途

- 让“档案馆”在系统层变成真实存在的数据
- 给玩家提供可回看的主线知识碎片
- 作为后续元世界对话的上下文来源

### 注意

档案摘要不是完整通关回放。  
它是“系统允许你带出副本的那部分结论”。  
这点可以反过来服务元叙事：档案本身也可能有“公开版”和“隐藏版”。

---

## 4.4 异常层：`AnomalyLedgerState`

```ts
export interface AnomalyLedgerState {
  tracks: Record<string, AnomalyTrack>;
}

export interface AnomalyTrack {
  id: string;
  level: number;
  firstSeenEpisodeId: string;
  lastSeenEpisodeId: string;
  notes: string[];
  confirmed: boolean;
}
```

### 第一批建议异常 ID

- `pillar_emotion_resonance`
- `record_rewrite_noise`
- `public_private_record_split`
- `silent_seventh_pillar`
- `vanished_returnees`

### 设计目的

异常不是单次剧情效果，而是需要在多个副本里重复出现、逐渐升级的“观察对象”。  
因此它必须有：

- 初次出现
- 最近出现
- 强度等级
- 是否被玩家正式确认

---

## 4.5 认知层：`PlayerCognitionState`

```ts
export interface PlayerCognitionState {
  nodes: Record<string, CognitionNodeState>;
}

export interface CognitionNodeState {
  id: string;
  level: 0 | 1 | 2 | 3;
  sourceEpisodeIds: string[];
  lastUpdatedAt: number;
}
```

### 推荐的认知节点

- `understands_pillars_feed_on_emotion`
- `doubts_revival_promise`
- `recognizes_records_are_rewritten`
- `understands_public_vs_hidden_versions`
- `suspects_maintainer_layer_exists`

### 为什么用等级而不是布尔值

因为“知道”不是一步到位的。

例如：

- `level 0`：完全未知
- `level 1`：注意到异常
- `level 2`：怀疑其背后有结构
- `level 3`：被证据明确确认

这样后续常驻 NPC 才能根据玩家的认知深度说不同的话，而不是非黑即白。

---

## 5. 存储设计

建议新增一张表，而不是把元世界状态塞进 `user_progress`。

### 5.1 新表

```sql
CREATE TABLE IF NOT EXISTS meta_world_states (
  user_id TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 5.2 为什么采用 JSON Blob

当前阶段优先考虑：

- 开发速度
- 结构弹性
- 低迁移成本

而不是复杂查询。

因为短期内元世界状态主要是：

- 读整块
- 写整块
- 在服务端做逻辑计算

不需要立即拆成多张关系表。

### 5.3 后续可拆表的候选

如果后面需要更强查询，再拆：

- `meta_npc_states`
- `meta_archive_entries`
- `meta_anomaly_tracks`
- `meta_cognition_nodes`

但第一版不需要。

---

## 6. 仓储与模块划分

建议新增目录：

```text
app/src/lib/meta-world/
  types.ts
  defaults.ts
  repo.ts
  effects.ts
  selectors.ts
```

### 模块职责

- `types.ts`：元世界类型定义
- `defaults.ts`：默认状态初始化
- `repo.ts`：SQLite 读写
- `effects.ts`：副本结算如何映射为元世界变更
- `selectors.ts`：给 UI/API 输出摘要

这样能避免把所有逻辑硬塞进 `progress/repo.ts`。

---

## 7. 与现有流程的接入点

## 7.1 `GET /api/auth/session`

当前已经返回：

- `user`
- `activeSession`
- `progress`

建议扩展为：

```json
{
  "user": {},
  "activeSession": {},
  "progress": {},
  "metaWorld": {
    "hubSummary": {},
    "cognitionSummary": {},
    "anomalySummary": {}
  }
}
```

目的：主页登录后就能看到“你在回响之间的状态”，而不只是能不能继续游戏。

## 7.2 `POST /api/submit`

这是最关键接点。

结算后除了：

- 更新 `user_progress`
- 写 `episode_outcomes`

还应：

- 读取 `MetaWorldState`
- 根据本次副本结算应用 `EpisodeMetaEffects`
- 回写 `meta_world_states`

## 7.3 `POST /api/start`

本阶段不强制改 API 形状，但建议追加可选字段：

- `metaPrelude?`
- `hubState?`

这样副本开始时可以根据元世界认知层注入不同开场旁白。

---

## 8. 副本到元世界的映射机制

建议为 `EpisodeConfig` 扩展一个可选字段：

```ts
export interface EpisodeMetaEffectRule {
  whenRouteIds?: string[];
  whenRouteTypes?: Array<'HE' | 'TE' | 'BE' | 'SE'>;
  setWorldFlags?: string[];
  unlockHubAreas?: string[];
  anomalyDeltas?: Array<{ id: string; delta: number; note: string; confirm?: boolean }>;
  cognitionDeltas?: Array<{ id: string; delta: 1 | 2 | 3 }>;
  persistentNpcDeltas?: Array<{
    npcId: string;
    trustDelta?: number;
    suspicionDelta?: number;
    addTags?: string[];
    revealTopics?: string[];
    memorySummaryAppend?: string;
  }>;
  archiveEntry?: {
    title: string;
    summary: string;
    learnedTruths: string[];
  };
}
```

并在 `EpisodeConfig` 中增加：

```ts
metaStateEffects?: EpisodeMetaEffectRule[];
```

### 这样做的好处

- 副本策划可以显式声明“这个副本对主线产生什么后果”
- 避免所有元世界逻辑都堆在 `/api/submit`
- 后续副本设计更可控

---

## 9. 现有副本的首批映射建议

## 9.1 EP01

### 写入内容

- 异常：`pillar_emotion_resonance +1`
- 认知：`understands_pillars_feed_on_emotion -> level 1`
- 阿寂关系：`trust +4`
- 档案：记录“第一次注意到回响柱会回应情绪波动”

### 产品效果

玩家第一次通关后，不只是“解锁 ep02”，还会明确感到元世界记住了这次异样。

## 9.2 EP02

### 写入内容

- 异常：`record_rewrite_noise +1`
- 认知：`recognizes_records_are_rewritten -> level 1`
- 阿寂关系：`trust +6`
- 档案：记录“同编号回执/记录被重写”的线索

## 9.3 EP03

### 写入内容

- 异常：`public_private_record_split +2`
- 认知：
  - `recognizes_records_are_rewritten -> level 2`
  - `understands_public_vs_hidden_versions -> level 1 or 2`
  - `suspects_maintainer_layer_exists -> level 1`
- 阿寂关系大幅推进
- 解锁元世界区域：如 `archive_annex`、`pillar07_perimeter`

---

## 10. UI 承载建议

第一阶段不做完整元世界地图，但至少要有三个可见出口。

## 10.1 首页 / 大厅

新增“回响之间近况”区块：

- 阿寂态度摘要
- 最近异常
- 最近新增档案
- 当前主线认知层级

## 10.2 结算页

在副本结算后增加：

- `【档案更新】`
- `【异常记录】`
- `【回响之间有人记住了你这次的选择】`

## 10.3 后续 Hub 页

中期可以补：

- 常驻角色卡
- 档案馆
- 异常墙
- 回响柱观察记录

---

## 11. 失败模式与边界

## 11.1 失败模式

### 失败模式 A：元世界状态写得太满

风险：每个副本都往元世界塞一堆状态，最后没人看得懂。

对策：  
只保留四类长期价值：

- 关系
- 异常
- 认知
- 档案

### 失败模式 B：元世界变成另一个数值养成层

风险：用户开始刷信任、刷异常等级，而不是体验故事。

对策：  
元世界状态用于**解释世界连续性**，而不是制造强数值驱动。

### 失败模式 C：副本后果写入与文案脱节

风险：文案说玩家意识到了什么，系统却没有记录。

对策：  
每个副本必须显式配置 `metaStateEffects`。

---

## 12. 分阶段实施建议

## Phase 1：先打基础存储

- 新增 `meta_world_states` 表
- 新增 repo / defaults / selectors
- `GET /api/auth/session` 支持返回 metaWorld 摘要

## Phase 2：接入结算写回

- `/api/submit` 应用 `metaStateEffects`
- EP01 / EP02 / EP03 全部补配置

## Phase 3：做用户可感知 UI

- 首页显示元世界摘要
- 结算页显示档案与异常新增

## Phase 4：做元世界角色层

- 阿寂 / 林鹿 / 老赵 / 兜帽人正式数据化
- 后续开放 Hub 对话

---

## 13. 设计结论

这套设计的核心不是“多存一个 JSON”，而是把《无尽回响》的真正产品形态补完整：

- `user_progress` 解决“能玩什么”
- `game_session` 解决“这一局在发生什么”
- `episode_outcomes` 解决“你曾经打出了什么结果”
- `meta_world_state` 解决“这个世界究竟记住了你什么”

只有第四层成立之后，“多副本不同世界 + 同一元世界主线”才会从文案设定变成产品能力。
