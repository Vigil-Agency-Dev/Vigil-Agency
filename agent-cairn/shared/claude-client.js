import Anthropic from '@anthropic-ai/sdk';

export function createClaudeClient(apiKey) {
  const client = new Anthropic({ apiKey });
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
  const maxTokens = parseInt(process.env.MAX_TOKENS || '2048', 10);

  return {
    async chat(systemPrompt, messages) {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      });

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      return {
        text,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    },
  };
}
