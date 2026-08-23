import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generatorConfig } from './config';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmOptions {
  provider?: string;
  model?: string;
  temperature?: number;
  stream?: boolean;
}

function resolveProviderModel(provider?: string, model?: string) {
  const p = provider || generatorConfig.default_provider;
  const providers = generatorConfig.providers as Record<string, { default_model: string; models: Record<string, unknown> }>;
  const cfg = providers[p];
  const m = model || cfg?.default_model || 'gpt-4o';
  return { provider: p, model: m };
}

export async function completeText(prompt: string, options: LlmOptions = {}): Promise<string> {
  const { provider, model } = resolveProviderModel(options.provider, options.model);

  if (provider === 'google') {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_API_KEY is not configured');
    const genAI = new GoogleGenerativeAI(apiKey);
    const gModel = genAI.getGenerativeModel({ model });
    const result = await gModel.generateContent(prompt);
    return result.response.text();
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: provider === 'openai' ? model : 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: options.temperature ?? 0.4,
  });
  return response.choices[0]?.message?.content || '';
}

export async function* streamText(
  messages: LlmMessage[],
  options: LlmOptions = {},
): AsyncGenerator<string> {
  const { provider, model } = resolveProviderModel(options.provider, options.model);

  if (provider === 'google') {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_API_KEY is not configured');
    const genAI = new GoogleGenerativeAI(apiKey);
    const gModel = genAI.getGenerativeModel({ model });
    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join('\n\n');
    const result = await gModel.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  const openai = new OpenAI({ apiKey });
  const stream = await openai.chat.completions.create({
    model: provider === 'openai' ? model : 'gpt-4o-mini',
    messages,
    temperature: options.temperature ?? 0.5,
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}
