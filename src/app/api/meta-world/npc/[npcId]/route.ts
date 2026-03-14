import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, unauthorizedResponse } from '@/lib/auth/guard';
import { callLlmWithMeta, LlmError } from '@/lib/llm';
import {
  applyPersistentCounselorConversationEffects,
  buildPersistentCounselorFallbackReply,
  buildPersistentCounselorPrompt,
  isPersistentCounselorId,
} from '@/lib/meta-world/counselors';
import { buildMetaWorldHubPayload } from '@/lib/meta-world/hub';
import { getMetaWorldState, upsertMetaWorldState } from '@/lib/meta-world/repo';

const requestSchema = z.object({
  message: z.string().trim().min(1).max(800),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ npcId: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { npcId } = await context.params;
  if (!isPersistentCounselorId(npcId)) {
    return NextResponse.json(
      { error: '这个常驻角色还没有准备好回应。' },
      { status: 404 }
    );
  }

  const payload = requestSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: '问题格式不合法。' },
      { status: 400 }
    );
  }

  const metaWorld = getMetaWorldState(auth.user.id);
  const hub = buildMetaWorldHubPayload(auth.user.id);
  const effects = applyPersistentCounselorConversationEffects({
    npcId,
    state: metaWorld,
    message: payload.data.message,
  });

  try {
    const completion = await callLlmWithMeta(
      buildPersistentCounselorPrompt({
        npcId,
        username: auth.user.username,
        hub,
      }),
      [{ role: 'user', content: payload.data.message }],
      { temperature: npcId === 'hooded_figure' ? 0.65 : 0.55, maxTokens: 260 }
    );

    const nextMetaWorld = upsertMetaWorldState(
      applyPersistentCounselorConversationEffects({
        npcId,
        state: metaWorld,
        message: payload.data.message,
        reply: completion.text.trim(),
      }).state
    );

    return NextResponse.json({
      npcId,
      reply: completion.text.trim(),
      relationUpdate: effects.relationUpdate,
      hub: buildMetaWorldHubPayload(nextMetaWorld.userId),
    });
  } catch (error) {
    if (error instanceof LlmError) {
      const fallbackReply =
        error.type === 'config'
          ? '这里先按简化模式回应你。等 live LLM 接好，这个人说话会更完整。'
          : buildPersistentCounselorFallbackReply(npcId, payload.data.message);
      const nextMetaWorld = upsertMetaWorldState(
        applyPersistentCounselorConversationEffects({
          npcId,
          state: metaWorld,
          message: payload.data.message,
          reply: fallbackReply,
        }).state
      );

      return NextResponse.json({
        npcId,
        reply: fallbackReply,
        relationUpdate: effects.relationUpdate,
        hub: buildMetaWorldHubPayload(nextMetaWorld.userId),
      });
    }

    throw error;
  }
}
