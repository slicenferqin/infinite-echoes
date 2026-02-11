import { NpcProfile } from '../../types';

export const npcs: NpcProfile[] = [
  {
    id: 'lina',
    name: '莉娜',
    age: 39,
    appearance: '驿站掌柜，袖口总沾着墨痕，站得很直，眼底却有连日未眠的血丝。',
    personality: '扛责、护短、嘴硬。宁可自己认罚，也不愿把孩子推给债主。',
    role: '被告 / 驿站掌柜',
    locationId: 'relay_station',
    initialTrust: 36,
    knowledge: `
- 她确实延迟过回执
- 延迟的直接原因是给阿哲争取监护缓冲
- 码头代投链有人收钱做“晚送两日”交易
- 她怀疑公证所有人在配合，但没有完整名单
`,
    ignorance: `
- 不掌握双回执的最终造假环节
- 不知道马修会不会真的顶住舆论延期审理
`,
    dialogueStyle: '短句直给，情绪上来会拍桌。被质疑时先认“违规”，再讲“我不是为钱”。',
    trustThresholds: [
      { level: 42, description: '愿意细说', unlocksInfo: '承认自己主动暂存过回执' },
      { level: 58, description: '开始松口', unlocksInfo: '交代“拖半天是为了挡债主先动监护”' },
      { level: 74, description: '交出关键方向', unlocksInfo: '说出旧仓库交接有独立钥匙链' },
    ],
    lifeCard: {
      publicFace: '驿站掌柜，做事硬，愿意认罚。',
      privateNeed: '保住阿哲的人身与家产不被围猎。',
      coreFear: '自己定罪后，孩子被“合法接管”却再无翻身机会。',
      tabooTopics: ['把她说成唯利是图', '要求她拿孩子交换证词', '否认乔安处境'],
      speechTraits: ['不拐弯', '先认错再争理', '急时会重复“我认责但不认恶”'],
    },
    relationshipEdges: [
      { targetNpcId: 'azhe', type: '代照料', heat: 86, dependency: '乔安去世后承担生活照应', sharedSecretId: 'guardianship_delay' },
      { targetNpcId: 'matthew', type: '程序冲突', heat: 62, dependency: '审理定性由马修推进' },
      { targetNpcId: 'weide', type: '业务往来', heat: 58, dependency: '港口货单与回执链条交错' },
      { targetNpcId: 'sara', type: '街坊互助', heat: 65, dependency: '常借互助摊遮掩阿哲动向' },
    ],
    lieModel: [
      {
        topic: '延迟动机',
        lowTrustClaim: '我延迟了，罚我就是。',
        midTrustClaim: '那几小时不是为了钱。',
        highTrustTruth: '我在挡债主抢监护文书，想给孩子留一条活路。',
        revealThreshold: 58,
        leadFlag: 'lead_guardianship_chain',
        topicKeywords: ['监护', '孩子', '债主', '拖延', '为什么晚送'],
      },
      {
        topic: '旧仓库钥匙',
        lowTrustClaim: '仓库我不清楚。',
        midTrustClaim: '旧仓库有内部交接规矩。',
        highTrustTruth: '铁箱不是蛮力能开，得拿对钥匙和暗号。',
        revealThreshold: 72,
        leadFlag: 'lead_warehouse_key',
        topicKeywords: ['仓库', '铁箱', '钥匙', '暗号', '封包'],
      },
    ],
    repairHooks: ['先明确你要保人命不是找替罪羊', '承认她承担了违规后果', '提出可执行保护方案再追问细节'],
  },
  {
    id: 'matthew',
    name: '马修',
    age: 46,
    appearance: '镇司法官，制服平整，语气克制，手边常压着一本翻旧的程序手册。',
    personality: '重程序、讲复核、内心并非冷血。',
    role: '制度代表 / 审理主持',
    locationId: 'court_square',
    initialTrust: 31,
    knowledge: `
- 莉娜延迟回执的表证链成立
- 镇里确实存在借时间差牟利的长期疑点
- 只要证据可复核，他愿意延期并启动联查
- 公证所档案中“手续费”栏目最可疑
`,
    ignorance: `
- 不掌握代投中间人的完整名单
- 不知道双回执实物是否还在旧仓库
`,
    dialogueStyle: '句式严谨，经常反问“证据能否复核”。先证据后情绪时会明显松动。',
    trustThresholds: [
      { level: 45, description: '程序解释', unlocksInfo: '解释最低流程延迟边界' },
      { level: 52, description: '出示记录', unlocksInfo: '提供书吏记录（B3）' },
      { level: 70, description: '放权协作', unlocksInfo: '允许调档并支持核查公证旧案' },
    ],
    lifeCard: {
      publicFace: '依法办案的镇司法官。',
      privateNeed: '让判决在程序上站住，也在良心上过得去。',
      coreFear: '一旦“程序可随意绕开”被坐实，整个镇务信用崩塌。',
      tabooTopics: ['把程序说成无意义摆设', '逼他先表态再补证据', '公然诱导违法取证'],
      speechTraits: ['关键词明确', '慎用情绪词', '末句常带条件限制'],
    },
    relationshipEdges: [
      { targetNpcId: 'lina', type: '审理关系', heat: 63, dependency: '需在规则内评估动机与后果' },
      { targetNpcId: 'noel', type: '上下游文书', heat: 55, dependency: '索引和调档依赖抄录员' },
      { targetNpcId: 'weide', type: '证人关系', heat: 48, dependency: '口供可信度决定案件外延' },
      { targetNpcId: 'sara', type: '社会反馈', heat: 42, dependency: '互助摊舆情影响审理压力' },
    ],
    lieModel: [
      {
        topic: '公证费码',
        lowTrustClaim: '我暂时不能对外推断。',
        midTrustClaim: '费码栏目确实值得复核。',
        highTrustTruth: '暗账若存在，入口多半在“手续费缩写”那列。',
        revealThreshold: 64,
        leadFlag: 'lead_notary_fee_code',
        topicKeywords: ['手续费', '费码', '缩写', '账簿', '公证'],
      },
      {
        topic: '旧案索引',
        lowTrustClaim: '旧案太多，没法立刻比对。',
        midTrustClaim: '若有案号索引，能明显缩短排查时间。',
        highTrustTruth: '去找诺埃尔，他手里有一份未公开索引。',
        revealThreshold: 72,
        leadFlag: 'lead_old_case_index',
        topicKeywords: ['旧案', '索引', '案号', '七起', '年份'],
      },
    ],
    repairHooks: ['把说法落到可复核事实', '先承认程序边界，再提补证请求', '避免情绪化给结论'],
    specialMechanics: '当玩家只给情绪不提证据时，他会维持中立阻力；事实链完整时会主动给权限。',
  },
  {
    id: 'weide',
    name: '魏德',
    age: 42,
    appearance: '码头账房，指尖常夹算盘珠，说话时总先看门口再看你。',
    personality: '怕报复、重面子、算账精。知道链条但不想先死。',
    role: '中间证人 / 代投节点',
    locationId: 'wharf_office',
    initialTrust: 23,
    knowledge: `
- 有人长期收钱购买“晚送两日”
- 私驿船固定绕开官方时钟登记点
- 旧仓库铁箱存过双份编号材料
- 公证所暗账与码头代投手续费联动
`,
    ignorance: `
- 不确定马修能否保护其家属
- 不知道莉娜是否掌握双回执全链条
`,
    dialogueStyle: '先打太极，再试探底牌。只要觉得你护不住他，他就会改口。',
    trustThresholds: [
      { level: 40, description: '试探供述', unlocksInfo: '承认“确实有人买时间”' },
      { level: 55, description: '方向松口', unlocksInfo: '交代私驿路线入口（C3线）' },
      { level: 68, description: '关键口供', unlocksInfo: '说出“晚送两日交易”（B2）' },
      { level: 80, description: '深层名单', unlocksInfo: '愿意把代投-公证勾连讲全' },
    ],
    lifeCard: {
      publicFace: '码头账房，精于算账。',
      privateNeed: '保住家里人，别因作证被清算。',
      coreFear: '自己一开口，家人先出事。',
      tabooTopics: ['逼他当场点名所有人', '嘲笑他胆小', '空口承诺“我保你”'],
      speechTraits: ['先绕后直', '时常补一句“我可没说死”', '越怕越小声'],
    },
    relationshipEdges: [
      { targetNpcId: 'lina', type: '业务摩擦', heat: 60, dependency: '驿站与码头交接互相牵制' },
      { targetNpcId: 'noel', type: '灰色合作', heat: 74, dependency: '费码与回执重组有交叉', sharedSecretId: 'fee_code_chain' },
      { targetNpcId: 'sara', type: '街巷消息链', heat: 45, dependency: '互助摊常听到装卸异动' },
      { targetNpcId: 'matthew', type: '惧怕执法', heat: 58, dependency: '证人保护与审理走向绑定' },
    ],
    lieModel: [
      {
        topic: '私驿路径',
        lowTrustClaim: '哪有什么私驿，都是谣言。',
        midTrustClaim: '有些船不走登记，是行规。',
        highTrustTruth: '后港暗道能绕钟楼登记，地板夹层里有路线图。',
        revealThreshold: 55,
        leadFlag: 'lead_private_route',
        topicKeywords: ['私驿', '暗道', '路线', '小船', '绕登记'],
      },
      {
        topic: '仓库铁箱',
        lowTrustClaim: '仓库都是普通封包。',
        midTrustClaim: '铁箱有人专门看，不是我管。',
        highTrustTruth: '铁箱需要交接钥匙和暗号，两样缺一不可。',
        revealThreshold: 64,
        leadFlag: 'lead_warehouse_key',
        topicKeywords: ['铁箱', '钥匙', '暗号', '仓库', '封包'],
      },
      {
        topic: '公证费码',
        lowTrustClaim: '我不懂公证账。',
        midTrustClaim: '他们有套简写，我看不全。',
        highTrustTruth: '费码和代投手续费能对上，查那列就能抓到线。',
        revealThreshold: 70,
        leadFlag: 'lead_notary_fee_code',
        topicKeywords: ['费码', '手续费', '公证', '暗账', '缩写'],
      },
    ],
    repairHooks: ['先谈证人保护再谈细节', '一次只追一个节点', '拿出已掌握事实避免空逼供'],
    specialMechanics: 'Day1 傍晚后进入受压期；Day2 上午若未建立互信，会先降信任并改口。',
  },
  {
    id: 'azhe',
    name: '阿哲',
    age: 14,
    appearance: '瘦小少年，衣袖磨破，手里总攥着一段旧布条。',
    personality: '护家、敏感、倔。嘴硬心软，最怕被当成“没人管的孩子”。',
    role: '受害家庭核心当事人',
    locationId: 'alley_lane',
    initialTrust: 27,
    knowledge: `
- 债主反复催他签代监护文书
- 母亲临终前说过“别怪莉娜”
- 他见过有人半夜抬封包去旧仓库
`,
    ignorance: `
- 不知道公证暗账具体是谁在记
- 不确定马修会不会真保护他
`,
    dialogueStyle: '情绪直给，防御时会呛人；被理解后很快会给出具体细节。',
    trustThresholds: [
      { level: 40, description: '愿意多说', unlocksInfo: '讲出债主催签频率' },
      { level: 55, description: '关键披露', unlocksInfo: '明确监护权风险（B1）' },
      { level: 75, description: '深信', unlocksInfo: '交出乔安口供片段（B4）' },
    ],
    lifeCard: {
      publicFace: '乔安遗孤，巷里都认识的孩子。',
      privateNeed: '保住家、保住母亲留下的最后体面。',
      coreFear: '被贴上“欠债孤儿”后被合法带走。',
      tabooTopics: ['把他当工具证人', '否认乔安遗言', '威胁把他交给债主'],
      speechTraits: ['先刺人后沉默', '情绪到了会提高音量', '被安抚后会突然说关键句'],
    },
    relationshipEdges: [
      { targetNpcId: 'lina', type: '被照料', heat: 88, dependency: '日常吃住依赖莉娜帮助', sharedSecretId: 'guardianship_delay' },
      { targetNpcId: 'sara', type: '街坊照看', heat: 70, dependency: '互助摊常给他留饭' },
      { targetNpcId: 'weide', type: '恐惧对象', heat: 44, dependency: '常见魏德和催债人往来' },
      { targetNpcId: 'matthew', type: '制度距离', heat: 36, dependency: '是否被保护取决于审理结果' },
    ],
    lieModel: [
      {
        topic: '监护风险',
        lowTrustClaim: '我能自己活，不用你们管。',
        midTrustClaim: '他们说要管我家账。',
        highTrustTruth: '债主要借代监护拿走我家房契和抚恤。',
        revealThreshold: 55,
        leadFlag: 'lead_guardianship_chain',
        topicKeywords: ['监护', '债主', '房契', '代管', '孩子'],
      },
      {
        topic: '私驿动向',
        lowTrustClaim: '我没看清是谁。',
        midTrustClaim: '半夜有人搬封包去后港。',
        highTrustTruth: '那批封包走的是绕钟楼的小路，和官船时间对不上。',
        revealThreshold: 60,
        leadFlag: 'lead_private_route',
        topicKeywords: ['后港', '搬封包', '半夜', '小路', '私驿'],
      },
    ],
    repairHooks: ['先问“你接下来怎么活”再问案子', '给出可执行保护承诺', '少说教，多确认他的担心'],
  },
  {
    id: 'sara',
    name: '萨拉',
    age: 33,
    appearance: '港口互助摊主，围裙上别着针线包，说话快，眼神很亮。',
    personality: '热心、现实、会权衡。平时帮街坊，但不愿白白背锅。',
    role: '互助摊主 / 舆情与街巷情报节点',
    locationId: 'harbor_gate',
    initialTrust: 34,
    knowledge: `
- 她长期照看阿哲，见过债主递代监护单
- 后港夜里有不走登记的小船
- 诺埃尔常在互助摊附近买纸绳和封蜡
`,
    ignorance: `
- 不知道双回执是否已经被转移
- 不确定马修能否顶住“先定罪”的舆论
`,
    dialogueStyle: '话快但有分寸。愿意帮忙时会给你“下一步去哪”的实用建议。',
    trustThresholds: [
      { level: 42, description: '愿意站你这边', unlocksInfo: '确认阿哲监护风险为真' },
      { level: 56, description: '给路线提示', unlocksInfo: '指出后港私驿换袋时段' },
      { level: 68, description: '交代旧线索入口', unlocksInfo: '透露旧案索引可能在诺埃尔手里' },
    ],
    lifeCard: {
      publicFace: '港口互助摊主，谁家缺口她都知道一点。',
      privateNeed: '保住摊子，也保住街坊互助这张网。',
      coreFear: '一旦被贴“多嘴”标签，摊子和街坊都会被清算。',
      tabooTopics: ['逼她当众站队', '拿她的摊子做威胁', '把互助说成“多管闲事”'],
      speechTraits: ['先给结论再补细节', '爱用“我只说我看见的”', '不爱理论辩论'],
    },
    relationshipEdges: [
      { targetNpcId: 'azhe', type: '照看关系', heat: 79, dependency: '长期给阿哲提供口粮和消息' },
      { targetNpcId: 'lina', type: '互助同盟', heat: 67, dependency: '常协调驿站与街坊小额周转' },
      { targetNpcId: 'weide', type: '利益警惕', heat: 53, dependency: '知道魏德与催债链有交集' },
      { targetNpcId: 'noel', type: '观察对象', heat: 49, dependency: '留意其夜间取材与封蜡习惯' },
    ],
    lieModel: [
      {
        topic: '监护围猎',
        lowTrustClaim: '街上闲话多，别全信。',
        midTrustClaim: '确实有人逼阿哲签东西。',
        highTrustTruth: '那是代监护链条，签下去家产就不在阿哲手里。',
        revealThreshold: 46,
        leadFlag: 'lead_guardianship_chain',
        topicKeywords: ['监护', '签字', '债主', '家产', '阿哲'],
      },
      {
        topic: '私驿与旧仓库',
        lowTrustClaim: '夜里看不清，别问我。',
        midTrustClaim: '后港有小船不走钟楼。',
        highTrustTruth: '先拿私驿路线，再去问铁箱钥匙，不然仓库只会白跑。',
        revealThreshold: 58,
        leadFlag: 'lead_private_route',
        topicKeywords: ['私驿', '小船', '后港', '仓库', '路线'],
      },
      {
        topic: '旧案索引线',
        lowTrustClaim: '旧案你去问官面的人。',
        midTrustClaim: '诺埃尔手里可能有索引。',
        highTrustTruth: '你先拿到调档权限，再逼诺埃尔给案号顺序。',
        revealThreshold: 68,
        leadFlag: 'lead_old_case_index',
        topicKeywords: ['旧案', '索引', '诺埃尔', '案号', '调档'],
      },
    ],
    repairHooks: ['先说明不会让她独自背书', '确认你会保护互助摊', '把问题聚焦到她亲眼所见'],
  },
  {
    id: 'noel',
    name: '诺埃尔',
    age: 29,
    appearance: '公证所抄录员，指尖常带墨渍，说话慢，习惯先整理纸张再开口。',
    personality: '谨慎、自保、记性极好。既怕出事，也怕真相烂在柜子里。',
    role: '公证所抄录员 / 档案入口节点',
    locationId: 'notary_hall',
    initialTrust: 24,
    knowledge: `
- 近三年“晚到重组”案件存在重复模板
- 手续费暗码确实出现在公证账边栏
- 双回执曾被短暂登记后又被抽走
`,
    ignorance: `
- 不确定魏德会不会供出全部中间人
- 不知道莉娜是否清楚自己被当作挡箭牌
`,
    dialogueStyle: '含蓄、保留、句子偏短。信任足够前只给你“半句真话”。',
    trustThresholds: [
      { level: 42, description: '承认异常', unlocksInfo: '承认旧案模式重复' },
      { level: 58, description: '给费码入口', unlocksInfo: '指出公证暗账费码位置' },
      { level: 72, description: '交出索引顺序', unlocksInfo: '提供七起旧案可复核案号链' },
    ],
    lifeCard: {
      publicFace: '安静的抄录员，负责把案子抄进柜子。',
      privateNeed: '保住饭碗，也保住自己没成为共犯的底线。',
      coreFear: '一旦站错队，先丢工作再丢安全。',
      tabooTopics: ['逼他当众承认伪造', '嘲讽其“写字匠”身份', '让他跳过程序直接偷档'],
      speechTraits: ['慢速陈述', '习惯引用编号', '喜欢用“按记录来说”起句'],
    },
    relationshipEdges: [
      { targetNpcId: 'matthew', type: '文书上下级', heat: 57, dependency: '调档和封存指令来自马修体系' },
      { targetNpcId: 'weide', type: '灰线接触', heat: 71, dependency: '费码与代投资料互相咬合', sharedSecretId: 'fee_code_chain' },
      { targetNpcId: 'sara', type: '被观察', heat: 44, dependency: '常被街坊盯梢其夜间动向' },
      { targetNpcId: 'lina', type: '间接冲突', heat: 50, dependency: '驿站延迟案牵出公证风险' },
    ],
    lieModel: [
      {
        topic: '费码暗账',
        lowTrustClaim: '公证账都按格式写的。',
        midTrustClaim: '边栏缩写不一定有问题。',
        highTrustTruth: '“F-7”那列就是代投手续费入口，能和晚送记录对上。',
        revealThreshold: 58,
        leadFlag: 'lead_notary_fee_code',
        topicKeywords: ['费码', 'F-7', '缩写', '手续费', '暗账'],
      },
      {
        topic: '旧案索引',
        lowTrustClaim: '卷宗太多，查不过来。',
        midTrustClaim: '有一份内部索引，但不对外。',
        highTrustTruth: '七起案子在同一索引链上，按年份逆序查最快。',
        revealThreshold: 70,
        leadFlag: 'lead_old_case_index',
        topicKeywords: ['索引', '七起', '旧案', '年份', '案号'],
      },
    ],
    repairHooks: ['先给他合法调档理由', '避免当面定性其共犯身份', '按编号提问会显著降低其防御'],
  },
];
