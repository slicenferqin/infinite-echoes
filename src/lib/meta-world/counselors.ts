import {
  MetaWorldHubPayload,
  MetaWorldState,
  PersistentNpcState,
} from '../types';

export type PersistentCounselorId = 'aji' | 'linlu' | 'laozhao' | 'hooded_figure';

interface CounselorProfile {
  id: PersistentCounselorId;
  label: string;
  opening: string;
  tone: string[];
  fallbackReplies: Array<{ when: string[]; reply: string }>;
  archiveHints: string[];
  anomalyHints: string[];
  deepHints: string[];
  empathyHints: string[];
  pressureHints: string[];
}

interface CounselorConversationEffectsInput {
  npcId: PersistentCounselorId;
  state: MetaWorldState;
  message: string;
  reply?: string;
}

export interface CounselorRelationUpdate {
  trustDelta: number;
  suspicionDelta: number;
  addedTags: string[];
  revealedTopics: string[];
}

const PROFILES: Record<PersistentCounselorId, CounselorProfile> = {
  aji: {
    id: 'aji',
    label: '阿寂',
    opening: '你终于肯停下来看看这些回响留下的东西了。先别急着进下一扇门，读读它们。',
    tone: ['话少', '冷静', '知道更多，但不会一次说透', '不说现代客服腔'],
    fallbackReplies: [
      {
        when: ['档案', '记录', '版本'],
        reply: '档案会说话，但只说它被允许说的那一半。你先去看最近那几份，再回来问我。',
      },
      {
        when: ['异常', '回响柱', '异响'],
        reply: '你已经听见它们不对劲了。先别急着给这些异响起名字，名字会把人骗进更窄的答案里。',
      },
      {
        when: ['复活', '离开', '回来'],
        reply: '你现在问这个，还太早。先记住一件事：有些门会开，不代表它真通向你以为的地方。',
      },
    ],
    archiveHints: ['档案', '记录', '结算', '回执', '版本'],
    anomalyHints: ['异常', '回响柱', '异响', '第七座', '裂缝'],
    deepHints: ['谁在维护', '是谁写的', '谁在改', '维护层', '系统', '复活', '离开'],
    empathyHints: ['谢谢', '辛苦', '明白', '理解', '我知道你也难', '我不是来逼你', '请你帮我'],
    pressureHints: ['快说', '立刻', '别废话', '你是不是在骗我', '你必须', '告诉我真相'],
  },
  linlu: {
    id: 'linlu',
    label: '林鹿',
    opening: '你每次从门里回来，身上都像多带了一层灰。先坐下吧，你要是愿意，我陪你把它理顺。',
    tone: ['热心', '敏感', '会从细节里过度联想', '说到关键处会突然压低声音'],
    fallbackReplies: [
      {
        when: ['情绪', '难受', '害怕', '后悔'],
        reply: '你要是说不出口，就先说那一幕最卡在哪。很多事不是想不明白，是身体还没放过你。',
      },
      {
        when: ['副本', '故事', '像是安排好的'],
        reply: '我也越来越觉得，那些门里发生的事，不像巧合。像是谁挑着我们最容易疼的地方下手。',
      },
    ],
    archiveHints: ['档案', '手记', '经历', '故事'],
    anomalyHints: ['异常', '回响柱', '不对劲', '量身定做'],
    deepHints: ['为什么是我', '为什么是我们', '被选中', '安排好的'],
    empathyHints: ['我想听你说', '你觉得呢', '你还好吗', '我明白', '谢谢你'],
    pressureHints: ['你别矫情', '你想太多', '闭嘴', '别废话'],
  },
  laozhao: {
    id: 'laozhao',
    label: '老赵',
    opening: '别站着发愣。你既然回来了，就先想想下一步先保什么、再查什么，这地方最怕人乱。',
    tone: ['朴实', '不绕弯', '偏实用主义', '对人情和分寸很敏感'],
    fallbackReplies: [
      {
        when: ['怎么做', '先查什么', '稳妥'],
        reply: '先看人，再看物，最后才看嘴硬的规矩。人一慌，嘴最先漏；物一动，路就死了。',
      },
      {
        when: ['为什么留下', '你怎么还在这'],
        reply: '有的人走不了，有的人是不想走。你以后分得出来的。',
      },
    ],
    archiveHints: ['档案', '旧案', '手记'],
    anomalyHints: ['异常', '不对劲', '回响柱'],
    deepHints: ['留下', '不走', '第三条路'],
    empathyHints: ['请教', '劳烦', '你觉得', '稳妥', '麻烦你'],
    pressureHints: ['快点', '少说教', '你懂什么', '别装'],
  },
  hooded_figure: {
    id: 'hooded_figure',
    label: '兜帽人',
    opening: '你还是走到这里了。别问我是谁，先问你自己，为什么总能走到这些门前。',
    tone: ['简短', '带预言感', '故意不把句子说满', '会回避身份追问'],
    fallbackReplies: [
      {
        when: ['身份', '你是谁', '名字'],
        reply: '名字是给还在原处的人用的。你先把门后的东西看够了，再来问我这个。',
      },
      {
        when: ['第七座', '第七柱', '第三条路'],
        reply: '你已经听见它沉默了。沉默不是没有声音，是有人不想让你听懂。',
      },
    ],
    archiveHints: ['档案', '残卷', '删掉'],
    anomalyHints: ['第七座', '第七柱', '异常', '裂缝'],
    deepHints: ['第三条路', '离开', '假的复活', '沉默'],
    empathyHints: ['我不是来逼你', '我想知道', '请你告诉我'],
    pressureHints: ['现在就说', '别装神弄鬼', '你必须告诉我'],
  },
};

function clampText(text: string, limit = 120): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}...`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function ensureCounselorState(
  state: MetaWorldState,
  npcId: PersistentCounselorId
): PersistentNpcState {
  return (
    state.persistentNpcStates[npcId] ?? {
      npcId,
      trust: 0,
      suspicion: 0,
      affinityTags: [],
      revealedTopics: [],
      memorySummary: '',
      lastUpdatedAt: Date.now(),
    }
  );
}

function mergeMemorySummary(current: string, next: string): string {
  const pieces = unique([
    ...current.split('；').map((item) => item.trim()).filter(Boolean),
    next,
  ]);

  return pieces.slice(-3).join('；');
}

function summarizeCounselorMemory(label: string, message: string, reply: string): string {
  const compactMessage = message.replace(/\s+/g, ' ').trim().slice(0, 32);
  const compactReply = reply.replace(/\s+/g, ' ').trim().slice(0, 40);
  return `你问过${label}“${compactMessage}”，他当时回你：“${compactReply}”`;
}

export function isPersistentCounselorId(value: string): value is PersistentCounselorId {
  return value in PROFILES;
}

export function getPersistentCounselorProfile(npcId: PersistentCounselorId): CounselorProfile {
  return PROFILES[npcId];
}

export function buildPersistentCounselorPrompt(params: {
  npcId: PersistentCounselorId;
  username: string;
  hub: MetaWorldHubPayload;
}): string {
  const { npcId, username, hub } = params;
  const profile = getPersistentCounselorProfile(npcId);
  const selfState = hub.persistentNpcs.find((npc) => npc.id === npcId);

  const npcSummary = hub.persistentNpcs
    .slice(0, 4)
    .map((npc) => `- ${npc.label}：信任 ${npc.trust} / 戒心 ${npc.suspicion} / 记忆摘要：${npc.memorySummary || '暂无'}`)
    .join('\n');

  const anomalySummary = hub.anomalies
    .slice(0, 5)
    .map((item) => `- ${item.label}：强度 ${item.level} / ${item.confirmed ? '已确认' : '未确认'} / ${item.notes.slice(-1)[0] ?? '无'}`)
    .join('\n');

  const cognitionSummary = hub.cognition
    .slice(0, 5)
    .map((item) => `- ${item.label}：层级 ${item.level}/3`)
    .join('\n');

  const archiveSummary = hub.archiveEntries
    .slice(0, 4)
    .map((entry) => `- ${entry.title}：${clampText(entry.summary, 80)}`)
    .join('\n');

  return `你是《无尽回响》元世界中的常驻角色“${profile.label}”。

你现在在回响之间接待玩家 ${username}。你必须保持这个角色的口吻：
${profile.tone.map((item) => `- ${item}`).join('\n')}

你手里掌握的是这个玩家当前在回响之间的状态摘要：

【你和玩家现在的关系】
- 信任：${selfState?.trust ?? 0}
- 戒心：${selfState?.suspicion ?? 0}
- 你已经对他松口的话题：${selfState?.revealedTopics?.join('、') || '暂无'}
- 你记得他的最近印象：${selfState?.memorySummary || '你还在判断他是否值得你说更多'}

【常驻关系】
${npcSummary || '- 暂无'}

【异常】
${anomalySummary || '- 暂无'}

【认知】
${cognitionSummary || '- 暂无'}

【最近档案】
${archiveSummary || '- 暂无'}

回答要求：
1. 只用角色会说的话回答，2-5 句话
2. 优先回应玩家真正关心的问题，不背设定百科
3. 如果玩家问得太深，但你与他的信任不足，就给半句真话和半句保留
4. 可以轻微提点下一步该看哪里，但不能直接剧透
5. 不要出现动作旁白、舞台指令、模型身份或系统规则说明`;
}

export function buildPersistentCounselorFallbackReply(
  npcId: PersistentCounselorId,
  message: string
): string {
  const profile = getPersistentCounselorProfile(npcId);
  const normalized = normalize(message);

  for (const item of profile.fallbackReplies) {
    if (item.when.some((hint) => normalized.includes(normalize(hint)))) {
      return item.reply;
    }
  }

  return profile.opening;
}

function detectCounselorRelationUpdate(
  npcId: PersistentCounselorId,
  state: MetaWorldState,
  message: string
): CounselorRelationUpdate {
  const profile = getPersistentCounselorProfile(npcId);
  const current = ensureCounselorState(state, npcId);
  const normalized = normalize(message);
  let trustDelta = 0;
  let suspicionDelta = 0;
  const addedTags: string[] = [];
  const revealedTopics: string[] = [];

  if (profile.empathyHints.some((hint) => normalized.includes(normalize(hint)))) {
    trustDelta += 2;
    suspicionDelta -= 1;
    addedTags.push('feels_safe_with_you');
  }

  if (profile.pressureHints.some((hint) => normalized.includes(normalize(hint)))) {
    trustDelta -= 1;
    suspicionDelta += 3;
    addedTags.push('watches_your_words');
  }

  if (profile.archiveHints.some((hint) => normalized.includes(normalize(hint)))) {
    trustDelta += 1;
    revealedTopics.push('archive_records');
  }

  if (profile.anomalyHints.some((hint) => normalized.includes(normalize(hint)))) {
    trustDelta += 1;
    revealedTopics.push('anomaly_tracks');
  }

  if (profile.deepHints.some((hint) => normalized.includes(normalize(hint)))) {
    if ((state.cognition.nodes.suspects_maintainer_layer_exists?.level ?? 0) > 0 || npcId !== 'aji') {
      trustDelta += 1;
      revealedTopics.push('deep_route');
      addedTags.push('answers_in_half_steps');
    } else {
      suspicionDelta += 1;
    }
  }

  if (current.trust + trustDelta >= 8) {
    addedTags.push('takes_you_seriously');
  }

  if (npcId === 'hooded_figure' && normalized.includes('身份')) {
    suspicionDelta += 2;
    revealedTopics.push('identity_avoidance');
  }

  return {
    trustDelta,
    suspicionDelta,
    addedTags: unique(addedTags),
    revealedTopics: unique(revealedTopics),
  };
}

export function applyPersistentCounselorConversationEffects({
  npcId,
  state,
  message,
  reply,
}: CounselorConversationEffectsInput): {
  state: MetaWorldState;
  relationUpdate: CounselorRelationUpdate;
} {
  const current = ensureCounselorState(state, npcId);
  const profile = getPersistentCounselorProfile(npcId);
  const relationUpdate = detectCounselorRelationUpdate(npcId, state, message);
  const nextState: PersistentNpcState = {
    ...current,
    trust: clamp(current.trust + relationUpdate.trustDelta, 0, 100),
    suspicion: clamp(current.suspicion + relationUpdate.suspicionDelta, 0, 100),
    affinityTags: unique([...current.affinityTags, ...relationUpdate.addedTags]),
    revealedTopics: unique([...current.revealedTopics, ...relationUpdate.revealedTopics]),
    memorySummary: reply
      ? mergeMemorySummary(
          current.memorySummary,
          summarizeCounselorMemory(profile.label, message, reply)
        )
      : current.memorySummary,
    lastUpdatedAt: Date.now(),
  };

  return {
    state: {
      ...state,
      updatedAt: Date.now(),
      persistentNpcStates: {
        ...state.persistentNpcStates,
        [npcId]: nextState,
      },
    },
    relationUpdate,
  };
}
