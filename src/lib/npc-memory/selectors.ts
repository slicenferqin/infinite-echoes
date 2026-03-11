import { NpcMemoryEntry, NpcMemorySelectionInput, NpcMemorySelectionResult, NpcMemoryState } from './types';

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractTokens(text: string): string[] {
  const normalized = normalize(text);
  if (!normalized) return [];

  const latinTokens = normalized
    .split(/[\s,，。！？!?:：;；、"'“”‘’()（）【】[\]{}<>《》/\\|]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 2);

  const chineseChunks = (normalized.match(/[\u4e00-\u9fff]{2,}/g) ?? []).flatMap((chunk) => {
    if (chunk.length <= 2) return [chunk];

    const windows: string[] = [chunk];
    for (let index = 0; index < chunk.length - 1; index += 1) {
      windows.push(chunk.slice(index, index + 2));
    }
    return windows;
  });

  return unique([...latinTokens, ...chineseChunks]);
}

function scoreEntry(entry: NpcMemoryEntry, input: NpcMemorySelectionInput): number {
  let score = entry.weight * 2;
  const now = Date.now();
  const ageMs = Math.max(0, now - entry.createdAt);

  if (ageMs <= 60 * 60 * 1000) score += 5;
  else if (ageMs <= 24 * 60 * 60 * 1000) score += 3;
  else if (ageMs <= 3 * 24 * 60 * 60 * 1000) score += 1;

  if (entry.aboutPlayer) score += 2;
  if (input.currentLocation && entry.locationId === input.currentLocation) score += 2;
  if (input.presentedClueId && entry.topicTags.includes(input.presentedClueId)) score += 4;

  const haystack = normalize(`${entry.summary} ${entry.emotionTag} ${entry.topicTags.join(' ')}`);
  for (const token of extractTokens(input.playerInput)) {
    if (haystack.includes(token)) {
      score += token.length >= 4 ? 3 : 1.5;
    }
  }

  if (entry.kind === 'trauma') score += 1;
  if (entry.kind === 'event') score += 0.5;

  return score;
}

function formatMemoryLine(entry: NpcMemoryEntry): string {
  const tone =
    entry.kind === 'trauma'
      ? '这仍让你本能地防备'
      : entry.kind === 'event'
        ? '这件事你记得很清楚'
        : '你对这件事仍有印象';

  return `${entry.summary}（${tone}）`;
}

export function selectRelevantNpcMemories(
  state: NpcMemoryState,
  input: NpcMemorySelectionInput
): NpcMemorySelectionResult {
  const limit = Math.max(1, Math.min(8, input.limit ?? 6));

  const entries = [...state.entries]
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, input),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return right.entry.createdAt - left.entry.createdAt;
    })
    .slice(0, limit)
    .map((item) => item.entry);

  return {
    entries,
    lines: entries.map(formatMemoryLine),
  };
}
