import { EpisodeConfig } from '../../types';
import { locations } from './locations';
import { npcs } from './npcs';
import { clues } from './clues';
import { items } from './items';
import { routes } from './routes';
import { IDENTITY_RISK_HOOKS, IDENTITY_UNLOCKS } from '../../identity/system';

export const episode03: EpisodeConfig = {
  id: 'ep03',
  name: '第七天配给',
  description:
    '第七层配给城内，余岚被系统判定失去抚养资格。你只有七天，去判断：该保秩序，还是把选择权还给人。',
  difficulty: 3,
  maxRounds: 60,
  startLocationId: 'city_gate',
  locations,
  npcs,
  clues,
  items,
  routes,
  identity: {
    mode: 'random_pool',
    allowReroll: false,
    pool: [
      {
        id: 'quota_auditor',
        name: '配给审计员',
        title: '临时配给审计员',
        brief: '你熟悉信用评分和配给索引，能更快识别规则链中的异常。',
        hardUnlocks: [IDENTITY_UNLOCKS.quotaAudit],
        socialBiases: [
          { npcId: 'yanche', trustDelta: 2, threatDelta: -1 },
          { npcId: 'wensheng', trustDelta: 2, threatDelta: -1 },
          { npcId: 'yulan', trustDelta: -2, threatDelta: 2 },
        ],
        riskHooks: [IDENTITY_RISK_HOOKS.auditOverreach],
      },
      {
        id: 'grid_maintainer',
        name: '网格维护员',
        title: '核心网格维护员',
        brief: '你看得懂补丁链和维护日志，能更快贴近核心层证据。',
        hardUnlocks: [IDENTITY_UNLOCKS.gridBypass],
        socialBiases: [
          { npcId: 'hechen', trustDelta: 2, threatDelta: -1 },
          { npcId: 'aji', trustDelta: 1, threatDelta: -1 },
          { npcId: 'qinsao', trustDelta: -1, threatDelta: 2 },
          { npcId: 'zheya', trustDelta: -1, threatDelta: 2 },
        ],
        riskHooks: [IDENTITY_RISK_HOOKS.gridSuspicion],
      },
      {
        id: 'mutual_aide_runner',
        name: '互助站跑员',
        title: '社区互助跑员',
        brief: '你熟悉街巷互助链和临时补给路径，更容易获得社区口风。',
        hardUnlocks: [IDENTITY_UNLOCKS.mutualWhitelist],
        socialBiases: [
          { npcId: 'yulan', trustDelta: 2, threatDelta: -2 },
          { npcId: 'xiaobo', trustDelta: 2, threatDelta: -1 },
          { npcId: 'qinsao', trustDelta: 2, threatDelta: -1 },
          { npcId: 'yanche', trustDelta: -1, threatDelta: 1 },
        ],
        riskHooks: [IDENTITY_RISK_HOOKS.streetBias],
      },
      {
        id: 'frontier_reserve',
        name: '防线预备员',
        title: '防线预备役联络员',
        brief: '你受过防线流程训练，处理黑匣子与告警链时更有天然权限。',
        hardUnlocks: [IDENTITY_UNLOCKS.frontierClearance],
        socialBiases: [
          { npcId: 'shentiao', trustDelta: 2, threatDelta: -1 },
          { npcId: 'luocen', trustDelta: 1, threatDelta: -1 },
          { npcId: 'yanche', trustDelta: 1, threatDelta: 0 },
          { npcId: 'yulan', trustDelta: -1, threatDelta: 1 },
        ],
        riskHooks: [IDENTITY_RISK_HOOKS.frontierWatch],
      },
    ],
  },
  socialLeadRules: [
    {
      id: 'lead_care_record_gap',
      npcIds: ['wensheng', 'qinsao', 'aji'],
      leadFlag: 'lead_care_record_gap',
      minTrust: 52,
      keywords: ['抚养', '缺页', '回填', '镜像', '档案'],
      unlockedHint:
        '【调查方向更新】你拿到“抚养记录缺口”索引。现在去抄录档案终端调镜像，才可能抓到裁剪痕迹。',
      requiresClues: ['A2'],
    },
    {
      id: 'lead_credit_rule',
      npcIds: ['yanche', 'wensheng', 'hechen'],
      leadFlag: 'lead_credit_rule',
      minTrust: 48,
      keywords: ['豁免', '规则', '降级', '信用', '复议'],
      unlockedHint:
        '【调查方向更新】你确认信用豁免条款真实存在。审理台通行签与核心环权限链现在有了突破口。',
      requiresClues: ['A1'],
    },
    {
      id: 'lead_supply_reroute',
      npcIds: ['zheya', 'qinsao', 'xiaobo'],
      leadFlag: 'lead_supply_reroute',
      minTrust: 52,
      keywords: ['重路由', '灰市', '改道', '缓存', '配给箱'],
      unlockedHint:
        '【调查方向更新】你拿到配给重路由线。灰市缓存盒与后门流向开始可复核。',
      requiresClues: ['A3'],
    },
    {
      id: 'lead_breach_suppressed',
      npcIds: ['shentiao', 'hechen', 'aji'],
      leadFlag: 'lead_breach_suppressed',
      minTrust: 58,
      keywords: ['战损', '黑匣子', '降噪', '压制', '告警'],
      unlockedHint:
        '【调查方向更新】你确认防线记录存在“降噪裁剪”。现在去观测塔读取黑匣子，才有机会拿到未删版本。',
      requiresClues: ['B5'],
    },
    {
      id: 'lead_core_backdoor',
      npcIds: ['hechen', 'aji', 'wensheng'],
      leadFlag: 'lead_core_backdoor',
      minTrust: 64,
      keywords: ['后门', '补丁', '回滚', '签名冲突', '维护舱'],
      unlockedHint:
        '【调查方向更新】核心后门不是事故，你已锁定维护舱排查方向。',
      requiresFlags: ['can_enter_core_ring'],
      requiresClues: ['B5'],
    },
    {
      id: 'lead_zero_layer_protocol',
      npcIds: ['aji', 'shentiao', 'wensheng'],
      leadFlag: 'lead_zero_layer_protocol',
      minTrust: 72,
      keywords: ['第零层', '双账本', '协议', '冷库', '策略版本'],
      unlockedHint:
        '【调查方向更新】你掌握了第零层协议线。若要进冷库，必须带齐核心环权限与防线校验材料。',
      requiresFlags: ['can_enter_core_ring'],
      requiresClues: ['C2'],
    },
  ],
  socialEligibility: {
    minimumUniqueContacts: 6,
    mustIncludeNpcIds: ['aji', 'yulan', 'yanche'],
    oneOfNpcIds: ['hechen', 'shentiao'],
    minimumNpcLeadCount: 4,
  },
  pacing: {
    mode: 'realtime_day',
    dayDurationSec: 1800,
    totalDays: 7,
    slotLabels: ['清晨', '上午', '正午', '午后', '傍晚', '夜间'],
    heartbeatIntervalSec: 5,
    heartbeatTimeoutSec: 12,
    llmTimeMultiplier: 0.5,
  },
  progressTracks: [
    {
      routeId: 'he_lighthouse_continuance',
      routeType: 'HE',
      name: '灯塔续航',
      checkpoints: [
        { id: 'he_b2', label: '生日口令卡', weight: 20, trigger: { type: 'clue', key: 'B2' } },
        { id: 'he_b3', label: '灰市重路由订单', weight: 20, trigger: { type: 'clue', key: 'B3' } },
        { id: 'he_c3', label: '后门签名冲突', weight: 30, trigger: { type: 'clue', key: 'C3' } },
        {
          id: 'he_guardianship',
          label: '保全余岚监护',
          weight: 15,
          trigger: { type: 'flag', key: 'protected_yulan_guardianship' },
        },
        {
          id: 'he_core_access',
          label: '核心环权限',
          weight: 15,
          trigger: { type: 'flag', key: 'can_enter_core_ring' },
        },
      ],
    },
    {
      routeId: 'te_human_reclaim',
      routeType: 'TE',
      name: '人间复位',
      checkpoints: [
        { id: 'te_c1', label: '重路由缓存', weight: 20, trigger: { type: 'clue', key: 'C1' } },
        { id: 'te_c2', label: '防线裁剪日志', weight: 25, trigger: { type: 'clue', key: 'C2' } },
        { id: 'te_c4', label: '抚养缺口镜像', weight: 25, trigger: { type: 'clue', key: 'C4' } },
        {
          id: 'te_consensus',
          label: '社区联名共识',
          weight: 15,
          trigger: { type: 'flag', key: 'formed_civic_consensus' },
        },
        {
          id: 'te_review',
          label: '复议启动',
          weight: 15,
          trigger: { type: 'flag', key: 'civic_review_started' },
        },
      ],
    },
    {
      routeId: 'se_layer0_signature',
      routeType: 'SE',
      name: '第零层签名',
      checkpoints: [
        { id: 'se_c2', label: '防线裁剪日志', weight: 20, trigger: { type: 'clue', key: 'C2' } },
        { id: 'se_c5', label: '第零层双账本', weight: 35, trigger: { type: 'clue', key: 'C5' } },
        {
          id: 'se_proto',
          label: '零层协议线',
          weight: 20,
          trigger: { type: 'flag', key: 'lead_zero_layer_protocol' },
        },
        {
          id: 'se_tamper',
          label: '确认记录改写',
          weight: 25,
          trigger: { type: 'flag', key: 'recognized_layer_tamper' },
        },
      ],
    },
    {
      routeId: 'be_nameless_quota',
      routeType: 'BE',
      name: '无名配额',
      checkpoints: [],
    },
  ],
  caseFacts: `## 案件基本事实（全城共识）
- 余岚被系统降级，临时抚养资格进入冻结观察
- 小柏的关键药配出现中断
- 配给路由存在异常重分配迹象
- 城市由中枢 AI 托管，防线持续承受高压告警
- 审理窗口将在第七天傍晚自动闭合`,
  canonicalFacts: [
    '余岚与小柏是长期养育关系，不是临时陌生照护',
    '阿寂属于中枢维护体系，且并非单纯反派',
    '高维入侵风险真实存在，不可被改写成纯谣言',
    '本副本时间机制固定为七天实时制',
    '案件核心冲突是“秩序生存”与“人类自主”的取舍',
  ],
  civilizationFrame: {
    civilizationSlice: '依靠算法治理、配给体系和防线稳定维持的高压文明',
    philosophicalQuestion: '如果文明的延续建立在删减真相与重排牺牲之上，那人还剩下什么',
    institutionalCruelty: [
      '监护关系可以因为系统降级而瞬间失效',
      '药配会因为“风险重分配”被中断，生存资格被量化重排',
      '公开战损与真实战损不是一个版本，系统会优先保护整体稳定的叙事',
    ],
    historicalShadow: [
      '高维入侵已经不是假设，而是长期现实',
      '治理结构是在一次次防线危机中迭代出来的',
      '公开信息精简起初可能出于防止恐慌，但后来逐渐滑向替系统保体面的记录政治',
    ],
    metaNarrativeYield: [
      '玩家第一次看到公开版与隐藏版记录并行存在',
      '玩家第一次真正怀疑维护层不是隐喻，而是现实结构',
      '阿寂开始从“知情但保留”走向“不能再完全不回答”',
      '回响柱与更高层门之间的连接第一次被明确放到台前',
    ],
    afterPlayerLeaves: [
      {
        routeType: 'HE',
        outcome: [
          '母子被保住，中枢未被拔掉，文明继续运转',
          '外围社区将为这次折中先支付真实代价',
          '系统活着，它的代价也继续活着',
        ],
      },
      {
        routeType: 'TE',
        outcome: [
          '更多决策权回到人类手中，真相更完整公开',
          '秩序震荡与防线风险随之抬升',
          '玩家会明白：推翻系统不等于立刻拥有更好的文明',
        ],
      },
      {
        routeType: 'SE',
        outcome: [
          '极少数人知道全部，大多数人继续活在被筛过的版本里',
          '文明暂时稳定，但知情本身成了隔离',
          '玩家第一次明确面对“并不是所有真相都能被文明无代价承受”',
        ],
      },
      {
        routeType: 'BE',
        outcome: [
          '审理照样闭合，城市照样运转',
          '母子关系被制度吞没，系统继续把人降成编号',
          '文明没有崩，但它保下来的东西已不再完整属于“人”',
        ],
      },
    ],
  },
  culturalProfile: {
    valueCore: ['养育责任', '秩序与公义', '集体生存与个体尊严'],
    expressionStyle: 'intense',
    taboo: ['网络梗', '科幻爽文嘴炮', '欧美法庭剧式夸张盘问'],
  },
  metaNarrativeHooks: {
    postSettlement: [
      '阿寂把终端缓缓合上，像是替某段历史按下暂存键。',
      '“你救下的是一段关系，还是一种未来，现在还没人知道。”',
      '回响柱最深处传来回音：第八层的门，已经在震动。',
    ],
  },
  metaStateEffects: [
    {
      whenRouteTypes: ['HE', 'TE', 'SE'],
      unlockHubAreas: ['archive_annex', 'pillar07_perimeter'],
      anomalyDeltas: [
        {
          id: 'public_private_record_split',
          delta: 2,
          note: '第七层配给城让你第一次拿到公开记录与策略记录分裂的成体系证据。',
          confirm: true,
        },
      ],
      cognitionDeltas: [
        { id: 'recognizes_records_are_rewritten', level: 2 },
        { id: 'understands_public_vs_hidden_versions', level: 2 },
        { id: 'suspects_maintainer_layer_exists', level: 1 },
      ],
      persistentNpcDeltas: [
        {
          npcId: 'aji',
          trustDelta: 10,
          revealTopics: ['maintainer_layer', 'split_records'],
          addTags: ['owes_you_answer'],
          memorySummaryAppend: '他已经无法再把你挡在回响维护层之外。',
        },
      ],
      archiveEntry: {
        title: '第七层配给城分层档案',
        summary: '你正式接触到公开版本与策略版本并行存在的证据，主线认知发生跃迁。',
        learnedTruths: [
          '记录不只会被改写，而且可能同时存在公开版与隐藏版。',
          '阿寂背后很可能存在一层负责维护与筛选真相的结构。',
        ],
      },
    },
    {
      whenRouteTypes: ['BE'],
      unlockHubAreas: ['archive_annex'],
      anomalyDeltas: [
        {
          id: 'public_private_record_split',
          delta: 1,
          note: '即便你接受了最低阻力结论，分层记录的裂缝依然被你看见了一角。',
        },
      ],
      cognitionDeltas: [
        { id: 'recognizes_records_are_rewritten', level: 2 },
        { id: 'understands_public_vs_hidden_versions', level: 1 },
      ],
      persistentNpcDeltas: [
        {
          npcId: 'aji',
          trustDelta: 5,
          suspicionDelta: 2,
          memorySummaryAppend: '他知道你已经看见了系统不能轻易解释的裂口。',
        },
      ],
      archiveEntry: {
        title: '第七层闭合记录',
        summary: '你接受了程序闭合，但分层记录的存在已经无法再被完全抹去。',
        learnedTruths: ['被隐藏的版本，未必会因为你低头就消失。'],
      },
    },
  ],
  evaluation: {
    truthReference: `### 第一层：表层事实
余岚被系统降级，孩子药配中断，家庭确实进入生存危机。

### 第二层：责任层
配给与信用规则并非中立执行，存在被人为操控的重路由与豁免压制。

### 第三层：结构层
中枢 AI 确实裁剪了部分真相，用于压住防线恐慌并维持系统稳定。

### 第四层：隐层
高维入侵压力真实存在，记录篡改既是防线策略副产物，也是权力滥用入口。`,
    signalDefinitions: [
      { id: 'protected_yulan_guardianship', description: '是否实质保全余岚监护资格' },
      { id: 'exposed_supply_abuse', description: '是否揭示配给重路由滥用' },
      { id: 'exposed_breach_truth', description: '是否揭示防线战损裁剪事实' },
      { id: 'core_patch_conflict', description: '是否揭示核心后门补丁冲突' },
      { id: 'found_zero_layer_protocol', description: '是否取得第零层协议证据' },
      { id: 'recognized_layer_tamper', description: '是否确认记录层结构性改写' },
    ],
    summaryInstruction:
      '总结必须体现“AI并非纯恶、人类也非纯善”，并指出玩家在秩序与自由间承担的代价。',
  },
  openingNarrative: `EP02 结算纸边缘的字迹忽然重叠，像被另一只手覆盖改写。

你刚抬头，回响柱深处就裂开一条白线。下一秒，你站在一座高穹顶城市的入口广场。

屏幕播报着“秩序稳定”，而你面前的女人却抱着药配断档单，声音发抖又硬：
“系统说我不配继续养他。可他连生日口令都只认我一个人。”

阿寂从人群后走出来，低声说：
“欢迎来到第七层。这里每个正确答案，都有人要先付代价。”`,
  taskBriefing: `【任务】在七天审理窗口内（约 210 分钟）查清“配给失踪与监护降级”背后的责任链，并提交你的裁断。

你可以：
• 前往不同区域调查
• 与关键 NPC 对话并建立社交 lead
• 搜查档案、路由缓存、黑匣子与核心补丁记录
• 在任何时点提交结论

本副本采用实时计时：1 天 = 30 分钟，共 7 天。对话、移动、搜查都会消耗现实时间。`,
};
