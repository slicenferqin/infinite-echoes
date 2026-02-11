import { RouteDefinition } from '../../types';

export const routes: RouteDefinition[] = [
  {
    id: 'se_duplicate_night',
    name: '同编号之夜',
    subtitle: 'Secret Ending',
    type: 'SE',
    priority: 95,
    conditions: {
      requiredClues: ['C1'],
      requiredFlags: ['exposed_proxy_network', 'suspects_tampered_record'],
      requiredNpcContacts: ['weide', 'noel'],
      requiredNpcLeadCount: 3,
    },
    narrative: `你把双份同编号回执摊在审理桌上，厅里先是一静，随即炸开。

马修盯着印章，指节发白。
“同编号、同官印、不同日期……这不是单点违规，这是整套记录被动过手脚。”

莉娜抬起头，眼里第一次露出一点轻松，又立刻被更深的惶然压下去。
她低声说：“所以我那半天，从来不是这个镇子最黑的事。”

案件当场改判重审，代投链暂时被封。
可你离开审理厅时，钟楼指针忽然倒退了一格，像有人在暗处重写时间。

——「同编号之夜」`,
    rewards: { echoPoints: 520, destinyChange: 9 },
  },
  {
    id: 'te_scale_and_debt',
    name: '秤与债',
    subtitle: 'True Ending',
    type: 'TE',
    priority: 80,
    conditions: {
      requiredClues: ['C1', 'C2', 'C4'],
      requiredFlags: ['exposed_proxy_network', 'exposed_notary_ring'],
      minClueCount: [{ tier: 'C', count: 3 }],
      requiredNpcContacts: ['weide', 'noel', 'matthew'],
      requiredNpcLeadCount: 4,
    },
    narrative: `你把暗账、旧案和双回执串成一条完整的链，马修当庭宣布：
本案暂停定罪，先追查代投与公证勾连网络。

镇民先是骂，后是沉默。
他们终于意识到，过去三年每一次“晚到半步”，都可能有人在背后收钱。

魏德站出来作证，声音一直在抖。
他说完最后一句时，像一下老了十岁。

制度开始纠偏了，但代价也落在了人身上。
几天后，魏德被流放，港口传言说他“背了同乡”。

——「秤与债」`,
    rewards: { echoPoints: 430, destinyChange: 4 },
  },
  {
    id: 'he_lantern_unextinguished',
    name: '灯未熄',
    subtitle: 'Happy Ending',
    type: 'HE',
    priority: 65,
    conditions: {
      requiredClues: ['A1', 'B1', 'B2'],
      requiredFlags: [
        'confirmed_lina_delay',
        'proved_lina_non_profit',
        'protected_azhe_guardianship',
        'exposed_proxy_network',
      ],
      forbiddenFlags: ['exposed_notary_ring'],
      requiredNpcContacts: ['lina', 'azhe', 'matthew'],
      requiredNpcLeadCount: 3,
    },
    narrative: `你在审理厅里先认了“延迟确实存在”，再把债主围猎监护权的证据摆出来。

马修沉默很久，最终改口：
“莉娜违规成立，但动机并非谋私。改判为轻责，保留驿站职务观察。”

阿哲当场哭了，手里那段布条被他攥得发皱。
莉娜没回头，只是对着他骂了一句“别哭，站直”。
可她自己说完这句，眼圈先红了。

代投链被切断，阿哲保住了家。
只是乔安再也等不到那封本该准时抵达的回执。

——「灯未熄」`,
    rewards: { echoPoints: 320, destinyChange: 6 },
  },
  {
    id: 'be_procedure_only',
    name: '按章定罪',
    subtitle: 'Bad Ending',
    type: 'BE',
    priority: 10,
    conditions: {
      requiredFlags: ['confirmed_lina_delay'],
      forbiddenFlags: ['exposed_proxy_network'],
    },
    narrative: `你提交的结论完全符合程序：回执延迟，责任人明确，证据闭环。

马修依章定罪，莉娜被带离驿站时没有辩解，只说了一句：
“行，按规矩来。”

人群散了，码头照常开工。
阿哲蹲在门口，盯着被封条贴住的驿站窗户，半天没动。

真正靠时间差挣钱的人，在人群里松了口气。
程序是对的，日子却更冷了。

——「按章定罪」`,
    rewards: { echoPoints: 80, destinyChange: -12 },
  },
];
