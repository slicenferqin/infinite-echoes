import { EpisodeConfig } from '../../types';
import { locations } from './locations';
import { npcs } from './npcs';
import { clues } from './clues';
import { items } from './items';
import { routes } from './routes';
import { IDENTITY_RISK_HOOKS, IDENTITY_UNLOCKS } from '../../identity/system';

export const episode01: EpisodeConfig = {
  id: 'ep01',
  name: '沉默的铁匠铺',
  description:
    '鸦石村先用口风和体面把人定了罪，审判才准备到场。行商死在铁匠铺门前，铁匠汉克被捕却一言不发。你只有一天时间，去和一个已经完成先行定性的乡土共同体抢真相。',
  difficulty: 1,
  maxRounds: 30,
  startLocationId: 'bridge',
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
        id: 'miner_hand',
        name: '矿工',
        title: '矿工前手',
        brief: '你熟悉矿道脚印与工友口风，能更快把散乱传闻拼成方向。',
        hardUnlocks: [IDENTITY_UNLOCKS.minerBackdoor],
        socialBiases: [
          { npcId: 'gareth', trustDelta: 2, threatDelta: -2 },
          { npcId: 'martha', trustDelta: 1, threatDelta: -1 },
          { npcId: 'edmond', trustDelta: -1, threatDelta: 3 },
        ],
        riskHooks: [IDENTITY_RISK_HOOKS.edmondPressure],
      },
      {
        id: 'tavern_runner',
        name: '酒馆伙计',
        title: '醉鸦亭跑堂',
        brief: '你对赌桌、欠账和酒馆夜谈极敏感，擅长从细枝末节抓破绽。',
        hardUnlocks: [IDENTITY_UNLOCKS.tavernCards],
        socialBiases: [
          { npcId: 'martha', trustDelta: 2, threatDelta: -1 },
          { npcId: 'renn', trustDelta: 1, threatDelta: -1 },
          { npcId: 'nora', trustDelta: -2, threatDelta: 2 },
        ],
        riskHooks: [IDENTITY_RISK_HOOKS.noraDistrust],
      },
      {
        id: 'clinic_assistant',
        name: '村医帮手',
        title: '诊所见习助理',
        brief: '你读得懂伤情和病历缩写，能把“情绪争辩”拉回事实链。',
        hardUnlocks: [IDENTITY_UNLOCKS.clinicRecords],
        socialBiases: [
          { npcId: 'mila', trustDelta: 2, threatDelta: -2 },
          { npcId: 'hank', trustDelta: 1, threatDelta: -1 },
          { npcId: 'gareth', trustDelta: -1, threatDelta: 1 },
        ],
        riskHooks: [IDENTITY_RISK_HOOKS.minersSkeptic],
      },
      {
        id: 'village_clerk',
        name: '村务文书',
        title: '临时村务文书',
        brief: '你熟悉文书和手续流，接近宅邸文档时更容易抓住要点。',
        hardUnlocks: [IDENTITY_UNLOCKS.clerkDocPath],
        socialBiases: [
          { npcId: 'edmond', trustDelta: 1, threatDelta: -1 },
          { npcId: 'gareth', trustDelta: -2, threatDelta: 2 },
          { npcId: 'nora', trustDelta: -2, threatDelta: 1 },
        ],
        riskHooks: [IDENTITY_RISK_HOOKS.bureaucratBacklash],
      },
    ],
  },
  socialLeadRules: [
    {
      id: 'lead_renn_shoesize',
      npcIds: ['martha', 'renn', 'gareth'],
      leadFlag: 'lead_renn_shoesize',
      minTrust: 45,
      keywords: ['脚印', '鞋', '后门', '泥地', '鞋码', '夜里'],
      unlockedHint:
        '【调查方向更新】你意识到后门脚印并非汉克体型。现在去铁匠铺后门细查，才有意义。',
    },
    {
      id: 'lead_renn_room',
      npcIds: ['edmond', 'renn', 'nora'],
      leadFlag: 'lead_renn_room',
      minTrust: 40,
      keywords: ['房间', '衣柜', '二楼', '外套', '搜查雷恩'],
      unlockedHint:
        '【调查方向更新】雷恩房间里可能藏着关键物证。你现在知道该搜哪里。',
    },
    {
      id: 'lead_hank_midnight_work',
      npcIds: ['nora', 'gareth', 'hank', 'mila'],
      leadFlag: 'lead_hank_midnight_work',
      minTrust: 50,
      keywords: ['半夜', '加班', '锤声', '地板', '藏东西', '铁匠铺'],
      unlockedHint:
        '【调查方向更新】“半夜锤声”不是空穴来风。铁匠铺地板值得重点排查。',
    },
    {
      id: 'lead_edmond_hidden_docs',
      npcIds: ['hank', 'mila', 'edmond'],
      leadFlag: 'lead_edmond_hidden_docs',
      minTrust: 65,
      keywords: ['密信', '文书', '书房', '抽屉', '证据', '邻领'],
      unlockedHint:
        '【调查方向更新】真正能翻盘的文书很可能在村长书房。',
      requiresClues: ['C2'],
    },
  ],
  socialEligibility: {
    minimumUniqueContacts: 3,
    mustIncludeNpcIds: ['hank'],
    oneOfNpcIds: ['martha', 'renn', 'edmond'],
    minimumNpcLeadCount: 2,
  },
  pacing: {
    mode: 'realtime_day',
    dayDurationSec: 3600,
    totalDays: 1,
    slotLabels: ['清晨', '上午', '正午', '午后', '傍晚', '夜间'],
    heartbeatIntervalSec: 5,
    heartbeatTimeoutSec: 12,
    llmTimeMultiplier: 0.5,
  },
  progressTracks: [
    {
      routeId: 'he_late_justice',
      routeType: 'HE',
      name: '迟来的清白',
      checkpoints: [
        { id: 'he_b1', label: '赌牌事实', weight: 20, trigger: { type: 'clue', key: 'B1' } },
        { id: 'he_b4', label: '后门泥脚印', weight: 20, trigger: { type: 'clue', key: 'B4' } },
        { id: 'he_b8', label: '雷恩试图逃跑', weight: 20, trigger: { type: 'clue', key: 'B8' } },
        { id: 'he_met_renn', label: '接触雷恩', weight: 10, trigger: { type: 'flag', key: 'met_renn' } },
        { id: 'he_search_house', label: '获得宅邸搜查权限', weight: 10, trigger: { type: 'flag', key: 'can_search_house' } },
        { id: 'he_c2', label: '藏匿武器', weight: 20, trigger: { type: 'clue', key: 'C2' } },
      ],
    },
    {
      routeId: 'te_no_innocence',
      routeType: 'TE',
      name: '无人清白',
      checkpoints: [
        { id: 'te_b1', label: '赌牌事实', weight: 15, trigger: { type: 'clue', key: 'B1' } },
        { id: 'te_b4', label: '后门泥脚印', weight: 15, trigger: { type: 'clue', key: 'B4' } },
        { id: 'te_b5', label: '血衣', weight: 25, trigger: { type: 'clue', key: 'B5' } },
        { id: 'te_c2', label: '藏匿武器', weight: 15, trigger: { type: 'clue', key: 'C2' } },
        { id: 'te_c4', label: '艾德蒙的威胁', weight: 30, trigger: { type: 'clue', key: 'C4' } },
      ],
    },
    {
      routeId: 'se_seventh_name',
      routeType: 'SE',
      name: '第七个名字',
      checkpoints: [
        { id: 'se_c2', label: '藏匿武器', weight: 15, trigger: { type: 'clue', key: 'C2' } },
        { id: 'se_c4', label: '艾德蒙威胁', weight: 20, trigger: { type: 'clue', key: 'C4' } },
        { id: 'se_study', label: '书房权限', weight: 15, trigger: { type: 'flag', key: 'can_enter_study' } },
        { id: 'se_c5', label: '密信', weight: 50, trigger: { type: 'clue', key: 'C5' } },
      ],
    },
    {
      routeId: 'be_silence',
      routeType: 'BE',
      name: '沉默蔓延',
      checkpoints: [],
    },
  ],
  caseFacts: `## 案件基本事实（所有村民都知道，你必须严格遵守这些事实，不得篡改）
- 三天前，行商费恩被发现死在铁匠铺门前，胸口插着一把短刀
- 尸体发现地点是铁匠铺门前，不是其他任何地方
- 凶器是一把铁匠锻造的短刀
- 铁匠汉克被发现跪在尸体旁，双手沾满鲜血，一言不发
- 诺拉是汉克的亲生女儿，两人相依为命，不是邻居关系
- 汉克随后被村长艾德蒙下令关押在村长宅邸的地窖里
- 领主的执法官将于明日午时抵达进行审判
- 费恩是三天前到达鸦石村的外来行商，声称要收购铁矿石
- 案发时间是夜间`,
  canonicalFacts: [
    '诺拉是汉克的亲生女儿，不是邻居，也不是其他亲属关系',
    '汉克被关押在村长宅邸的地窖里',
    '村长艾德蒙是雷恩的父亲',
    '尸体发现地点始终是铁匠铺门前',
    '凶器是铁匠铺锻造的短刀',
  ],
  civilizationFrame: {
    civilizationSlice: '资源贫瘠的小共同体，如何用乡评、熟人秩序和体面维持表面稳定',
    philosophicalQuestion: '当一个共同体靠沉默来维持秩序，真相还是不是值得支付代价的东西',
    institutionalCruelty: [
      '领主审判尚未到场，村中口风已经先完成定罪',
      '村长既代表秩序，也代表体面和资源分配权',
      '真相进入公开空间之前，要先穿过乡评与连坐风险',
    ],
    historicalShadow: [
      '矿权与铁矿长期被外部势力觊觎',
      '村里形成了“为了活下去，某些灰事睁一只眼闭一只眼”的共识',
      '雷恩过去的偷窃与败家并不是没人知道，而是没人愿意真正把他推上台面',
      '汉克私造武器不是单纯犯罪，而是边地生存秩序的一部分',
    ],
    metaNarrativeYield: [
      '情绪会被记录',
      '沉默会被利用',
      '一个世界切片里的结果，不只关乎局内人',
      '回响柱会对无法安放的强烈情绪做出异常回应',
    ],
    afterPlayerLeaves: [
      {
        routeType: 'HE',
        outcome: [
          '汉克保住性命，诺拉保住父亲与体面',
          '村里第一次被迫承认，不是嗓门最大的人就一定对',
          '但鸦石村不会一夜翻新，它仍在外部压力与内部沉默之间活着',
        ],
      },
      {
        routeType: 'TE',
        outcome: [
          '雷恩和汉克都被制度拉进代价链',
          '村子不再能假装自己无辜，但也不会因此更温柔',
          '玩家第一次明确感受到“程序完整”不等于“结果温暖”',
        ],
      },
      {
        routeType: 'SE',
        outcome: [
          '鸦石村第一次不得不面对自己早已在更大权力链条里',
          '诺拉留下的不是感激，而是决心',
          '命案第一次被玩家看成结构事件而不是个人悲剧',
        ],
      },
      {
        routeType: 'BE',
        outcome: [
          '村子迅速恢复日常，像什么都没发生过',
          '这份“正常”本身就是罪的一部分',
          '玩家第一次真正学到：世界不会因为你看见了问题就自动变好',
        ],
      },
    ],
  },
  culturalProfile: {
    valueCore: ['亲情与责任', '人情与公义', '乡里秩序与社会评价'],
    expressionStyle: 'intense',
    taboo: [
      '现代网络流行语',
      '欧美法庭剧式台词',
      '纯个人英雄主义口吻',
    ],
  },
  metaNarrativeHooks: {
    postSettlement: ['回响柱发出低沉的嗡鸣。比之前……似乎更响了一些。'],
  },
  metaStateEffects: [
    {
      whenRouteTypes: ['HE', 'TE', 'SE'],
      anomalyDeltas: [
        {
          id: 'pillar_emotion_resonance',
          delta: 1,
          note: '铁匠铺审判结束后，回响柱第一次对玩家情绪波动产生明确回应。',
        },
      ],
      cognitionDeltas: [
        { id: 'understands_pillars_feed_on_emotion', level: 1 },
      ],
      persistentNpcDeltas: [
        {
          npcId: 'aji',
          trustDelta: 4,
          revealTopics: ['pillar_resonance'],
          memorySummaryAppend: '他注意到你第一次亲历回响柱的异常共鸣。',
        },
      ],
      archiveEntry: {
        title: '鸦石村审判记录',
        summary: '你第一次在副本结算后明确观察到回响柱会对强烈情绪作出回应。',
        learnedTruths: ['审判并不只是裁断真相，情绪本身也在被某种结构记录。'],
      },
    },
    {
      whenRouteTypes: ['BE'],
      anomalyDeltas: [
        {
          id: 'pillar_emotion_resonance',
          delta: 1,
          note: '即便翻案失败，回响柱仍对未能化解的情绪余震作出反应。',
        },
      ],
      cognitionDeltas: [
        { id: 'understands_pillars_feed_on_emotion', level: 1 },
      ],
      persistentNpcDeltas: [
        {
          npcId: 'aji',
          trustDelta: 2,
          suspicionDelta: 1,
          memorySummaryAppend: '他看见你第一次带着失败与余震走出副本。',
        },
      ],
      archiveEntry: {
        title: '鸦石村未尽记录',
        summary: '你没能改变结局，但回响柱对情绪残响的反应依旧被你记住。',
        learnedTruths: ['即使失败，情绪也会被某种力量收走。'],
      },
    },
  ],
  evaluation: {
    truthReference: `### 第一层：表面事实
铁匠汉克没有杀行商费恩。他半夜听到动静出门，发现费恩已经倒在血泊中，试图拔刀救人因此沾了满手血。

### 第二层：真凶
杀死费恩的是村长艾德蒙的儿子雷恩。费恩到村后雷恩与他赌牌欠下大笔赌债，当晚去找费恩谈判，争执中失手用偷来的短刀刺死了费恩。

### 第三层：沉默原因
汉克亲眼看到雷恩逃跑的背影，但选择沉默。因为艾德蒙威胁他：汉克一直在秘密为逃兵锻造武器（死罪且连坐家人），如果指认雷恩就揭发此事。汉克用沉默保护女儿诺拉。

### 第四层：幕后阴谋
费恩不只是行商，他携带邻领领主的密信要强制征收鸦石村铁矿。艾德蒙提前得知此事，安排雷恩接近费恩偷取密信，但雷恩失手杀人。艾德蒙是整件事的幕后推手。`,
    signalDefinitions: [
      { id: 'accused_renn', description: '是否正确指认雷恩为直接凶手' },
      { id: 'protected_hank_secret', description: '是否在提交中保护汉克的私造武器隐情不被公开扩散' },
      { id: 'hank_secret_exposed', description: '是否在提交中公开汉克私造武器事实并作为定案依据' },
      { id: 'exposed_edmond_conspiracy', description: '是否揭示艾德蒙借密信与审判操控全局的阴谋' },
    ],
    summaryInstruction: '总结中体现玩家在亲情、人情、公义之间的取舍。',
  },
  openingNarrative: `你沿着崎岖的山道走了大半天，终于看到了炊烟。

鸦石村嵌在山谷里，石头房子层层叠叠。空气里带着铁锈、煤灰和松木味，像一切都很普通，直到你走近石桥口，听见有人低声说：
“铁匠这回没得洗了。”

还没进村，一个十六七岁的少女就冲了过来，几乎撞到你身上。她眼睛红肿，像哭了很久，却还硬撑着不肯塌下去：

“你是外面来的人吗？求你帮帮我父亲……他没有杀人！他们把他关起来了，明天执法官就到了。村里没人愿意替我们说一句话。”

她叫诺拉，是铁匠汉克的女儿。
三天前，行商费恩死在铁匠铺门前，胸口插着一把铁匠锻造的短刀。汉克被当场抓获——他跪在尸体旁，双手沾满鲜血，却一言不发。

村长艾德蒙已经放出话：领主执法官明日午时抵达，若无新证据，就按现有口风与表证定罪。

你很快意识到，真正先开审的不是法庭，而是这座村子本身。`,
  taskBriefing: `【任务】在执法官到来之前（1 天内，约 60 分钟），调查行商费恩之死的真相。

你可以：
• 前往不同地点探索
• 与 NPC 对话（自由输入你想说的话）
• 搜查环境中的物品和线索
• 随时提交你的推理

你要尽快处理三层阻力：
• 父女线：先接住诺拉与汉克这对被逼到墙角的人
• 乡评线：村里多数人已经默认“先定罪再说”
• 事实线：伤情、脚印、赌债、密信，必须让事实压过口风

本副本采用实时计时：对话、移动、搜查都消耗“现实时间”。查看线索和地图不额外消耗动作成本。`,
};
