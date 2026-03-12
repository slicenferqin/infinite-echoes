'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MetaWorldHubPayload } from '@/lib/types';

interface HubUser {
  id: string;
  username: string;
  createdAt: number;
}

interface HubSessionPayload {
  user?: HubUser;
  error?: string;
}

interface AjiMessage {
  role: 'player' | 'aji';
  content: string;
}

interface AjiRelationUpdate {
  trustDelta: number;
  suspicionDelta: number;
  addedTags: string[];
  revealedTopics: string[];
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MetaHubView() {
  const [user, setUser] = useState<HubUser | null>(null);
  const [hub, setHub] = useState<MetaWorldHubPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ajiInput, setAjiInput] = useState('');
  const [ajiLoading, setAjiLoading] = useState(false);
  const [ajiRelationHint, setAjiRelationHint] = useState<string | null>(null);
  const [ajiMessages, setAjiMessages] = useState<AjiMessage[]>([
    {
      role: 'aji',
      content: '你终于肯停下来看看这些回响留下的东西了。先别急着进下一扇门，读读它们。',
    },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [sessionRes, hubRes] = await Promise.all([
          fetch('/api/auth/session', { cache: 'no-store' }),
          fetch('/api/meta-world', { cache: 'no-store' }),
        ]);

        const sessionData = (await sessionRes.json()) as HubSessionPayload;
        const hubData = (await hubRes.json()) as MetaWorldHubPayload & { error?: string };

        if (cancelled) return;

        if (sessionRes.status === 401 || hubRes.status === 401) {
          setUser(null);
          setHub(null);
          setError('登录状态已失效，请先返回大厅重新登录。');
          return;
        }

        if (!sessionRes.ok || !sessionData.user || !hubRes.ok) {
          setUser(null);
          setHub(null);
          setError(hubData.error ?? sessionData.error ?? '回响之间暂时没有稳定回应。');
          return;
        }

        setUser(sessionData.user);
        setHub(hubData);
      } catch (loadError) {
        console.error('Failed to load meta hub:', loadError);
        if (!cancelled) {
          setError('网络抖了一下，回响之间没有顺利显形。');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const archiveCount = hub?.archiveEntries.length ?? 0;
  const anomalyCount = hub?.anomalies.filter((item) => item.level > 0).length ?? 0;
  const chronicleCount = hub?.recentChronicles.length ?? 0;

  const topAnomaly = useMemo(() => hub?.anomalies[0] ?? null, [hub]);

  async function askAji() {
    const message = ajiInput.trim();
    if (!message || ajiLoading) return;

    setAjiLoading(true);
    setAjiMessages((entries) => [...entries, { role: 'player', content: message }]);
    setAjiInput('');

    try {
      const response = await fetch('/api/meta-world/aji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = (await response.json()) as {
        reply?: string;
        error?: string;
        hub?: MetaWorldHubPayload;
        relationUpdate?: AjiRelationUpdate;
      };
      const reply = data.reply?.trim() || '……阿寂沉默了片刻，没有把话说死。';

      setAjiMessages((entries) => [...entries, { role: 'aji', content: reply }]);
      if (data.hub) {
        setHub(data.hub);
      }

      const relation = data.relationUpdate;
      if (relation) {
        const parts: string[] = [];
        if (relation.trustDelta !== 0) {
          parts.push(`信任 ${relation.trustDelta > 0 ? '+' : ''}${relation.trustDelta}`);
        }
        if (relation.suspicionDelta !== 0) {
          parts.push(`戒心 ${relation.suspicionDelta > 0 ? '+' : ''}${relation.suspicionDelta}`);
        }
        if (relation.revealedTopics.length > 0) {
          parts.push(`松口话题：${relation.revealedTopics.join(' / ')}`);
        }
        if (relation.addedTags.length > 0) {
          parts.push(`关系标签：${relation.addedTags.join(' / ')}`);
        }
        setAjiRelationHint(parts.length > 0 ? `阿寂的态度发生变化：${parts.join(' · ')}` : null);
      } else {
        setAjiRelationHint(null);
      }
    } catch (requestError) {
      console.error('Failed to ask Aji:', requestError);
      setAjiMessages((entries) => [
        ...entries,
        { role: 'aji', content: '先记下你的问题。这里的回声一乱，我也不想说废话。' },
      ]);
      setAjiRelationHint(null);
    } finally {
      setAjiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-sm" style={{ color: 'var(--muted)' }}>
          回响之间正在显形……
        </div>
      </div>
    );
  }

  if (!user || !hub) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--input-bg)' }}>
          <h1 className="text-xl font-bold mb-3" style={{ color: 'var(--system-color)' }}>
            回响之间
          </h1>
          <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
            {error ?? '你还没有资格走进这里。'}
          </p>
          <Link
            href="/"
            className="inline-flex px-4 py-2 rounded text-sm font-bold"
            style={{ background: 'var(--system-color)', color: 'var(--background)' }}
          >
            返回大厅
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <div className="text-xs tracking-[0.3em] mb-2" style={{ color: 'var(--muted)' }}>
              THE ECHO BETWEEN
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-2" style={{ color: 'var(--system-color)' }}>
              回响之间
            </h1>
            <p className="text-sm max-w-2xl leading-relaxed" style={{ color: 'var(--foreground)' }}>
              这里不是副本结算后的空白大厅，而是记录你、观察你、等待你继续往前的地方。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs" style={{ color: 'var(--muted)' }}>当前旅人</div>
              <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{user.username}</div>
            </div>
            <Link
              href="/"
              className="px-4 py-2 rounded text-sm font-bold"
              style={{ background: 'rgba(212,160,87,0.12)', color: 'var(--system-color)', border: '1px solid var(--border)' }}
            >
              返回大厅
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {[
            { label: '档案条目', value: archiveCount },
            { label: '异常观测', value: anomalyCount },
            { label: '已收录经历', value: chronicleCount },
            { label: '开放区域', value: hub.summary.unlockedHubAreas.length },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border p-4"
              style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, rgba(20,20,24,0.92), rgba(12,12,15,0.92))' }}
            >
              <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>{item.label}</div>
              <div className="text-3xl font-bold" style={{ color: 'var(--system-color)' }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'rgba(20,20,24,0.88)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold tracking-wide" style={{ color: 'var(--system-color)' }}>
                  档案馆
                </h2>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  最近 {hub.archiveEntries.length} 条
                </div>
              </div>
              <div className="space-y-3">
                {hub.archiveEntries.length > 0 ? hub.archiveEntries.slice(0, 6).map((entry) => (
                  <div key={entry.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{entry.title}</div>
                      <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{entry.episodeId} / {entry.routeType}</div>
                    </div>
                    <div className="text-xs leading-relaxed mb-2" style={{ color: 'var(--muted)' }}>
                      {entry.summary}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--npc-color)' }}>
                      {entry.learnedTruths.join(' / ')}
                    </div>
                  </div>
                )) : (
                  <div className="text-sm" style={{ color: 'var(--muted)' }}>档案馆还没有收进你的正式记录。</div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'rgba(20,20,24,0.88)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold tracking-wide" style={{ color: 'var(--npc-color)' }}>
                  异常观测
                </h2>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  {topAnomaly ? `最高强度 ${topAnomaly.level}` : '尚无明确异常'}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {hub.anomalies.length > 0 ? hub.anomalies.map((entry) => (
                  <div key={entry.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(122,176,212,0.06)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{entry.label}</div>
                      <div className="text-xs" style={{ color: 'var(--system-color)' }}>Lv.{entry.level}</div>
                    </div>
                    <div className="text-[11px] mb-2" style={{ color: 'var(--muted)' }}>
                      首次：{entry.firstSeenEpisodeId} / 最近：{entry.lastSeenEpisodeId}
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
                      {entry.notes.slice(-1)[0] ?? '暂无异常备注'}
                    </div>
                  </div>
                )) : (
                  <div className="text-sm" style={{ color: 'var(--muted)' }}>回响柱暂时还没有留下足够清晰的裂缝。</div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'rgba(20,20,24,0.88)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold tracking-wide" style={{ color: 'var(--player-color)' }}>
                  主角经历
                </h2>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  这些会逐渐拼出旅人的一生
                </div>
              </div>
              <div className="space-y-3">
                {hub.recentChronicles.length > 0 ? hub.recentChronicles.map((entry) => (
                  <div key={entry.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(139,196,138,0.06)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{entry.title}</div>
                      <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{entry.routeType}</div>
                    </div>
                    <div className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
                      {entry.episodeId} · 收录于 {formatDate(entry.createdAt)}
                    </div>
                  </div>
                )) : (
                  <div className="text-sm" style={{ color: 'var(--muted)' }}>你的经历还没有沉成完整的手记。</div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'rgba(20,20,24,0.88)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold tracking-wide" style={{ color: 'var(--clue-color)' }}>
                  小说提纲
                </h2>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  先成提纲，再长成小说
                </div>
              </div>
              <div className="space-y-3">
                {hub.novelProjects.length > 0 ? hub.novelProjects.map((project) => (
                  <div key={project.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(199,158,207,0.06)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                        {project.targetChapterCount} 章 / 每章约 {project.targetWordsPerChapter} 字
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{project.status}</div>
                    </div>
                    <div className="space-y-1">
                      {project.previewChapters.map((chapter) => (
                        <div key={chapter.chapter} className="text-xs" style={{ color: 'var(--foreground)' }}>
                          第{chapter.chapter}章 · {chapter.title} · 视角：{chapter.pov}
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                  <div className="text-sm" style={{ color: 'var(--muted)' }}>还没有任何一段经历长成提纲。</div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, rgba(122,176,212,0.08), rgba(20,20,24,0.92))' }}>
              <h2 className="text-sm font-bold tracking-wide mb-3" style={{ color: 'var(--npc-color)' }}>
                阿寂
              </h2>
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {ajiMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className="rounded-xl px-3 py-2 text-sm leading-relaxed"
                    style={{
                      background: message.role === 'aji' ? 'rgba(122,176,212,0.08)' : 'rgba(212,160,87,0.08)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                    }}
                  >
                    <div className="text-[11px] mb-1" style={{ color: message.role === 'aji' ? 'var(--npc-color)' : 'var(--system-color)' }}>
                      {message.role === 'aji' ? '阿寂' : '你'}
                    </div>
                    {message.content}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  value={ajiInput}
                  onChange={(event) => setAjiInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void askAji();
                    }
                  }}
                  placeholder="问阿寂：这些异常说明了什么？"
                  className="flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                />
                <button
                  onClick={() => {
                    void askAji();
                  }}
                  disabled={!ajiInput.trim() || ajiLoading}
                  className="rounded-xl px-4 py-2 text-sm font-bold transition-opacity disabled:opacity-40"
                  style={{ background: 'var(--npc-color)', color: 'var(--background)' }}
                >
                  {ajiLoading ? '回应中' : '发问'}
                </button>
              </div>
              {ajiRelationHint && (
                <div className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--system-color)' }}>
                  {ajiRelationHint}
                </div>
              )}
            </section>

            <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'rgba(20,20,24,0.88)' }}>
              <h2 className="text-sm font-bold tracking-wide mb-3" style={{ color: 'var(--system-color)' }}>
                常驻关系
              </h2>
              <div className="space-y-3">
                {hub.persistentNpcs.length > 0 ? hub.persistentNpcs.map((npc) => (
                  <div key={npc.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{npc.label}</div>
                      <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                        信任 {npc.trust} / 戒心 {npc.suspicion}
                      </div>
                    </div>
                    <div className="text-xs leading-relaxed mb-2" style={{ color: 'var(--muted)' }}>
                      {npc.memorySummary || '你们之间还没有形成足够清晰的共同记忆。'}
                    </div>
                    {npc.affinityTags.length > 0 && (
                      <div className="text-[11px]" style={{ color: 'var(--npc-color)' }}>
                        {npc.affinityTags.join(' / ')}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="text-sm" style={{ color: 'var(--muted)' }}>回响之间还没有谁真正把你认下来。</div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'rgba(20,20,24,0.88)' }}>
              <h2 className="text-sm font-bold tracking-wide mb-3" style={{ color: 'var(--system-color)' }}>
                主线认知
              </h2>
              <div className="space-y-3">
                {hub.cognition.length > 0 ? hub.cognition.map((entry) => (
                  <div key={entry.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: 'var(--foreground)' }}>{entry.label}</span>
                      <span style={{ color: 'var(--system-color)' }}>{entry.level}/3</span>
                    </div>
                    <div className="h-1.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div
                        className="h-full rounded"
                        style={{ width: `${(entry.level / 3) * 100}%`, background: 'var(--system-color)' }}
                      />
                    </div>
                  </div>
                )) : (
                  <div className="text-sm" style={{ color: 'var(--muted)' }}>你还停留在回响之间给出的表层说明里。</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
