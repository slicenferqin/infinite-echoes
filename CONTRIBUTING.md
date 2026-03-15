# Contributing

## 目标

这个项目需要的不是“随手提点子”，而是能把问题说清楚、把改动落到文档或代码里的人。

适合贡献的方向：

- 副本文案与戏剧入口
- NPC 关系 / 记忆 / 谎言层
- 社交 lead / 资格门槛 / 时间窗口
- 前端交互、信息架构、可玩性反馈
- 多 agent / memory / world simulation 工程
- 试玩、结构化反馈、回归验证

## 本地启动

```bash
npm install
cp .env.local.example .env.local
npm run doctor
npm run db:reset
npm run smoke:mock
npm run dev
```

默认 `.env.local.example` 使用 `LLM_MODE=mock`，这意味着：

- 项目可以直接启动
- 不需要先申请模型 key
- 对话 / 搜查 / 结算会走保守占位响应
- 适合联调 UI、流程、状态机、数据库、鉴权

如果你要接入真实模型，改成：

```bash
LLM_MODE=live
LLM_API_STYLE=openai
LLM_BASE_URL=https://your-openai-compatible-gateway.example.com/v1
LLM_API_KEY=your_key_or_dummy
LLM_MODEL=your_model_name
```

说明：

- `LLM_API_STYLE=openai` 时，网关必须兼容 OpenAI `chat.completions`
- `LLM_API_STYLE=anthropic` 时，网关必须兼容 Anthropic `v1/messages`
- 如果你的网关不校验 key，`LLM_API_KEY` 也要填一个非空值，例如 `dummy`

## 提交前自检

```bash
npm run doctor
npm run db:reset
npm run smoke:mock
npm run lint
npm run build
```

## 贡献建议

- 小步提交，不要把文案、机制、UI、数据结构全揉成一个 commit
- 改副本内容时，优先同步对应文档
- 不要提交真实 key、生产地址、数据库文件
- 如果是戏剧/文案调整，附上“为什么这样改”的一段说明，避免只给结论
