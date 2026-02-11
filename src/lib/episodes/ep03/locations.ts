import { Location } from '../../types';

export const locations: Location[] = [
  {
    id: 'city_gate',
    name: '第七层入口广场',
    description:
      '穹顶屏幕滚动播报“配给稳定、秩序优先”。人群在安检线前沉默排队，只有孩子的咳嗽声偶尔刺破广播噪音。',
    connectedTo: ['ration_hall', 'mutual_station', 'gray_market'],
    npcsPresent: ['aji'],
    searchableItems: [
      {
        id: 'gate_bulletin_wall',
        description: '公示墙上贴着本周配给缺口统计和分级通知。',
        clueId: 'A1',
      },
      {
        id: 'gate_rumor_channel',
        description: '匿名频道里有人断言“养育降级都是收钱办事”。',
        clueId: 'X1',
      },
    ],
  },
  {
    id: 'ration_hall',
    name: '配给审理厅',
    description:
      '审理厅冷白灯一刻不停，电子印章落下时没有回声。每一份请求都被编号、压缩、等待系统裁决。',
    connectedTo: ['city_gate', 'data_archive', 'core_ring'],
    npcsPresent: ['yanche'],
    searchableItems: [
      {
        id: 'custody_degrade_notice',
        description: '终端里留着“临时抚养资格降级”的正式通知。',
        clueId: 'A2',
      },
      {
        id: 'hearing_desk',
        description: '审理台抽屉里放着未签发的核心环临时通行签。',
        itemId: 'core_ring_pass',
        requiresFlag: 'lead_credit_rule',
        blockedNarrative:
          '你摸到抽屉边缘就被权限锁弹回。没有弄懂信用规则豁免链，这张通行签不会对你开放。',
      },
    ],
  },
  {
    id: 'mutual_station',
    name: '社区互助站',
    description:
      '互助站里堆满旧毯和药盒，墙角挂着手写“先救急、后记账”。人情还在，但每个人都被配额勒得喘不过气。',
    connectedTo: ['city_gate', 'shelter_block'],
    npcsPresent: ['yulan', 'qinsao'],
    searchableItems: [
      {
        id: 'station_medicine_sheet',
        description: '药品领用册显示小柏的心肺药在三天前被中断。',
        clueId: 'A3',
      },
      {
        id: 'station_blame_gossip',
        description: '有人传余岚拿了灰市好处才被降级。',
        clueId: 'X2',
      },
    ],
  },
  {
    id: 'shelter_block',
    name: '庇护居住区',
    description:
      '狭窄走廊里挤着折叠床和简易储物箱，警报灯每隔几分钟闪一次。罗岑带队巡查，所有对话都像在压低音量。',
    connectedTo: ['mutual_station', 'gray_market'],
    npcsPresent: ['xiaobo', 'luocen'],
    searchableItems: [
      {
        id: 'shelter_family_drawer',
        description: '抽屉里压着一叠孩子画，背面是余岚手写的生日口令。',
        clueId: 'B2',
        requiresFlag: 'met_xiaobo',
        blockedNarrative:
          '你不认识这家人的生活轨迹，翻到的只是几张无从判断的旧纸。',
      },
    ],
  },
  {
    id: 'gray_market',
    name: '下层灰市',
    description:
      '灰市藏在废弃风道后，摊位上摆着拆机芯片和无编号药片。每个人都说“只是讨生活”，但谁都知道这里有另一套路由。',
    connectedTo: ['city_gate', 'shelter_block', 'defense_spire'],
    npcsPresent: ['zheya'],
    searchableItems: [
      {
        id: 'ration_router_cache',
        description: '路由缓存盒里存着被改写过的配给转发链。',
        clueId: 'C1',
        requiresLeads: ['lead_supply_reroute'],
        requiresNpcContact: ['zheya'],
        blockedNarrative:
          '缓存盒里全是碎片日志。没拿到灰市路由线和折鸦口风时，你只能看见噪音。',
      },
    ],
  },
  {
    id: 'data_archive',
    name: '抄录档案脊',
    description:
      '一排排冷柜沿着轨道向上延伸，闻笙坐在最里面手动校对。档案被分层封存，只有权限和关键词都对上才会开口。',
    connectedTo: ['ration_hall', 'core_ring'],
    npcsPresent: ['wensheng'],
    searchableItems: [
      {
        id: 'care_archive_terminal',
        description: '终端里有抚养记录镜像库，可比对回填痕迹。',
        clueId: 'C4',
        requiresLeads: ['lead_care_record_gap'],
        requiresNpcContact: ['wensheng'],
        blockedNarrative:
          '你调取了几个普通档案，记录看起来完整无缺。没有缺口索引时，这台终端不会给你关键镜像。',
      },
    ],
  },
  {
    id: 'core_ring',
    name: '核心维护环',
    description:
      '环形机房低频轰鸣，补丁灯带按秒跳动。贺沉守着维护台，阿寂在旁边盯着一面不断刷新分层图的屏幕。',
    connectedTo: ['ration_hall', 'data_archive', 'defense_spire', 'layer0_vault'],
    npcsPresent: ['hechen', 'aji'],
    searchableItems: [
      {
        id: 'core_maintenance_bay',
        description: '维护舱内保存着近七天的补丁回滚与签名记录。',
        clueId: 'C3',
        requiresFlag: 'can_enter_core_ring',
        requiresLeads: ['lead_core_backdoor'],
        blockedNarrative:
          '维护舱只给你读到公开日志。没有核心后门线索和通行权限，关键签名页不会显示。',
      },
    ],
  },
  {
    id: 'defense_spire',
    name: '防线观测塔',
    description:
      '观测塔外壁布满修补痕迹，塔内不断回放前线告警。沈迢站在黑屏前不肯离开，像在守一份没人敢看的名单。',
    connectedTo: ['gray_market', 'core_ring'],
    npcsPresent: ['shentiao'],
    searchableItems: [
      {
        id: 'defense_blackbox',
        description: '黑匣子模块记录着防线伤亡明细与删改痕迹。',
        clueId: 'C2',
        itemId: 'breach_hash_key',
        requiresLeads: ['lead_breach_suppressed'],
        requiresNpcContact: ['shentiao'],
        blockedNarrative:
          '黑匣子只回你一句“无授权”。没有防线压制线和沈迢的接触背书，你拿不到实质记录。',
      },
    ],
  },
  {
    id: 'layer0_vault',
    name: '第零层冷库',
    description:
      '冷库深处静得可怕，只有旧式磁盘阵列在慢慢转动。这里保存的不是案件，而是每次“必须被删掉”的版本差分。',
    connectedTo: ['core_ring'],
    npcsPresent: [],
    searchableItems: [
      {
        id: 'layer0_cold_vault',
        description: '冷库主阵列里封存着双账本和协议签名差分。',
        clueId: 'C5',
        requiresFlag: 'can_enter_core_ring',
        requiresItem: 'breach_hash_key',
        requiresLeads: ['lead_zero_layer_protocol'],
        blockedNarrative:
          '冷库阵列拒绝你的索引请求。你缺少第零层协议线，且没有足够校验材料。',
      },
      {
        id: 'layer0_fake_manifest',
        description: '一份过时清单把高维告警标注成“训练噪音”。',
        clueId: 'X3',
      },
    ],
  },
];
