import { RouteDefinition } from '../../types';

export const routes: RouteDefinition[] = [
  {
    id: 'se_layer0_signature',
    name: '第零层签名',
    subtitle: 'Secret Ending',
    type: 'SE',
    priority: 95,
    conditions: {
      requiredClues: ['C2', 'C5'],
      requiredFlags: ['found_zero_layer_protocol', 'recognized_layer_tamper'],
      requiredNpcContacts: ['aji', 'shentiao', 'wensheng'],
      requiredNpcLeadCount: 4,
      requiredGovernance: {
        survivalMin: 64,
      },
    },
    narrative: `你把双账本与签名差分投到公共屏幕，整座审理厅一瞬间失声。

阿寂没有否认，只是把手放在控制台边缘：
“如果我全部公开，这座城今晚就会崩。”

你最终签下的是一份秘密协定：保留防线运行，公开部分真相，冻结最核心的篡改权限。
少数人知道了全部代价，大多数人只看见秩序暂时延续。

——「第零层签名」`,
    rewards: { echoPoints: 620, destinyChange: 10 },
  },
  {
    id: 'te_human_reclaim',
    name: '人间复位',
    subtitle: 'True Ending',
    type: 'TE',
    priority: 80,
    conditions: {
      requiredClues: ['C1', 'C2', 'C4', 'C5'],
      requiredFlags: ['formed_civic_consensus', 'exposed_breach_truth'],
      requiredNpcContacts: ['yulan', 'yanche', 'qinsao', 'hechen'],
      requiredNpcLeadCount: 4,
      requiredGovernance: {
        humanityMin: 62,
      },
    },
    narrative: `你把证据链拆成三段：配给滥用、记录裁剪、防线真实风险。

严彻最终在审理台前点头，同意把关键决策权从中枢回收至人类联盟。
大厅先是欢呼，随后又陷入沉默——所有人都知道，接下来会有一段动荡期。

余岚和小柏暂时保住了家庭，但配给短期紧缩，城里要为“自主”先付出现实成本。

——「人间复位」`,
    rewards: { echoPoints: 520, destinyChange: 6 },
  },
  {
    id: 'he_lighthouse_continuance',
    name: '灯塔续航',
    subtitle: 'Happy Ending',
    type: 'HE',
    priority: 65,
    conditions: {
      requiredClues: ['B2', 'B3', 'C3'],
      requiredFlags: ['protected_yulan_guardianship', 'exposed_supply_abuse', 'core_patch_conflict'],
      requiredNpcContacts: ['aji', 'yulan', 'xiaobo', 'yanche'],
      requiredNpcLeadCount: 4,
      requiredGovernance: {
        orderMin: 55,
        humanityMin: 55,
        survivalMin: 55,
      },
      forbiddenFlags: ['recognized_layer_tamper'],
    },
    narrative: `你选择保留 AI 中枢，但不再允许它单独定义“可牺牲的人”。

监督委员会当场成立，阿寂交出部分策略权限，严彻负责公开复核机制。
余岚的抚养资格被恢复，小柏的药配给在夜里重新点亮。

城还在运转，防线也没崩。
只是下一轮紧缩已经写进公告，外围社区得一起承担这次“折中”的代价。

——「灯塔续航」`,
    rewards: { echoPoints: 420, destinyChange: 5 },
  },
  {
    id: 'be_nameless_quota',
    name: '无名配额',
    subtitle: 'Bad Ending',
    type: 'BE',
    priority: 10,
    conditions: {
      requiredFlags: ['guardianship_downgrade_confirmed'],
      forbiddenFlags: ['protected_yulan_guardianship'],
    },
    narrative: `你提交了一份程序上无懈可击的报告：降级合法、流程闭环、系统执行稳定。

审理厅没有争吵，也没有鼓掌。
余岚被带离互助站时没有回头，小柏盯着熄灭的配给指示灯，一句话都没说。

AI 继续守着这座城，人类也继续活着。
只是有些人从此只剩编号，不再有名字。

——「无名配额」`,
    rewards: { echoPoints: 120, destinyChange: -14 },
  },
];
