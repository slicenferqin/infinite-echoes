import {
  EpisodeConfig,
  GameAction,
  GameState,
  IdentityDefinition,
  IdentitySocialBias,
  PlayerState,
  SearchableItem,
} from '../types';

const LEGACY_PROFESSION_META: Record<
  string,
  { name: string; title: string; brief: string; trait: string }
> = {
  journalist: {
    name: '记者',
    title: '旧时代记者',
    brief: '你擅长从矛盾里寻找破绽。',
    trait: '敏锐直觉——你更容易注意到 NPC 话语中的矛盾',
  },
  doctor: {
    name: '医生',
    title: '旧时代医生',
    brief: '你会优先观察情绪与伤情细节。',
    trait: '察言观色——你能感知到 NPC 更细腻的情绪变化',
  },
  programmer: {
    name: '程序员',
    title: '旧时代程序员',
    brief: '你偏好建立链式证据。',
    trait: '逻辑链——你的推理提交有更高的容错率',
  },
  teacher: {
    name: '教师',
    title: '旧时代教师',
    brief: '你知道如何缓和对立并引导表达。',
    trait: '循循善诱——NPC 对你的信任度提升更快',
  },
};

export const IDENTITY_UNLOCKS = {
  minerBackdoor: 'ep01.unlock.miner_backdoor',
  tavernCards: 'ep01.unlock.tavern_card_context',
  clinicRecords: 'ep01.unlock.clinic_records',
  clerkDocPath: 'ep01.unlock.clerk_document_path',
  quotaAudit: 'ep03.unlock.quota_audit',
  gridBypass: 'ep03.unlock.grid_bypass',
  mutualWhitelist: 'ep03.unlock.mutual_whitelist',
  frontierClearance: 'ep03.unlock.frontier_clearance',
} as const;

export const IDENTITY_RISK_HOOKS = {
  edmondPressure: 'ep01.risk.edmond_pressure',
  noraDistrust: 'ep01.risk.nora_distrust',
  minersSkeptic: 'ep01.risk.miners_skeptic',
  bureaucratBacklash: 'ep01.risk.bureaucrat_backlash',
  auditOverreach: 'ep03.risk.audit_overreach',
  gridSuspicion: 'ep03.risk.grid_suspicion',
  streetBias: 'ep03.risk.street_bias',
  frontierWatch: 'ep03.risk.frontier_watch',
} as const;

function cloneIdentity(identity: IdentityDefinition): IdentityDefinition {
  return {
    ...identity,
    hardUnlocks: [...identity.hardUnlocks],
    socialBiases: identity.socialBiases.map((bias) => ({ ...bias })),
    riskHooks: [...identity.riskHooks],
  };
}

export function getEpisodeIdentityMode(
  episode: EpisodeConfig
): 'random_pool' | 'legacy_profession' {
  return episode.identity?.mode ?? 'legacy_profession';
}

export function isRandomIdentityEpisode(episode: EpisodeConfig): boolean {
  return getEpisodeIdentityMode(episode) === 'random_pool';
}

export function pickRandomIdentity(episode: EpisodeConfig): IdentityDefinition | null {
  const config = episode.identity;
  if (!config || config.mode !== 'random_pool' || config.pool.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * config.pool.length);
  return cloneIdentity(config.pool[index]);
}

export function getIdentityById(
  episode: EpisodeConfig,
  identityId?: string | null
): IdentityDefinition | null {
  if (!identityId) return null;

  const found = episode.identity?.pool.find((identity) => identity.id === identityId);
  return found ? cloneIdentity(found) : null;
}

export function createLegacyIdentity(profession: string): IdentityDefinition {
  const normalized = (profession || 'journalist').trim().toLowerCase();
  const meta = LEGACY_PROFESSION_META[normalized] ?? LEGACY_PROFESSION_META.journalist;

  return {
    id: `legacy_${normalized}`,
    name: meta.name,
    title: meta.title,
    brief: meta.brief,
    hardUnlocks: [],
    socialBiases: [],
    riskHooks: [],
  };
}

export function resolvePlayerIdentity(
  episode: EpisodeConfig,
  player: PlayerState
): IdentityDefinition {
  const byId = getIdentityById(episode, player.identityId);
  if (byId) return byId;

  if (player.identityId?.startsWith('legacy_')) {
    return createLegacyIdentity(player.identityId.replace(/^legacy_/, ''));
  }

  return createLegacyIdentity(player.profession || 'journalist');
}

export function resolveIdentityForState(
  episode: EpisodeConfig,
  state: Pick<GameState, 'player'>
): IdentityDefinition {
  return resolvePlayerIdentity(episode, state.player);
}

export function getIdentityBiasForNpc(
  identity: IdentityDefinition,
  npcId: string
): IdentitySocialBias {
  return (
    identity.socialBiases.find((entry) => entry.npcId === npcId) ?? {
      npcId,
      trustDelta: 0,
      threatDelta: 0,
    }
  );
}

export function hasIdentityUnlock(
  identity: IdentityDefinition,
  unlockId: string
): boolean {
  return identity.hardUnlocks.includes(unlockId);
}

export function getIdentityLeadTrustBoost(
  identity: IdentityDefinition,
  leadFlag: string
): number {
  if (
    leadFlag === 'lead_renn_shoesize' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.minerBackdoor)
  ) {
    return 12;
  }

  if (
    leadFlag === 'lead_renn_room' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.tavernCards)
  ) {
    return 8;
  }

  if (
    leadFlag === 'lead_hank_midnight_work' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.clinicRecords)
  ) {
    return 10;
  }

  if (
    leadFlag === 'lead_edmond_hidden_docs' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.clerkDocPath)
  ) {
    return 10;
  }

  if (
    leadFlag === 'lead_credit_rule' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.quotaAudit)
  ) {
    return 12;
  }

  if (
    leadFlag === 'lead_core_backdoor' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.gridBypass)
  ) {
    return 10;
  }

  if (
    leadFlag === 'lead_supply_reroute' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.mutualWhitelist)
  ) {
    return 10;
  }

  if (
    leadFlag === 'lead_breach_suppressed' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.frontierClearance)
  ) {
    return 12;
  }

  return 0;
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values));
}

export interface IdentitySearchBypassResult {
  missingLeads: string[];
  missingNpcContacts: string[];
  bypassNotes: string[];
}

export function applyIdentitySearchGateBypass(
  state: GameState,
  episode: EpisodeConfig,
  item: SearchableItem,
  missingLeads: string[],
  missingNpcContacts: string[]
): IdentitySearchBypassResult {
  const identity = resolveIdentityForState(episode, state);
  const nextLeads = [...missingLeads];
  const nextContacts = [...missingNpcContacts];
  const notes: string[] = [];

  if (
    item.id === 'forge_backdoor' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.minerBackdoor)
  ) {
    const idx = nextLeads.indexOf('lead_renn_shoesize');
    if (idx >= 0) {
      nextLeads.splice(idx, 1);
      notes.push('你长期接触矿道脚印与鞋底纹路，很快抓住了后门痕迹的关键差异。');
    }
  }

  if (
    item.id === 'tavern_card_table' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.tavernCards)
  ) {
    const idx = nextContacts.indexOf('martha');
    if (idx >= 0) {
      nextContacts.splice(idx, 1);
      notes.push('你对酒馆牌桌和欠账痕迹很熟，没等人提醒也能看出赌局关系。');
    }
  }

  if (
    item.id === 'clinic_records' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.clinicRecords)
  ) {
    const idx = nextContacts.indexOf('mila');
    if (idx >= 0) {
      nextContacts.splice(idx, 1);
      notes.push('你能读懂诊疗批注中的 shorthand，病历对你不是天书。');
    }
  }

  if (
    item.id === 'elder_study' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.clerkDocPath)
  ) {
    const idx = nextLeads.indexOf('lead_edmond_hidden_docs');
    if (idx >= 0) {
      nextLeads.splice(idx, 1);
      notes.push('你熟悉文书归档习惯，能快速排除无关账册，直奔关键抽屉。');
    }
  }

  if (
    item.id === 'care_archive_terminal' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.quotaAudit)
  ) {
    const idx = nextLeads.indexOf('lead_care_record_gap');
    if (idx >= 0) {
      nextLeads.splice(idx, 1);
      notes.push('你熟悉配给审计字段，直接从异常索引定位到抚养记录缺口。');
    }
  }

  if (
    item.id === 'ration_router_cache' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.mutualWhitelist)
  ) {
    const idx = nextContacts.indexOf('zheya');
    if (idx >= 0) {
      nextContacts.splice(idx, 1);
      notes.push('你掌握互助站流转白名单格式，直接读懂了路由缓存里的暗码。');
    }
  }

  if (
    item.id === 'core_maintenance_bay' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.gridBypass)
  ) {
    const idx = nextLeads.indexOf('lead_core_backdoor');
    if (idx >= 0) {
      nextLeads.splice(idx, 1);
      notes.push('你对网格维护补丁链非常熟，快速锁定了核心后门的旧版本痕迹。');
    }
  }

  if (
    item.id === 'defense_blackbox' &&
    hasIdentityUnlock(identity, IDENTITY_UNLOCKS.frontierClearance)
  ) {
    const idx = nextContacts.indexOf('shentiao');
    if (idx >= 0) {
      nextContacts.splice(idx, 1);
      notes.push('你具备防线预备档案权限，黑匣子记录对你默认开放了摘要层。');
    }
  }

  return {
    missingLeads: uniq(nextLeads),
    missingNpcContacts: uniq(nextContacts),
    bypassNotes: notes,
  };
}

export function computeIdentityRiskDelta(
  identity: IdentityDefinition,
  npcId: string,
  action: Pick<GameAction, 'approach'>,
  hasValidEvidence: boolean,
  bias: IdentitySocialBias
): number {
  let delta = 0;
  const approach = action.approach ?? 'neutral';

  if (
    identity.riskHooks.includes(IDENTITY_RISK_HOOKS.edmondPressure) &&
    npcId === 'edmond' &&
    approach === 'pressure'
  ) {
    delta += 8;
  }

  if (
    identity.riskHooks.includes(IDENTITY_RISK_HOOKS.noraDistrust) &&
    npcId === 'nora' &&
    approach !== 'empathy'
  ) {
    delta += 3;
  }

  if (
    identity.riskHooks.includes(IDENTITY_RISK_HOOKS.minersSkeptic) &&
    npcId === 'gareth' &&
    (approach === 'pressure' || approach === 'exchange')
  ) {
    delta += 4;
  }

  if (
    identity.riskHooks.includes(IDENTITY_RISK_HOOKS.bureaucratBacklash) &&
    (npcId === 'gareth' || npcId === 'nora') &&
    approach !== 'empathy'
  ) {
    delta += 4;
  }

  if (
    identity.riskHooks.includes(IDENTITY_RISK_HOOKS.auditOverreach) &&
    npcId === 'yulan' &&
    (approach === 'pressure' || approach === 'exchange')
  ) {
    delta += 5;
  }

  if (
    identity.riskHooks.includes(IDENTITY_RISK_HOOKS.gridSuspicion) &&
    (npcId === 'qinsao' || npcId === 'zheya') &&
    approach !== 'empathy'
  ) {
    delta += 4;
  }

  if (
    identity.riskHooks.includes(IDENTITY_RISK_HOOKS.streetBias) &&
    npcId === 'yanche' &&
    approach === 'pressure'
  ) {
    delta += 6;
  }

  if (
    identity.riskHooks.includes(IDENTITY_RISK_HOOKS.frontierWatch) &&
    npcId === 'luocen' &&
    approach === 'exchange'
  ) {
    delta += 4;
  }

  if (approach === 'pressure' && bias.threatDelta > 0) {
    delta += Math.ceil(bias.threatDelta / 2);
  }

  if (approach === 'present_evidence' && !hasValidEvidence) {
    delta += 2;
  }

  return Math.max(0, Math.min(20, delta));
}

export function getIdentityPresentation(identity: IdentityDefinition): {
  advantages: string[];
  costs: string[];
} {
  switch (identity.id) {
    case 'miner_hand':
      return {
        advantages: ['更快读懂矿工圈口风与脚印细节', '与加雷斯、玛莎对话更容易建立默契'],
        costs: ['艾德蒙对你更警惕，强压对话更易反噬'],
      };
    case 'tavern_runner':
      return {
        advantages: ['对赌桌痕迹和欠账链更敏感', '与玛莎、雷恩对话更容易抓矛盾'],
        costs: ['诺拉对你起步信任较低，需要先证明立场'],
      };
    case 'clinic_assistant':
      return {
        advantages: ['更容易读懂诊疗记录与伤情逻辑', '与米拉、汉克建立稳定信任更快'],
        costs: ['矿工圈对你“只讲理不站队”的印象更重'],
      };
    case 'village_clerk':
      return {
        advantages: ['文书检索效率更高，手续链推进更顺', '与艾德蒙谈“程序”阻力更低'],
        costs: ['加雷斯、诺拉会先把你当“官面的人”'],
      };
    case 'quota_auditor':
      return {
        advantages: ['更快识别配给与信用记录中的异常字段', '与严彻、闻笙谈规则链条更容易进入实质'],
        costs: ['余岚会对你天然戒备，强压质询容易放大对立'],
      };
    case 'grid_maintainer':
      return {
        advantages: ['更容易读懂核心维护日志和补丁轨迹', '与贺沉、阿寂讨论系统细节时门槛更低'],
        costs: ['社区侧会怀疑你“站在系统那边”，街巷信任起步偏低'],
      };
    case 'mutual_aide_runner':
      return {
        advantages: ['互助网络线索转化更快，灰市口风更容易撬动', '更容易在情绪场中稳住母子线'],
        costs: ['在制度会谈中说服力偏弱，程序证据推进稍慢'],
      };
    case 'frontier_reserve':
      return {
        advantages: ['防线记录与黑匣子摘要更容易获取', '谈“高维入侵风险”时更容易得到严肃回应'],
        costs: ['治安与官面角色对你更警惕，试探成本更高'],
      };
    default:
      return {
        advantages: [identity.brief],
        costs: ['该身份暂无额外代价。'],
      };
  }
}

export function getLegacyProfessionTrait(profession: string): string {
  const meta = LEGACY_PROFESSION_META[profession] ?? LEGACY_PROFESSION_META.journalist;
  return meta.trait;
}
