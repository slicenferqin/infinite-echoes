import { ItemDefinition } from '../../types';

export const items: ItemDefinition[] = [
  {
    id: 'inspection_writ',
    name: '临时调档文书',
    description: '马修签发的临时文书，允许你进入公证所内档柜复核旧案。',
    obtainedFrom: 'search',
    sourceId: 'court_desk',
    usableAt: 'notary_archive',
    setsFlag: 'can_search_notary_archive',
  },
  {
    id: 'duplicate_receipt_copy',
    name: '双回执拓印',
    description: '从旧仓库带出的回执拓印，编号一致但日期不同。',
    obtainedFrom: 'search',
    sourceId: 'warehouse_iron_box',
  },
  {
    id: 'joan_last_note',
    name: '乔安遗言布条',
    description: '阿哲藏着的一段布条，记着母亲临终托付。',
    obtainedFrom: 'npc',
    sourceId: 'azhe',
  },
];
