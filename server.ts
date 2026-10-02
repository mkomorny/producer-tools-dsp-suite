import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { spawnSync, spawn } from "child_process";
import multer from "multer";
// vite is only imported dynamically in dev mode (see below)
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { PROFILE_MAP } from "./voice-prompts.js";
import 'dotenv/config';

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: "50mb" }));

  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  app.post("/api/list-models", async (req, res) => {
    const { clientApiKey, clientProvider } = req.body;
    if (!clientApiKey) {
      return res.status(400).json({ error: "No API Key provided" });
    }

    const provider = clientProvider || 'google';

    try {
      if (provider === 'google') {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${clientApiKey}`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`Google API returned status ${response.status}`);
        }
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          const formatted = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent') || m.name?.includes('lyria'))
            .map((m: any) => ({
              name: m.name.startsWith('models/') ? m.name : `models/${m.name}`,
              displayName: m.displayName || m.name.split('/').pop() || m.name,
              description: m.description || ""
            }));
          return res.json({ models: formatted });
        }
        throw new Error("Invalid response format from Google API");
      } 
      else if (provider === 'anthropic') {
        const apiUrl = 'https://api.anthropic.com/v1/models';
        const response = await fetch(apiUrl, {
          headers: {
            'x-api-key': clientApiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error(`Anthropic API returned status ${response.status}`);
        }
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          const formatted = data.data.map((m: any) => ({
            name: m.id,
            displayName: m.display_name || m.id,
            description: `Released: ${m.created_at || 'unknown'}`
          }));
          return res.json({ models: formatted });
        }
        throw new Error("Invalid response format from Anthropic API");
      } 
      else if (provider === 'xai') {
        const apiUrl = 'https://api.x.ai/v1/models';
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${clientApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error(`xAI API returned status ${response.status}`);
        }
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          const formatted = data.data.map((m: any) => ({
            name: m.id,
            displayName: m.id,
            description: `xAI model: ${m.id}`
          }));
          return res.json({ models: formatted });
        }
        throw new Error("Invalid response format from xAI API");
      } 
      else {
        return res.json({ 
          models: [
            { name: 'custom-model', displayName: 'Custom Model' }
          ] 
        });
      }
    } catch (err: any) {
      // Silently fall back to static defaults if the provided key is invalid
      let defaults: any[] = [];
      if (provider === 'google') {
        defaults = [
          { name: 'models/gemini-3.5-flash', displayName: 'Gemini 3.5 Flash' },
          { name: 'models/gemini-3.1-pro-preview', displayName: 'Gemini 3.1 Pro Preview' },
          { name: 'models/gemini-3.1-flash-lite', displayName: 'Gemini 3.1 Flash Lite' },
          { name: 'models/gemini-3.1-flash-live-preview', displayName: 'Gemini 3.1 Flash Live Preview' },
          { name: 'models/gemini-3.1-flash-tts-preview', displayName: 'Gemini 3.1 Flash TTS Preview' },
          { name: 'models/lyria-3-clip-preview', displayName: 'Lyria 3 Clip (Music)' },
          { name: 'models/lyria-3-pro-preview', displayName: 'Lyria 3 Pro (Music)' },
        ];
      } else if (provider === 'anthropic') {
        defaults = [
          { name: 'claude-3-5-sonnet-latest', displayName: 'Claude 3.5 Sonnet' },
          { name: 'claude-3-5-haiku-latest', displayName: 'Claude 3.5 Haiku' },
          { name: 'claude-3-opus-latest', displayName: 'Claude 3 Opus' },
        ];
      } else if (provider === 'xai') {
        defaults = [
          { name: 'grok-2-1212', displayName: 'Grok 2' },
          { name: 'grok-beta', displayName: 'Grok Beta' },
          { name: 'grok-vision-beta', displayName: 'Grok Vision Beta' },
        ];
      } else {
        defaults = [
          { name: 'custom-model', displayName: 'Custom Model' }
        ];
      }
      return res.json({ models: defaults });
    }
  });

  // ==========================================
  // Server-side Model Resolver (reference: src/lib/modelRegistry.ts)
  // Ensures the *right* model is called for the provider + task when user selects "auto"
  // or a specific model from their chosen API key.
  // ==========================================
  type ServerTask = 'music-structure' | 'voice-profile' | 'tts' | 'general-text';

  function resolveServerModel(requested: string | undefined, provider: string, task: ServerTask): string {
    const p = (provider || 'google').toLowerCase();
    const req = (requested || 'auto').trim().toLowerCase();

    if (req && req !== 'auto') {
      // Honor explicit selection from the user's key (light normalization)
      if (p === 'google') {
        if (req.startsWith('models/')) return requested!;
        if (req.startsWith('gemini-') || req.startsWith('lyria-')) return `models/${requested}`;
      }
      return requested!;
    }

    // AUTO: pick best per task + provider
    if (task === 'tts') {
      if (p === 'google') return 'models/gemini-3.1-flash-tts-preview';
      if (p === 'xai') return 'grok-4.3'; // xAI branch uses its TTS API
      return 'models/gemini-3.1-flash-tts-preview'; // fallback for others
    }
    if (task === 'voice-profile') {
      if (p === 'google') return 'models/gemini-3.1-pro-preview';
      if (p === 'anthropic') return 'claude-sonnet-4.6';
      if (p === 'xai') return 'grok-4.3';
      return 'models/gemini-3.1-pro-preview';
    }
    if (task === 'music-structure') {
      if (p === 'google') return 'models/gemini-3.1-pro-preview';
      if (p === 'anthropic') return 'claude-3-5-sonnet-latest';
      if (p === 'xai') return 'grok-4.3';
      return 'models/gemini-3.1-pro-preview';
    }
    // general
    if (p === 'google') return 'models/gemini-2.5-flash';
    if (p === 'anthropic') return 'claude-3-5-sonnet-latest';
    if (p === 'xai') return 'grok-4.3';
    return 'models/gemini-2.5-flash';
  }

  function getGoogleTextCallModel(resolvedModel: string): string {
    const lower = resolvedModel.toLowerCase();
    if (lower.includes('lyria') || lower.includes('clip') || lower.includes('music')) {
      return 'models/gemini-2.5-flash';
    }
    if (lower.includes('tts')) {
      return 'models/gemini-3.1-flash-lite';
    }
    return resolvedModel;
  }

  app.post("/api/generate-profile", async (req, res) => {
    const { name, clientApiKey, clientProvider, modelId } = req.body;
    
    if (!clientApiKey && !process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: "No API Key provided" });
    }

    try {
      const provider = clientProvider || 'google';
      const key = clientApiKey || process.env.GEMINI_API_KEY;

      // Resolve using selected key's model (or auto -> best for voice-profile)
      const resolvedRequested = resolveServerModel(modelId, provider, 'voice-profile');
      const templateStr = `
**VOICE BIOMETRIC & ACOUSTIC PROFILE TEMPLATE**  
**Profile Type / Condition:** Performance / Style Description (adapt based on character characteristics)

**Subject / Voice Description:**  
[Vocal overview, estimated age, accents, persona/style, background context]

### 1. Fundamental Frequency (F0) & Glottal Source Characteristics
### 2. Time-Domain Waveform Properties
### 3. Frequency-Domain & Spectral Characteristics
### 4. Perturbation & Voice Quality Metrics
### 5. Prosodic & Temporal Modulation of the Waveform
### 6. Linguistic, Dialectal & Phonetic Characteristics
### 7. Anatomical, Physiological & Lifestyle Correlates
### 8. Variability, Contextual Factors & Consistency
### 9. Overall Sound-Wave & Perceptual Signature (Replicable Description)
### 10. Key Replicable Parameters for Voice Analysis, Synthesis, or Comparison
`;

      const prompt = `You are an expert in psychoacoustics and vocal analysis.
Analyze the voice of the character/person described as: "${name}". 
We need to generate a precise, hyper-detailed acoustic biometric report following this template structure:
${templateStr}

After researching/crafting this detailed biometric report, select the single prebuilt voice from ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede'] that would provide the closest match to this voice's pitch and style.
- puck: crisp gender-neutral, youthful mid/high
- charon: extremely deep, authoritative baritone/bass
- kore: female bright, warm, and highly expressive
- fenrir: deep, gravelly, low-mid male
- zephyr: soft-spoken, airy, clean
- aoede: resonant, theatrical female

Return your evaluation STRICTLY as a JSON object containing EXACTLY these keys:
- "name": The user-friendly name (e.g. "${name}")
- "icon": A single relevant emoji (e.g., "🧬", "🎙️", "🕶️", etc. based on character)
- "voice": The selected base voice name
- "systemInstruction": A detailed instruction that includes the generated biometric profile exactly following the template. It should start with "Voice Profile Directive: Voice match the following exact acoustic characteristics of ${name}. Maintain this completely across all output without injecting stage directions: ... " followed by the completed template text.

Return ONLY raw JSON, without any markdown code blocks, backticks, or extra text.
`;

      let jsonText = "";
      let usageMetadata: { promptTokenCount: number; candidatesTokenCount: number; cost_in_usd_ticks?: number } | undefined;

      if (provider === 'google') {
        const actualModelToCall = getGoogleTextCallModel(resolvedRequested);
        const activeAi = new GoogleGenAI({ 
          apiKey: key,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });
        const response = await activeAi.models.generateContent({
          model: actualModelToCall,
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });
        jsonText = response.text || "";
        if (response.usageMetadata) {
          usageMetadata = {
            promptTokenCount: response.usageMetadata.promptTokenCount || 0,
            candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0
          };
        }
      } else if (provider === 'anthropic') {
        const targetModel = resolvedRequested;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: targetModel,
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Anthropic API Error');
        jsonText = data.content[0].text;
        if (data.usage) {
          usageMetadata = {
            promptTokenCount: data.usage.input_tokens || 0,
            candidatesTokenCount: data.usage.output_tokens || 0
          };
        }
      } else if (provider === 'xai') {
        const targetModel = resolvedRequested;
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'xAI API Error');
        jsonText = data.choices[0].message.content;
        if (data.usage) {
          usageMetadata = {
            promptTokenCount: data.usage.prompt_tokens || 0,
            candidatesTokenCount: data.usage.completion_tokens || 0,
            cost_in_usd_ticks: data.usage.cost_in_usd_ticks
          };
        }
      } else {
        throw new Error("Unsupported provider: " + provider);
      }

      if (!jsonText) {
        throw new Error("No response from voice generation model");
      }

      if (jsonText.includes("```")) {
        jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
      }

      const generatedData = JSON.parse(jsonText);
      if (usageMetadata) {
        generatedData.usageMetadata = usageMetadata;
      }
      res.json(generatedData);
    } catch (err: any) {
      console.error("Profile generation endpoint failed:", err);
      res.status(500).json({ error: err.message || "Failed to generate profile" });
    }
  });

  app.post("/api/generate-text", async (req, res) => {
    const { promptText, clientApiKey, clientProvider, modelId } = req.body;
    
    if (!clientApiKey && !process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: "No API Key provided" });
    }

    try {
      const provider = clientProvider || 'google';
      const key = clientApiKey || process.env.GEMINI_API_KEY;

      // Resolve model from the *selected key* + task (auto -> best for music/structure)
      const resolved = resolveServerModel(modelId, provider, 'music-structure');

      if (provider === 'google') {
        const actualModelToCall = getGoogleTextCallModel(resolved);
        const activeAi = new GoogleGenAI({ 
          apiKey: key,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });
        
        const response = await activeAi.models.generateContent({
          model: actualModelToCall,
          contents: promptText,
          config: {
            responseMimeType: "application/json"
          }
        });
        
        const usageMetadata = response.usageMetadata ? {
          promptTokenCount: response.usageMetadata.promptTokenCount || 0,
          candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0
        } : undefined;

        return res.json({ 
          text: response.text,
          usageMetadata,
          modelUsed: actualModelToCall
        });
      } 
      else if (provider === 'anthropic') {
        const targetModel = resolved;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: targetModel,
            max_tokens: 4096,
            messages: [{ role: 'user', content: promptText }]
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Anthropic API Error');
        
        const usageMetadata = data.usage ? {
          promptTokenCount: data.usage.input_tokens || 0,
          candidatesTokenCount: data.usage.output_tokens || 0
        } : undefined;

        return res.json({ 
          text: data.content[0].text,
          usageMetadata,
          modelUsed: targetModel
        });
      }
      else if (provider === 'xai') {
        const targetModel = resolved;
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: 'user', content: promptText }]
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'xAI API Error');

        const usageMetadata = data.usage ? {
          promptTokenCount: data.usage.prompt_tokens || 0,
          candidatesTokenCount: data.usage.completion_tokens || 0,
          cost_in_usd_ticks: data.usage.cost_in_usd_ticks
        } : undefined;

        return res.json({ 
          text: data.choices[0].message.content,
          usageMetadata,
          modelUsed: targetModel
        });
      }
      else {
        throw new Error("Unsupported provider: " + provider);
      }
    } catch (err: any) {
      console.error("Text generation failed:", err);
      res.status(500).json({ error: err.message || "Failed to generate text" });
    }
  });

  app.post("/api/tts", async (req, res) => {
    const { text, voice, clientApiKey, clientProvider, modelId, activeProfileId, customSystemInstruction, customVoice } = req.body;

    const profileMatch = activeProfileId ? PROFILE_MAP[activeProfileId] : null;
    const targetVoice = profileMatch ? profileMatch.voice : (customVoice || voice || 'Kore');
    const systemInstruction = profileMatch ? profileMatch.systemInstruction : (customSystemInstruction || undefined);

    const provider = (clientProvider || 'google').toLowerCase();

    // xAI path: use selected key if xAI
    if (provider === 'xai') {
      const apiKey = clientApiKey || process.env.XAI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "No API Key configured for xAI TTS." });
      }
      try {
        const voiceMap: Record<string, string> = {
          'Puck': 'rex',
          'Charon': 'leo',
          'Kore': 'eve',
          'Fenrir': 'sal',
          'Aoede': 'ara',
          'Zephyr': 'sal',
        };
        const mappedVoice = voiceMap[targetVoice] || 'eve';
        
        const response = await fetch('https://api.x.ai/v1/tts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: text,
            voice_id: mappedVoice,
            language: 'en'
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`xAI TTS error ${response.status}: ${errText}`);
        }

        const buffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(buffer).toString('base64');
        const usageMetadata = {
          promptTokenCount: Math.max(1, Math.round(text.length / 4)),
          candidatesTokenCount: 150
        };
        return res.json({ audio: base64Audio, usageMetadata, modelUsed: 'xai-tts' });
      } catch (err: any) {
        console.error("xAI TTS failed:", err);
        return res.status(500).json({ error: err.message || "xAI TTS generation failed" });
      }
    }

    // Resolve the TTS model using the selected key + task (will prefer gemini tts for google)
    const resolvedTtsModel = resolveServerModel(modelId, provider, 'tts');

    // For TTS we prefer a Gemini key. 
    // Use the selected key only if it is Google, otherwise fall back to env GEMINI for TTS capability.
    const apiKeyToUse = (provider === 'google' && clientApiKey) ? clientApiKey : process.env.GEMINI_API_KEY;

    if (!apiKeyToUse) {
      return res.status(400).json({ 
        error: "No Google Gemini API Key available for TTS. Add a Google key or set GEMINI_API_KEY." 
      });
    }

    try {
      const activeAi = new GoogleGenAI({ 
        apiKey: apiKeyToUse,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Prefer the resolved tts model; always ensure a TTS capable model is tried
      const modelsToTry: string[] = [];
      const clean = resolvedTtsModel.replace(/^models\//, '');
      if (clean && clean.includes('tts')) modelsToTry.push(clean);
      if (!modelsToTry.includes('gemini-3.1-flash-tts-preview')) modelsToTry.push('gemini-3.1-flash-tts-preview');

      let base64Audio: string | undefined;
      let lastError: Error | null = null;
      let usedModel = '';

      for (const modelToTry of modelsToTry) {
        try {
          console.log(`Attempting TTS with model: ${modelToTry}, voice: ${targetVoice} (provider key was ${provider})`);
          
          const promptText = (systemInstruction && modelToTry === "gemini-3.1-flash-tts-preview")
            ? `[Voice biometric & performance directive: ${systemInstruction}]\n\nRead the following text aloud with maximum fidelity, expressiveness, and exact character emulation:\n${text}`
            : text;

          const response = await activeAi.models.generateContent({
            model: modelToTry,
            contents: [{ parts: [{ text: promptText }] }],
            config: {
              ...(systemInstruction && modelToTry !== "gemini-3.1-flash-tts-preview" ? { systemInstruction } : {}),
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: targetVoice },
                  },
              },
            },
          });

          const parts = response.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              base64Audio = part.inlineData.data;
              usedModel = modelToTry;
              console.log(`Successfully generated audio using ${modelToTry}`);
              break;
            }
          }

          if (base64Audio) {
            const usageMetadata = response.usageMetadata ? {
              promptTokenCount: response.usageMetadata.promptTokenCount || 0,
              candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0
            } : undefined;
            
            return res.json({ audio: base64Audio, usageMetadata, modelUsed: usedModel });
          }
        } catch (modelErr: any) {
          console.warn(`TTS model ${modelToTry} failed: ${modelErr?.message || modelErr}`);
          lastError = modelErr;
        }
      }

      const errMsg = lastError ? lastError.message : "No audio part found.";
      console.error("All TTS models failed:", errMsg);
      res.status(500).json({ error: `TTS Generation failed: ${errMsg}` });
    } catch (e: any) {
      console.error("General TTS endpoint error:", e);
      res.status(500).json({ error: e.message || "An expected error occurred on the server." });
    }
  });

  // ==========================================
  // YouTube Ripper endpoint
  // ==========================================
  function resolveYtBinary(name: string): string {
    const envVar = name === 'yt-dlp' ? process.env.YTFILE_YTDLP : process.env.YTFILE_FFMPEG;
    if (envVar) return envVar;
    const localPath = path.join(process.cwd(), 'bin', process.platform === 'win32' ? `${name}.exe` : name);
    if (fs.existsSync(localPath)) return localPath;
    return name;
  }

  function ytBinaryExists(bin: string): boolean {
    try {
      const r = spawnSync(bin, ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
      return r.status === 0 && !!r.stdout;
    } catch { return false; }
  }

  const AUDIO_FORMATS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus'];
  const VIDEO_FORMATS = ['mp4', 'mkv', 'webm'];

  app.post("/api/yt-dl", async (req, res) => {
    const { url, mode, format } = req.body as { url: string; mode: 'audio' | 'video'; format: string };

    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ error: "Invalid URL provided." });
    }

    const ytdlp = resolveYtBinary('yt-dlp');
    const ffmpeg = resolveYtBinary('ffmpeg');

    if (!ytBinaryExists(ytdlp)) {
      return res.status(500).json({ error: "yt-dlp is not installed. Install it from https://github.com/yt-dlp/yt-dlp and ensure it is in your PATH or in the bin/ folder." });
    }
    if (!ytBinaryExists(ffmpeg)) {
      return res.status(500).json({ error: "ffmpeg is not installed. Install it from https://ffmpeg.org and ensure it is in your PATH or in the bin/ folder." });
    }

    const audioFmt = AUDIO_FORMATS.includes(format) ? format : 'mp3';
    const videoFmt = VIDEO_FORMATS.includes(format) ? format : 'mp4';
    const ext = mode === 'audio' ? audioFmt : videoFmt;

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-dl-'));
    const outTemplate = path.join(tmpDir, `download.%(ext)s`);

    const args: string[] = [
      url,
      '--ffmpeg-location', ffmpeg,
      '-o', outTemplate,
      '--no-warnings',
      '--no-playlist',
    ];

    if (mode === 'audio') {
      args.push('-f', 'bestaudio', '-x', '--audio-format', audioFmt, '--audio-quality', '0');
    } else {
      if (videoFmt === 'mp4') {
        args.push('-f', 'bestvideo[ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]/best[ext=mp4]/best', '--merge-output-format', 'mp4');
      } else if (videoFmt === 'mkv') {
        args.push('-f', 'bestvideo+bestaudio/best', '--merge-output-format', 'mkv');
      } else {
        args.push('-f', 'bestvideo[ext=webm]+bestaudio[ext=webm]/bestvideo+bestaudio/best', '--merge-output-format', 'webm');
      }
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(ytdlp, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';
        child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
        });
        child.on('error', reject);
      });

      // Find the downloaded file (yt-dlp resolves the actual extension)
      const files = fs.readdirSync(tmpDir);
      if (files.length === 0) throw new Error("No file was produced by yt-dlp.");
      const filePath = path.join(tmpDir, files[0]);
      const actualExt = path.extname(files[0]).slice(1) || ext;
      const mimeTypes: Record<string, string> = {
        mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac',
        aac: 'audio/aac', ogg: 'audio/ogg', m4a: 'audio/mp4', opus: 'audio/opus',
        mp4: 'video/mp4', mkv: 'video/x-matroska', webm: 'video/webm',
      };
      res.setHeader('Content-Type', mimeTypes[actualExt] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="download.${actualExt}"`);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      stream.on('close', () => {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      });
    } catch (err: any) {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      res.status(500).json({ error: err.message || "Download failed." });
    }
  });

  // ==========================================
  // Audio Converter endpoint
  // ==========================================
  const LOGO_PATH = process.env.APP_ROOT
    ? path.join(process.env.APP_ROOT, 'logo_for_Producer_Tools_app_202606152238.jpeg')
    : path.join(process.cwd(), 'logo_for_Producer_Tools_app_202606152238.jpeg');
  const VIDEO_OUTPUT_FORMATS = ['mp4', 'mkv', 'webm', 'avi', 'mov'];
  const AUDIO_OUTPUT_FORMATS_CONV = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus', 'wma', 'aiff'];

  const upload = multer({ dest: os.tmpdir() });

  app.post("/api/audio-convert", upload.single('file'), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded." });

    const {
      outputFormat = 'mp3',
      bitrate = '192k',
      sampleRate = '44100',
      channels = '0',
      volume = '1.0',
    } = req.body as Record<string, string>;

    const ffmpeg = resolveYtBinary('ffmpeg');
    if (!ytBinaryExists(ffmpeg)) {
      fs.unlinkSync(file.path);
      return res.status(500).json({ error: "ffmpeg is not installed. Install it or place ffmpeg.exe in the bin/ folder." });
    }

    const fmt = outputFormat.toLowerCase();
    const isVideo = VIDEO_OUTPUT_FORMATS.includes(fmt);
    const outExt = fmt;
    const tmpOut = path.join(os.tmpdir(), `conv_${Date.now()}.${outExt}`);

    try {
      const args: string[] = [];

      if (isVideo) {
        // Loop logo image for the full duration, mix in the audio
        const logoSrc = fs.existsSync(LOGO_PATH) ? LOGO_PATH : null;
        if (logoSrc) {
          args.push('-loop', '1', '-i', logoSrc);
        }
        args.push('-i', file.path);
        if (logoSrc) {
          // scale logo to 1280x720, pad with black if needed
          args.push('-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black');
          args.push('-map', '0:v', '-map', '1:a');
        } else {
          // No logo: generate black video
          args.push('-f', 'lavfi', '-i', 'color=c=black:s=1280x720:r=30');
          args.push('-map', '2:v', '-map', '0:a');
        }
        // Audio filters
        const af: string[] = [];
        if (channels === '1') af.push('pan=mono|c0=0.5*c0+0.5*c1');
        else if (channels === '2') af.push('pan=stereo|c0=c0|c1=c1');
        const vol = parseFloat(volume);
        if (!isNaN(vol) && Math.abs(vol - 1.0) > 0.01) af.push(`volume=${vol.toFixed(3)}`);
        if (af.length) args.push('-af', af.join(','));
        const sr = parseInt(sampleRate, 10);
        if (sr > 0) args.push('-ar', String(sr));

        if (fmt === 'mp4' || fmt === 'mov') {
          args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-b:a', '192k');
        } else if (fmt === 'mkv') {
          args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'libmp3lame', '-b:a', '192k');
        } else if (fmt === 'webm') {
          args.push('-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '30', '-c:a', 'libopus', '-b:a', '128k');
        } else if (fmt === 'avi') {
          args.push('-c:v', 'mpeg4', '-q:v', '5', '-c:a', 'libmp3lame', '-b:a', '192k');
        }
        args.push('-shortest', '-y', tmpOut);
      } else {
        // Pure audio conversion
        args.push('-i', file.path);

        const af: string[] = [];
        if (channels === '1') af.push('pan=mono|c0=0.5*c0+0.5*c1');
        else if (channels === '2') af.push('pan=stereo|c0=c0|c1=c1');
        const vol = parseFloat(volume);
        if (!isNaN(vol) && Math.abs(vol - 1.0) > 0.01) af.push(`volume=${vol.toFixed(3)}`);
        if (af.length) args.push('-af', af.join(','));

        const sr = parseInt(sampleRate, 10);
        if (sr > 0) args.push('-ar', String(sr));

        if (fmt === 'mp3') {
          args.push('-c:a', 'libmp3lame', '-b:a', bitrate.endsWith('k') ? bitrate : `${bitrate}k`);
        } else if (fmt === 'aac') {
          args.push('-c:a', 'aac', '-b:a', bitrate.endsWith('k') ? bitrate : `${bitrate}k`);
        } else if (fmt === 'ogg') {
          args.push('-c:a', 'libvorbis', '-qscale:a', '5');
        } else if (fmt === 'opus') {
          args.push('-c:a', 'libopus', '-b:a', bitrate.endsWith('k') ? bitrate : `${bitrate}k`);
        } else if (fmt === 'flac') {
          args.push('-c:a', 'flac');
        } else if (fmt === 'wav') {
          args.push('-c:a', 'pcm_s16le');
        } else if (fmt === 'wma') {
          args.push('-c:a', 'wmav2', '-b:a', bitrate.endsWith('k') ? bitrate : `${bitrate}k`);
        } else if (fmt === 'aiff') {
          args.push('-c:a', 'pcm_s16be');
        } else if (fmt === 'm4a') {
          args.push('-c:a', 'aac', '-b:a', bitrate.endsWith('k') ? bitrate : `${bitrate}k`);
        } else {
          args.push('-c:a', 'copy');
        }
        args.push('-y', tmpOut);
      }

      await new Promise<void>((resolve, reject) => {
        const child = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';
        child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(stderr.slice(-800)));
        });
        child.on('error', reject);
      });

      const mimeMap: Record<string, string> = {
        mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac',
        aac: 'audio/aac', ogg: 'audio/ogg', m4a: 'audio/mp4',
        opus: 'audio/opus', wma: 'audio/x-ms-wma', aiff: 'audio/aiff',
        mp4: 'video/mp4', mkv: 'video/x-matroska', webm: 'video/webm',
        avi: 'video/x-msvideo', mov: 'video/quicktime',
      };
      res.setHeader('Content-Type', mimeMap[fmt] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="converted.${outExt}"`);
      const stream = fs.createReadStream(tmpOut);
      stream.pipe(res);
      stream.on('close', () => {
        try { fs.unlinkSync(tmpOut); } catch {}
        try { fs.unlinkSync(file.path); } catch {}
      });
    } catch (err: any) {
      try { fs.unlinkSync(tmpOut); } catch {}
      try { fs.unlinkSync(file.path); } catch {}
      res.status(500).json({ error: err.message || "Conversion failed." });
    }
  });

  // ==========================================
  // Stem Splitter endpoint
  // ==========================================
  const stemJobs = new Map<string, { stemsDir: string; stems: string[]; expiry: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [id, job] of stemJobs) {
      if (now > job.expiry) {
        try { fs.rmSync(path.dirname(job.stemsDir), { recursive: true, force: true }); } catch {}
        stemJobs.delete(id);
      }
    }
  }, 5 * 60 * 1000);

  function findPython(): string | null {
    const localAppData = process.env.LOCALAPPDATA || '';
    const userProfile = process.env.USERPROFILE || '';
    const candidates: string[] = ['python', 'python3'];
    for (const v of ['312', '311', '310', '39', '38']) {
      candidates.push(path.join(localAppData, 'Programs', 'Python', `Python${v}`, 'python.exe'));
      candidates.push(`C:\\Python${v}\\python.exe`);
    }
    candidates.push(
      path.join(userProfile, 'anaconda3', 'python.exe'),
      path.join(userProfile, 'miniconda3', 'python.exe'),
      path.join(userProfile, 'miniforge3', 'python.exe'),
    );
    for (const candidate of candidates) {
      try {
        const r = spawnSync(candidate, ['--version'], { timeout: 3000, stdio: 'pipe', shell: false });
        if (r.status === 0) return candidate;
      } catch {}
    }
    return null;
  }

  const splitUpload = multer({ dest: os.tmpdir(), limits: { fileSize: 500 * 1024 * 1024 } } as any);

  app.post("/api/stem-split", splitUpload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ffmpeg = resolveYtBinary('ffmpeg');
    const ffmpegOk = ytBinaryExists(ffmpeg);
    const python = findPython();
    const demucsOk = python ? (() => {
      try { return spawnSync(python, ['-m', 'demucs', '--help'], { timeout: 5000, stdio: 'pipe' }).status === 0; }
      catch { return false; }
    })() : false;

    const ext = path.extname(req.file.originalname) || '.mp3';
    const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const jobDir = path.join(os.tmpdir(), `stem-${jobId}`);
    fs.mkdirSync(jobDir, { recursive: true });
    const inputPath = path.join(jobDir, `input${ext}`);
    fs.renameSync(req.file.path, inputPath);

    try {
      let stems: string[];
      let stemsDir: string;
      let mode: string;

      if (demucsOk && python) {
        const outDir = path.join(jobDir, 'out');

        await new Promise<void>((resolve, reject) => {
          const child = spawn(python, ['-m', 'demucs', '--mp3', '-n', 'htdemucs', '-o', outDir, inputPath], {
            stdio: ['ignore', 'pipe', 'pipe']
          });
          let stderr = '';
          child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
          child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(stderr.slice(-1000) || `demucs exited ${code}`));
          });
          child.on('error', reject);
          // 12 min timeout
          setTimeout(() => { try { child.kill(); } catch {} reject(new Error('demucs timed out after 12 minutes')); }, 12 * 60 * 1000);
        });

        // demucs places output at: outDir/htdemucs/<track_name>/
        const trackName = path.basename(inputPath, ext);
        stemsDir = path.join(outDir, 'htdemucs', trackName);
        stems = fs.readdirSync(stemsDir).filter(f => f.endsWith('.mp3')).map(f => f.replace('.mp3', ''));
        mode = 'demucs';

      } else if (ffmpegOk) {
        stemsDir = path.join(jobDir, 'stems');
        fs.mkdirSync(stemsDir, { recursive: true });

        const runFf = (extraArgs: string[], out: string) => new Promise<void>((resolve, reject) => {
          const child = spawn(ffmpeg, ['-i', inputPath, ...extraArgs, '-y', out], { stdio: ['ignore', 'pipe', 'pipe'] });
          let stderr = '';
          child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
          child.on('close', (code) => { if (code === 0) resolve(); else reject(new Error(stderr.slice(-500))); });
          child.on('error', reject);
        });

        await Promise.all([
          // Vocals = center (mid) channel
          runFf(['-af', 'pan=mono|c0=0.5*c0+0.5*c1', '-c:a', 'libmp3lame', '-b:a', '192k'],
            path.join(stemsDir, 'vocals.mp3')),
          // Instrumental = side channel (center-cancelled)
          runFf(['-af', 'pan=stereo|c0=c0-c1|c1=c1-c0', '-c:a', 'libmp3lame', '-b:a', '192k'],
            path.join(stemsDir, 'instrumental.mp3')),
          // Bass = low-pass below 200 Hz
          runFf(['-af', 'lowpass=f=200,pan=mono|c0=0.5*c0+0.5*c1', '-c:a', 'libmp3lame', '-b:a', '128k'],
            path.join(stemsDir, 'bass.mp3')),
        ]);

        stems = ['vocals', 'instrumental', 'bass'];
        mode = 'basic';

      } else {
        fs.rmSync(jobDir, { recursive: true, force: true });
        return res.status(503).json({
          error: 'No stem separator found. Install Demucs for full 4-stem AI separation:\n\n  pip install demucs\n\nOr install ffmpeg for basic vocal/instrumental extraction.',
          needsInstall: true,
        });
      }

      stemJobs.set(jobId, { stemsDir, stems, expiry: Date.now() + 20 * 60 * 1000 });
      return res.json({ jobId, stems, mode });

    } catch (err: any) {
      try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch {}
      return res.status(500).json({ error: err.message || 'Stem separation failed' });
    }
  });

  app.get("/api/stem-split/:jobId/:stem", (req, res) => {
    const job = stemJobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found or expired (20 min TTL)' });

    const stemFile = path.join(job.stemsDir, `${req.params.stem}.mp3`);
    if (!fs.existsSync(stemFile)) return res.status(404).json({ error: 'Stem file not found' });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.stem}.mp3"`);
    fs.createReadStream(stemFile).pipe(res);
  });

  // Vite middleware for development (dynamic import keeps it out of the production bundle)
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = process.env.APP_ROOT
      ? path.join(process.env.APP_ROOT, 'dist')
      : path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
