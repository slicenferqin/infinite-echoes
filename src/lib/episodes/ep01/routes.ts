import { RouteDefinition } from '../../types';

export const routes: RouteDefinition[] = [
  {
    id: 'se_seventh_name',
    name: '第七个名字',
    subtitle: 'Secret Ending',
    type: 'SE',
    priority: 90,
    conditions: {
      requiredClues: ['C5'],
      requiredFlags: ['accused_renn', 'exposed_edmond_conspiracy'],
      requiredNpcContacts: ['hank', 'edmond', 'mila'],
      requiredNpcLeadCount: 3,
    },
    narrative: `当你把密信摊在执法官案桌上，广场忽然静到只剩风声。

这不再只是“谁杀了费恩”。
而是一个村长如何把父子、乡里和审判一起拖进泥里。

艾德蒙看着信纸，声音却还稳：
“你揭了我，矿权也不会停。你真觉得他们会放过这村子？”

没人立刻回答。
但第一次，村里人不是看他的脸色，而是看彼此。

你离开时，诺拉没有追上来。
她站在铁匠铺门口，握着拳，像在和过去告别。

——「第七个名字」`,
    rewards: { echoPoints: 500, destinyChange: 8 },
  },
  {
    id: 'te_no_innocence',
    name: '无人清白',
    subtitle: 'True Ending',
    type: 'TE',
    priority: 70,
    conditions: {
      minClueCount: [{ tier: 'B', count: 3 }],
      requiredFlags: ['accused_renn', 'hank_secret_exposed'],
      requiredNpcContacts: ['hank', 'martha', 'gareth'],
      requiredNpcLeadCount: 2,
    },
    narrative: `真相被你一层层剥开，谁也无法再退回“没看见”的位置。

雷恩被押走，艾德蒙失势。
汉克也被带走——他是冤案受害者，却同样触犯重罪。

诺拉站在空铁匠铺门口，没有哭。
她只是把围裙抱在怀里，肩膀绷得笔直。

你做的是程序上最完整的裁断。
可当风从广场吹过，你仍会问自己：
公义落地那一刻，为什么这么冷。

——「无人清白」`,
    rewards: { echoPoints: 400, destinyChange: 3 },
  },
  {
    id: 'he_late_justice',
    name: '迟来的清白',
    subtitle: 'Happy Ending',
    type: 'HE',
    priority: 60,
    conditions: {
      minClueCount: [{ tier: 'B', count: 3 }],
      requiredFlags: ['accused_renn', 'protected_hank_secret'],
      forbiddenFlags: ['hank_secret_exposed'],
      requiredNpcContacts: ['hank', 'nora', 'renn'],
      requiredNpcLeadCount: 2,
    },
    narrative: `你在众人面前把证据摆成一条完整链条。

雷恩先是辩解，随后崩溃跪地。
艾德蒙想再说“规矩”，却第一次接不上话。

汉克被放出地窖时，阳光刺得他眯起眼。
诺拉冲过去抱住他，像终于能把那口气哭出来。

村里没有一夜翻新。
但至少，这一次不是靠谁嗓门大来定生死。

临别前，诺拉把一枚粗铁戒塞进你掌心：
“我爹说，欠你一命。”

——「迟来的清白」`,
    rewards: { echoPoints: 300, destinyChange: 5 },
  },
  {
    id: 'be_silence',
    name: '沉默蔓延',
    subtitle: 'Bad Ending',
    type: 'BE',
    priority: 10,
    conditions: {},
    narrative: `执法官按时进村，审判快得像例行公事。

汉克直到最后都没说出能翻案的话。
村里人也没人愿意再多承担一句证词。

诺拉的哭声穿过广场，却没人接住。

你并非什么都没做。
只是你撬开的，还不够改变这张人情和利益织成的网。

——「沉默蔓延」`,
    rewards: { echoPoints: 50, destinyChange: -10 },
  },
];
