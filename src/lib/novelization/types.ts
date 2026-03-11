export type NovelProjectStatus = 'pending' | 'outlined' | 'generating' | 'completed' | 'failed';

export interface NovelChapterOutline {
  chapter: number;
  title: string;
  pov: string;
  conflict: string;
  emotionalBeat: string;
  sourceRefs: string[];
}

export interface NovelProject {
  id: string;
  userId: string;
  chronicleEntryId: string;
  status: NovelProjectStatus;
  chapterPlan: NovelChapterOutline[];
  targetChapterCount: number;
  targetWordsPerChapter: number;
  createdAt: number;
}
