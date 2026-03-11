import { ArtifactDocument } from '../artifacts/types';
import { ChronicleEntry } from '../chronicle/types';
import { NovelChapterOutline, NovelProject } from './types';

function pick<T>(items: T[], index: number, fallback: T): T {
  return items[index] ?? fallback;
}

export function createNovelProject(params: {
  userId: string;
  chronicle: ChronicleEntry;
  episodeName: string;
  artifacts: ArtifactDocument[];
}): NovelProject {
  const chapterCount = 6;
  const artifactTitles = params.artifacts.map((item) => item.title);
  const rememberedPeople = params.chronicle.peopleRemembered;
  const truths = params.chronicle.truthsLearned;
  const wounds = params.chronicle.woundsLeft;

  const chapters: NovelChapterOutline[] = Array.from({ length: chapterCount }, (_, index) => {
    const chapter = index + 1;

    if (chapter === 1) {
      return {
        chapter,
        title: '裂隙开启',
        pov: '主角',
        conflict: `进入「${params.episodeName}」并第一次嗅到这场案件真正的情绪核心。`,
        emotionalBeat: params.chronicle.emotionalTheme,
        sourceRefs: artifactTitles.slice(0, 2),
      };
    }

    if (chapter === chapterCount) {
      return {
        chapter,
        title: '余波仍在',
        pov: '主角',
        conflict: `以「${params.chronicle.title}」的结局收束，但把代价留到回响之间。`,
        emotionalBeat: pick(wounds, 0, '真相落地后仍有余震未平。'),
        sourceRefs: artifactTitles.slice(-2),
      };
    }

    return {
      chapter,
      title: `第${chapter}章提纲`,
      pov: pick(rememberedPeople, chapter - 2, '主角'),
      conflict: pick(
        truths,
        chapter - 2,
        `围绕${pick(rememberedPeople, 0, '关键角色')}的立场、沉默和代价继续展开。`
      ),
      emotionalBeat: pick(
        wounds,
        chapter - 2,
        `这一章强调${params.chronicle.emotionalTheme}带来的撕扯。`
      ),
      sourceRefs: artifactTitles.slice(Math.max(0, chapter - 2), Math.max(1, chapter)),
    };
  });

  return {
    id: crypto.randomUUID(),
    userId: params.userId,
    chronicleEntryId: params.chronicle.id,
    status: 'outlined',
    chapterPlan: chapters,
    targetChapterCount: chapterCount,
    targetWordsPerChapter: 2400,
    createdAt: Date.now(),
  };
}
