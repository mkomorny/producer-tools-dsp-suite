/**
 * modelRegistry.ts
 * Central reference for API providers, model lists, and task-based "auto" model selection.
 * 
 * Used by:
 * - Header (for UI model pickers and key management)
 * - Feature components (App.tsx piano, VoiceGenerator, VocalToMidi, etc.) for preparing API calls
 * 
 * Backend (server.ts) has a mirrored resolver for authoritative execution.
 * When "auto" is chosen (or no specific model), pick the best model for the *current task*.
 */

export const PROVIDERS = [
  { id: 'google', name: 'Google (Gemini/Lyria)' },
  { id: 'anthropic', name: 'Anthropic (Claude)' },
  { id: 'xai', name: 'xAI (Grok)' },
  { id: 'custom', name: 'Custom' }
] as const;

export type ProviderId = typeof PROVIDERS[number]['id'];

/** Task types used for smart "auto" model selection */
export type AITask =
  | 'music-structure'   // piano roll chords/melody JSON, midi correction
  | 'voice-profile'     // generate detailed biometric voice profile JSON
  | 'tts'               // text-to-speech audio (primarily Gemini TTS models)
  | 'general-text'      // fallback / other text gen
  | 'lyrics'            // lyrics or creative text
  | 'analysis';         // audio analysis descriptions etc.

export interface ModelDef {
  name: string;           // the value sent as modelId (may include models/ prefix for Gemini)
  displayName: string;
  description?: string;
  // capabilities hint
  supportsTTS?: boolean;
  isMusic?: boolean;
}

/** Default / suggested models shown in UIs per provider. Keep in sync with backend fallbacks. */
export function getDefaultModelsForProvider(provider: string): ModelDef[] {
  if (provider === 'google') {
    return [
      { name: 'models/gemini-3.5-flash', displayName: 'Gemini 3.5 Flash', description: 'General multipurpose flash model' },
      { name: 'models/gemini-3.1-pro-preview', displayName: 'Gemini 3.1 Pro Preview', description: 'Advanced reasoning and complex task model' },
      { name: 'models/gemini-3.1-flash-lite', displayName: 'Gemini 3.1 Flash Lite', description: 'Fast, cost-efficient model' },
      { name: 'models/gemini-3.1-flash-live-preview', displayName: 'Gemini 3.1 Flash Live Preview', description: 'Low-latency conversational model' },
      { name: 'models/gemini-3.1-flash-tts-preview', displayName: 'Gemini 3.1 Flash TTS Preview', description: 'Text-to-speech engine', supportsTTS: true },
      { name: 'models/lyria-3-clip-preview', displayName: 'Lyria 3 Clip Preview', description: 'Short music generations', isMusic: true },
      { name: 'models/lyria-3-pro-preview', displayName: 'Lyria 3 Pro Preview', description: 'Full track music generations', isMusic: true }
    ];
  } else if (provider === 'anthropic') {
    return [
      { name: 'claude-fable-5', displayName: 'Claude Fable 5', description: 'Next-gen flagship Fable model' },
      { name: 'claude-mythos-5', displayName: 'Claude Mythos 5', description: 'Next-gen specialized Mythos model' },
      { name: 'claude-opus-4.8', displayName: 'Claude Opus 4.8', description: 'Ultra-advanced Opus 4.8 reasoning model' },
      { name: 'claude-sonnet-4.6', displayName: 'Claude Sonnet 4.6', description: 'Highly capable Sonnet 4.6 model' },
      { name: 'claude-3-5-sonnet-latest', displayName: 'Claude 3.5 Sonnet', description: 'Most intelligent Claude 3.5 model' },
      { name: 'claude-3-5-haiku-latest', displayName: 'Claude 3.5 Haiku', description: 'Fastest Claude 3.5 model' },
      { name: 'claude-3-opus-latest', displayName: 'Claude 3 Opus', description: 'Classic powerful reasoning model' }
    ];
  } else if (provider === 'xai') {
    return [
      { name: 'grok-4.3', displayName: 'Grok 4.3', description: 'Flagship Grok model' },
      { name: 'grok-4.20-0309-reasoning', displayName: 'Grok 4.20 Reasoning', description: 'Advanced reasoning model' },
      { name: 'grok-4.20-0309-non-reasoning', displayName: 'Grok 4.20 Non-Reasoning', description: 'Fast non-reasoning model' },
      { name: 'grok-build-0.1', displayName: 'Grok Build 0.1', description: 'Agentic coding model' },
      { name: 'grok-4.20-multi-agent-0309', displayName: 'Grok 4.20 Multi-Agent', description: 'Multi-agent research model' }
    ];
  } else {
    return [{ name: 'custom-model', displayName: 'Custom Model' }];
  }
}

/** 
 * Given a task + provider, return the single best model name to use when "auto" is selected.
 * This is the core of "automatically use the model best suited for the task".
 */
export function getBestModelForTask(task: AITask | undefined, provider: string): string {
  const p = provider || 'google';

  switch (task) {
    case 'music-structure':
      if (p === 'google') return 'models/gemini-3.1-pro-preview'; // strong at structured JSON + music reasoning
      if (p === 'anthropic') return 'claude-3-5-sonnet-latest';
      if (p === 'xai') return 'grok-4.3';
      return 'models/gemini-3.1-pro-preview';

    case 'voice-profile':
      if (p === 'google') return 'models/gemini-3.1-pro-preview'; // detailed analytical output
      if (p === 'anthropic') return 'claude-sonnet-4.6';
      if (p === 'xai') return 'grok-4.3';
      return 'models/gemini-3.1-pro-preview';

    case 'tts':
      if (p === 'google') return 'models/gemini-3.1-flash-tts-preview';
      if (p === 'xai') return 'grok-4.3'; // handled via xAI TTS endpoint in backend
      // Anthropic doesn't have first-class TTS here; fallback will occur in backend
      return 'models/gemini-3.1-flash-tts-preview';

    case 'lyrics':
    case 'general-text':
    case 'analysis':
    default:
      if (p === 'google') return 'models/gemini-2.5-flash';
      if (p === 'anthropic') return 'claude-3-5-sonnet-latest';
      if (p === 'xai') return 'grok-4.3';
      return 'models/gemini-2.5-flash';
  }
}

/**
 * Resolve the model that should actually be sent in the API request.
 * - If explicit model chosen (not 'auto'), return it (with light normalization).
 * - If 'auto' or falsy, pick using getBestModelForTask using the provided task hint.
 */
export function resolveModelForRequest(
  requestedModel: string | undefined | null,
  provider: string,
  task?: AITask
): string {
  const raw = (requestedModel || '').trim();
  if (raw && raw.toLowerCase() !== 'auto') {
    // Pass through user choice. Light normalization for Gemini (some UIs send without prefix).
    if (provider === 'google' && !raw.startsWith('models/') && !raw.startsWith('lyria-')) {
      // Only auto-prefix common gemini ones if they look like bare gemini ids
      if (/^gemini-/.test(raw) || /^lyria-/.test(raw)) {
        return `models/${raw}`;
      }
    }
    return raw;
  }
  // auto or none
  return getBestModelForTask(task, provider);
}

/** 
 * For Google, some music/lyria selections need mapping to a text model the generateContent endpoint can use.
 * Returns the model name that is safe to actually call for text/JSON tasks.
 */
export function getGoogleCallModel(requested: string): string {
  const lower = requested.toLowerCase();
  if (lower.includes('lyria') || lower.includes('music')) {
    // Lyria models are music gen; map to strong text model for structured output
    return 'models/gemini-2.5-flash';
  }
  if (lower.includes('tts')) {
    // TTS models are audio only; fall back to text model when used for generate-text
    return 'models/gemini-3.1-flash-lite';
  }
  return requested;
}

/** Get a human friendly display name for a model id (best effort) */
export function getModelDisplayName(modelId: string, provider?: string): string {
  if (!modelId) return 'Default';
  const p = provider || '';
  const models = getDefaultModelsForProvider(p);
  const match = models.find(m => m.name === modelId || m.name.endsWith(modelId) || modelId.endsWith(m.name));
  if (match) return match.displayName;

  // fallback formatting
  return modelId.replace(/^models\//, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
