import { Location } from '../../types';

export const locations: Location[] = [
  {
    id: 'harbor_gate',
    name: '灰石港栈桥口',
    description:
      '潮湿的海风夹着煤灰味吹过栈桥。码头工和商贩围在公告栏前，吵着“掌柜害死人”的旧账。远处钟楼每敲一下，人群就更躁动一分。',
    connectedTo: ['relay_station', 'wharf_office', 'court_square'],
    npcsPresent: ['sara'],
    searchableItems: [
      {
        id: 'harbor_bulletin',
        description: '公告栏上贴着讣告、收文登记和催债告示。',
        clueId: 'A2',
      },
      {
        id: 'harbor_gossip',
        description: '码头工人的闲聊里反复提到“阿哲偷货”的旧事。',
        clueId: 'X2',
      },
    ],
  },
  {
    id: 'relay_station',
    name: '山港驿站',
    description:
      '驿站木梁被潮气泡得发黑，墙上挂着按时序排好的回执袋。柜台后的铜铃轻轻晃动，像在催人把每一刻都算清楚。',
    connectedTo: ['harbor_gate', 'alley_lane'],
    npcsPresent: ['lina'],
    searchableItems: [
      {
        id: 'relay_logbook',
        description: '柜台后一本厚重日志，页角被反复翻折。',
        clueId: 'A1',
      },
      {
        id: 'relay_shelf',
        description: '暂存格里塞着一叠旧回执，最底下那封有莉娜签名。',
        clueId: 'A3',
      },
      {
        id: 'relay_quarrel_note',
        description: '欠账本里夹着一张争执记录，写着乔安与莉娜的口角。',
        clueId: 'X1',
      },
    ],
  },
  {
    id: 'wharf_office',
    name: '码头账房',
    description:
      '账房里算盘声断断续续，木柜上堆满货票与借据。窗外能看见私驿小船靠岸，来回比官船快，却不走登记流程。',
    connectedTo: ['harbor_gate', 'old_warehouse'],
    npcsPresent: ['weide'],
    searchableItems: [
      {
        id: 'wharf_floor_panel',
        description: '地板夹层里压着一卷手绘路线图。',
        clueId: 'C3',
        requiresLeads: ['lead_private_route'],
        blockedNarrative:
          '你掀开地板缝隙，只看到一层杂物灰和旧账角。没有人先把私驿线头说破，这里看上去只像港口最普通的脏地方。',
      },
      {
        id: 'weide_desk_note',
        description: '账桌边角压着几张加急单，日期被反复涂改。',
      },
    ],
  },
  {
    id: 'court_square',
    name: '镇务审理厅',
    description:
      '一座临时改造的审理厅，木椅挤满围观镇民。马修把证据箱摆在桌面中央，表情克制，却藏不住熬夜后的疲色。',
    connectedTo: ['harbor_gate', 'notary_hall'],
    npcsPresent: ['matthew'],
    searchableItems: [
      {
        id: 'court_desk',
        description: '审理台侧边放着待签发的调档文书。',
        itemId: 'inspection_writ',
      },
    ],
  },
  {
    id: 'notary_hall',
    name: '公证所档案室',
    description:
      '档案室狭窄阴冷，柜门上贴着年份标签。纸张受潮卷起，墨迹在灯下泛出灰绿光，看久了像一层旧伤。',
    connectedTo: ['court_square'],
    npcsPresent: ['noel'],
    searchableItems: [
      {
        id: 'notary_hidden_ledger',
        description: '最里层账柜夹着一本没有编号的手续费账本。',
        clueId: 'C2',
        requiresFlag: 'can_search_notary_archive',
        requiresLeads: ['lead_notary_fee_code'],
        blockedNarrative:
          '你翻遍了档柜，只看到按规矩摆好的常规账册。没有费码入口，这里只会给你一个“程序一切正常”的表面。',
      },
      {
        id: 'notary_old_cases',
        description: '旧案卷宗按年份捆扎，里面有多起“晚到重组”记录。',
        clueId: 'C4',
        requiresFlag: 'can_search_notary_archive',
        requiresLeads: ['lead_old_case_index'],
        blockedNarrative:
          '卷宗堆得像墙，没有索引线就只能盲翻。你会看到很多年份，却抓不到那批真正重复吃人的旧案。',
      },
    ],
  },
  {
    id: 'alley_lane',
    name: '贫民巷',
    description:
      '石板巷道潮湿狭窄，屋檐低得几乎压住人。阿哲家的门板钉着催债纸条，风一吹就沙沙作响。',
    connectedTo: ['relay_station'],
    npcsPresent: ['azhe'],
    searchableItems: [
      {
        id: 'azhe_debt_notice',
        description: '门框上的催债文书写着“逾期可申请代监护”。',
      },
    ],
  },
  {
    id: 'old_warehouse',
    name: '山港旧仓库',
    description:
      '旧仓库铁门生锈，空气里全是潮木和机油味。角落堆着无人认领的封包，封泥完好，却没有对应登记。',
    connectedTo: ['wharf_office'],
    npcsPresent: [],
    searchableItems: [
      {
        id: 'warehouse_iron_box',
        description: '一只上锁铁箱，箱缝里露出两张编号相同的回执边角。',
        clueId: 'C1',
        itemId: 'duplicate_receipt_copy',
        requiresLeads: ['lead_warehouse_key'],
        requiresNpcContact: ['weide'],
        blockedNarrative:
          '你试着撬开铁箱，却被双层锁卡死。没有钥匙链线索和魏德那头的交接信息，这里只会让你看见“有问题”，却拿不出能入档的真东西。',
      },
      {
        id: 'warehouse_fake_stamp_rumor',
        description: '散落货单提到外地商队卖假印章的传闻。',
        clueId: 'X3',
      },
    ],
  },
];
