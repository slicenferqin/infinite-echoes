import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || 'https://as086nwvpbrnivunc.imds.ai/api/v1',
  apiKey: process.env.LLM_API_KEY || '',
});

const DEFAULT_MODEL = process.env.LLM_MODEL || 'claude-haiku-4-5-20251001';

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type LlmErrorType =
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

export async function callLlmWithMeta(
  systemPrompt: string,
  messages: LlmMessage[],
  options?: LlmCallOptions
): Promise<LlmCallMeta> {
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
          model: DEFAULT_MODEL,
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
        model: response.model ?? DEFAULT_MODEL,
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
