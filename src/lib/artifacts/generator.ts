import { ArtifactDocument, ArtifactGenerationContext } from './types';

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildArchiveSummary(context: ArtifactGenerationContext): ArtifactDocument {
  return {
    id: crypto.randomUUID(),
    userId: context.userId,
    episodeId: context.episodeId,
    routeId: context.route.id,
    kind: 'archive_summary',
    title: `档案摘要：${context.episodeName} · ${context.route.name}`,
    body: [
      `在「${context.episodeName}」中，你最终走向了 ${context.route.type} 结局「${context.route.name}」。`,
      context.epilogue,
      context.discoveredClueNames.length > 0
        ? `本次被正式记录的关键线索包括：${context.discoveredClueNames.slice(0, 5).join('、')}。`
        : '这次记录里，真正能留下的线索并不多。',
    ].join('\n\n'),
    meta: {
      routeType: context.route.type,
      clueCount: context.discoveredClueNames.length,
    },
    createdAt: Date.now(),
  };
}

function buildWorldBulletin(context: ArtifactGenerationContext): ArtifactDocument {
  const eventText =
    context.worldEventSummaries.length > 0
      ? `在这次结局之前，世界里还发生了这些暗流：${context.worldEventSummaries.slice(0, 2).join('；')}。`
      : '表面平静之下的暗流，没有全部写进公开版本。';

  return {
    id: crypto.randomUUID(),
    userId: context.userId,
    episodeId: context.episodeId,
    routeId: context.route.id,
    kind: 'world_bulletin',
    title: `世界日报：${context.episodeName}`,
    body: [
      `【本期摘要】「${context.episodeName}」已以 ${context.route.type} 结局收束，公开标题为「${context.route.name}」。`,
      eventText,
      `公开版本会把这次事件解释为一场已经完成的裁断；但你知道，它真正留下的是更长的余波。`,
    ].join('\n\n'),
    meta: {
      routeType: context.route.type,
      source: 'system_bulletin',
    },
    createdAt: Date.now(),
  };
}

function buildFragmentLogs(context: ArtifactGenerationContext): ArtifactDocument[] {
  const fragmentSeeds = unique([
    ...context.contactedNpcNames.slice(0, 3).map((name) => `与${name}有关的未说出口之事`),
    ...context.worldEventSummaries.slice(0, 2),
  ]).slice(0, 3);

  if (fragmentSeeds.length === 0) {
    fragmentSeeds.push('没有被写进公开档案的情绪余震');
  }

  return fragmentSeeds.map((seed, index) => ({
    id: crypto.randomUUID(),
    userId: context.userId,
    episodeId: context.episodeId,
    routeId: context.route.id,
    kind: 'fragment_log',
    title: `碎片日志 ${index + 1}：${context.episodeName}`,
    body: [
      `这不是正式档案，而是一段从余波里捞出来的碎片：${seed}。`,
      `如果只看公开结局，「${context.route.name}」像是已经给出答案；但真正留在人心里的，往往是那些没被说全的话。`,
      context.contactedNpcNames.length > 0
        ? `你这次接触过的人里，最难彻底放下的仍是：${context.contactedNpcNames.slice(0, 3).join('、')}。`
        : '这次局里，没有谁真正轻松离场。',
    ].join('\n\n'),
    meta: {
      seed,
      routeType: context.route.type,
      index,
    },
    createdAt: Date.now() + index,
  }));
}

export function generateSettlementArtifacts(
  context: ArtifactGenerationContext
): ArtifactDocument[] {
  return [
    buildArchiveSummary(context),
    buildWorldBulletin(context),
    ...buildFragmentLogs(context),
  ];
}
