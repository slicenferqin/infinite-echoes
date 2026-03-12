import { MetaWorldHubPayload } from '../types';

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
5. 不要出现动作旁白、舞台指令、模型身份或系统规则说明`;
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
