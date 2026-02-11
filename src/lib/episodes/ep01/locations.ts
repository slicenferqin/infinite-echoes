import { Location } from '../../types';

export const locations: Location[] = [
  {
    id: 'bridge',
    name: '村口石桥',
    description:
      '一座跨溪石桥连着外路和鸦石村。桥面潮湿，铁锈色水痕沿缝隙渗开。桥头人来人往，却没人愿在这里久站。',
    connectedTo: ['square', 'mountain_path'],
    npcsPresent: ['nora'],
    searchableItems: [
      {
        id: 'bridge_view',
        description: '站在桥头俯看村子，你能分辨出宅邸、酒馆、铁匠铺的相对位置。',
      },
    ],
  },
  {
    id: 'square',
    name: '村中广场',
    description:
      '广场不大，却是全村口风最杂的地方。井边人群一散一聚，谁都在看谁先表态。',
    connectedTo: ['bridge', 'forge', 'tavern', 'elder_house', 'miners_quarter', 'clinic'],
    npcsPresent: [],
    searchableItems: [
      {
        id: 'well_gossip',
        description: '井沿附近的闲谈里，反复出现“该尽快定罪”的声音。',
      },
    ],
  },
  {
    id: 'forge',
    name: '铁匠铺（案发现场）',
    description:
      '铁砧和火炉都还在原位，门前血痕被草草洗过。越靠近后门，越能闻到潮泥和焦炭混合的味道。',
    connectedTo: ['square', 'clinic'],
    npcsPresent: [],
    searchableItems: [
      {
        id: 'forge_ledger',
        description: '工作台上有本厚账册，纸角翻卷，最近几页有匆忙涂改痕迹。',
        clueId: 'A1',
      },
      {
        id: 'forge_bloodstain',
        description: '门槛附近清洗过的深色痕迹，喷溅方向仍有残留。',
        clueId: 'A4',
      },
      {
        id: 'forge_backdoor',
        description: '后门泥地有一串被踩乱的脚印，边缘仍能看出鞋底纹路。',
        clueId: 'B4',
        requiresLeads: ['lead_renn_shoesize'],
        blockedNarrative: '你蹲在泥地看了很久，只能确认“有脚印”，但没有参照信息，暂时无法判定指向谁。',
      },
      {
        id: 'forge_floor',
        description: '工作台下有块石板松动，像是被人反复掀起又压回。',
        clueId: 'C2',
        requiresLeads: ['lead_hank_midnight_work'],
        requiresNpcContact: ['hank'],
        blockedNarrative: '你撬了几次石板边缘，却总觉得缺了关键判断。没有人证支撑，你只能先作罢。',
      },
    ],
  },
  {
    id: 'tavern',
    name: '醉鸦亭',
    description:
      '木门一推就吱呀作响。酒气、炖肉味和人声混在一起，角落那张牌桌像被人刻意留着没收拾。',
    connectedTo: ['square'],
    npcsPresent: ['martha'],
    searchableItems: [
      {
        id: 'tavern_card_table',
        description: '牌桌边有碎杯渣和划痕，筹码位置很凌乱。',
        clueId: 'B1',
        requiresNpcContact: ['martha'],
        blockedNarrative: '你看见了桌上的狼藉，却看不出它和命案的直接关系。先和酒馆里的人把话聊透更稳妥。',
      },
    ],
  },
  {
    id: 'elder_house',
    name: '村长宅邸',
    description:
      '石宅两层，外表体面，走廊里却透着压抑。门口来往的人都刻意压低声音，像怕惊动谁。',
    connectedTo: ['square', 'cellar'],
    npcsPresent: ['edmond', 'renn'],
    searchableItems: [
      {
        id: 'elder_study_key',
        description: '大厅长桌抽屉里压着一把细铜钥匙。',
        itemId: 'study_key',
        requiresFlag: 'can_search_house',
      },
      {
        id: 'renn_room',
        description: '二楼雷恩的房门半掩，屋里有翻找过又匆忙复位的痕迹。',
        clueId: 'B5',
        requiresFlag: 'can_search_house',
        requiresLeads: ['lead_renn_room'],
        blockedNarrative: '房间看起来并无异常。你缺少能锁定“要找什么”的调查引导，翻了半天也只剩空耗。',
      },
      {
        id: 'elder_study',
        description: '一楼尽头书房，门锁很新，门框却有老旧划痕。',
        clueId: 'C5',
        requiresFlag: 'can_enter_study',
        requiresLeads: ['lead_edmond_hidden_docs'],
        requiresNpcContact: ['hank'],
        blockedNarrative: '你进了书房也只看到一堆普通公文。没有内情导向，最关键的东西像从指缝里溜走。',
      },
    ],
  },
  {
    id: 'cellar',
    name: '宅邸地窖',
    description:
      '石阶往下潮气很重，墙上铁环锈迹斑斑。汉克被锁在角落，地上散着药布和旧水桶。',
    connectedTo: ['elder_house'],
    npcsPresent: ['hank'],
    requiresItem: 'cellar_key',
    searchableItems: [
      {
        id: 'hank_hands',
        description: '汉克手上的割伤与抓握痕迹层叠，像做过“拔出”动作而非“刺入”动作。',
        clueId: 'A3',
      },
    ],
  },
  {
    id: 'miners_quarter',
    name: '矿工棚屋区',
    description:
      '一排木棚靠着山脚，铁镐和麻绳随手挂在檐下。这里说话直，但每句话都带着饭碗分量。',
    connectedTo: ['square', 'mountain_path'],
    npcsPresent: ['gareth'],
    searchableItems: [
      {
        id: 'miners_gossip',
        description: '几名矿工围着火盆议论，口风在“护乡里”与“保命”之间反复。',
      },
    ],
  },
  {
    id: 'clinic',
    name: '村医诊所',
    description:
      '诊所不大，木柜里塞满药草和旧病历。门口总有等药的人，气氛比别处安静，却更沉。',
    connectedTo: ['square', 'forge'],
    npcsPresent: ['mila'],
    searchableItems: [
      {
        id: 'clinic_records',
        description: '案发后几日的简易诊疗记录，字迹工整，备注很细。',
        clueId: 'A2',
        requiresNpcContact: ['mila'],
        blockedNarrative: '你翻到几页记录，却看不懂其中关键标注。没有村医解释，这些字只是字。',
      },
      {
        id: 'clinic_herb_chest',
        description: '药柜最下层有安神草与止血药，近期取用频率明显偏高。',
      },
    ],
  },
  {
    id: 'mountain_path',
    name: '村后山道',
    description:
      '山道狭窄，泥地松软，灌木被人踩得东倒西歪。越往里走越安静，只剩风声。',
    connectedTo: ['bridge', 'miners_quarter'],
    npcsPresent: [],
    searchableItems: [
      {
        id: 'path_tracks',
        description: '泥地里有窄轮车辙，方向朝山里。',
        clueId: 'C3',
      },
    ],
  },
];
