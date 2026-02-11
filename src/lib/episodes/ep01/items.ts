import { ItemDefinition } from '../../types';

export const items: ItemDefinition[] = [
  {
    id: 'cellar_key',
    name: '地窖钥匙',
    description: '一把沉甸甸的铁钥匙，上面刻着村长宅邸的徽记。可以打开地窖的门。',
    obtainedFrom: 'npc',
    sourceId: 'edmond',
    usableAt: 'cellar',
  },
  {
    id: 'study_key',
    name: '书房钥匙',
    description: '一把小巧的铜钥匙。是从艾德蒙桌上拿到的，或者从雷恩那里得到的。',
    obtainedFrom: 'search',
    sourceId: 'elder_study_key',
    usableAt: 'elder_study',
    setsFlag: 'can_enter_study',
  },
  {
    id: 'bloody_knife_record',
    name: '短刀交易记录',
    description: '从汉克的账本中撕下的一页，记录了凶器短刀的售出信息。',
    obtainedFrom: 'search',
    sourceId: 'forge_ledger',
  },
  {
    id: 'secret_letter',
    name: '密信',
    description: '一封盖着邻领领主印章的信件，内容涉及强制征收鸦石村铁矿。',
    obtainedFrom: 'search',
    sourceId: 'elder_study',
  },
];
