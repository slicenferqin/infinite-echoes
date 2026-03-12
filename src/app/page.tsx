'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import GameView from '@/components/GameView';
import {
  ActiveSessionMeta,
  ApiStartResponse,
  EpisodeConfig,
  EpisodeSummary,
  GameState,
  MetaWorldSummary,
} from '@/lib/types';

const fallbackEpisode: EpisodeSummary = {
  id: 'ep01',
  name: '沉默的铁匠铺',
  description: '鸦石村，一个行商死在铁匠铺门前。铁匠被捕，却一言不发。执法官明日抵达。',
  difficulty: 1,
  maxRounds: 30,
};

interface ViewerUser {
  id: string;
  username: string;
  createdAt: number;
}

interface ViewerSessionPayload {
  user?: ViewerUser;
  activeSession?: ActiveSessionMeta | null;
  progress?: {
    unlockedEpisodes: string[];
    passedEpisodes: string[];
  };
  metaWorld?: MetaWorldSummary;
  recentArtifacts?: Array<{
    id: string;
    episodeId: string;
    routeId: string;
    kind: string;
    title: string;
    createdAt: number;
  }>;
  recentChronicles?: Array<{
    id: string;
    episodeId: string;
    routeId: string;
    routeType: string;
    title: string;
    createdAt: number;
  }>;
  error?: string;
}

export default function Home() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [episodeConfig, setEpisodeConfig] = useState<EpisodeConfig | null>(null);

  const [user, setUser] = useState<ViewerUser | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSessionMeta | null>(null);
  const [progress, setProgress] = useState<{ unlockedEpisodes: string[]; passedEpisodes: string[] } | null>(null);
  const [metaWorld, setMetaWorld] = useState<MetaWorldSummary | null>(null);
  const [recentArtifacts, setRecentArtifacts] = useState<ViewerSessionPayload['recentArtifacts']>([]);
  const [recentChronicles, setRecentChronicles] = useState<ViewerSessionPayload['recentChronicles']>([]);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [playerName, setPlayerName] = useState('');
  const [profession, setProfession] = useState('journalist');
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('ep01');

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const professions = [
    { id: 'journalist', name: '记者', trait: '敏锐直觉——更容易注意到矛盾' },
    { id: 'doctor', name: '医生', trait: '察言观色——感知情绪变化' },
    { id: 'programmer', name: '程序员', trait: '逻辑链——推理容错率更高' },
    { id: 'teacher', name: '教师', trait: '循循善诱——信任度提升更快' },
  ];

  const availableEpisodes = useMemo(() => (episodes.length > 0 ? episodes : [fallbackEpisode]), [episodes]);

  const activeEpisode = useMemo(
    () => availableEpisodes.find((episode) => episode.id === selectedEpisodeId),
    [availableEpisodes, selectedEpisodeId]
  );

  const selectedEpisodeUsesIdentityPool =
    activeEpisode?.identityMode === 'random_pool';

  const activeSessionEpisodeName = useMemo(() => {
    if (!activeSession) return null;
    const match = availableEpisodes.find((episode) => episode.id === activeSession.episodeId);
    return match?.name ?? activeSession.episodeId;
  }, [activeSession, availableEpisodes]);

  const loadEpisodes = useCallback(async () => {
    if (!user) {
      setEpisodes([]);
      return;
    }

    setLoadError(null);

    try {
      const response = await fetch('/api/episodes', { cache: 'no-store' });
      const data = await response.json();

      if (response.status === 401) {
        setUser(null);
        setActiveSession(null);
        setProgress(null);
        setEpisodes([]);
        return;
      }

      if (!response.ok) {
        setLoadError(data.error ?? '副本列表加载失败，已使用默认副本。');
        setEpisodes([fallbackEpisode]);
        setSelectedEpisodeId(fallbackEpisode.id);
        return;
      }

      const episodeList = (data.episodes as EpisodeSummary[]) ?? [];
      if (episodeList.length === 0) {
        setEpisodes([fallbackEpisode]);
        setSelectedEpisodeId(fallbackEpisode.id);
        return;
      }

      setEpisodes(episodeList);

      const defaultId = typeof data.defaultEpisodeId === 'string' ? data.defaultEpisodeId : episodeList[0].id;
      setSelectedEpisodeId((current) => {
        if (episodeList.some((episode) => episode.id === current)) {
          return current;
        }
        return defaultId;
      });
    } catch (error) {
      console.error('Failed to load episodes:', error);
      setLoadError('副本列表加载失败，已使用默认副本。');
      setEpisodes([fallbackEpisode]);
      setSelectedEpisodeId(fallbackEpisode.id);
    }
  }, [user]);

  const loadAuthSession = useCallback(async () => {
    setAuthLoading(true);

    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      const data = (await response.json()) as ViewerSessionPayload;

      if (response.status === 401) {
        setUser(null);
        setActiveSession(null);
        setProgress(null);
        setMetaWorld(null);
        setRecentArtifacts([]);
        setRecentChronicles([]);
        setEpisodes([]);
        return;
      }

      if (!response.ok || !data.user) {
        setUser(null);
        setActiveSession(null);
        setProgress(null);
        setMetaWorld(null);
        setRecentArtifacts([]);
        setRecentChronicles([]);
        setEpisodes([]);
        return;
      }

      setUser(data.user);
      setActiveSession(data.activeSession ?? null);
      setProgress(data.progress ?? null);
      setMetaWorld(data.metaWorld ?? null);
      setRecentArtifacts(data.recentArtifacts ?? []);
      setRecentChronicles(data.recentChronicles ?? []);
    } catch (error) {
      console.error('Failed to load auth session:', error);
      setUser(null);
      setActiveSession(null);
      setProgress(null);
      setMetaWorld(null);
      setRecentArtifacts([]);
      setRecentChronicles([]);
      setEpisodes([]);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const refreshLobby = useCallback(async () => {
    await loadAuthSession();
  }, [loadAuthSession]);

  useEffect(() => {
    void refreshLobby();
  }, [refreshLobby]);

  useEffect(() => {
    if (!user) return;
    void loadEpisodes();
  }, [user, loadEpisodes]);

  async function submitAuth() {
    setAuthSubmitting(true);
    setAuthError(null);

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authUsername,
          password: authPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error ?? '认证失败，请稍后重试。');
        return;
      }

      setAuthPassword('');
      await refreshLobby();
      await loadEpisodes();
    } catch (error) {
      console.error('Auth failed:', error);
      setAuthError('网络异常，认证未完成。');
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function logout() {
    setAuthError(null);
    setStartError(null);

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed:', error);
    }

    setUser(null);
    setActiveSession(null);
    setProgress(null);
    setMetaWorld(null);
    setRecentArtifacts([]);
    setRecentChronicles([]);
    setEpisodes([]);
    setGameState(null);
    setSessionId(null);
    setEpisodeConfig(null);
  }

  async function startGame(mode: 'new' | 'resume') {
    setLoading(true);
    setStartError(null);

    try {
      const selectedEpisode = availableEpisodes.find(
        (episode) => episode.id === selectedEpisodeId
      );
      const usesIdentityPool = selectedEpisode?.identityMode === 'random_pool';

      const payload =
        mode === 'resume'
          ? { mode: 'resume' }
          : (() => {
              const basePayload: {
                mode: 'new';
                playerName: string;
                episodeId: string;
                profession?: string;
              } = {
                mode: 'new',
                playerName: playerName || '旅人',
                episodeId: selectedEpisodeId,
              };

              if (!usesIdentityPool) {
                basePayload.profession = profession;
              }

              return basePayload;
            })();

      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as Partial<ApiStartResponse> & {
        error?: string;
        code?: string;
      };

      if (res.status === 401) {
        setUser(null);
        setActiveSession(null);
        setProgress(null);
        setStartError('登录已失效，请重新登录。');
        return;
      }

      if (!res.ok || !data.sessionId || !data.state || !data.episodeConfig) {
        if (data.code === 'NO_ACTIVE_SESSION') {
          setStartError('没有可继续的进度，请直接开启新调查。');
          await refreshLobby();
          return;
        }

        setStartError(data.error ?? '进入回响之间失败，请稍后重试。');
        await loadEpisodes();
        return;
      }

      setSessionId(data.sessionId);
      setGameState(data.state);
      setEpisodeConfig(data.episodeConfig);
      await refreshLobby();
    } catch (err) {
      console.error('Failed to start game:', err);
      setStartError('网络异常，暂时无法进入回响之间。');
    } finally {
      setLoading(false);
    }
  }

  function resetSession() {
    setGameState(null);
    setSessionId(null);
    setEpisodeConfig(null);
    setStartError(null);
    void refreshLobby();
    void loadEpisodes();
  }

  if (gameState && sessionId && episodeConfig) {
    return (
      <GameView
        initialState={gameState}
        sessionId={sessionId}
        episodeConfig={episodeConfig}
        onSessionExpired={resetSession}
      />
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-sm" style={{ color: 'var(--muted)' }}>正在校验回响身份…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--input-bg)' }}>
          <h1 className="text-2xl font-bold tracking-wide mb-2" style={{ color: 'var(--system-color)' }}>
            无尽回响
          </h1>
          <p className="text-xs mb-6" style={{ color: 'var(--muted)' }}>
            登录后可保存解锁进度与调查续玩。
          </p>

          <div className="flex gap-2 mb-4">
            {(['login', 'register'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setAuthMode(mode);
                  setAuthError(null);
                }}
                className="flex-1 px-3 py-2 text-xs rounded border transition-colors"
                style={{
                  borderColor: authMode === mode ? 'var(--system-color)' : 'var(--border)',
                  color: authMode === mode ? 'var(--system-color)' : 'var(--muted)',
                  background: authMode === mode ? 'rgba(212,160,87,0.08)' : 'transparent',
                }}
              >
                {mode === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>用户名</label>
              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                autoComplete="username"
                placeholder="请输入用户名"
                className="w-full px-3 py-2 text-sm rounded border focus:outline-none"
                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>密码</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                placeholder="至少 8 位"
                className="w-full px-3 py-2 text-sm rounded border focus:outline-none"
                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              />
            </div>
          </div>

          {authError && (
            <div className="mt-4 px-3 py-2 text-xs rounded border" style={{ borderColor: 'var(--border)', color: 'var(--system-color)', background: 'var(--background)' }}>
              {authError}
            </div>
          )}

          <button
            onClick={() => {
              void submitAuth();
            }}
            disabled={authSubmitting || !authUsername.trim() || !authPassword.trim()}
            className="w-full mt-5 py-3 rounded text-sm font-bold tracking-wide transition-opacity hover:opacity-85 disabled:opacity-40"
            style={{ background: 'var(--system-color)', color: 'var(--background)' }}
          >
            {authSubmitting ? '处理中…' : authMode === 'login' ? '登录并继续' : '注册并进入'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-widest mb-1" style={{ color: 'var(--system-color)' }}>
              无 尽 回 响
            </h1>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>INFINITE ECHOES</p>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: 'var(--muted)' }}>当前账号</div>
            <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{user.username}</div>
            <div className="flex items-center justify-end gap-3 mt-1">
              <Link href="/hub" className="text-xs hover:opacity-80" style={{ color: 'var(--npc-color)' }}>
                进入回响之间
              </Link>
              <button
                onClick={() => {
                  void logout();
                }}
                className="text-xs hover:opacity-80"
                style={{ color: 'var(--system-color)' }}
              >
                退出登录
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--input-bg)' }}>
          <div className="text-xs leading-relaxed" style={{ color: 'var(--gm-color)' }}>
            <p>世界的尽头不是虚无，而是一片灰白色的静默空间。</p>
            <p className="mt-1">完成试炼，或许能重返人间。</p>
          </div>

          {activeSession && (
            <div className="rounded border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(122,176,212,0.06)' }}>
              <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
                上次调查尚未结束：{activeSessionEpisodeName} · 已行动 {activeSession.round} 步
              </div>
              <button
                onClick={() => {
                  void startGame('resume');
                }}
                disabled={loading}
                className="w-full py-2 rounded text-sm font-bold transition-opacity hover:opacity-85 disabled:opacity-40"
                style={{ background: 'var(--npc-color)', color: 'var(--background)' }}
              >
                {loading ? '正在载入…' : '继续上次调查'}
              </button>
            </div>
          )}

          {progress && (
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              已通过副本：{progress.passedEpisodes.length} ｜ 已解锁副本：{progress.unlockedEpisodes.length}
            </div>
          )}

          {metaWorld && (
            <div className="rounded border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(212,160,87,0.06)' }}>
              <div className="text-xs font-bold mb-2" style={{ color: 'var(--system-color)' }}>
                回响之间近况
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-[11px] mb-1" style={{ color: 'var(--muted)' }}>常驻角色</div>
                  <div className="space-y-1">
                    {metaWorld.npcRelations.length > 0 ? metaWorld.npcRelations.map((entry) => (
                      <div key={entry.id} className="text-xs" style={{ color: 'var(--foreground)' }}>
                        {entry.label} · 信任 {entry.trust ?? 0} / 戒心 {entry.suspicion ?? 0}
                      </div>
                    )) : (
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>还未形成稳定关系。</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] mb-1" style={{ color: 'var(--muted)' }}>异常观测</div>
                  <div className="space-y-1">
                    {metaWorld.anomalyHighlights.length > 0 ? metaWorld.anomalyHighlights.map((entry) => (
                      <div key={entry.id} className="text-xs" style={{ color: 'var(--foreground)' }}>
                        {entry.label} · 强度 {entry.level ?? 0}{entry.confirmed ? ' · 已确认' : ''}
                      </div>
                    )) : (
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>尚无明确异常。</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] mb-1" style={{ color: 'var(--muted)' }}>主线认知</div>
                  <div className="space-y-1">
                    {metaWorld.cognitionHighlights.length > 0 ? metaWorld.cognitionHighlights.map((entry) => (
                      <div key={entry.id} className="text-xs" style={{ color: 'var(--foreground)' }}>
                        {entry.label} · 层级 {entry.level ?? 0}/3
                      </div>
                    )) : (
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>你仍停留在表层解释。</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] mb-1" style={{ color: 'var(--muted)' }}>最新档案</div>
                  <div className="space-y-1">
                    {metaWorld.recentArchives.length > 0 ? metaWorld.recentArchives.map((entry) => (
                      <div key={entry.id} className="text-xs" style={{ color: 'var(--foreground)' }}>
                        {entry.label} · {entry.episodeId} / {entry.routeType}
                      </div>
                    )) : (
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>档案馆还没有你的正式记录。</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-[11px] mt-2" style={{ color: 'var(--muted)' }}>
                已开放区域：{metaWorld.unlockedHubAreas.length > 0 ? metaWorld.unlockedHubAreas.join(' / ') : '无'}
              </div>
            </div>
          )}

          {(recentArtifacts?.length || recentChronicles?.length) ? (
            <div className="rounded border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(122,176,212,0.06)' }}>
              <div className="text-xs font-bold mb-2" style={{ color: 'var(--npc-color)' }}>
                最近沉淀
              </div>
              {recentChronicles && recentChronicles.length > 0 && (
                <div className="mb-2">
                  <div className="text-[11px] mb-1" style={{ color: 'var(--muted)' }}>主角经历</div>
                  {recentChronicles.slice(0, 2).map((entry) => (
                    <div key={entry.id} className="text-xs" style={{ color: 'var(--foreground)' }}>
                      {entry.title} · {entry.routeType}
                    </div>
                  ))}
                </div>
              )}
              {recentArtifacts && recentArtifacts.length > 0 && (
                <div>
                  <div className="text-[11px] mb-1" style={{ color: 'var(--muted)' }}>档案与碎片</div>
                  {recentArtifacts.slice(0, 3).map((entry) => (
                    <div key={entry.id} className="text-xs" style={{ color: 'var(--foreground)' }}>
                      {entry.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {loadError && (
            <div
              className="px-3 py-2 text-xs rounded border"
              style={{ borderColor: 'var(--border)', color: 'var(--system-color)', background: 'var(--background)' }}
            >
              {loadError}
            </div>
          )}

          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--muted)' }}>你的名字</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="旅人"
              className="w-full px-3 py-2 text-sm rounded border focus:outline-none"
              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>

          {selectedEpisodeUsesIdentityPool ? (
            <div className="rounded border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(122,176,212,0.06)' }}>
              <div className="text-xs font-bold mb-1" style={{ color: 'var(--npc-color)' }}>
                本副本启用身份池
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                进入副本时将随机抽取身份，并且本局不可重抽。若想换身份，只能重开新调查。
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs mb-2" style={{ color: 'var(--muted)' }}>生前职业</label>
              <div className="grid grid-cols-2 gap-2">
                {professions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProfession(p.id)}
                    className="text-left px-3 py-2 rounded border text-sm transition-colors"
                    style={{
                      background: profession === p.id ? 'rgba(212,160,87,0.12)' : 'var(--background)',
                      borderColor: profession === p.id ? 'var(--system-color)' : 'var(--border)',
                      color: profession === p.id ? 'var(--system-color)' : 'var(--foreground)',
                    }}
                  >
                    <div className="font-bold">{p.name}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{p.trait}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--muted)' }}>选择副本</label>
            <div className="space-y-2">
              {availableEpisodes.map((episode) => (
                <button
                  key={episode.id}
                  onClick={() => setSelectedEpisodeId(episode.id)}
                  className="w-full text-left px-3 py-2 rounded border transition-colors"
                  style={{
                    background: selectedEpisodeId === episode.id ? 'rgba(212,160,87,0.08)' : 'var(--background)',
                    borderColor: selectedEpisodeId === episode.id ? 'var(--system-color)' : 'var(--border)',
                  }}
                >
                  <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                    {episode.name}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    难度 {'★'.repeat(Math.max(1, episode.difficulty))}{'☆'.repeat(Math.max(0, 5 - episode.difficulty))}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
                    {episode.identityMode === 'random_pool'
                      ? `身份池随机 · ${episode.identityPoolSize ?? 0} 个身份`
                      : '遗留职业模式'}
                  </div>
                </button>
              ))}
            </div>
            {activeEpisode && (
              <>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {activeEpisode.description}
                </p>
                {selectedEpisodeUsesIdentityPool && (
                  <p className="text-[11px] mt-2" style={{ color: 'var(--npc-color)' }}>
                    进入后将随机抽取身份（不可重抽）。请按抽中的社会位置与 NPC 周旋。
                  </p>
                )}
              </>
            )}
          </div>

          {startError && (
            <div
              className="px-3 py-2 text-xs rounded border"
              style={{ borderColor: 'var(--border)', color: 'var(--system-color)', background: 'var(--background)' }}
            >
              {startError}
            </div>
          )}

          <button
            onClick={() => {
              void startGame('new');
            }}
            disabled={loading}
            className="w-full py-3 rounded text-sm font-bold tracking-wider transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--system-color)', color: 'var(--background)' }}
          >
            {loading
              ? '正在进入回响之间...'
              : selectedEpisodeUsesIdentityPool
                ? '进入裂隙门（随机身份）'
                : '进入裂隙门'}
          </button>
        </div>
      </div>
    </div>
  );
}
