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

interface NovelProjectRow {
  id: string;
  chronicle_entry_id: string;
  status: string;
  chapter_plan_json: string;
  target_chapter_count: number;
  target_words_per_chapter: number;
  created_at: number;
}

export function listRecentNovelProjects(userId: string, limit = 6): NovelProject[] {
  const rows = db
    .prepare(
      `
        SELECT
          id,
          chronicle_entry_id,
          status,
          chapter_plan_json,
          target_chapter_count,
          target_words_per_chapter,
          created_at
        FROM novel_projects
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `
    )
    .all(userId, limit) as NovelProjectRow[];

  return rows.flatMap((row) => {
    try {
      return [
        {
          id: row.id,
          userId,
          chronicleEntryId: row.chronicle_entry_id,
          status: row.status as NovelProject['status'],
          chapterPlan: JSON.parse(row.chapter_plan_json),
          targetChapterCount: row.target_chapter_count,
          targetWordsPerChapter: row.target_words_per_chapter,
          createdAt: row.created_at,
        } satisfies NovelProject,
      ];
    } catch {
      return [];
    }
  });
}
