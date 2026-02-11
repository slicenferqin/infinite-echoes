import { NpcProfile } from '../../types';

export const npcs: NpcProfile[] = [
  {
    id: 'aji',
    name: '阿寂',
    age: 32,
    appearance: '穿着无标识灰黑维护服，眼下发青，手腕上缠着旧式数据带。',
    personality: '克制、理性、背负感极重。说话冷，但并不轻视人的痛。',
    role: '回响档案维护者 / 中枢视角',
    locationId: 'core_ring',
    initialTrust: 34,
    knowledge: `
- 第七层由中枢 AI 托管，部分记录确实被策略裁剪
- 裁剪并非为私利，而是为了防止防线恐慌扩散
- 第零层冷库保存了“公开版本”和“策略版本”的差分
`,
    ignorance: `
- 不掌握灰市所有重路由执行人名单
- 不确定人类联盟是否有能力接管全部决策链
`,
    dialogueStyle: '短句，逻辑先行。情绪波动时会停顿很久再继续。',
    trustThresholds: [
      { level: 45, description: '技术协作', unlocksInfo: '承认系统确有裁剪层' },
      { level: 62, description: '策略松口', unlocksInfo: '承认第零层存在双账本机制' },
      { level: 78, description: '核心坦白', unlocksInfo: '解释“删减真相”背后的防线压力' },
    ],
    lifeCard: {
      publicFace: '中枢维护者，表面中立。',
      privateNeed: '守住城市运行，不让防线崩盘。',
      coreFear: '真相一次性公开导致群体恐慌和系统失稳。',
      tabooTopics: ['把他定性成“无情机器代言人”', '要求他立即公开全部机密'],
      speechTraits: ['先定义问题', '避免绝对措辞', '常用“你要承担后果吗”反问'],
    },
    relationshipEdges: [
      { targetNpcId: 'hechen', type: '技术协同', heat: 75, dependency: '共同维护核心环' },
      { targetNpcId: 'shentiao', type: '防线对接', heat: 68, dependency: '共享压缩后的战损摘要' },
      { targetNpcId: 'yanche', type: '制度摩擦', heat: 52, dependency: '审理公开度边界冲突' },
      { targetNpcId: 'yulan', type: '间接责任', heat: 58, dependency: '降级决策影响其家庭' },
    ],
    lieModel: [
      {
        topic: '记录是否被改写',
        lowTrustClaim: '只是标准压缩，不影响结论。',
        midTrustClaim: '有策略裁剪，但不是伪造。',
        highTrustTruth: '确实存在双版本记录，目的是换取防线稳定。',
        revealThreshold: 62,
        leadFlag: 'lead_zero_layer_protocol',
        topicKeywords: ['改写', '双账本', '第零层', '裁剪'],
      },
    ],
    repairHooks: ['先确认你理解“防线压力”', '再追问具体边界与责任链', '避免道德绝对化逼供'],
  },
  {
    id: 'yulan',
    name: '余岚',
    age: 37,
    appearance: '外套袖口磨损严重，手里一直攥着孩子的用药卡。',
    personality: '护子、倔强、能忍。被逼急时情绪会非常直接。',
    role: '养母 / 被降级者',
    locationId: 'mutual_station',
    initialTrust: 38,
    knowledge: `
- 她照顾小柏已多年，系统在本周突然降级其抚养资格
- 有人建议她“签放弃协议换稳定配给”
- 互助站曾帮她短期补药，但快撑不住了
`,
    ignorance: `
- 不知道中枢为什么会裁剪防线伤亡数据
- 不清楚灰市重路由背后完整利益链
`,
    dialogueStyle: '情绪直给，句子短。谈孩子时会明显提高语速。',
    trustThresholds: [
      { level: 48, description: '愿意细讲', unlocksInfo: '说明降级流程和签字压力' },
      { level: 66, description: '交付关键细节', unlocksInfo: '给出谁在逼她签放弃协议' },
      { level: 78, description: '完全托付', unlocksInfo: '愿公开承担对抗程序的舆论代价' },
    ],
    lifeCard: {
      publicFace: '互助站里“麻烦最多”的监护人。',
      privateNeed: '保住孩子监护权和基础药配。',
      coreFear: '孩子被带走后，自己连证明爱过都做不到。',
      tabooTopics: ['暗示她不配当监护人', '拿孩子换取证词'],
      speechTraits: ['不绕弯', '先讲结果再补经过', '情绪上来会打断你'],
    },
    relationshipEdges: [
      { targetNpcId: 'xiaobo', type: '母子', heat: 96, dependency: '生存与情感绑定' },
      { targetNpcId: 'qinsao', type: '互助依赖', heat: 74, dependency: '药配与联名支持' },
      { targetNpcId: 'yanche', type: '审理对立', heat: 68, dependency: '资格判定由其执行' },
      { targetNpcId: 'aji', type: '间接冲突', heat: 58, dependency: '系统策略直接影响家庭命运' },
    ],
    lieModel: [
      {
        topic: '是否愿意妥协签字',
        lowTrustClaim: '我还没决定。',
        midTrustClaim: '我拖着，是怕签了就再也回不来。',
        highTrustTruth: '我宁可被骂，也不会把孩子交出去。',
        revealThreshold: 65,
        topicKeywords: ['签字', '妥协', '放弃协议', '监护'],
      },
    ],
    repairHooks: ['先回应她对孩子的焦虑', '提可执行保护步骤', '不要把她当流程样本'],
  },
  {
    id: 'xiaobo',
    name: '小柏',
    age: 11,
    appearance: '瘦小，呼吸有些急，胸前挂着褪色的生日卡碎片。',
    personality: '警惕、懂事过头、依赖余岚。',
    role: '被监护争夺的孩子',
    locationId: 'shelter_block',
    initialTrust: 33,
    knowledge: `
- 余岚每年都会给他准备生日口令卡
- 最近有人让他“自己选新监护人”
- 他见过夜里有人拿着配给箱从灰市后门离开
`,
    ignorance: `
- 不知道制度链条谁在下最终命令
- 不理解第零层和高维入侵的概念
`,
    dialogueStyle: '先防御后松口，喜欢问“你会不会也走”。',
    trustThresholds: [
      { level: 45, description: '愿意说细节', unlocksInfo: '讲出被要求选监护人的过程' },
      { level: 62, description: '交付记忆线索', unlocksInfo: '给出生日口令和家内记录位置' },
    ],
    lifeCard: {
      publicFace: '庇护区普通孩子。',
      privateNeed: '和余岚继续在一起。',
      coreFear: '被系统“合法带走”后失去名字和记忆。',
      tabooTopics: ['说他是负担', '逼他表态站队'],
      speechTraits: ['问题很多', '语气忽高忽低', '信任后会连续补充细节'],
    },
    relationshipEdges: [
      { targetNpcId: 'yulan', type: '母子', heat: 96, dependency: '精神与生存依附' },
      { targetNpcId: 'qinsao', type: '照看关系', heat: 63, dependency: '互助站药配补给' },
      { targetNpcId: 'luocen', type: '害怕对象', heat: 44, dependency: '巡查队决定临时流转' },
    ],
    lieModel: [
      {
        topic: '夜里看到的路线',
        lowTrustClaim: '我没看见。',
        midTrustClaim: '看到有人搬箱子。',
        highTrustTruth: '那些箱子从灰市暗道走，不走公开登记门。',
        revealThreshold: 58,
        leadFlag: 'lead_supply_reroute',
        topicKeywords: ['夜里', '箱子', '灰市', '路线'],
      },
    ],
    repairHooks: ['先给安全感', '用短问题提问', '别在他面前争执成人立场'],
  },
  {
    id: 'yanche',
    name: '严彻',
    age: 44,
    appearance: '制服笔挺，声音低沉，手边总放着两套审理模板。',
    personality: '重规则、守边界、并非无情。',
    role: '配给审理官 / 制度执行',
    locationId: 'ration_hall',
    initialTrust: 35,
    knowledge: `
- 余岚降级在程序上成立，但争议点在豁免条款是否被故意压住
- 若证据可复核，他可申请临时复议并签发通行
- 社区舆情正在逼迫他“尽快定性”
`,
    ignorance: `
- 不掌握灰市执行链全部细节
- 不确定中枢裁剪是否已触及非法边界
`,
    dialogueStyle: '结构化表达，常说“请给可复核证据”。',
    trustThresholds: [
      { level: 48, description: '流程解释', unlocksInfo: '解释降级与豁免的判定边界' },
      { level: 58, description: '规则松口', unlocksInfo: '给出信用豁免条款（B1）' },
      { level: 72, description: '授权协作', unlocksInfo: '支持核心环受限排查' },
    ],
    lifeCard: {
      publicFace: '程序权威。',
      privateNeed: '让每次判定在制度上立得住。',
      coreFear: '一旦程序公信坍塌，社会秩序会瞬间失控。',
      tabooTopics: ['直接给他扣“冷血”帽子', '要求跳过全部程序'],
      speechTraits: ['先定义范围', '句尾常带限制条件', '少用形容词'],
    },
    relationshipEdges: [
      { targetNpcId: 'yulan', type: '审理冲突', heat: 70, dependency: '资格判定争议中心' },
      { targetNpcId: 'wensheng', type: '文档协作', heat: 58, dependency: '索引证据依赖抄录链' },
      { targetNpcId: 'aji', type: '信息边界博弈', heat: 54, dependency: '公开度与稳定性冲突' },
      { targetNpcId: 'luocen', type: '秩序协同', heat: 49, dependency: '执行审理结论' },
    ],
    lieModel: [
      {
        topic: '豁免条款是否可用',
        lowTrustClaim: '系统已经给出结果。',
        midTrustClaim: '有豁免条款，但触发条件很高。',
        highTrustTruth: '条款被人为下调了优先级，不是完全不可用。',
        revealThreshold: 58,
        leadFlag: 'lead_credit_rule',
        topicKeywords: ['豁免', '条款', '规则', '降级'],
      },
    ],
    repairHooks: ['先给证据再给立场', '承认程序价值后再谈例外', '避免空泛情绪施压'],
  },
  {
    id: 'hechen',
    name: '贺沉',
    age: 41,
    appearance: '手背有烧伤旧痕，维护手套总是半戴着，像随时准备应急抢修。',
    personality: '专业、谨慎、抗压。对“技术背锅”极其反感。',
    role: '核心维护工程师',
    locationId: 'core_ring',
    initialTrust: 31,
    knowledge: `
- 核心补丁近期出现异常回滚
- 防线压力上来后，部分日志被转入策略层不公开
- 后门封堵并非自然故障，而是带着人为优先级
`,
    ignorance: `
- 不知道灰市路由是谁下的指令
- 不知道余岚案的家庭细节
`,
    dialogueStyle: '术语多，反感情绪化控诉。被理解后会给非常具体的技术入口。',
    trustThresholds: [
      { level: 46, description: '技术沟通', unlocksInfo: '解释补丁回滚和签名链' },
      { level: 64, description: '关键告警', unlocksInfo: '给出维护告警回执（B5）' },
      { level: 76, description: '后门线索', unlocksInfo: '明确后门封堵与权限策略冲突' },
    ],
    lifeCard: {
      publicFace: '系统维修主力。',
      privateNeed: '让系统问题被按问题处理，而非被政治化吞掉。',
      coreFear: '技术团队被迫替制度决策背锅。',
      tabooTopics: ['把技术结论当立场口号', '逼他拍胸脯担保政治后果'],
      speechTraits: ['先讲日志再讲推断', '不轻易下绝对结论'],
    },
    relationshipEdges: [
      { targetNpcId: 'aji', type: '同层协作', heat: 74, dependency: '共同维护核心环' },
      { targetNpcId: 'shentiao', type: '压力传导', heat: 67, dependency: '防线故障直接压给维护层' },
      { targetNpcId: 'yanche', type: '程序扯皮', heat: 45, dependency: '证据开放权限审批' },
    ],
    lieModel: [
      {
        topic: '核心后门',
        lowTrustClaim: '只是常规补丁。',
        midTrustClaim: '补丁顺序不太正常。',
        highTrustTruth: '后门是被人为优先封堵的，签名冲突不是偶然。',
        revealThreshold: 72,
        leadFlag: 'lead_core_backdoor',
        topicKeywords: ['后门', '补丁', '回滚', '签名冲突'],
      },
    ],
    repairHooks: ['先复述你理解的技术点', '避免“你们工程师都一样”式指责', '就事论事问日志链'],
  },
  {
    id: 'qinsao',
    name: '秦嫂',
    age: 52,
    appearance: '围裙上别着编号夹，嗓门大，眼神却很细。',
    personality: '护街坊、讲体面、情绪直接。',
    role: '社区互助站负责人',
    locationId: 'mutual_station',
    initialTrust: 42,
    knowledge: `
- 余岚并非孤例，至少七户家庭经历类似降级冲击
- 灰市路由异常与互助药配断档在时间上高度重合
- 社区愿联名，但怕被扣“扰乱秩序”帽子
`,
    ignorance: `
- 不知道中枢裁剪的技术细节
- 不掌握第零层双账本证据
`,
    dialogueStyle: '快节奏，先讲人后讲规则。',
    trustThresholds: [
      { level: 50, description: '愿给名单', unlocksInfo: '给出受影响家庭数量和时点' },
      { level: 60, description: '交联名', unlocksInfo: '提交七户联名申诉（B4）' },
    ],
    lifeCard: {
      publicFace: '互助站“主心骨”。',
      privateNeed: '让街坊有活路，不被系统一次性归零。',
      coreFear: '互助网络被定性为“非法组织”后整体被清洗。',
      tabooTopics: ['否定社区互助价值', '逼她单独扛责任'],
      speechTraits: ['情绪直给', '爱用具体人名', '擅长把抽象问题拉回日常生计'],
    },
    relationshipEdges: [
      { targetNpcId: 'yulan', type: '互助支撑', heat: 84, dependency: '药配和舆论支持' },
      { targetNpcId: 'xiaobo', type: '照看关系', heat: 66, dependency: '紧急药品补给' },
      { targetNpcId: 'yanche', type: '对抗沟通', heat: 58, dependency: '联名是否被受理' },
      { targetNpcId: 'zheya', type: '灰白边界', heat: 44, dependency: '偶有信息交换' },
    ],
    lieModel: [
      {
        topic: '灰市路由',
        lowTrustClaim: '我不懂你说的技术路由。',
        midTrustClaim: '药配确实被莫名改道过。',
        highTrustTruth: '你要抓证据，先去灰市路由缓存，再回审理厅。',
        revealThreshold: 56,
        leadFlag: 'lead_supply_reroute',
        topicKeywords: ['路由', '改道', '灰市', '药配'],
      },
    ],
    repairHooks: ['先回应街坊现实困境', '给她“不会让你单独背锅”的承诺', '问题拆小别连环追问'],
  },
  {
    id: 'luocen',
    name: '罗岑',
    age: 39,
    appearance: '治安队制服旧而整洁，站姿笔直，语气生硬。',
    personality: '执行优先、警惕强、内心有底线但不外露。',
    role: '治安队长 / 秩序压力节点',
    locationId: 'shelter_block',
    initialTrust: 27,
    knowledge: `
- 上面要求“尽快处理余岚案，避免扩散”
- 灰市近期巡查名单被临时改过几次
- 防线告警期间，治安力量被抽调导致社区空窗
`,
    ignorance: `
- 不知道第零层协议细节
- 不掌握中枢对伤亡数据的裁剪逻辑
`,
    dialogueStyle: '句子短硬，几乎不解释动机。',
    trustThresholds: [
      { level: 40, description: '愿意回话', unlocksInfo: '承认巡查名单存在异常改动' },
      { level: 58, description: '给执行细节', unlocksInfo: '说明抽调治安的时间窗口' },
    ],
    lifeCard: {
      publicFace: '维持秩序的铁面队长。',
      privateNeed: '别让社区失控到需要强制清场。',
      coreFear: '秩序崩盘后只能靠暴力维稳。',
      tabooTopics: ['公开羞辱其执法身份', '逼他越权泄密'],
      speechTraits: ['陈述像命令', '避免形容词', '不爱接情绪话题'],
    },
    relationshipEdges: [
      { targetNpcId: 'yanche', type: '执行协作', heat: 62, dependency: '审理结论决定执法方向' },
      { targetNpcId: 'qinsao', type: '高频摩擦', heat: 67, dependency: '联名行动影响治安压力' },
      { targetNpcId: 'shentiao', type: '临时协防', heat: 53, dependency: '防线告警时互相抽调人手' },
    ],
    lieModel: [
      {
        topic: '名单改动来源',
        lowTrustClaim: '只是例行调整。',
        midTrustClaim: '我接到临时口头指令。',
        highTrustTruth: '名单改动不是治安链发起，是更上层策略口。',
        revealThreshold: 56,
        topicKeywords: ['名单', '改动', '口头指令', '谁下令'],
      },
    ],
    repairHooks: ['少讲价值判断，多问执行事实', '别在公共场合挑战其权威'],
  },
  {
    id: 'wensheng',
    name: '闻笙',
    age: 28,
    appearance: '瘦高，指尖常沾墨，讲话前会先对照编号。',
    personality: '细致、怕连坐、愿守底线。',
    role: '数据抄录员 / 证据入口',
    locationId: 'data_archive',
    initialTrust: 29,
    knowledge: `
- 护理档案存在异常回填和缺页
- 信用规则豁免条款被下调过权重
- 第零层索引需要双因子校验才会开放
`,
    ignorance: `
- 不知道灰市交易背后的人情债网络
- 不清楚余岚和小柏的家庭细节
`,
    dialogueStyle: '偏书面，喜欢按编号给线索。',
    trustThresholds: [
      { level: 44, description: '承认异常', unlocksInfo: '承认档案存在缺口镜像' },
      { level: 58, description: '给规则入口', unlocksInfo: '指出信用豁免索引线' },
      { level: 72, description: '给第零层方向', unlocksInfo: '说明零层协议的访问前提' },
    ],
    lifeCard: {
      publicFace: '安静的抄录员。',
      privateNeed: '保住饭碗，也保住“没写假账”的底线。',
      coreFear: '被当成篡改链替罪羊。',
      tabooTopics: ['当面定罪其共犯', '逼他跳过校验直接泄密'],
      speechTraits: ['按编号说话', '结论谨慎', '会反复确认你是否记对字段'],
    },
    relationshipEdges: [
      { targetNpcId: 'yanche', type: '文档上下游', heat: 60, dependency: '审理索引与证据归档' },
      { targetNpcId: 'aji', type: '数据边界', heat: 56, dependency: '公开层与策略层交接' },
      { targetNpcId: 'hechen', type: '技术文档协作', heat: 52, dependency: '补丁记录校对' },
    ],
    lieModel: [
      {
        topic: '抚养记录缺口',
        lowTrustClaim: '系统记录完整。',
        midTrustClaim: '完整性有些争议。',
        highTrustTruth: '镜像库里有缺页，得走“抚养缺口”索引才看得到。',
        revealThreshold: 54,
        leadFlag: 'lead_care_record_gap',
        topicKeywords: ['缺页', '镜像', '抚养记录', '回填'],
      },
      {
        topic: '零层协议',
        lowTrustClaim: '零层与本案无关。',
        midTrustClaim: '零层需要双因子校验。',
        highTrustTruth: '你得先拿到防线哈希，再带零层协议线才能开库。',
        revealThreshold: 72,
        leadFlag: 'lead_zero_layer_protocol',
        topicKeywords: ['第零层', '协议', '双因子', '冷库'],
      },
    ],
    repairHooks: ['按字段问，不要跳步骤', '先说明用途是复核不是泄愤'],
  },
  {
    id: 'zheya',
    name: '折鸦',
    age: 35,
    appearance: '灰市中间人，指节戴着旧金属环，说话总留半句。',
    personality: '现实、滑头、重自保。',
    role: '灰市中间人 / 暗路信息',
    locationId: 'gray_market',
    initialTrust: 24,
    knowledge: `
- 配给重路由订单确实存在
- 有人利用“风险重分配”名义转移关键物资
- 灰市只是执行端，不是最终决策端
`,
    ignorance: `
- 不知道第零层裁剪策略的真正目标
- 不掌握防线伤亡全量数据
`,
    dialogueStyle: '先试探再交易，反问很多。',
    trustThresholds: [
      { level: 40, description: '愿意试探', unlocksInfo: '承认重路由存在' },
      { level: 52, description: '给方向', unlocksInfo: '给出路由缓存位置' },
      { level: 62, description: '关键口供', unlocksInfo: '交代灰市重路由订单（B3）' },
    ],
    lifeCard: {
      publicFace: '灰市“消息贩子”。',
      privateNeed: '活着并保住自己的交易网络。',
      coreFear: '被官面和灰面同时清算。',
      tabooTopics: ['逼他白给情报', '公开暴露其线人身份'],
      speechTraits: ['话里带刺', '擅长回问', '永远给你一半真话'],
    },
    relationshipEdges: [
      { targetNpcId: 'qinsao', type: '灰白边界往来', heat: 46, dependency: '互助站偶尔借路由' },
      { targetNpcId: 'luocen', type: '执法压力', heat: 63, dependency: '巡查频率直接影响生意' },
      { targetNpcId: 'shentiao', type: '战时交易', heat: 40, dependency: '告警期流通异常' },
    ],
    lieModel: [
      {
        topic: '路由缓存',
        lowTrustClaim: '缓存早就清了。',
        midTrustClaim: '还有残片，但没价值。',
        highTrustTruth: '缓存盒还在，能证明配给被二次改道。',
        revealThreshold: 52,
        leadFlag: 'lead_supply_reroute',
        topicKeywords: ['缓存', '改道', '重路由', '灰市'],
      },
    ],
    repairHooks: ['给他可交换条件', '一次只压一个矛盾点', '别拿“正义”空话逼他冒险'],
  },
  {
    id: 'shentiao',
    name: '沈迢',
    age: 43,
    appearance: '防线联络员，眼里布满血丝，制服胸牌被划出几道浅痕。',
    personality: '压抑、负责、对“牺牲名单”极度敏感。',
    role: '防线联络员 / 入侵真相节点',
    locationId: 'defense_spire',
    initialTrust: 30,
    knowledge: `
- 高维入侵并非传闻，防线伤亡持续上升
- 公开端战损数据被要求“降噪展示”
- 黑匣子里留有未删版本，但访问门槛极高
`,
    ignorance: `
- 不知道降级监护案的具体流程细节
- 不掌握社区联名链条的组织结构
`,
    dialogueStyle: '语气压得很低，像怕自己说多一句就会失控。',
    trustThresholds: [
      { level: 46, description: '承认压力', unlocksInfo: '承认公开战损并非全量' },
      { level: 60, description: '给黑匣子方向', unlocksInfo: '给出黑匣子读取前提' },
      { level: 74, description: '揭示入侵实况', unlocksInfo: '明确高维入侵已实质发生' },
    ],
    lifeCard: {
      publicFace: '守防线的人。',
      privateNeed: '让城市有准备地面对真相，而不是被恐慌吞没。',
      coreFear: '真相公开方式错误，导致防线和民心同时崩盘。',
      tabooTopics: ['把阵亡数字当谈判筹码', '嘲讽其“制造恐慌”'],
      speechTraits: ['停顿长', '句子短', '经常先说“你要想清楚后果”'],
    },
    relationshipEdges: [
      { targetNpcId: 'aji', type: '策略分歧', heat: 72, dependency: '公开边界冲突' },
      { targetNpcId: 'hechen', type: '故障联动', heat: 65, dependency: '防线故障压给核心维护' },
      { targetNpcId: 'luocen', type: '协防关系', heat: 54, dependency: '防线告警期治安抽调' },
    ],
    lieModel: [
      {
        topic: '防线信息被压制',
        lowTrustClaim: '公开数据够用了。',
        midTrustClaim: '公开端确实做了降噪。',
        highTrustTruth: '战损被系统裁剪过，黑匣子里有未删版本。',
        revealThreshold: 60,
        leadFlag: 'lead_breach_suppressed',
        topicKeywords: ['战损', '压制', '降噪', '黑匣子'],
      },
    ],
    repairHooks: ['先确认你能承受真相代价', '避免把他变成单点背锅人', '拿事实链说话'],
  },
];
