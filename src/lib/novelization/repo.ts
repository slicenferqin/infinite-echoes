import { db } from '../db/sqlite';
import { NovelProject } from './types';

export function insertNovelProject(project: NovelProject): void {
  db.prepare(
    `
      INSERT OR REPLACE INTO novel_projects (
        id,
        user_id,
        chronicle_entry_id,
        status,
        chapter_plan_json,
        target_chapter_count,
        target_words_per_chapter,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    project.id,
    project.userId,
    project.chronicleEntryId,
    project.status,
    JSON.stringify(project.chapterPlan),
    project.targetChapterCount,
    project.targetWordsPerChapter,
    project.createdAt
  );
}
