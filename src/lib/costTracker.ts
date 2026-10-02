// Cost and Token Tracker Utility for Gemini & Lyria APIs
// Persistent local calculation based on actual model attributes

export interface CostLog {
  id: string;
  sessionId: string;
  sessionStartTime: number;
  timestamp: number;
  modelId: string;
  type: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  success: boolean;
  apiKeyId?: string;
  apiKeyName?: string;
  provider?: string;
}

export const PRICING_RATES: Record<string, { input: number; output: number; flatRate?: number; ratePerSecond?: number; name: string }> = {
  // Lyria Models
  'lyria-3-pro-preview': { input: 0, output: 0, flatRate: 0.08, name: 'Lyria 3 Pro' },
  'lyria-3-clip-preview': { input: 0, output: 0, flatRate: 0.04, name: 'Lyria 3 Clip' },
  'lyria-realtalk': { input: 0, output: 0, ratePerSecond: 0.0015, name: 'Lyria RealTalk' },

  // Claude 5 Models
  'claude-5-fable': { input: 10 / 1000000, output: 50 / 1000000, name: 'Claude Fable 5' },
  'claude-fable-5': { input: 10 / 1000000, output: 50 / 1000000, name: 'Claude Fable 5' },
  'claude-5-mythos': { input: 10 / 1000000, output: 50 / 1000000, name: 'Claude Mythos 5' },
  'claude-mythos-5': { input: 10 / 1000000, output: 50 / 1000000, name: 'Claude Mythos 5' },

  // Claude 4.x Models
  'claude-4-8-opus': { input: 5 / 1000000, output: 25 / 1000000, name: 'Claude Opus 4.8' },
  'claude-opus-4.8': { input: 5 / 1000000, output: 25 / 1000000, name: 'Claude Opus 4.8' },
  'claude-4-7-opus': { input: 5 / 1000000, output: 25 / 1000000, name: 'Claude Opus 4.7' },
  'claude-opus-4.7': { input: 5 / 1000000, output: 25 / 1000000, name: 'Claude Opus 4.7' },
  'claude-4-6-opus': { input: 5 / 1000000, output: 25 / 1000000, name: 'Claude Opus 4.6' },
  'claude-opus-4.6': { input: 5 / 1000000, output: 25 / 1000000, name: 'Claude Opus 4.6' },
  'claude-4-5-opus': { input: 5 / 1000000, output: 25 / 1000000, name: 'Claude Opus 4.5' },
  'claude-opus-4.5': { input: 5 / 1000000, output: 25 / 1000000, name: 'Claude Opus 4.5' },
  'claude-4-1-opus': { input: 15 / 1000000, output: 75 / 1000000, name: 'Claude Opus 4.1' },
  'claude-opus-4.1': { input: 15 / 1000000, output: 75 / 1000000, name: 'Claude Opus 4.1' },
  'claude-4-opus': { input: 15 / 1000000, output: 75 / 1000000, name: 'Claude Opus 4' },
  'claude-opus-4': { input: 15 / 1000000, output: 75 / 1000000, name: 'Claude Opus 4' },

  'claude-4-6-sonnet': { input: 3 / 1000000, output: 15 / 1000000, name: 'Claude Sonnet 4.6' },
  'claude-sonnet-4.6': { input: 3 / 1000000, output: 15 / 1000000, name: 'Claude Sonnet 4.6' },
  'claude-4-5-sonnet': { input: 3 / 1000000, output: 15 / 1000000, name: 'Claude Sonnet 4.5' },
  'claude-sonnet-4.5': { input: 3 / 1000000, output: 15 / 1000000, name: 'Claude Sonnet 4.5' },
  'claude-4-sonnet': { input: 3 / 1000000, output: 15 / 1000000, name: 'Claude Sonnet 4' },
  'claude-sonnet-4': { input: 3 / 1000000, output: 15 / 1000000, name: 'Claude Sonnet 4' },

  'claude-4-5-haiku': { input: 1 / 1000000, output: 5 / 1000000, name: 'Claude Haiku 4.5' },
  'claude-haiku-4.5': { input: 1 / 1000000, output: 5 / 1000000, name: 'Claude Haiku 4.5' },
  
  // Claude 3.5 Models
  'claude-3-5-sonnet-latest': { input: 3 / 1000000, output: 15 / 1000000, name: 'Claude 3.5 Sonnet' },
  'claude-3-5-sonnet': { input: 3 / 1000000, output: 15 / 1000000, name: 'Claude 3.5 Sonnet' },
  'claude-3-5-haiku-latest': { input: 0.8 / 1000000, output: 4 / 1000000, name: 'Claude 3.5 Haiku' },
  'claude-3-5-haiku': { input: 0.8 / 1000000, output: 4 / 1000000, name: 'Claude 3.5 Haiku' },
  'claude-3-opus-latest': { input: 15 / 1000000, output: 75 / 1000000, name: 'Claude 3 Opus' },
  'claude-3-opus': { input: 15 / 1000000, output: 75 / 1000000, name: 'Claude 3 Opus' },
  'claiku-3.5': { input: 0.8 / 1000000, output: 4 / 1000000, name: 'Claude Haiku 3.5' },
  'claude-haiku-3.5': { input: 0.8 / 1000000, output: 4 / 1000000, name: 'Claude Haiku 3.5' },

  // Gemini 3.5 Models
  'gemini-3.5-flash': { input: 1.50 / 1000000, output: 9.00 / 1000000, name: 'Gemini 3.5 Flash' },
  'models/gemini-3.5-flash': { input: 1.50 / 1000000, output: 9.00 / 1000000, name: 'Gemini 3.5 Flash' },
  'gemini-3.5-live-translate-preview': { input: 3.50 / 1000000, output: 21.00 / 1000000, name: 'Gemini 3.5 Live Translate' },
  'models/gemini-3.5-live-translate-preview': { input: 3.50 / 1000000, output: 21.00 / 1000000, name: 'Gemini 3.5 Live Translate' },

  // Gemini 3.1 Models
  'gemini-3.1-flash-lite': { input: 0.25 / 1000000, output: 1.50 / 1000000, name: 'Gemini 3.1 Flash Lite' },
  'models/gemini-3.1-flash-lite': { input: 0.25 / 1000000, output: 1.50 / 1000000, name: 'Gemini 3.1 Flash Lite' },
  'gemini-3.1-pro-preview': { input: 2.00 / 1000000, output: 12.00 / 1000000, name: 'Gemini 3.1 Pro Preview' },
  'models/gemini-3.1-pro-preview': { input: 2.00 / 1000000, output: 12.00 / 1000000, name: 'Gemini 3.1 Pro Preview' },
  'gemini-3.1-pro-preview-customtools': { input: 2.00 / 1000000, output: 12.00 / 1000000, name: 'Gemini 3.1 Pro CustomTools' },
  'models/gemini-3.1-pro-preview-customtools': { input: 2.00 / 1000000, output: 12.00 / 1000000, name: 'Gemini 3.1 Pro CustomTools' },
  'gemini-3.1-flash-live-preview': { input: 0.75 / 1000000, output: 4.50 / 1000000, name: 'Gemini 3.1 Flash Live' },
  'models/gemini-3.1-flash-live-preview': { input: 0.75 / 1000000, output: 4.50 / 1000000, name: 'Gemini 3.1 Flash Live' },
  'gemini-3.1-flash-image': { input: 0.50 / 1000000, output: 3.00 / 1000000, name: 'Gemini 3.1 Flash Image' },
  'models/gemini-3.1-flash-image': { input: 0.50 / 1000000, output: 3.00 / 1000000, name: 'Gemini 3.1 Flash Image' },
  'gemini-3.1-flash-tts-preview': { input: 1.00 / 1000000, output: 20.00 / 1000000, name: 'Gemini 3.1 Flash TTS Preview' },
  'models/gemini-3.1-flash-tts-preview': { input: 1.00 / 1000000, output: 20.00 / 1000000, name: 'Gemini 3.1 Flash TTS Preview' },

  // Gemini 3 Preview Models
  'gemini-3-flash-preview': { input: 0.50 / 1000000, output: 3.00 / 1000000, name: 'Gemini 3 Flash Preview' },
  'models/gemini-3-flash-preview': { input: 0.50 / 1000000, output: 3.00 / 1000000, name: 'Gemini 3 Flash Preview' },
  'gemini-3-pro-image': { input: 2.00 / 1000000, output: 12.00 / 1000000, name: 'Gemini 3 Pro Image' },
  'models/gemini-3-pro-image': { input: 2.00 / 1000000, output: 12.00 / 1000000, name: 'Gemini 3 Pro Image' },

  // Gemini 2.5 Models
  'gemini-2.5-pro': { input: 1.25 / 1000000, output: 10.00 / 1000000, name: 'Gemini 2.5 Pro' },
  'models/gemini-2.5-pro': { input: 1.25 / 1000000, output: 10.00 / 1000000, name: 'Gemini 2.5 Pro' },
  'gemini-2.5-flash': { input: 0.30 / 1000000, output: 2.50 / 1000000, name: 'Gemini 2.5 Flash' },
  'models/gemini-2.5-flash': { input: 0.30 / 1000000, output: 2.50 / 1000000, name: 'Gemini 2.5 Flash' },
  'gemini-2.5-flash-lite': { input: 0.10 / 1000000, output: 0.40 / 1000000, name: 'Gemini 2.5 Flash Lite' },
  'models/gemini-2.5-flash-lite': { input: 0.10 / 1000000, output: 0.40 / 1000000, name: 'Gemini 2.5 Flash Lite' },
  'gemini-2.5-flash-lite-preview-09-2025': { input: 0.10 / 1000000, output: 0.40 / 1000000, name: 'Gemini 2.5 Flash Lite Preview' },
  'models/gemini-2.5-flash-lite-preview-09-2025': { input: 0.10 / 1000000, output: 0.40 / 1000000, name: 'Gemini 2.5 Flash Lite Preview' },
  'gemini-2.5-flash-native-audio-preview-12-2025': { input: 0.50 / 1000000, output: 2.00 / 1000000, name: 'Gemini 2.5 Flash Native Audio' },
  'models/gemini-2.5-flash-native-audio-preview-12-2025': { input: 0.50 / 1000000, output: 2.00 / 1000000, name: 'Gemini 2.5 Flash Native Audio' },
  'gemini-2.5-flash-image': { input: 0.30 / 1000000, output: 30.00 / 1000000, name: 'Gemini 2.5 Flash Image' },
  'models/gemini-2.5-flash-image': { input: 0.30 / 1000000, output: 30.00 / 1000000, name: 'Gemini 2.5 Flash Image' },
  'gemini-2.5-flash-preview-tts': { input: 0.50 / 1000000, output: 10.00 / 1000000, name: 'Gemini 2.5 Flash Preview TTS' },
  'models/gemini-2.5-flash-preview-tts': { input: 0.50 / 1000000, output: 10.00 / 1000000, name: 'Gemini 2.5 Flash Preview TTS' },
  'gemini-2.5-pro-preview-tts': { input: 1.00 / 1000000, output: 20.00 / 1000000, name: 'Gemini 2.5 Pro Preview TTS' },
  'models/gemini-2.5-pro-preview-tts': { input: 1.00 / 1000000, output: 20.00 / 1000000, name: 'Gemini 2.5 Pro Preview TTS' },

  // Gemini 2.0 Models
  'gemini-2.0-flash': { input: 0.10 / 1000000, output: 0.40 / 1000000, name: 'Gemini 2.0 Flash (Deprecated)' },
  'models/gemini-2.0-flash': { input: 0.10 / 1000000, output: 0.40 / 1000000, name: 'Gemini 2.0 Flash (Deprecated)' },
  'gemini-2.0-flash-lite': { input: 0.075 / 1000000, output: 0.30 / 1000000, name: 'Gemini 2.0 Flash Lite (Deprecated)' },
  'models/gemini-2.0-flash-lite': { input: 0.075 / 1000000, output: 0.30 / 1000000, name: 'Gemini 2.0 Flash Lite (Deprecated)' },

  // Imagen Models
  'imagen-4.0-generate-001': { input: 0, output: 0, flatRate: 0.04, name: 'Imagen 4 Standard' },
  'imagen-4.0-ultra-generate-001': { input: 0, output: 0, flatRate: 0.06, name: 'Imagen 4 Ultra' },
  'imagen-4.0-fast-generate-001': { input: 0, output: 0, flatRate: 0.02, name: 'Imagen 4 Fast' },

  // Veo Models
  'veo-3.1-generate-preview': { input: 0, output: 0, ratePerSecond: 0.40, name: 'Veo 3.1 Standard' },
  'veo-3.1-fast-generate-preview': { input: 0, output: 0, ratePerSecond: 0.12, name: 'Veo 3.1 Fast' },
  'veo-3.1-lite-generate-preview': { input: 0, output: 0, ratePerSecond: 0.08, name: 'Veo 3.1 Lite' },
  'veo-3.0-generate-001': { input: 0, output: 0, ratePerSecond: 0.40, name: 'Veo 3 Standard' },
  'veo-3.0-fast-generate-001': { input: 0, output: 0, ratePerSecond: 0.12, name: 'Veo 3 Fast' },
  'veo-2.0-generate-001': { input: 0, output: 0, ratePerSecond: 0.35, name: 'Veo 2.0' },

  // Gemini Embedding Models
  'gemini-embedding-2': { input: 0.20 / 1000000, output: 0, name: 'Gemini Embedding 2' },
  'models/gemini-embedding-2': { input: 0.20 / 1000000, output: 0, name: 'Gemini Embedding 2' },
  'gemini-embedding-001': { input: 0.15 / 1000000, output: 0, name: 'Gemini Embedding 001' },
  'models/gemini-embedding-001': { input: 0.15 / 1000000, output: 0, name: 'Gemini Embedding 001' },

  // Other specialized Gemini models
  'gemini-robotics-er-1.6-preview': { input: 1.00 / 1000000, output: 5.00 / 1000000, name: 'Gemini Robotics-ER 1.6' },
  'models/gemini-robotics-er-1.6-preview': { input: 1.00 / 1000000, output: 5.00 / 1000000, name: 'Gemini Robotics-ER 1.6' },
  'gemini-2.5-computer-use-preview-10-2025': { input: 1.25 / 1000000, output: 10.00 / 1000000, name: 'Gemini 2.5 Computer Use' },
  'models/gemini-2.5-computer-use-preview-10-2025': { input: 1.25 / 1000000, output: 10.00 / 1000000, name: 'Gemini 2.5 Computer Use' },

  // Grok Models
  'grok-4.3': { input: 1.25 / 1000000, output: 2.50 / 1000000, name: 'Grok 4.3' },
  'grok-4.20-0309-reasoning': { input: 1.25 / 1000000, output: 2.50 / 1000000, name: 'Grok 4.20 Reasoning' },
  'grok-4.20-0309-non-reasoning': { input: 1.25 / 1000000, output: 2.50 / 1000000, name: 'Grok 4.20 Non-Reasoning' },
  'grok-build-0.1': { input: 1.00 / 1000000, output: 2.00 / 1000000, name: 'Grok Build 0.1' },
  'grok-4.20-multi-agent-0309': { input: 1.25 / 1000000, output: 2.50 / 1000000, name: 'Grok 4.20 Multi-Agent' },
  'grok-imagine-image': { input: 0, output: 0, flatRate: 0.02, name: 'Grok Imagine Image' },
  'grok-imagine-image-quality': { input: 0, output: 0, flatRate: 0.05, name: 'Grok Imagine Quality' },
  'grok-imagine-video-1.5': { input: 0, output: 0, ratePerSecond: 0.080, name: 'Grok Imagine Video 1.5' },
  'grok-imagine-video': { input: 0, output: 0, ratePerSecond: 0.050, name: 'Grok Imagine Video' },
  'grok-2-1212': { input: 2 / 1000000, output: 10 / 1000000, name: 'Grok 2' },
  'grok-beta': { input: 5 / 1000000, output: 15 / 1000000, name: 'Grok Beta' },
  'grok-vision-beta': { input: 5 / 1000000, output: 15 / 1000000, name: 'Grok Vision Beta' }
};

// Generate a session ID that persists during page lifetime (sessionStorage)
export function getOrCreateSessionId(): { id: string; startTime: number } {
  try {
    const cachedId = sessionStorage.getItem('producer_current_session_id');
    const cachedStart = sessionStorage.getItem('producer_current_session_start');
    
    if (cachedId && cachedStart) {
      return { id: cachedId, startTime: Number(cachedStart) };
    }
  } catch {}

  const newId = `session_${Math.random().toString(36).substring(2, 11)}`;
  const newStart = Date.now();
  
  try {
    sessionStorage.setItem('producer_current_session_id', newId);
    sessionStorage.setItem('producer_current_session_start', String(newStart));
  } catch {}

  return { id: newId, startTime: newStart };
}

export function resolveRate(modelId: string) {
  let rateKey = 'lyria-3-pro-preview';
  const modelIdLower = modelId ? modelId.toLowerCase() : '';
  
  if (modelId && modelId in PRICING_RATES) {
    rateKey = modelId;
  } else {
    const stripped = modelId?.startsWith('models/') ? modelId.substring(7) : modelId;
    const prefixed = modelId && !modelId.startsWith('models/') ? `models/${modelId}` : modelId;
    
    if (stripped && stripped in PRICING_RATES) {
      rateKey = stripped;
    } else if (prefixed && prefixed in PRICING_RATES) {
      rateKey = prefixed;
    } else {
      const foundKey = Object.keys(PRICING_RATES).find(k => k.toLowerCase() === modelIdLower);
      if (foundKey) {
        rateKey = foundKey;
      } else if (modelIdLower.includes('fable') || modelIdLower.includes('mythos')) {
        rateKey = 'claude-5-fable';
      } else if (modelIdLower.includes('opus-4') || modelIdLower.includes('opus-4.8') || modelIdLower.includes('opus-4.7') || modelIdLower.includes('opus-4.6') || modelIdLower.includes('opus-4.5')) {
        rateKey = 'claude-4-6-opus';
      } else if (modelIdLower.includes('opus')) {
        rateKey = 'claude-3-opus-latest';
      } else if (modelIdLower.includes('sonnet-4') || modelIdLower.includes('sonnet-4.6') || modelIdLower.includes('sonnet-4.5')) {
        rateKey = 'claude-4-6-sonnet';
      } else if (modelIdLower.includes('sonnet')) {
        rateKey = 'claude-3-5-sonnet-latest';
      } else if (modelIdLower.includes('haiku-4')) {
        rateKey = 'claude-4-5-haiku';
      } else if (modelIdLower.includes('haiku')) {
        rateKey = 'claude-3-5-haiku-latest';
      } else if (modelIdLower.includes('gemini-3.5-live-translate')) {
        rateKey = 'models/gemini-3.5-live-translate-preview';
      } else if (modelIdLower.includes('gemini-3.5-flash')) {
        rateKey = 'models/gemini-3.5-flash';
      } else if (modelIdLower.includes('gemini-3.1-pro') || modelIdLower.includes('gemini-3-pro')) {
        rateKey = 'models/gemini-3.1-pro-preview';
      } else if (modelIdLower.includes('gemini-3.1-flash-lite')) {
        rateKey = 'models/gemini-3.1-flash-lite';
      } else if (modelIdLower.includes('gemini-3.1-flash-live')) {
        rateKey = 'models/gemini-3.1-flash-live-preview';
      } else if (modelIdLower.includes('gemini-3.1-flash-image')) {
        rateKey = 'models/gemini-3.1-flash-image';
      } else if (modelIdLower.includes('gemini-3.1-flash-tts')) {
        rateKey = 'models/gemini-3.1-flash-tts-preview';
      } else if (modelIdLower.includes('gemini-3-pro-image')) {
        rateKey = 'models/gemini-3-pro-image';
      } else if (modelIdLower.includes('gemini-3-flash-preview')) {
        rateKey = 'models/gemini-3-flash-preview';
      } else if (modelIdLower.includes('gemini-2.5-pro') || modelIdLower.includes('computer-use')) {
        rateKey = 'models/gemini-2.5-pro';
      } else if (modelIdLower.includes('gemini-2.5-flash-lite-preview')) {
        rateKey = 'models/gemini-2.5-flash-lite-preview-09-2025';
      } else if (modelIdLower.includes('gemini-2.5-flash-lite')) {
        rateKey = 'models/gemini-2.5-flash-lite';
      } else if (modelIdLower.includes('gemini-2.5-flash-native-audio')) {
        rateKey = 'models/gemini-2.5-flash-native-audio-preview-12-2025';
      } else if (modelIdLower.includes('gemini-2.5-flash-image')) {
        rateKey = 'models/gemini-2.5-flash-image';
      } else if (modelIdLower.includes('gemini-2.5-flash-preview-tts')) {
        rateKey = 'models/gemini-2.5-flash-preview-tts';
      } else if (modelIdLower.includes('gemini-2.5-pro-preview-tts')) {
        rateKey = 'models/gemini-2.5-pro-preview-tts';
      } else if (modelIdLower.includes('gemini-2.5-flash')) {
        rateKey = 'models/gemini-2.5-flash';
      } else if (modelIdLower.includes('gemini-2.0-flash-lite')) {
        rateKey = 'models/gemini-2.0-flash-lite';
      } else if (modelIdLower.includes('gemini-2.0-flash')) {
        rateKey = 'models/gemini-2.0-flash';
      } else if (modelIdLower.includes('embedding-2')) {
        rateKey = 'models/gemini-embedding-2';
      } else if (modelIdLower.includes('embedding')) {
        rateKey = 'models/gemini-embedding-001';
      } else if (modelIdLower.includes('robotics-er')) {
        rateKey = 'models/gemini-robotics-er-1.6-preview';
      } else if (modelIdLower.includes('gemini')) {
        rateKey = 'models/gemini-3.5-flash';
      } else if (modelIdLower.includes('grok-4.3')) {
        rateKey = 'grok-4.3';
      } else if (modelIdLower.includes('grok-4.20-0309-reasoning') || (modelIdLower.includes('grok-4.20') && modelIdLower.includes('reasoning'))) {
        rateKey = 'grok-4.20-0309-reasoning';
      } else if (modelIdLower.includes('grok-4.20-0309-non-reasoning') || (modelIdLower.includes('grok-4.20') && modelIdLower.includes('non-reasoning'))) {
        rateKey = 'grok-4.20-0309-non-reasoning';
      } else if (modelIdLower.includes('grok-4.20-multi-agent')) {
        rateKey = 'grok-4.20-multi-agent-0309';
      } else if (modelIdLower.includes('grok-4.20')) {
        rateKey = 'grok-4.20-0309-reasoning';
      } else if (modelIdLower.includes('grok-build')) {
        rateKey = 'grok-build-0.1';
      } else if (modelIdLower.includes('grok-imagine-image-quality')) {
        rateKey = 'grok-imagine-image-quality';
      } else if (modelIdLower.includes('grok-imagine-image')) {
        rateKey = 'grok-imagine-image';
      } else if (modelIdLower.includes('grok-imagine-video-1.5')) {
        rateKey = 'grok-imagine-video-1.5';
      } else if (modelIdLower.includes('grok-imagine-video')) {
        rateKey = 'grok-imagine-video';
      } else if (modelIdLower.includes('grok-2')) {
        rateKey = 'grok-2-1212';
      } else if (modelIdLower.includes('grok')) {
        rateKey = 'grok-beta';
      } else if (modelIdLower.includes('realtalk')) {
        rateKey = 'lyria-realtalk';
      } else if (modelIdLower.includes('clip')) {
        rateKey = 'lyria-3-clip-preview';
      }
    }
  }
  return PRICING_RATES[rateKey] || PRICING_RATES['lyria-3-pro-preview'];
}

// Log a new API transaction
export function logTransaction(params: {
  modelId: string;
  type: string;
  promptText: string;
  responseText?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cost_in_usd_ticks?: number;
  };
  success: boolean;
  secondsDuration?: number;
}): CostLog {
  const { id: sessionId, startTime: sessionStartTime } = getOrCreateSessionId();
  
  // Try to find the active API key info
  let apiKeyId = undefined;
  let apiKeyName = undefined;
  let provider = undefined;
  
  try {
    const selectedKeyId = localStorage.getItem('producer_lyria_selected_key_id');
    const savedKeysStr = localStorage.getItem('producer_lyria_api_keys');
    if (selectedKeyId && savedKeysStr) {
      const savedKeys = JSON.parse(savedKeysStr);
      const activeKey = savedKeys.find((k: any) => k.id === selectedKeyId);
      if (activeKey) {
        apiKeyId = activeKey.id;
        apiKeyName = activeKey.nickname;
        provider = activeKey.provider;
      }
    }
  } catch (e) {
    // Ignore error
  }
  
  // Estimate tokens if not returned explicitly
  let inputTokens = params.usageMetadata?.promptTokenCount || 0;
  let outputTokens = params.usageMetadata?.candidatesTokenCount || 0;
  const costInUsdTicks = params.usageMetadata?.cost_in_usd_ticks;
  
  if (params.success) {
    if (!inputTokens && params.promptText) {
      inputTokens = Math.max(1, Math.round(params.promptText.length / 4));
    }
    if (!outputTokens && params.responseText) {
      outputTokens = Math.max(1, Math.round(params.responseText.length / 4));
    }
  }

  // Calculate Costs using flexible key finding
  const rate = resolveRate(params.modelId);
  let calculatedCost = 0;

  if (params.success) {
    if (costInUsdTicks !== undefined) {
      // Use exact xAI billing ticks (1 USD = 10,000,000,000 ticks)
      calculatedCost = costInUsdTicks / 1e10;
    } else if (rate.flatRate !== undefined) {
      calculatedCost = rate.flatRate;
    } else if (rate.ratePerSecond !== undefined) {
      const durSec = params.secondsDuration || 30; // default 30s
      calculatedCost = rate.ratePerSecond * durSec;
    } else {
      let inputRate = rate.input;
      let outputRate = rate.output;
      
      // Dynamic tiered pricing for <= 200k vs > 200k context sizes
      const modelIdLower = params.modelId ? params.modelId.toLowerCase() : '';
      if (modelIdLower.includes('gemini-3.1-pro') || modelIdLower.includes('gemini-3.1-pro-preview')) {
        if (inputTokens > 200000) {
          inputRate = 4.0 / 1000000;
          outputRate = 18.0 / 1000000;
        } else {
          inputRate = 2.0 / 1000000;
          outputRate = 12.0 / 1000000;
        }
      } else if (modelIdLower.includes('gemini-2.5-pro') || modelIdLower.includes('computer-use-preview')) {
        if (inputTokens > 200000) {
          inputRate = 2.50 / 1000000;
          outputRate = 15.00 / 1000000;
        } else {
          inputRate = 1.25 / 1000000;
          outputRate = 10.00 / 1000000;
        }
      }
      
      calculatedCost = (inputTokens * inputRate) + (outputTokens * outputRate);
    }
  }

  const logEntry: CostLog = {
    id: `cost_${Math.random().toString(36).substring(2, 9)}`,
    sessionId,
    sessionStartTime,
    timestamp: Date.now(),
    modelId: params.modelId,
    type: params.type,
    inputTokens,
    outputTokens,
    cost: Number(calculatedCost.toFixed(6)),
    success: params.success,
    apiKeyId,
    apiKeyName,
    provider
  };

  try {
    const rawLogs = localStorage.getItem('producer_lyria_cost_logs') || '[]';
    const logs: CostLog[] = JSON.parse(rawLogs);
    logs.push(logEntry);
    localStorage.setItem('producer_lyria_cost_logs', JSON.stringify(logs));
    
    // Broadcast a storage event so active elements update immediately
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('Failed to persist cost log entry:', e);
  }

  return logEntry;
}

// Retrieve transaction history
export function getStoredLogs(): CostLog[] {
  try {
    const rawLogs = localStorage.getItem('producer_lyria_cost_logs') || '[]';
    return JSON.parse(rawLogs);
  } catch {
    return [];
  }
}

// Clear transaction history
export function clearStoredLogs() {
  try {
    localStorage.setItem('producer_lyria_cost_logs', '[]');
    window.dispatchEvent(new Event('storage'));
  } catch {}
}

// Format cost to a human-readable USD display
export function formatUSD(value: number): string {
  if (value === 0) return '$0.0000';
  if (value < 0.001) {
    return `$${value.toFixed(5)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 5
  }).format(value);
}
