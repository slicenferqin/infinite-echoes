import { ItemDefinition } from '../../types';

export const items: ItemDefinition[] = [
  {
    id: 'core_ring_pass',
    name: '核心环通行签',
    description: '审理官签发的临时通行签，允许进入核心环进行受限排查。',
    obtainedFrom: 'search',
    sourceId: 'hearing_desk',
    setsFlag: 'can_enter_core_ring',
  },
  {
    id: 'breach_hash_key',
    name: '防线校验哈希片',
    description: '来自防线黑匣子的校验哈希片，可用于解锁第零层冷库索引。',
    obtainedFrom: 'search',
    sourceId: 'defense_blackbox',
  },
  {
    id: 'birthday_card_fragment',
    name: '生日卡碎片',
    description: '小柏藏着的一张旧卡片，上面写着余岚手抄的生日口令。',
    obtainedFrom: 'npc',
    sourceId: 'xiaobo',
  },
];
