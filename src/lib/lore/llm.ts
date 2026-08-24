import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  resolveModelGenerationParams,
  type ResolvedModelGenerationParams,
} from './model-params';

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

function applyGenerationParams(
  target: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming |
    OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
  resolved: ResolvedModelGenerationParams,
  options: LlmOptions,
) {
  const temperature = options.temperature ?? resolved.temperature;
  if (temperature !== undefined) {
    target.temperature = temperature;
  }
  if (resolved.top_p !== undefined) {
    target.top_p = resolved.top_p;
  }
}

export async function completeText(prompt: string, options: LlmOptions = {}): Promise<string> {
  const resolved = resolveModelGenerationParams(options.provider, options.model);

  if (resolved.provider === 'google') {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_API_KEY is not configured');
    const genAI = new GoogleGenerativeAI(apiKey);
    const generationConfig: Record<string, number> = {};
    const temperature = options.temperature ?? resolved.temperature;
    if (temperature !== undefined) generationConfig.temperature = temperature;
    if (resolved.top_p !== undefined) generationConfig.top_p = resolved.top_p;
    if (resolved.top_k !== undefined) generationConfig.top_k = resolved.top_k;

    const gModel = genAI.getGenerativeModel({
      model: resolved.model,
      generationConfig,
    });
    const result = await gModel.generateContent(prompt);
    return result.response.text();
  }

  const apiKey =
    resolved.provider === 'openrouter'
      ? process.env.OPENROUTER_API_KEY
      : process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      resolved.provider === 'openrouter'
        ? 'OPENROUTER_API_KEY is not configured'
        : 'OPENAI_API_KEY is not configured',
    );
  }

  const openai = new OpenAI({
    apiKey,
    baseURL:
      resolved.provider === 'openrouter'
        ? process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
        : process.env.OPENAI_BASE_URL,
  });

  const request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: resolved.model,
    messages: [{ role: 'user', content: prompt }],
  };
  applyGenerationParams(request, resolved, options);

  const response = await openai.chat.completions.create(request);
  return response.choices[0]?.message?.content || '';
}

export async function* streamText(
  messages: LlmMessage[],
  options: LlmOptions = {},
): AsyncGenerator<string> {
  const resolved = resolveModelGenerationParams(options.provider, options.model);

  if (resolved.provider === 'google') {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_API_KEY is not configured');
    const genAI = new GoogleGenerativeAI(apiKey);
    const generationConfig: Record<string, number> = {};
    const temperature = options.temperature ?? resolved.temperature;
    if (temperature !== undefined) generationConfig.temperature = temperature;
    if (resolved.top_p !== undefined) generationConfig.top_p = resolved.top_p;
    if (resolved.top_k !== undefined) generationConfig.top_k = resolved.top_k;

    const gModel = genAI.getGenerativeModel({
      model: resolved.model,
      generationConfig,
    });
    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join('\n\n');
    const result = await gModel.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
    return;
  }

  const apiKey =
    resolved.provider === 'openrouter'
      ? process.env.OPENROUTER_API_KEY
      : process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      resolved.provider === 'openrouter'
        ? 'OPENROUTER_API_KEY is not configured'
        : 'OPENAI_API_KEY is not configured',
    );
  }

  const openai = new OpenAI({
    apiKey,
    baseURL:
      resolved.provider === 'openrouter'
        ? process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
        : process.env.OPENAI_BASE_URL,
  });

  const request: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
    model: resolved.model,
    messages,
    stream: true,
  };
  applyGenerationParams(request, resolved, options);

  const stream = await openai.chat.completions.create(request);

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}
