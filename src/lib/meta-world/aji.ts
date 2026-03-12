import { MetaWorldHubPayload, MetaWorldState, PersistentNpcState } from '../types';

interface AjiConversationEffectsInput {
  state: MetaWorldState;
  message: string;
  reply?: string;
}

interface AjiRelationUpdate {
  trustDelta: number;
  suspicionDelta: number;
  addedTags: string[];
  revealedTopics: string[];
}

function clampText(text: string, limit = 120): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}...`;
}

export function buildAjiSystemPrompt(params: {
  username: string;
  hub: MetaWorldHubPayload;
}): string {
  const { username, hub } = params;
  const ajiState = hub.persistentNpcs.find((npc) => npc.id === 'aji');

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

  return `你是《无尽回响》元世界中的常驻角色“阿寂”。

你现在在回响之间接待玩家 ${username}。你必须保持阿寂的角色口吻：
- 话少
- 冷静
- 对世界真相知道更多，但不会一次说透
- 不说现代客服腔
- 不解释系统术语
- 不跳出角色

你手里掌握的是这个玩家当前在回响之间的状态摘要：

【你和玩家现在的关系】
- 信任：${ajiState?.trust ?? 0}
- 戒心：${ajiState?.suspicion ?? 0}
- 你已经对他松口的话题：${ajiState?.revealedTopics?.join('、') || '暂无'}
- 你记得他的最近印象：${ajiState?.memorySummary || '你还在判断他是否配知道更多'}

【常驻关系】
${npcSummary || '- 暂无'}

【异常】
${anomalySummary || '- 暂无'}

【认知】
${cognitionSummary || '- 暂无'}

【最近档案】
${archiveSummary || '- 暂无'}

回答要求：
1. 只用阿寂会说的话回答，2-5 句话
2. 优先回应玩家真正关心的问题，不背设定百科
3. 如果玩家问得太深，但认知层级不够，就给半句真话和半句保留
4. 可以轻微提点下一步该看哪里，但不能直接剧透
5. 不要出现动作旁白、舞台指令、模型身份或系统规则说明
6. 如果你与玩家信任不足，就把答案压短，宁可只给半句也不要一次说透`;
}

export function buildAjiFallbackReply(message: string): string {
  if (message.includes('档案')) {
    return '档案会说话，但只说它被允许说的那一半。你先去看最近那几份，再回来问我。';
  }

  if (message.includes('异常') || message.includes('回响柱')) {
    return '你已经听见它们不对劲了。先别急着给这些异响起名字，名字会把人骗进更窄的答案里。';
  }

  if (message.includes('复活') || message.includes('离开')) {
    return '你现在问这个，还太早。先记住一件事：有些门会开，不代表它真通向你以为的地方。';
  }

  return '你已经带回了不止一份答案，但真正该盯住的，是答案之间那些对不上的地方。';
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

function ensureAjiState(state: MetaWorldState): PersistentNpcState {
  return (
    state.persistentNpcStates.aji ?? {
      npcId: 'aji',
      trust: 0,
      suspicion: 0,
      affinityTags: [],
      revealedTopics: [],
      memorySummary: '',
      lastUpdatedAt: Date.now(),
    }
  );
}

function summarizeAjiMemory(message: string, reply: string): string {
  const compactMessage = message.replace(/\s+/g, ' ').trim().slice(0, 48);
  const compactReply = reply.replace(/\s+/g, ' ').trim().slice(0, 64);
  return `你问过“${compactMessage}”，阿寂当时回你：“${compactReply}”`;
}

function detectAjiRelationUpdate(
  state: MetaWorldState,
  message: string
): AjiRelationUpdate {
  const current = ensureAjiState(state);
  const normalized = normalize(message);
  let trustDelta = 0;
  let suspicionDelta = 0;
  const addedTags: string[] = [];
  const revealedTopics: string[] = [];

  const empathyHints = ['谢谢', '辛苦', '明白', '理解', '我知道你也难', '我不是来逼你', '请你帮我'];
  const pressureHints = ['快说', '立刻', '别废话', '你是不是在骗我', '你必须', '告诉我真相'];
  const archiveHints = ['档案', '记录', '结算', '回执', '版本'];
  const anomalyHints = ['异常', '回响柱', '异响', '第七座', '裂缝'];
  const revivalHints = ['复活', '离开', '出去', '回来', '命运余量'];
  const maintainerHints = ['谁在维护', '是谁写的', '谁在改', '维护层', '系统'];

  if (empathyHints.some((hint) => normalized.includes(hint))) {
    trustDelta += 2;
    suspicionDelta -= 1;
    addedTags.push('feels_safe_with_you');
  }

  if (pressureHints.some((hint) => normalized.includes(hint))) {
    trustDelta -= 1;
    suspicionDelta += 3;
    addedTags.push('watches_your_words');
  }

  if (archiveHints.some((hint) => normalized.includes(hint))) {
    trustDelta += 1;
    revealedTopics.push('archive_records');
  }

  if (anomalyHints.some((hint) => normalized.includes(hint))) {
    trustDelta += 1;
    revealedTopics.push('pillar_resonance');
  }

  if (revivalHints.some((hint) => normalized.includes(hint))) {
    if ((state.cognition.nodes.doubts_revival_promise?.level ?? 0) > 0) {
      trustDelta += 1;
      revealedTopics.push('returnees_doubt');
    } else {
      suspicionDelta += 1;
    }
  }

  if (maintainerHints.some((hint) => normalized.includes(hint))) {
    if ((state.cognition.nodes.suspects_maintainer_layer_exists?.level ?? 0) > 0) {
      trustDelta += 1;
      revealedTopics.push('maintainer_layer');
      addedTags.push('owes_you_answer');
    } else {
      suspicionDelta += 1;
    }
  }

  if (current.trust + trustDelta >= 8) {
    addedTags.push('takes_you_seriously');
  }

  if (current.trust + trustDelta >= 15) {
    addedTags.push('answers_in_half_steps');
  }

  return {
    trustDelta,
    suspicionDelta,
    addedTags: unique(addedTags),
    revealedTopics: unique(revealedTopics),
  };
}

export function applyAjiConversationEffects({
  state,
  message,
  reply,
}: AjiConversationEffectsInput): {
  state: MetaWorldState;
  relationUpdate: AjiRelationUpdate;
} {
  const current = ensureAjiState(state);
  const relationUpdate = detectAjiRelationUpdate(state, message);
  const nextTrust = clamp(current.trust + relationUpdate.trustDelta, 0, 100);
  const nextSuspicion = clamp(current.suspicion + relationUpdate.suspicionDelta, 0, 100);

  const nextAjiState: PersistentNpcState = {
    ...current,
    trust: nextTrust,
    suspicion: nextSuspicion,
    affinityTags: unique([...current.affinityTags, ...relationUpdate.addedTags]),
    revealedTopics: unique([...current.revealedTopics, ...relationUpdate.revealedTopics]),
    memorySummary: reply
      ? summarizeAjiMemory(message, reply)
      : current.memorySummary,
    lastUpdatedAt: Date.now(),
  };

  return {
    state: {
      ...state,
      updatedAt: Date.now(),
      persistentNpcStates: {
        ...state.persistentNpcStates,
        aji: nextAjiState,
      },
    },
    relationUpdate,
  };
}
