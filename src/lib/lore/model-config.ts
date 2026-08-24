import { generatorConfig } from './config';

export interface ModelOption {
  id: string;
  name: string;
}

export interface ProviderOption {
  id: string;
  name: string;
  models: ModelOption[];
  supportsCustomModel?: boolean;
}

export interface ModelConfigResponse {
  providers: ProviderOption[];
  defaultProvider: string;
}

/** Shape returned to the frontend model selector (matches Python /models/config). */
export function buildModelConfigResponse(): ModelConfigResponse {
  const providersRecord = generatorConfig.providers as Record<
    string,
    { models: Record<string, unknown>; supportsCustomModel?: boolean }
  >;

  const providers: ProviderOption[] = Object.entries(providersRecord).map(
    ([providerId, providerConfig]) => ({
      id: providerId,
      name: providerId.charAt(0).toUpperCase() + providerId.slice(1),
      supportsCustomModel: providerConfig.supportsCustomModel ?? false,
      models: Object.keys(providerConfig.models).map((modelId) => ({
        id: modelId,
        name: modelId,
      })),
    }),
  );

  return {
    providers,
    defaultProvider: generatorConfig.default_provider,
  };
}
