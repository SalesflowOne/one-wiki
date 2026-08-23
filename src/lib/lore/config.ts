import generator from '../../../api/config/generator.json';
import lang from '../../../api/config/lang.json';

export const generatorConfig = generator;
export const langConfig = lang;

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ja: 'Japanese (日本語)',
  zh: 'Mandarin Chinese (中文)',
  'zh-tw': 'Traditional Chinese (繁體中文)',
  es: 'Spanish (Español)',
  kr: 'Korean (한국어)',
  vi: 'Vietnamese (Tiếng Việt)',
  'pt-br': 'Brazilian Portuguese (Português Brasileiro)',
  fr: 'Français (French)',
  ru: 'Русский (Russian)',
};

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code] || 'English';
}

export function normalizeLanguage(language?: string): string {
  const supported = langConfig.supported_languages as Record<string, string>;
  if (language && language in supported) return language;
  return langConfig.default as string;
}
