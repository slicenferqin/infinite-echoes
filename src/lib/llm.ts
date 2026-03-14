import OpenAI from 'openai';

const MOCK_MODEL = 'mock-contributor-v1';

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type LlmErrorType =
  | 'config'
  | 'timeout'
  | 'network'
  | 'api_4xx'
  | 'api_5xx'
  | 'invalid_response'
  | 'unknown';

export class LlmError extends Error {
  public readonly type: LlmErrorType;
  public readonly causeError?: unknown;

  constructor(type: LlmErrorType, message: string, causeError?: unknown) {
    super(message);
    this.name = 'LlmError';
    this.type = type;
    this.causeError = causeError;
  }
}

export interface LlmCallOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  maxAttempts?: number;
}

export interface LlmCallMeta {
  text: string;
  model: string;
  latencyMs: number;
  attempts: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface LlmRuntimeConfig {
  mode: 'live' | 'mock';
  baseURL: string;
  apiKey: string;
  model: string;
  issues: string[];
}

function normalizeEnv(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function getLlmRuntimeConfig(): LlmRuntimeConfig {
  const explicitMode = normalizeEnv(process.env.LLM_MODE).toLowerCase();
  const baseURL = normalizeEnv(process.env.LLM_BASE_URL);
  const apiKey = normalizeEnv(process.env.LLM_API_KEY);
  const model = normalizeEnv(process.env.LLM_MODEL);

  const hasLiveHints = Boolean(baseURL || apiKey || model);
  const mode =
    explicitMode === 'live'
      ? 'live'
      : explicitMode === 'mock'
        ? 'mock'
        : hasLiveHints
          ? 'live'
          : 'mock';

  const issues: string[] = [];

  if (mode === 'live') {
    if (!baseURL) issues.push('缺少 LLM_BASE_URL');
    if (!apiKey) issues.push('缺少 LLM_API_KEY');
    if (!model) issues.push('缺少 LLM_MODEL');
  }

  return {
    mode,
    baseURL,
    apiKey,
    model,
    issues,
  };
}

function isRetryable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const err = error as {
    status?: number;
    code?: string;
    name?: string;
  };

  if (err.name === 'AbortError') return true;

  if (typeof err.status === 'number') {
    return err.status >= 500 || err.status === 429;
  }

  const retryableCodes = new Set([
    'ECONNRESET',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'ENOTFOUND',
    'UND_ERR_CONNECT_TIMEOUT',
  ]);

  return !!err.code && retryableCodes.has(err.code);
}

function classifyError(error: unknown): LlmErrorType {
  if (!error || typeof error !== 'object') return 'unknown';

  const err = error as {
    status?: number;
    name?: string;
    code?: string;
  };

  if (err.name === 'AbortError') return 'timeout';

  if (typeof err.status === 'number') {
    if (err.status >= 500) return 'api_5xx';
    if (err.status >= 400) return 'api_4xx';
  }

  if (typeof err.code === 'string') return 'network';

  return 'unknown';
}

function normalizeContent(content: unknown): string {
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === 'string' ? text : '';
        }
        return '';
      })
      .join('')
      .trim();
  }

  return '';
}

function extractLineValue(source: string, label: string): string {
  const line = source
    .split('\n')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(label));

  return line?.slice(label.length).trim() ?? '';
}

function extractTagValue(source: string, tag: string): string | null {
  const match = source.match(new RegExp(`\\[${tag}:([^\\]]+)\\]`));
  return match?.[1]?.trim() ?? null;
}

function lastUserMessage(messages: LlmMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') {
      return messages[index].content.trim();
    }
  }

  return '';
}

function buildMockSummary(messages: LlmMessage[]): string {
  const latest = lastUserMessage(messages).split('\n')[0]?.trim();
  if (!latest) {
    return '你们已经来回试探过几轮，对方仍有保留，但话没有彻底关死。';
  }

  return `你们已经围绕“${latest.slice(0, 24)}”来回试探过几轮，对方仍有保留，但态度没有彻底关死。`;
}

function buildMockNpcResponse(systemPrompt: string, messages: LlmMessage[]): string {
  const npcName = extractLineValue(systemPrompt, '姓名：') || '对方';
  const signatureLine = extractLineValue(systemPrompt, '你最容易脱口而出的那句话：');
  const latest = lastUserMessage(messages);
  const playerLine = latest.split('\n')[0]?.trim() ?? '';

  let trustDelta = 0;
  if (latest.includes('接住对方情绪')) trustDelta = 1;
  if (latest.includes('语气加重')) trustDelta = -1;
  if (latest.includes('交换条件')) trustDelta = 0;
  if (latest.includes('出示了线索')) trustDelta = 1;
  if (/威胁|要挟|不然|否则|报复|伤害/.test(playerLine)) trustDelta = -2;

  let firstSentence = signatureLine || '这话我得想清楚再答。';
  if (npcName === '诺拉' && /汉克|你爹|父亲|地窖/.test(playerLine)) {
    firstSentence = '我只想先见到我爹。地窖再冷一夜，他真会撑不住。';
  } else if (npcName === '汉克' && /诺拉/.test(playerLine)) {
    firstSentence = '诺拉还在外头？别让她在风里站太久。';
  } else if (npcName === '艾德蒙' && /钥匙|汉克/.test(playerLine)) {
    firstSentence = '该按规矩走的事，我不会让外人一句话就改了。';
  } else if (/昨夜|那晚|昨晚/.test(playerLine)) {
    firstSentence = '昨夜的事我记得，但不是一两句就能说尽。';
  }

  let secondSentence = '你换个稳一点的问法，我还能继续接。';
  if (latest.includes('接住对方情绪')) {
    secondSentence = '你若真想帮，就先把人和地方都看清。';
  } else if (latest.includes('语气加重')) {
    secondSentence = '你别拿狠话压我，压得再紧，我也不会顺着你乱说。';
  } else if (latest.includes('交换条件')) {
    secondSentence = '你要换这句话，总得先让我知道你拿什么来换。';
  } else if (latest.includes('出示了线索')) {
    secondSentence = '你手里的东西我看见了，但这还不够把所有话都撬开。';
  }

  return `${firstSentence}${secondSentence ? ` ${secondSentence}` : ''}\n[TRUST_DELTA:${trustDelta >= 0 ? `+${trustDelta}` : trustDelta}]`;
}

function buildMockGmResponse(messages: LlmMessage[]): string {
  const latest = lastUserMessage(messages);
  const clueId = extractTagValue(latest, 'CLUE_FOUND');
  const itemId = extractTagValue(latest, 'ITEM_FOUND');
  const flagId = extractTagValue(latest, 'FLAG_SET');

  if (clueId) {
    const clueNameMatch = latest.match(/发现了一条线索：([^—。\n]+)(?:—|。)/);
    const clueName = clueNameMatch?.[1]?.trim() ?? clueId;
    return `你把那处容易被忽略的地方反复查了一遍，终于翻出一条能往前推的痕迹：${clueName}。它还解释不了全部，但已经够你把下一步问话落到实处。[CLUE_FOUND:${clueId}]`;
  }

  if (itemId) {
    const itemNameMatch = latest.match(/发现物品：([^（。\n]+)/);
    const itemName = itemNameMatch?.[1]?.trim() ?? itemId;
    return `你伸手把东西从夹缝里摸了出来，是${itemName}。这东西暂时不起眼，但留在手里总比留在现场安全。[ITEM_FOUND:${itemId}]`;
  }

  if (latest.includes('当前地点没有这个东西')) {
    return '你沿着周围摸了一圈，只摸到些不相干的灰土和旧痕，没有找到你要找的东西。';
  }

  if (latest.includes('暂时还无法接触那里')) {
    return '你试着往里探了探，可那处地方眼下还碰不得，只能先把位置记在心里。';
  }

  if (latest.includes('缺少必要物品')) {
    return '你手头还差一道关键东西，强行去碰只会白费功夫。';
  }

  const base = flagId
    ? `你在现场多看了几眼，心里已经有了下一步该去哪里查的方向。[FLAG_SET:${flagId}]`
    : '你把现场翻了一遍，只先记下一些零碎痕迹，暂时还不够把话说死。';

  return base;
}

function buildMockEvaluation(): string {
  return JSON.stringify({
    overallTruthScore: 30,
    logicCoherence: 50,
    summary: '当前处于 mock 模式，结算结果按保守规则生成，仅用于本地联调和贡献者上手。',
    signalFlags: {},
  });
}

function buildMockCounselorReply(messages: LlmMessage[]): string {
  const latest = lastUserMessage(messages).split('\n')[0]?.trim();
  if (!latest) {
    return '先别急着往前赶。把你刚才最想抓住的那件事记住，再决定下一步。';
  }

  return `你先记住这句：${latest.slice(0, 28)}。回响不会替你做判断，但会记得你为什么迟疑。`;
}

function buildMockResponse(
  systemPrompt: string,
  messages: LlmMessage[]
): LlmCallMeta {
  const startedAt = Date.now();

  let text = '先把你眼前能确认的东西记下来，再继续往前。';

  if (systemPrompt.includes('你是一个对话摘要工具')) {
    text = buildMockSummary(messages);
  } else if (systemPrompt.includes('你是一个严格但公正的评判系统')) {
    text = buildMockEvaluation();
  } else if (systemPrompt.includes('你是一个文字冒险解谜游戏中的 NPC 角色')) {
    text = buildMockNpcResponse(systemPrompt, messages);
  } else if (systemPrompt.includes('你是一个文字冒险解谜游戏的 GM（游戏主持人）')) {
    text = buildMockGmResponse(messages);
  } else {
    text = buildMockCounselorReply(messages);
  }

  return {
    text,
    model: MOCK_MODEL,
    latencyMs: Date.now() - startedAt,
    attempts: 1,
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
  };
}

function createClient(config: LlmRuntimeConfig): OpenAI {
  return new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });
}

export async function callLlmWithMeta(
  systemPrompt: string,
  messages: LlmMessage[],
  options?: LlmCallOptions
): Promise<LlmCallMeta> {
  const config = getLlmRuntimeConfig();

  if (config.mode === 'mock') {
    return buildMockResponse(systemPrompt, messages);
  }

  if (config.issues.length > 0) {
    throw new LlmError(
      'config',
      `LLM live 配置不完整：${config.issues.join('、')}。请检查 .env.local，或移除 live 配置字段以回退到 mock 模式。`
    );
  }

  const client = createClient(config);
  const maxAttempts = Math.max(1, options?.maxAttempts ?? 3);
  const timeoutMs = Math.max(1_000, options?.timeoutMs ?? 15_000);

  const injectedMessages: LlmMessage[] = [
    {
      role: 'user',
      content: `[系统指令 - 你必须严格遵守以下设定，不得跳出角色]\n\n${systemPrompt}\n\n[以下是对话开始]`,
    },
    {
      role: 'assistant',
      content: '明白，我将严格按照设定进行角色扮演。',
    },
    ...messages,
  ];

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await client.chat.completions.create(
        {
          model: config.model,
          max_tokens: options?.maxTokens ?? 1024,
          temperature: options?.temperature ?? 0.7,
          messages: injectedMessages,
        },
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timer);

      const text = normalizeContent(response.choices[0]?.message?.content);
      if (!text) {
        throw new LlmError('invalid_response', 'LLM 返回了空内容');
      }

      return {
        text,
        model: response.model ?? config.model,
        latencyMs: Date.now() - startedAt,
        attempts: attempt,
        usage: {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
        },
      };
    } catch (error) {
      clearTimeout(timer);
      lastError = error;

      const retryable = isRetryable(error);
      if (!retryable || attempt >= maxAttempts) {
        const type = error instanceof LlmError ? error.type : classifyError(error);
        const message =
          error instanceof Error ? error.message : '调用 LLM 时发生未知错误';
        throw new LlmError(type, message, error);
      }
    }
  }

  throw new LlmError('unknown', 'LLM 调用失败且未返回具体错误', lastError);
}

export async function callLlm(
  systemPrompt: string,
  messages: LlmMessage[],
  options?: LlmCallOptions
): Promise<string> {
  const result = await callLlmWithMeta(systemPrompt, messages, options);
  return result.text;
}
