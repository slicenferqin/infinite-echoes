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
而是一个村长如何借儿子、乡里体面和外部矿权，把整场审判一起拖进泥里。

艾德蒙看着信纸，声音却还稳：
“你揭了我，矿权也不会停。你真觉得他们会放过这村子？”

没人立刻回答。可第一次，村里人不是看他的脸色，而是看彼此。
他们终于不得不承认：鸦石村不是单纯从里面坏掉的，它早就和更大的权力链纠缠在一起，只是大家一直装作看不见。

你离开时，诺拉没有追上来。
她站在铁匠铺门口，握着拳，像是在和过去的沉默告别。

村子不会立刻变好，但从这一刻起，它再也没法把这场命案只讲成一桩“家门不幸”的丑事。

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

执法官的判词足够完整，完整到谁也没法再拿“乡里情面”替任何人遮住事实。
可完整不等于温暖。它只是把每个人都拖回各自该付的代价里。

诺拉站在空铁匠铺门口，没有哭。
她只是把围裙抱在怀里，肩膀绷得笔直。

你做的是程序上最完整的裁断。
村子不再能装作自己无辜，却也没有因此学会更温柔地活。

风从广场吹过时，你会清楚地知道：公义落地那一刻，有时就是这么冷。

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
诺拉冲过去抱住他，像终于能把憋了一整天的那口气哭出来。

你保住了人，也保住了一点体面——不是所有真相都被撕成最难堪的样子，但真正该承担的人，终于被推回了台前。

村里没有一夜翻新。
可至少这一次，不再是谁嗓门大、谁更像体面人，谁就能先把另一个人压成凶手。

临别前，诺拉把一枚粗铁戒塞进你掌心：
“我爹说，欠你一命。”

你知道鸦石村不会因此变干净，它只是第一次被撬开了一道缝。

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
村里人也没人愿意再多承担一句证词，因为对这座村子来说，“赶紧恢复正常”比“别冤错人”更像头等大事。

诺拉的哭声穿过广场，却没人接住。

你并非什么都没做。
只是你撬开的，还不够改变这张由人情、体面和利益一起织成的网。

几天后，鸦石村照旧开矿、烧炉、吃饭、闭嘴。
这份恢复如常，本身就是它最会吞掉人的地方。

——「沉默蔓延」`,
    rewards: { echoPoints: 50, destinyChange: -10 },
  },
];
