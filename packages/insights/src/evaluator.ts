import type { InsightBrief, InsightEvaluation } from '@sellerpool/core';
import { BRAND_NAME_RU, InsightEvaluationSchema } from '@sellerpool/core';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  readonly name: string;
  completeStructured(messages: LLMMessage[]): Promise<InsightEvaluation>;
}

export interface LLMProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  return text.trim();
}

export function createOpenAICompatibleProvider(config: LLMProviderConfig): LLMProvider {
  return {
    name: config.model,
    async completeStructured(messages) {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`LLM request failed (${response.status}): ${body}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('LLM returned empty content');
      }

      const parsed = JSON.parse(extractJson(content));
      return InsightEvaluationSchema.parse(parsed);
    },
  };
}

export function createLLMProvider(
  provider: string,
  env: {
    deepseekApiKey?: string;
    deepseekBaseUrl?: string;
    qwenApiKey?: string;
    qwenBaseUrl?: string;
  }
): LLMProvider {
  if (provider === 'qwen') {
    if (!env.qwenApiKey) throw new Error('QWEN_API_KEY is required');
    return createOpenAICompatibleProvider({
      apiKey: env.qwenApiKey,
      baseUrl: env.qwenBaseUrl ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-plus',
    });
  }

  if (!env.deepseekApiKey) throw new Error('DEEPSEEK_API_KEY is required');
  return createOpenAICompatibleProvider({
    apiKey: env.deepseekApiKey,
    baseUrl: env.deepseekBaseUrl ?? 'https://api.deepseek.com',
    model: 'deepseek-chat',
  });
}

const EVALUATOR_SYSTEM_PROMPT = `Ты бизнес-аналитик ${BRAND_NAME_RU}. Оценивай только факты из brief.
Отвечай строго JSON с полями: summary, whatHappened, hypotheses (cause, confidence), recommendations, confidence.
Не выдумывай числа. Если данных мало — понижай confidence и пиши об этом.`;

export async function evaluateInsight(
  provider: LLMProvider,
  brief: InsightBrief
): Promise<InsightEvaluation> {
  return provider.completeStructured([
    { role: 'system', content: EVALUATOR_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Brief:\n${JSON.stringify(brief, null, 2)}`,
    },
  ]);
}
