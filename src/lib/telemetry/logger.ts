export interface GameTelemetryEvent {
  event: string;
  sessionId?: string;
  episodeId?: string;
  round?: number;
  actionType?: string;
  llmLatencyMs?: number;
  llmAttempts?: number;
  llmPromptTokens?: number;
  llmCompletionTokens?: number;
  llmTotalTokens?: number;
  newFlags?: string[];
  newClues?: string[];
  errorType?: string;
  detail?: Record<string, unknown>;
}

export function logGameTelemetry(payload: GameTelemetryEvent): void {
  const entry = {
    ts: new Date().toISOString(),
    ...payload,
  };

  console.log('[game-telemetry]', JSON.stringify(entry));
}
