import { RouteDefinition } from '../../types';

export const routes: RouteDefinition[] = [
  {
    id: 'se_duplicate_night',
    name: '同编号之夜',
    subtitle: 'Secret Ending',
    type: 'SE',
    priority: 95,
    conditions: {
      requiredClues: ['C1', 'C3'],
      requiredFlags: ['suspects_tampered_record', 'can_search_notary_archive'],
      requiredNpcContacts: ['weide', 'noel', 'matthew'],
      requiredNpcLeadCount: 3,
    },
    narrative: `你把双份同编号回执、私驿路线图和调档记录一并摊开，审理厅里先是一静，随后连钟楼外的人声都像慢了半拍。

马修盯着那两个编号，久久没有落槌。
“同编号、同官印、不同日期。若这两份都是真的，那假的就不是某个人的证词——是整套公开记录。”

诺埃尔脸色一下白了，终于承认那份材料曾被抽换过。
魏德也低声补上后港绕钟楼的路线，说明这不是偶发失误，而是有人先制造时间差，再给时间差写出一个能上柜的版本。

莉娜抬起头，像终于从“最后一环责任人”这个位置上挪开了一寸。
可厅里没人觉得轻松。因为从这一刻起，灰石港要面对的问题已经不是谁晚送了半天，而是谁一直在替这套秩序改写版本。

案件被迫冻结重审。你离开审理厅时，钟楼指针忽然轻轻倒跳了一格，像有只看不见的手，在更深处替所有结论重新编号。

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
      requiredClues: ['B2', 'C1', 'C2', 'C4'],
      requiredFlags: ['exposed_proxy_network', 'exposed_notary_ring'],
      minClueCount: [{ tier: 'C', count: 3 }],
      requiredNpcContacts: ['weide', 'noel', 'matthew'],
      requiredNpcLeadCount: 4,
    },
    narrative: `你把“晚送两日交易”、代投暗账、七起旧案和双回执串成一条完整的链，审理厅里第一次没人能再把问题缩回“掌柜违规”四个字。

马修看完所有材料，终于改口：
“本案暂停定罪。先查代投、公证、旧案重组链。”

这一句落下去，广场上的骂声反而更大了。
因为所有人都开始意识到，过去三年每一次“晚半步”，都可能不是倒霉，而是一门有人吃、有人分、有人默许的生意。

魏德站出来作证时，手一直在抖。诺埃尔把索引顺序补齐时，声音低得几乎像在认罪。
你看见的不是坏人伏法的爽快，而是一整套靠时间差活着的人，被迫从同一条秩序里倒出来。

制度开始纠偏，但代价先落在最脆弱的节点上。
几天后，魏德被流放，港口说他“背乡”；诺埃尔也被调离，再没有人提那七起旧案时用了怎样的口气。

灰石港没有立刻变好，它只是第一次不得不承认：程序的冷，不是天灾，是被人经营出来的。

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
    narrative: `你在审理厅里先承认“延迟确实存在”，随后把监护围猎、阿哲的处境和代投链的时间差交易一并摆出来。

你没有替莉娜洗白。你只是证明了：她确实违规，但她拖住的那半步，不是为了自己收钱，而是为了让一个孩子别在抚恤到账前先被合法分走。

马修沉默很久，最终把判词改成：
“违规成立，但动机并非谋私。改判轻责，保留驿站职务观察，同时冻结针对阿哲的监护处置。”

阿哲当场哭了，手里那段旧布条被攥得发皱。
莉娜没回头，只骂了一句“别哭，站直”。
可她说完这句，自己先红了眼眶。

代投链被切断了一截，阿哲保住了家。灰石港没有因此变暖，只是第一次有人把“程序伤人”几个字带回了制度桌面。

乔安还是死了。那封本该准时抵达的回执，也再不会替她活回来。

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
    narrative: `你提交的结论完全符合程序：回执延迟，责任人明确，证据闭环，案件可以按最省事的方式结束。

马修依章定罪。莉娜被带离驿站时没有辩解，只低声说了一句：
“行，按规矩来。”

广场很快就安静了。有人说总算有个交代，有人说早该这样。码头照常开工，互助摊继续摆，钟楼照旧报时，整座镇像什么都没发生过。

只有阿哲还蹲在门口，盯着那扇被封条贴住的窗，半天没动。

真正靠时间差挣钱的人，在人群里悄悄松了口气。
灰石港恢复了它最擅长的秩序：把最后一环推出去，让剩下的人继续把这种冷叫作正常。

——「按章定罪」`,
    rewards: { echoPoints: 80, destinyChange: -12 },
  },
];
