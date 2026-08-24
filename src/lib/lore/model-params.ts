import { generatorConfig } from './config';

type ProviderConfig = {
  default_model: string;
  models: Record<string, Record<string, unknown>>;
};

export type ResolvedModelGenerationParams = {
  provider: string;
  model: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
};

const FIXED_TEMPERATURE_PATTERNS = [
  /^gpt-5(?:-|$)/,
  /^o[134](?:-|$)/,
  /^o4-mini/,
  /\/gpt-5(?:-|$)/,
  /\/o[134](?:-|$)/,
  /\/o4-mini/,
];

/** Reasoning models only accept the provider default temperature (1). */
export function modelRequiresDefaultTemperature(model: string): boolean {
  const normalized = model.toLowerCase();
  return FIXED_TEMPERATURE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function resolveModelGenerationParams(
  provider?: string,
  model?: string,
): ResolvedModelGenerationParams {
  const providers = generatorConfig.providers as Record<string, ProviderConfig>;
  const resolvedProvider = provider || generatorConfig.default_provider;
  const providerCfg = providers[resolvedProvider];
  const resolvedModel = model || providerCfg?.default_model || 'gpt-4o';

  const modelParams =
    providerCfg?.models?.[resolvedModel] ??
    (providerCfg?.default_model ? providerCfg.models[providerCfg.default_model] : {}) ??
    {};

  const result: ResolvedModelGenerationParams = {
    provider: resolvedProvider,
    model: resolvedModel,
  };

  if (modelRequiresDefaultTemperature(resolvedModel)) {
    return result;
  }

  if (typeof modelParams.temperature === 'number') {
    result.temperature = modelParams.temperature;
  }
  if (typeof modelParams.top_p === 'number') {
    result.top_p = modelParams.top_p;
  }
  if (typeof modelParams.top_k === 'number') {
    result.top_k = modelParams.top_k;
  }

  return result;
}

export function isLlmConfigurationError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('temperature') ||
    lower.includes('api key') ||
    lower.includes('openai_api_key') ||
    lower.includes('google_api_key') ||
    lower.includes('unsupported value') ||
    lower.includes('model') && lower.includes('not found')
  );
}
