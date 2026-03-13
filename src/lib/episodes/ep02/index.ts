import { EpisodeConfig } from '../../types';
import { locations } from './locations';
import { npcs } from './npcs';
import { clues } from './clues';
import { items } from './items';
import { routes } from './routes';

export const episode02: EpisodeConfig = {
  id: 'ep02',
  name: '迟到的回执',
  description:
    '灰石港靠驿站、公证和代投维持秩序，也靠“晚半步”吞掉最弱的人。驿站掌柜莉娜被控延迟回执致人病亡，你要在两天审理窗口内判清：程序该先保体面，还是先为人命让路？',
  difficulty: 2,
  maxRounds: 25,
  startLocationId: 'harbor_gate',
  locations,
  npcs,
  clues,
  items,
  routes,
  identity: {
    mode: 'legacy_profession',
    allowReroll: false,
    pool: [],
  },
  socialLeadRules: [
    {
      id: 'lead_guardianship_chain',
      npcIds: ['azhe', 'sara', 'lina'],
      leadFlag: 'lead_guardianship_chain',
      minTrust: 45,
      keywords: ['监护', '债主', '代监护', '家产', '孤儿', '孩子'],
      unlockedHint:
        '【调查方向更新】你确认“监护权围猎”是真实威胁。后续证词若不覆盖这条链，莉娜动机会被误读成纯违规。',
      requiresClues: ['A2'],
    },
    {
      id: 'lead_private_route',
      npcIds: ['weide', 'sara', 'azhe'],
      leadFlag: 'lead_private_route',
      minTrust: 52,
      keywords: ['私驿', '小船', '绕登记', '暗道', '后港', '路线'],
      unlockedHint:
        '【调查方向更新】你拿到了私驿绕行的有效线头。码头账房地板夹层与旧仓库路线现在值得深挖。',
    },
    {
      id: 'lead_warehouse_key',
      npcIds: ['weide', 'sara', 'lina'],
      leadFlag: 'lead_warehouse_key',
      minTrust: 60,
      keywords: ['仓库', '铁箱', '钥匙', '封包', '交接暗号', '箱锁'],
      unlockedHint:
        '【调查方向更新】你确认旧仓库铁箱有专门交接钥匙。现在去仓库排查，才可能拿到关键实物。',
      requiresFlags: ['lead_private_route'],
    },
    {
      id: 'lead_notary_fee_code',
      npcIds: ['noel', 'matthew', 'weide'],
      leadFlag: 'lead_notary_fee_code',
      minTrust: 58,
      keywords: ['手续费', '费码', '代投', '公证账', '暗账', '科目'],
      unlockedHint:
        '【调查方向更新】你摸到了公证账里的费码入口。没有这条索引，去档案室也很难直接碰到暗账。',
      requiresClues: ['B2'],
    },
    {
      id: 'lead_old_case_index',
      npcIds: ['noel', 'matthew', 'sara'],
      leadFlag: 'lead_old_case_index',
      minTrust: 62,
      keywords: ['旧案', '卷宗', '索引', '七起', '案号', '年份'],
      unlockedHint:
        '【调查方向更新】你拿到旧案索引线。公证所里那批“晚到重组”卷宗可以定向复核了。',
      requiresFlags: ['can_search_notary_archive'],
      requiresClues: ['B3'],
    },
  ],
  socialEligibility: {
    minimumUniqueContacts: 4,
    mustIncludeNpcIds: ['matthew'],
    oneOfNpcIds: ['weide', 'noel'],
    minimumNpcLeadCount: 3,
  },
  pacing: {
    mode: 'realtime_day',
    dayDurationSec: 3600,
    totalDays: 2,
    slotLabels: ['清晨', '上午', '正午', '午后', '傍晚', '夜间'],
    heartbeatIntervalSec: 5,
    heartbeatTimeoutSec: 12,
    llmTimeMultiplier: 0.5,
  },
  progressTracks: [
    {
      routeId: 'he_lantern_unextinguished',
      routeType: 'HE',
      name: '灯未熄',
      checkpoints: [
        { id: 'he_a1', label: '驿站日志涂改', weight: 15, trigger: { type: 'clue', key: 'A1' } },
        { id: 'he_b1', label: '监护权风险', weight: 20, trigger: { type: 'clue', key: 'B1' } },
        { id: 'he_b2', label: '晚送两日交易', weight: 25, trigger: { type: 'clue', key: 'B2' } },
        {
          id: 'he_guardianship',
          label: '保护阿哲监护权',
          weight: 20,
          trigger: { type: 'flag', key: 'protected_azhe_guardianship' },
        },
        {
          id: 'he_proxy',
          label: '揭开代投网络',
          weight: 20,
          trigger: { type: 'flag', key: 'exposed_proxy_network' },
        },
      ],
    },
    {
      routeId: 'te_scale_and_debt',
      routeType: 'TE',
      name: '秤与债',
      checkpoints: [
        { id: 'te_b2', label: '晚送两日交易', weight: 15, trigger: { type: 'clue', key: 'B2' } },
        { id: 'te_c1', label: '同编号双回执', weight: 30, trigger: { type: 'clue', key: 'C1' } },
        { id: 'te_c2', label: '代投暗账', weight: 25, trigger: { type: 'clue', key: 'C2' } },
        { id: 'te_c4', label: '七起旧案', weight: 30, trigger: { type: 'clue', key: 'C4' } },
      ],
    },
    {
      routeId: 'se_duplicate_night',
      routeType: 'SE',
      name: '同编号之夜',
      checkpoints: [
        { id: 'se_c1', label: '同编号双回执', weight: 45, trigger: { type: 'clue', key: 'C1' } },
        { id: 'se_c3', label: '私驿路线图', weight: 25, trigger: { type: 'clue', key: 'C3' } },
        {
          id: 'se_private_route',
          label: '确认私驿路线',
          weight: 15,
          trigger: { type: 'flag', key: 'found_private_route' },
        },
        {
          id: 'se_notary',
          label: '公证档案权限',
          weight: 15,
          trigger: { type: 'flag', key: 'can_search_notary_archive' },
        },
      ],
    },
    {
      routeId: 'be_procedure_only',
      routeType: 'BE',
      name: '按章定罪',
      checkpoints: [],
    },
  ],
  caseFacts: `## 案件基本事实（所有镇民公认）
- 抚恤回执确实发生了延迟
- 回执曾由驿站掌柜莉娜暂存并签收
- 乔安在等待抚恤期间病故，留下未成年儿子阿哲
- 镇司法官马修将在两天审理窗口结束时完成初审定性
- 港口存在民间代投与私驿传递网络
- 镇上多数人已经默认“先把责任挂到最后经手的人身上”`,
  canonicalFacts: [
    '莉娜确实延迟过回执，这是不可否认的事实',
    '乔安已经病故，阿哲是未成年人并面临监护与债务压力',
    '马修是镇司法官，不是反派，也不是替罪羊',
    '案件冲突核心是人情、公义与程序的先后次序',
    '本案完整调查窗口固定为两天实时制',
    '灰石港会优先寻找一个能让全镇继续过日子的结论，而不一定是真相本身',
  ],
  civilizationFrame: {
    civilizationSlice: '一个依赖文书、公证、驿站和时间差维持运转的基层制度社会',
    philosophicalQuestion: '守法是否等于公道；违规救人是否仍然必须承担制度之罪',
    institutionalCruelty: [
      '程序先把最后经手的人钉在责任链表层',
      '时间差足以杀人，却极易被解释成正常流程损耗',
      '代投、公证、私驿把延迟变成一种可收费、可分润的秩序业务',
    ],
    historicalShadow: [
      '灰石港长期依赖代投、私驿和民间担保补足制度效率',
      '这些补丁后来反过来长成吃时间差的灰色网络',
      '乔安不是唯一被晚到重组害死的人，只是这次终于有人死到无法继续被当成个例',
    ],
    metaNarrativeYield: [
      '记录可以不改事实本身，只改结果的可见版本',
      '同一事件可以拥有多个编号、多个可被公开的解释',
      '阿寂第一次不再只是旁观，而开始承认结局可能被写过',
    ],
    afterPlayerLeaves: [
      {
        routeType: 'HE',
        outcome: [
          '莉娜保住位置，阿哲保住家',
          '代投链只被切断一部分，乔安的死亡仍无法被追回',
          '灰石港第一次为“程序伤人”支付了局部纠偏代价',
        ],
      },
      {
        routeType: 'TE',
        outcome: [
          '制度开始纠偏，关键证人与中间节点先承受反噬',
          '港口会先更痛、更乱，而不是立刻更好',
          '玩家会明确感到：把结构拉出来，并不是免费的正义',
        ],
      },
      {
        routeType: 'SE',
        outcome: [
          '港口短暂进入重审与冻结状态',
          '玩家第一次把制度作弊升级成记录作弊',
          '灰石港从案件现场升级为主线里“版本被预写”的硬证据场',
        ],
      },
      {
        routeType: 'BE',
        outcome: [
          '莉娜成为最后一环替罪者',
          '真正靠时间差吃饭的人继续活下去',
          '灰石港恢复运转，而这种平静本身就是系统最可怕的面目',
        ],
      },
    ],
  },
  culturalProfile: {
    valueCore: ['人情与公义', '家计与责任', '面子与乡里评价'],
    expressionStyle: 'intense',
    taboo: ['现代网络梗', '欧美法庭腔盘问', '个人英雄主义宣言'],
  },
  metaNarrativeHooks: {
    postSettlement: [
      '阿寂盯着你手里的结算纸，沉默了很久。',
      '“有些结局，不是你选错了，是有人替你写好了。”',
      '回响柱忽然发出一声比以往更尖的异响，像是某段记录被强行改写。',
    ],
  },
  metaStateEffects: [
    {
      whenRouteTypes: ['HE', 'TE', 'SE'],
      anomalyDeltas: [
        {
          id: 'record_rewrite_noise',
          delta: 1,
          note: '回执与编号异常让你第一次怀疑，某些结局在公开前就被修过。',
          confirm: false,
        },
      ],
      cognitionDeltas: [
        { id: 'recognizes_records_are_rewritten', level: 1 },
      ],
      persistentNpcDeltas: [
        {
          npcId: 'aji',
          trustDelta: 6,
          revealTopics: ['rewritten_endings'],
          addTags: ['takes_you_seriously'],
          memorySummaryAppend: '他开始把你视为能真正看见记录裂缝的人。',
        },
      ],
      archiveEntry: {
        title: '边港回执异常档案',
        summary: '你带回了关于同编号回执与记录异响的第一批明确证据。',
        learnedTruths: ['有些结局在公开之前，可能已经被谁改写过。'],
      },
    },
    {
      whenRouteTypes: ['BE'],
      anomalyDeltas: [
        {
          id: 'record_rewrite_noise',
          delta: 1,
          note: '程序照常闭环，但异响反而更像有人在暗处修正结果。',
        },
      ],
      cognitionDeltas: [
        { id: 'recognizes_records_are_rewritten', level: 1 },
      ],
      persistentNpcDeltas: [
        {
          npcId: 'aji',
          trustDelta: 3,
          suspicionDelta: 1,
          memorySummaryAppend: '他看见你开始怀疑结局本身是否可靠。',
        },
      ],
      archiveEntry: {
        title: '边港程序定性残卷',
        summary: '即便你按程序完成裁断，记录层的不协调感依然没有消失。',
        learnedTruths: ['程序正确，不代表记录真实。'],
      },
    },
  ],
  evaluation: {
    truthReference: `### 第一层：表层事实
莉娜确实延迟了回执，形式上违规成立。

### 第二层：动机层
莉娜延迟并非谋私，而是为阿哲争取时间，避免债主在抚恤未到账前抢夺临时监护与财产代管。

### 第三层：结构层
镇公证人与代投网络长期利用回执时间差牟利，通过“晚到-重组-手续费”形成稳定链条。

### 第四层：隐层
存在同编号双回执，暗示不仅个案流程被操控，连记录系统本身也可能被篡改。`,
    signalDefinitions: [
      { id: 'confirmed_lina_delay', description: '是否确认莉娜确实延迟了回执' },
      { id: 'proved_lina_non_profit', description: '是否证明莉娜延迟行为并非为个人牟利' },
      { id: 'protected_azhe_guardianship', description: '是否明确保护阿哲监护与家产不被债主围猎' },
      { id: 'exposed_proxy_network', description: '是否揭示代投网络利用时间差牟利' },
      { id: 'exposed_notary_ring', description: '是否揭示公证与代投的结构性勾连' },
      { id: 'suspects_tampered_record', description: '是否指出同编号回执反映记录层被改写的可能' },
    ],
    summaryInstruction: '总结里要体现“错的人未必坏，守法的人也可能伤人”的价值张力。',
  },
  openingNarrative: `雨刚停，灰石港的栈桥还在滴水。

你刚靠岸，就看见公告栏前已经完成了第一轮审判。讣告、收文登记和催债告示被钉在同一块木板上，像故意把“死人”“欠债”和“责任人”连成一条线。

人群口风很齐：
“掌柜害死人。”
“人都没了，还查什么。”

审理厅门口，莉娜被两名差役押着站在风里。她没有喊冤，只是把背挺得很直，像已经准备好把所有骂名一并扛下。

司法官马修敲响木槌：
“从现在起，两天内给出完整结论。若无新证据，窗口结束即按现有链条定性。”

你很快意识到，这座港镇的第一反应不是追真相，而是先找一个能让日子继续转下去的责任人。`,
  taskBriefing: `【任务】在审理时限结束前（2 天内，约 120 分钟）查清“迟到回执”案的责任链，并提交你的裁断。

你可以：
• 前往不同地点调查
• 与当事人和证人对话
• 搜查账本、回执、旧档案
• 随时提交你的推理

你需要尽快建立三条线：
• 监护链：阿哲为什么会成为被围猎的对象
• 私驿链：谁在制造“晚半步”的时间差
• 程序链：谁把这种延迟写成了可以反复发生的正常流程

本副本采用实时计时：对话、移动、搜查都消耗“现实时间”。查看线索和地图不额外消耗动作成本。`,
};
