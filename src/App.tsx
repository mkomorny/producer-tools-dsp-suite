/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Square, ChevronDown, Undo } from 'lucide-react';
import { PianoRoll, PianoRollNote } from './components/PianoRoll';
import * as Tone from 'tone';

import { Header } from './components/Header';
import { VocalToMidiInterface } from './components/VocalToMidiInterface';
import { VocalEditorInterface } from './components/VocalEditorInterface';
import { VoiceGeneratorInterface } from './components/VoiceGeneratorInterface';
import { AudioSlicerInterface } from './components/AudioSlicerInterface';
import { AudioConverterInterface } from './components/AudioConverterInterface';
import { AudioSplitterInterface } from './components/AudioSplitterInterface';
import { AudioCleanupInterface } from './components/AudioCleanupInterface';
import { YoutubeRipperInterface } from './components/YoutubeRipperInterface';
import VocalSyntaxTool from './components/VocalSyntax/VocalSyntaxTool';
import { logTransaction } from './lib/costTracker';
import { resolveModelForRequest, getBestModelForTask, AITask } from './lib/modelRegistry';
import { ErrorBoundary } from './components/ErrorBoundary';

import { DEFAULT_TUNING, TUNING_OPTIONS, getTunedFrequency, isTwelveToneEqualTemperament, type TuningId } from './tuning';
import { INSTRUMENT_CATEGORIES, SYNTH_PRESETS } from './lib/instruments';
import { GM_MAP } from './lib/gm_map';
import { SCALES, SCALE_GROUPS, ALL_SCALE_NAMES } from './lib/scales';

// Force the app to run on 48kHz to ensure high-quality audio processing
// and consistent STFT sizing in the audio splitter.
if (typeof window !== 'undefined' && window.AudioContext) {
  Tone.setContext(new Tone.Context(new window.AudioContext({ sampleRate: 48000 })));
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const ALL_INSTRUMENTS = INSTRUMENT_CATEGORIES.flatMap(c => c.instruments);

const THEMES = [
  { id: 'default', name: 'Default Dark', bg: '#0a0a0c', accent: '#6366f1' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', bg: '#05000a', accent: '#ff007f' },
  { id: 'wildfire', name: 'Wildfire Flame', bg: '#070301', accent: '#ea580c' },
  { id: 'synthwave', name: 'Synthwave Night', bg: '#04010a', accent: '#ff007f' },
  { id: 'electric-lime', name: 'Electric Lime', bg: '#020202', accent: '#a3e635' },
  { id: 'solar-storm', name: 'Solar Storm', bg: '#07050b', accent: '#f97316' },
  { id: 'magma', name: 'Magma Core', bg: '#050000', accent: '#ef4444' },
  { id: 'laser-tag', name: 'Laser Tag Arena', bg: '#050708', accent: '#db2777' },
  { id: 'acid-jazz', name: 'Acid Jazz Gold', bg: '#020412', accent: '#eab308' },
  { id: 'crimson-void', name: 'Crimson Void', bg: '#030000', accent: '#ff0000' },
  { id: 'toxic-waste', name: 'Toxic Chemical', bg: '#010502', accent: '#ccff00' },
  { id: 'ocean-breeze', name: 'Ocean Breeze', bg: '#010c14', accent: '#3b82f6' },
  { id: 'forest-harmony', name: 'Forest Harmony', bg: '#020d09', accent: '#10b981' },
  { id: 'aurora-dream', name: 'Aurora Dream', bg: '#04020a', accent: '#a855f7' },
  { id: 'cozy-amber', name: 'Cozy Amber', bg: '#0a0501', accent: '#d97706' },
  { id: 'lavender-haze', name: 'Lavender Haze', bg: '#07050d', accent: '#c084fc' },
  { id: 'slate-minimal', name: 'Slate Minimal', bg: '#0b0f19', accent: '#475569' },
  { id: 'desert-dusk', name: 'Desert Dusk', bg: '#0d0603', accent: '#f97316' },
  { id: 'rose-gold', name: 'Rose Gold Metallic', bg: '#0d040a', accent: '#be185d' },
  { id: 'mint-chocolate', name: 'Mint Cocoa', bg: '#0c0806', accent: '#059669' },
  { id: 'glacier-hush', name: 'Glacier Cushioned', bg: '#f0f7ff', accent: '#38bdf8' },
  { id: 'candy-noir', name: 'Candy Noir Fizz', bg: '#050308', accent: '#ec4899' },
  { id: 'tropical', name: 'Tropical Island', bg: '#020b0a', accent: '#f97316' },
  { id: 'aurora', name: 'Aurora Borealis', bg: '#040814', accent: '#a855f7' },
  { id: 'solarpunk', name: 'Solarpunk Green', bg: '#060802', accent: '#eab308' },
  { id: 'vapor', name: 'Vaporwave Sunset', bg: '#0a0314', accent: '#38bdf8' },
  { id: 'ocean', name: 'Deep Sea Abyss', bg: '#010510', accent: '#06b6d4' },
  { id: 'cyber-jade', name: 'Cyber Jade Slate', bg: '#020606', accent: '#10b981' },
  { id: 'blossom', name: 'Cherry Blossom', bg: '#fff5f8', accent: '#db2777' },
  { id: 'infrared', name: 'Thermal Vector', bg: '#070000', accent: '#ff2b00' },
  { id: 'psychedelic', name: 'Psychedelic Dream', bg: '#0a0110', accent: '#f43f5e' },
  { id: 'cyan-crimson', name: 'Cyan Crimson Edge', bg: '#040810', accent: '#00ffff' },
  { id: 'sundial', name: 'Golden Sundial', bg: '#fffbf5', accent: '#2563eb' },
  { id: 'ethereal', name: 'Ethereal Fog', bg: '#fafafc', accent: '#a855f7' },
  { id: 'midnight-abyss', name: 'Midnight Abyss', bg: '#020205', accent: '#7c3aed' },
  { id: 'coal-dust', name: 'Coal Dust Dark', bg: '#0d0d0d', accent: '#525252' }
];

const OCTAVE_OFFSET = 12;

export default function App() {
  const [currentTool, setCurrentTool] = useState<'picker' | 'chord' | 'vocal' | 'editor' | 'voice-generator' | 'slicer' | 'converter' | 'splitter' | 'youtube-ripper' | 'vocal-syntax' | 'cleanup'>('picker');
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('producer-suite-theme') || 'default');

  // Synchronize CSS custom attribute

  useEffect(() => {
    if (theme === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else if (!theme.startsWith('custom_')) {
      document.documentElement.setAttribute('data-theme', theme);
    }
    // ThemeSelector handles the data-theme attribute for 'custom_' themes.
    localStorage.setItem('producer-suite-theme', theme);
  }, [theme]);

  const handleVocalSyntaxAnalyze = async ({ title, prompt, hasVideo, fileName, fileType, fileSize }: any) => {
    const activeKeyId = localStorage.getItem('producer_lyria_selected_key_id') || '';
    const savedKeysStr = localStorage.getItem('producer_lyria_api_keys') || '[]';
    let savedKeys: any[] = [];
    try { savedKeys = JSON.parse(savedKeysStr); } catch {}
    const activeKeyObj = savedKeys.find((k: any) => k.id === activeKeyId);
    const clientApiKey = activeKeyObj ? activeKeyObj.apiKey : '';
    const clientProvider = activeKeyObj ? activeKeyObj.provider : '';

    const systemPrompt = `You are an expert linguistic biometric analyzer. Create a highly detailed vocal syntax and acoustic report based on the following input prompt: "${prompt}".
${fileName ? `The user uploaded a file named ${fileName} (${fileType}, ${fileSize} bytes).` : ''}
${hasVideo ? 'The source material contains video/visual cues.' : ''}

Respond ONLY in valid JSON matching this exact structure:
{
  "title": "${title}",
  "overview": "Summary...",
  "vocalTract": { "larynxPosition": "...", "vocalFoldThickness": "...", "pharyngealWidth": "..." },
  "phonetics": { "vowelSpace": "...", "consonantArticulation": "...", "formantFrequencies": "..." },
  "resonance": { "nasality": "...", "chestResonance": "...", "headResonance": "..." },
  "articulatory": { "jawTension": "...", "lipRounding": "...", "tonguePosition": "..." },
  "prosody": { "pitchRange": "...", "speechRate": "...", "rhythm": "..." },
  "pathology": { "vocalFry": "...", "breathiness": "...", "hoarseness": "..." }
}`;

    const res = await fetch('/api/generate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        promptText: systemPrompt,
        clientApiKey,
        clientProvider,
        modelId: localStorage.getItem('producer_lyria_selected_model_id') || 'auto'
      })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to analyze vocal syntax');
    }
    
    const data = await res.json();
    let jsonText = data.text;
    if (jsonText.includes('\`\`\`')) {
      jsonText = jsonText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    }
    const report = JSON.parse(jsonText);
    report.id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    report.date = new Date().toISOString().split('T')[0];
    return report;
  };

  return (
    <div className="min-h-screen text-text relative">
      {/* PERSISTENT HEADER */}
      <Header theme={theme} setTheme={setTheme} />

      {/* CORE WORKSPACE PORTAL */}
      <main className="pt-24 pb-12 min-h-screen">
        <ErrorBoundary>
          {currentTool === 'chord' ? (
            <ChordExplorerInterface onBack={() => setCurrentTool('picker')} />
          ) : currentTool === 'vocal' ? (
            <VocalToMidiInterface onBack={() => setCurrentTool('picker')} />
          ) : currentTool === 'editor' ? (
            <VocalEditorInterface onBack={() => setCurrentTool('picker')} />
          ) : currentTool === 'youtube-ripper' ? (
            <YoutubeRipperInterface onBack={() => setCurrentTool('picker')} />
          ) : currentTool === 'voice-generator' ? (
            <VoiceGeneratorInterface onBack={() => setCurrentTool('picker')} />
          ) : currentTool === 'slicer' ? (
            <AudioSlicerInterface onBack={() => setCurrentTool('picker')} />
          ) : currentTool === 'converter' ? (
            <AudioConverterInterface onBack={() => setCurrentTool('picker')} />
          ) : currentTool === 'splitter' ? (
            <AudioSplitterInterface onBack={() => setCurrentTool('picker')} />
          ) : currentTool === 'cleanup' ? (
            <AudioCleanupInterface onBack={() => setCurrentTool('picker')} />
          ) : currentTool === 'vocal-syntax' ? (
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mb-8 font-sans">
              <div className="mb-4">
                <button onClick={() => setCurrentTool('picker')} className="text-text3 hover:text-text font-black uppercase text-[10px] bg-bg3 border border-border px-3 py-1.5 rounded-lg flex gap-2 items-center transition-colors">
                  ← Back Launchpad
                </button>
              </div>
              <VocalSyntaxTool onAIAnalyze={handleVocalSyntaxAnalyze} />
            </div>
          ) : (
            <ToolPicker onSelect={setCurrentTool} />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}

// ----------------------------------------------------
// CHILD COMPONENT MODULES
// ----------------------------------------------------

function ToolPicker({ onSelect }: { onSelect: (tool: 'chord' | 'vocal' | 'editor' | 'voice-generator' | 'slicer' | 'converter' | 'splitter' | 'youtube-ripper' | 'vocal-syntax' | 'cleanup') => void }) {
  const handleChordSelect = async () => {
    await Tone.start();
    onSelect('chord');

  };

  const handleVocalSelect = async () => {
    await Tone.start();
    onSelect('vocal');
  };

  const handleEditorSelect = async () => {
    await Tone.start();
    onSelect('editor');
  };

  const handleYoutubeRipperSelect = async () => {
    await Tone.start();
    onSelect('youtube-ripper');
  };

  const handleVocalSyntaxSelect = async () => {
    await Tone.start();
    onSelect('vocal-syntax');
  };

  const handleVoiceGeneratorSelect = async () => {
    await Tone.start();
    onSelect('voice-generator');
  };

  const handleSlicerSelect = async () => {
    await Tone.start();
    onSelect('slicer');
  };

  const handleConverterSelect = async () => {
    await Tone.start();
    onSelect('converter');
  };

  const handleSplitterSelect = async () => {
    await Tone.start();
    onSelect('splitter');
  };

  const handleCleanupSelect = async () => {
    await Tone.start();
    onSelect('cleanup');
  };

  return (
    <div className="max-w-4xl mx-auto px-6 font-sans">
      <div className="text-center mb-10 pt-6">
        <h2 className="text-4xl font-normal tracking-tight bg-gradient-to-r from-[var(--accent)] via-[var(--accent2)] to-[var(--accent)] bg-clip-text text-transparent uppercase font-display">
          Tool Launchpad
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Chord Explorer Launcher */}
        <button 
          onClick={handleChordSelect} 
          style={{ 
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 35%, var(--bg2)), color-mix(in srgb, var(--accent2) 12%, var(--bg3)))',
            borderColor: 'color-mix(in srgb, var(--accent) 80%, transparent)'
          }}
          className="w-full max-w-md mx-auto p-5 sm:p-8 border hover:border-[var(--accent)] rounded-2xl flex flex-col items-center gap-4 text-center transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-[0_20px_50px_var(--accent-glow)] active:scale-95 group relative overflow-hidden"
        >
          <div 
            style={{ backgroundColor: 'var(--accent)' }}
            className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl opacity-35 group-hover:opacity-60 transition-all duration-300" 
          />
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_4px_12px_var(--accent-glow)]">🎹</span>
          <div>
            <span 
              className="block font-display text-2xl font-bold uppercase mb-2 tracking-wide text-[var(--accent)] drop-shadow-sm"
            >
              Chord Playground
            </span>
            <span 
              className="block text-text2 text-xs leading-relaxed max-w-sm font-medium"
            >
              Explore musical scales and chords, play notes using your keyboard, and record your musical ideas into MIDI files easily.
            </span>
          </div>
          <span 
            className="mt-2 px-5 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--bg)] font-black uppercase tracking-wider rounded-full shadow-lg hover:shadow-[0_0_15px_var(--accent-glow)] transition-all duration-200"
          >
            Launch Tool
          </span>
        </button>

        {/* Vocal to Midi Launcher */}
        <button 
          onClick={handleVocalSelect} 
          style={{ 
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent2) 35%, var(--bg2)), color-mix(in srgb, var(--accent) 12%, var(--bg3)))',
            borderColor: 'color-mix(in srgb, var(--accent2) 80%, transparent)'
          }}
          className="w-full max-w-md mx-auto p-5 sm:p-8 border hover:border-[var(--accent2)] rounded-2xl flex flex-col items-center gap-4 text-center transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-[0_20px_50px_color-mix(in srgb,var(--accent2)_45%,transparent)] active:scale-95 group relative overflow-hidden"
        >
          <div 
            style={{ backgroundColor: 'var(--accent2)' }}
            className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl opacity-35 group-hover:opacity-60 transition-all duration-300" 
          />
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_4px_12px_rgba(var(--accent2),0.3)]">🎤</span>
          <div>
            <span 
              className="block font-display text-2xl font-bold uppercase mb-2 tracking-wide text-[var(--accent2)] drop-shadow-sm"
            >
              Vocal to Midi
            </span>
            <span 
              className="block text-text2 text-xs leading-relaxed max-w-sm font-medium"
            >
              Hum or sing into your microphone, and instantly convert your voice into musical notes and MIDI files you can use in any music software.
            </span>
          </div>
          <span 
            className="mt-2 px-5 py-2 bg-[var(--accent2)] hover:bg-[var(--accent2)]/90 text-[var(--bg)] font-black uppercase tracking-wider rounded-full shadow-lg hover:shadow-[0_0_15px_rgba(var(--accent2),0.4)] transition-all duration-200"
          >
            Launch Tool
          </span>
        </button>

        {/* Vocal Editor Launcher */}
        <button 
          onClick={handleEditorSelect} 
          style={{ 
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 24%, var(--bg2)), color-mix(in srgb, var(--accent2) 24%, var(--bg3)))',
            borderColor: 'color-mix(in srgb, var(--accent) 60%, var(--accent2))'
          }}
          className="w-full max-w-md mx-auto p-5 sm:p-8 border rounded-2xl flex flex-col items-center gap-4 text-center transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-[0_20px_50px_color-mix(in srgb,var(--accent)_30%,color-mix(in srgb,var(--accent2)_30%,transparent))] active:scale-95 group relative overflow-hidden cursor-pointer"
        >
          <div 
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-300" 
          />
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_4px_12px_var(--accent-glow)]">🎙️</span>
          <div>
            <span 
              style={{ color: 'color-mix(in srgb, var(--accent) 65%, var(--accent2))' }}
              className="block font-display text-2xl font-bold uppercase mb-2 tracking-wide drop-shadow-sm"
            >
              Vocal Sample Editor
            </span>
            <span 
              className="block text-text2 text-xs leading-relaxed max-w-sm mx-auto font-medium"
            >
              Record or upload voice recordings, edit them, and apply cool effects to make them sound professional. 
            </span>
          </div>
          <span 
            style={{ 
              borderColor: 'color-mix(in srgb, var(--accent) 70%, var(--accent2) / 60%)',
              color: 'var(--bg)',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))'
            }}
            className="mt-2 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-md hover:shadow-lg transition-all duration-200"
          >
            Launch Tool
          </span>
        </button>

        {/* Youtube Ripper Launcher */}
        <button 
          onClick={handleYoutubeRipperSelect} 
          style={{ 
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 24%, var(--bg2)), color-mix(in srgb, var(--accent2) 24%, var(--bg3)))',
            borderColor: 'color-mix(in srgb, var(--accent) 60%, var(--accent2))'
          }}
          className="w-full max-w-md mx-auto p-5 sm:p-8 border rounded-2xl flex flex-col items-center gap-4 text-center transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-[0_20px_50px_var(--accent-glow)] active:scale-95 group relative overflow-hidden cursor-pointer"
        >
          <div 
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-300" 
          />
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_4px_12px_var(--accent-glow)]">📥</span>
          <div>
            <span 
              style={{ color: 'color-mix(in srgb, var(--accent) 65%, var(--accent2))' }}
              className="block font-display text-2xl font-bold uppercase mb-2 tracking-wide drop-shadow-sm"
            >
              Youtube Ripper
            </span>
            <span 
              className="block text-text2 text-xs leading-relaxed max-w-sm mx-auto font-medium"
            >
              Download audio or video straight from YouTube as an MP3 or MP4 for your beats and samples.
            </span>
          </div>
          <span 
            style={{ 
              borderColor: 'color-mix(in srgb, var(--accent) 70%, var(--accent2) / 60%)',
              color: 'var(--bg)',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))'
            }}
            className="mt-2 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-md hover:shadow-lg transition-all duration-200"
          >
            Launch Tool
          </span>
        </button>

        {/* Voice Generator Launcher */}
        <button 
          onClick={handleVoiceGeneratorSelect} 
          style={{ 
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent2) 24%, var(--bg2)), color-mix(in srgb, var(--accent) 24%, var(--bg3)))',
            borderColor: 'color-mix(in srgb, var(--accent2) 60%, var(--accent))'
          }}
          className="w-full max-w-md mx-auto p-5 sm:p-8 border rounded-2xl flex flex-col items-center gap-4 text-center transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-[0_20px_50px_color-mix(in srgb,var(--accent2)_30%,color-mix(in srgb,var(--accent)_30%,transparent))] active:scale-95 group relative overflow-hidden cursor-pointer"
        >
          <div 
            style={{ background: 'linear-gradient(135deg, var(--accent2), var(--accent))' }}
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-300" 
          />
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_4px_12px_var(--accent-glow)]">🗣️</span>
          <div>
            <span 
              style={{ color: 'color-mix(in srgb, var(--accent2) 65%, var(--accent))' }}
              className="block font-display text-2xl font-bold uppercase mb-2 tracking-wide drop-shadow-sm"
            >
              Text-to-Speech Tool
            </span>
            <span 
              className="block text-text2 text-xs leading-relaxed max-w-sm mx-auto font-medium"
            >
              Type in text to generate AI voices, or change your own voice to sound like a robot, alien, or other fun characters.
            </span>
          </div>
          <span 
            style={{ 
              borderColor: 'color-mix(in srgb, var(--accent2) 70%, var(--accent) / 60%)',
              color: 'var(--bg)',
              background: 'linear-gradient(135deg, var(--accent2), var(--accent))'
            }}
            className="mt-2 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-md hover:shadow-lg transition-all duration-200"
          >
            Launch Tool
          </span>
        </button>

        {/* Audio Slicer Launcher */}
        <button 
          onClick={handleSlicerSelect} 
          style={{ 
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 24%, var(--bg2)), color-mix(in srgb, var(--accent2) 24%, var(--bg3)))',
            borderColor: 'color-mix(in srgb, var(--accent) 60%, var(--accent2))'
          }}
          className="w-full max-w-md mx-auto p-5 sm:p-8 border rounded-2xl flex flex-col items-center gap-4 text-center transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-[0_20px_50px_color-mix(in srgb,var(--accent)_30%,color-mix(in srgb,var(--accent2)_30%,transparent))] active:scale-95 group relative overflow-hidden cursor-pointer"
        >
          <div 
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-300" 
          />
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_4px_12px_var(--accent-glow)]">🔪</span>
          <div>
            <span 
              style={{ color: 'color-mix(in srgb, var(--accent) 65%, var(--accent2))' }}
              className="block font-display text-2xl font-bold uppercase mb-2 tracking-wide drop-shadow-sm"
            >
              Audio Slicer / Sampler
            </span>
            <span 
              className="block text-text2 text-xs leading-relaxed max-w-sm mx-auto font-medium"
            >
              Upload a song or sound, chop it up into smaller pieces, and play the pieces back using your keyboard like a beat pad.
            </span>
          </div>
          <span 
            style={{ 
              borderColor: 'color-mix(in srgb, var(--accent) 70%, var(--accent2) / 60%)',
              color: 'var(--bg)',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))'
            }}
            className="mt-2 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-md hover:shadow-lg transition-all duration-200"
          >
            Launch Tool
          </span>
        </button>

        {/* Audio Converter Launcher */}
        <button 
          onClick={handleConverterSelect} 
          style={{ 
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 24%, var(--bg2)), color-mix(in srgb, var(--accent2) 24%, var(--bg3)))',
            borderColor: 'color-mix(in srgb, var(--accent) 60%, var(--accent2))'
          }}
          className="w-full max-w-md mx-auto p-5 sm:p-8 border rounded-2xl flex flex-col items-center gap-4 text-center transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-[0_20px_50px_var(--accent-glow)] active:scale-95 group relative overflow-hidden cursor-pointer"
        >
          <div 
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-300" 
          />
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_4px_12px_var(--accent-glow)]">⚙️</span>
          <div>
            <span 
              style={{ color: 'color-mix(in srgb, var(--accent) 65%, var(--accent2))' }}
              className="block font-display text-2xl font-bold uppercase mb-2 tracking-wide drop-shadow-sm"
            >
              Audio Converter
            </span>
            <span 
              className="block text-text2 text-xs leading-relaxed max-w-sm mx-auto font-medium"
            >
              Change audio files from one format to another (like MP3 to WAV), make them louder or quieter, and adjust quality settings.
            </span>
          </div>
          <span 
            style={{ 
              borderColor: 'color-mix(in srgb, var(--accent) 70%, var(--accent2) / 60%)',
              color: 'var(--bg)',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))'
            }}
            className="mt-2 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-md hover:shadow-lg transition-all duration-200"
          >
            Launch Tool
          </span>
        </button>
        {/* Audio Splitter Launcher */}
        <button 
          onClick={handleSplitterSelect} 
          style={{ 
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent2) 24%, var(--bg2)), color-mix(in srgb, var(--accent) 24%, var(--bg3)))',
            borderColor: 'color-mix(in srgb, var(--accent2) 60%, var(--accent))'
          }}
          className="w-full max-w-md mx-auto p-5 sm:p-8 border rounded-2xl flex flex-col items-center gap-4 text-center transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-[0_20px_50px_color-mix(in srgb,var(--accent2)_30%,color-mix(in srgb,var(--accent)_30%,transparent))] active:scale-95 group relative overflow-hidden cursor-pointer"
        >
          <div 
            style={{ background: 'linear-gradient(135deg, var(--accent2), var(--accent))' }}
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-300" 
          />
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_4px_12px_var(--accent-glow)]">🧬</span>
          <div>
            <span 
              style={{ color: 'color-mix(in srgb, var(--accent2) 65%, var(--accent))' }}
              className="block font-display text-2xl font-bold uppercase mb-2 tracking-wide drop-shadow-sm"
            >
              Audio Splitter
            </span>
            <span 
              className="block text-text2 text-xs leading-relaxed max-w-sm mx-auto font-medium"
            >
              Upload a song and separate it into different parts like vocals, drums, bass, and other instruments.
            </span>
          </div>
          <span 
            style={{ 
              borderColor: 'color-mix(in srgb, var(--accent2) 70%, var(--accent) / 60%)',
              color: 'var(--bg)',
              background: 'linear-gradient(135deg, var(--accent2), var(--accent))'
            }}
            className="mt-2 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-md hover:shadow-lg transition-all duration-200"
          >
            Launch Tool
          </span>
        </button>

        {/* Vocal Syntax Report Launcher */}
        <button 
          onClick={handleVocalSyntaxSelect} 
          style={{ 
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 24%, var(--bg2)), color-mix(in srgb, var(--accent2) 24%, var(--bg3)))',
            borderColor: 'color-mix(in srgb, var(--accent) 60%, var(--accent2))'
          }}
          className="w-full max-w-md mx-auto p-5 sm:p-8 border rounded-2xl flex flex-col items-center gap-4 text-center transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-[0_20px_50px_var(--accent-glow)] active:scale-95 group relative overflow-hidden cursor-pointer"
        >
          <div 
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-300" 
          />
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_4px_12px_var(--accent-glow)]">🗣️</span>
          <div>
            <span 
              style={{ color: 'color-mix(in srgb, var(--accent) 65%, var(--accent2))' }}
              className="block font-display text-2xl font-bold uppercase mb-2 tracking-wide drop-shadow-sm"
            >
              Vocal Syntax Report
            </span>
            <span 
              className="block text-text2 text-xs leading-relaxed max-w-sm mx-auto font-medium"
            >
              Generate linguistic biometrics and detailed acoustic reports from voice.
            </span>
          </div>
          <span 
            style={{ 
              borderColor: 'color-mix(in srgb, var(--accent) 70%, var(--accent2) / 60%)',
              color: 'var(--bg)',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))'
            }}
            className="mt-2 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-md hover:shadow-lg transition-all duration-200"
          >
            Launch Tool
          </span>
        </button>

        {/* Audio Cleanup Launcher */}
        <button 
          onClick={handleCleanupSelect} 
          style={{ 
            background: 'linear-gradient(135deg, color-mix(in srgb, #10b981 15%, var(--bg2)), color-mix(in srgb, var(--accent) 15%, var(--bg3)))',
            borderColor: 'color-mix(in srgb, #10b981 50%, var(--accent))'
          }}
          className="w-full max-w-md mx-auto p-5 sm:p-8 border rounded-2xl flex flex-col items-center gap-4 text-center transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-[0_20px_50px_color-mix(in srgb,#10b981_30%,transparent)] active:scale-95 group relative overflow-hidden cursor-pointer"
        >
          <div 
            style={{ background: 'linear-gradient(135deg, #10b981, var(--accent))' }}
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-300" 
          />
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_4px_12px_rgba(16,185,129,0.3)]">✨</span>
          <div>
            <span 
              style={{ color: 'color-mix(in srgb, #10b981 65%, var(--accent))' }}
              className="block font-display text-2xl font-bold uppercase mb-2 tracking-wide drop-shadow-sm"
            >
              Audio Cleanup
            </span>
            <span 
              className="block text-text2 text-xs leading-relaxed max-w-sm mx-auto font-medium"
            >
              Repair bad audio, remove hum, clicks, crackle, and denoise background ambience instantly.
            </span>
          </div>
          <span 
            style={{ 
              borderColor: 'color-mix(in srgb, #10b981 70%, var(--accent) / 60%)',
              color: 'var(--bg)',
              background: 'linear-gradient(135deg, #10b981, var(--accent))'
            }}
            className="mt-2 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-md hover:shadow-lg transition-all duration-200"
          >
            Launch Tool
          </span>
        </button>
      </div>
    </div>
  );
}

function ChordExplorerInterface({ onBack }: { onBack: () => void }) {
  const [aiModelId, setAiModelId] = useState(() => localStorage.getItem('producer_lyria_selected_model_id') || 'lyria-3-clip-preview');
  const [root, setRoot] = useState('C');
  const [scaleName, setScaleName] = useState('Major');
  const [activeChord, setActiveChord] = useState<number[] | null>(null);
  const [chordComplexity, setChordComplexity] = useState<'Dyads' | 'Triads' | '7ths' | '9ths' | '11ths'>('Triads');
  const [noteDensity, setNoteDensity] = useState<number>(2);
  const melodyDensity = noteDensity === 1 ? 'Sparse' : noteDensity === 2 ? 'Balanced' : noteDensity === 3 ? 'Detailed' : 'Intricate';
  const [playMode, setPlayMode] = useState<'Tap' | 'Keyboard'>('Tap');
  const [showKeyboardTutorial, setShowKeyboardTutorial] = useState(false);
  const [numpadMode, setNumpadMode] = useState<'Degrees' | 'Chords'>('Chords');
  const [card2History, setCard2History] = useState<{ playMode: 'Tap' | 'Keyboard'; numpadMode: 'Degrees' | 'Chords' }[]>([]);

  useEffect(() => {
    const syncModel = () => {
      const activeModel = localStorage.getItem('producer_lyria_selected_model_id');
      if (activeModel) {
        setAiModelId(activeModel);
      }
    };
    syncModel();
    const interval = setInterval(syncModel, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePlayModeChange = (newPlayMode: 'Tap' | 'Keyboard') => {
    if (newPlayMode === playMode) return;
    setCard2History(prev => [...prev, { playMode, numpadMode }]);
    setPlayMode(newPlayMode);
  };

  const handleNumpadModeChange = (newNumpadMode: 'Degrees' | 'Chords') => {
    if (newNumpadMode === numpadMode) return;
    setCard2History(prev => [...prev, { playMode, numpadMode }]);
    setNumpadMode(newNumpadMode);
  };

  const handleUndoCard2 = () => {
    if (card2History.length > 0) {
      const prev = card2History[card2History.length - 1];
      setPlayMode(prev.playMode);
      setNumpadMode(prev.numpadMode);
      setCard2History(prevList => prevList.slice(0, -1));
    }
  };
  const [octaveDegrees, setOctaveDegrees] = useState(4);
  const [octaveChords, setOctaveChords] = useState(3);
  const [adsr, setAdsr] = useState({ attack: 0.01, decay: 0.2, sustain: 0.4, release: 1.2 });
  const [isToneStarted, setIsToneStarted] = useState(false);
  const [scaleMessage, setScaleMessage] = useState<string | null>(null);
  const [tuning, setTuning] = useState<TuningId>(DEFAULT_TUNING);

  // Generation state
  const [genBars, setGenBars] = useState<number>(4);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStatus, setGenerationStatus] = useState<{ type: 'idle' | 'success' | 'info' | 'error'; message: string }>({ type: 'idle', message: '' });
  
  const [pianoRollNotes, setPianoRollNotes] = useState<PianoRollNote[]>([]);
  const [pianoRollUndoStack, setPianoRollUndoStack] = useState<PianoRollNote[][]>([]);
  const [isRecording, setIsRecording] = useState(false);
  
  const isRecordingRef = useRef(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordedNotesRef = useRef<PianoRollNote[]>([]);
  const isPlaybackActiveRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [instDegrees, setInstDegrees] = useState('Grand Piano');
  const [instChords, setInstChords] = useState('Grand Piano');
  const [loadingDegrees, setLoadingDegrees] = useState(false);
  const [loadingChords, setLoadingChords] = useState(false);
  const [showCustomDegrees, setShowCustomDegrees] = useState(false);
  const [showCustomChords, setShowCustomChords] = useState(false);
  const [customTextDegrees, setCustomTextDegrees] = useState('');
  const [customTextChords, setCustomTextChords] = useState('');

  const samplers = useRef<Record<string, any>>({});
  const customSynths = useRef<Record<string, any>>({});
  const reverb = useRef<any>(null);
  const fallbackSynth = useRef<any>(null);

  const captureBufferRef = useRef<{ notes: number[], timestamp: number }[]>([]);
  const [hasRecentCapture, setHasRecentCapture] = useState(false);
  const [isPlayingCapture, setIsPlayingCapture] = useState(false);
  const lastEventTimeRef = useRef<number>(0);
  
  const BPM = 120;
  const MS_PER_BAR = (60 / BPM) * 4 * 1000;

  const formatDawValue = (key: string, val: number) => {
    if (key === 'attack' || key === 'decay') {
      return val < 1.0 ? `${Math.round(val * 1000)} ms` : `${val.toFixed(2)} s`;
    }
    if (key === 'sustain') {
      return `${Math.round(val * 100)}%`;
    }
    if (key === 'release') {
      return val < 1.0 ? `${Math.round(val * 1000)} ms` : `${val.toFixed(2)} s`;
    }
    return val.toString();
  };

  const applyAdsr = useCallback((inst: any, customAdsr = adsr) => {
    if (!inst) return;
    try {
      if (inst.envelope) {
        inst.envelope.attack = customAdsr.attack;
        inst.envelope.decay = customAdsr.decay;
        inst.envelope.sustain = customAdsr.sustain;
        inst.envelope.release = customAdsr.release;
      } else if (typeof inst.set === 'function') {
        inst.set({
          envelope: {
            attack: customAdsr.attack,
            decay: customAdsr.decay,
            sustain: customAdsr.sustain,
            release: customAdsr.release
          }
        });
      }
      if (inst.attack !== undefined) inst.attack = customAdsr.attack;
      if (inst.release !== undefined) inst.release = customAdsr.release;
    } catch (err) {
      console.warn("Failed to apply ADSR", err);
    }
  }, [adsr]);

  const getCustomSynth = (instrument: string) => {
    if (customSynths.current[instrument]) return customSynths.current[instrument];
    if (SYNTH_PRESETS[instrument]) {
      const s = SYNTH_PRESETS[instrument]();
      if (reverb.current) {
        s.connect(reverb.current);
      } else {
        s.toDestination();
      }
      customSynths.current[instrument] = s;
      return s;
    }
    return fallbackSynth.current;
  };

  useEffect(() => {
    startTone();
    return () => {
      Object.values(samplers.current).forEach((s: any) => s.dispose());
      Object.values(customSynths.current).forEach((s: any) => s.dispose());
      if (fallbackSynth.current) fallbackSynth.current.dispose();
      if (reverb.current) reverb.current.dispose();
    };
  }, []);

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    recordingStartTimeRef.current = null;
  };

  const startRecording = (now: number) => {
    isRecordingRef.current = true;
    setIsRecording(true);
    recordingStartTimeRef.current = now;
  };

  const startTone = async () => {
    await Tone.start();
    setIsToneStarted(true);

    if (!reverb.current) {
      reverb.current = new Tone.Freeverb({ roomSize: 0.75, dampening: 4000 }).toDestination();
    }

    fallbackSynth.current = new Tone.PolySynth(Tone.Synth).connect(reverb.current);
    applyAdsr(fallbackSynth.current);
    
    loadInstrument('Grand Piano', 'degrees');
  };

  const loadInstrument = async (name: string, section: 'degrees' | 'chords') => {
    if (SYNTH_PRESETS[name]) return;
    const gmId = GM_MAP[name];
    if (!gmId || samplers.current[name]) return;

    const setLoading = section === 'degrees' ? setLoadingDegrees : setLoadingChords;
    setLoading(true);

    return new Promise((resolve) => {
      const sampler = new Tone.Sampler({
        urls: {
          "C3": "C3.mp3", "C4": "C4.mp3", "C5": "C5.mp3", "C6": "C6.mp3"
        },
        baseUrl: `https://gleitz.github.io/midi-js-soundfonts/MusyngKite/${gmId}-mp3/`,
        onload: () => {
          samplers.current[name] = sampler.toDestination();
          applyAdsr(sampler);
          setLoading(false);
          resolve(true);
        },
        onerror: () => {
          setLoading(false);
          resolve(false);
        }
      });
    });
  };

  const getNoteName = (midi: number) => NOTES[midi % 12];
  const getFullNoteName = (midi: number) => {
    const name = NOTES[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${name}${octave}`;
  };

  const resolvePitch = useCallback((midi: number) => {
    if (isTwelveToneEqualTemperament(tuning)) return Tone.Frequency(midi, 'midi').toNote();
    const rootPitchClass = NOTES.indexOf(root);
    const hz = getTunedFrequency(midi, rootPitchClass, tuning);
    if (!Number.isFinite(hz) || hz <= 0) return Tone.Frequency(midi, 'midi').toNote();
    return hz;
  }, [tuning, root]);

  const playSound = useCallback(async (midiNotes: number[], instrument: string, section: 'degrees' | 'chords', time?: number) => {
    if (!isToneStarted) return;

    if (GM_MAP[instrument] && !samplers.current[instrument]) {
      await loadInstrument(instrument, section);
    }

    const now = performance.now();

    if (isPlaybackActiveRef.current) {
      // Just auditory trigger during playback
    } else {
      if (!isRecordingRef.current) {
          startRecording(now);
      }
      
      // Auto close/save loop on 10 seconds of silence
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(stopRecording, 10000);
      
      if (isRecordingRef.current && recordingStartTimeRef.current !== null) {
          const timeOffsetSeconds = (performance.now() - recordingStartTimeRef.current) / 1000;
          
          midiNotes.forEach(n => {
              recordedNotesRef.current.push({ note: n, startTime: timeOffsetSeconds, id: Math.random().toString(), duration: 0.25 });
          });
          setPianoRollNotes([...recordedNotesRef.current]);
      }
      
      captureBufferRef.current.push({ notes: midiNotes, timestamp: now });
      lastEventTimeRef.current = now;
      setHasRecentCapture(true);
    }

    const freqNotes = midiNotes.map((n) => resolvePitch(n));
    
    try {
      if (samplers.current[instrument] && samplers.current[instrument].loaded) {
        samplers.current[instrument].triggerAttackRelease(freqNotes, '2n', time);
      } else {
        const synth = getCustomSynth(instrument);
        synth.triggerAttackRelease(freqNotes, '2n', time);
      }
    } catch (e) {
      console.warn("Audio buffer not loaded yet, using fallback", e);
      const synth = getCustomSynth('fallback');
      if (synth) synth.triggerAttackRelease(freqNotes, '2n', time);
    }

    setActiveChord(midiNotes);
    setTimeout(() => setActiveChord(null), 500);
  }, [isToneStarted, resolvePitch]);

  const baseScaleNotes = useMemo(() => {
    const rootMidi = NOTES.indexOf(root);
    const intervals = SCALES[scaleName as keyof typeof SCALES] || SCALES.Major;
    const len = intervals.length;
    const count = len > 7 ? len + 1 : 8;
    const notes: number[] = [];
    for (let i = 0; i < count; i++) {
      const interval = intervals[i % len] + Math.floor(i / len) * 12;
      notes.push(rootMidi + interval);
    }
    return notes;
  }, [root, scaleName]);

  const continuousScale = useMemo(() => {
    const rootMidi = NOTES.indexOf(root);
    const intervals = SCALES[scaleName as keyof typeof SCALES] || SCALES.Major;
    const len = intervals.length;
    const notes: number[] = [];
    for (let i = 0; i < 64; i++) {
      const interval = intervals[i % len] + Math.floor(i / len) * 12;
      notes.push(rootMidi + interval);
    }
    return notes;
  }, [root, scaleName]);

  const chordsInScale = useMemo(() => {
    const rootMidi = NOTES.indexOf(root);
    const intervals = SCALES[scaleName as keyof typeof SCALES] || SCALES.Major;
    const len = intervals.length;
    const count = len > 7 ? len + 1 : 8;
    const chords: number[][] = [];
    for (let i = 0; i < count; i++) {
      const rootNote = rootMidi + intervals[i % len] + Math.floor(i / len) * 12;
      const third = rootMidi + intervals[(i + 2) % len] + Math.floor((i + 2) / len) * 12;
      const fifth = rootMidi + intervals[(i + 4) % len] + Math.floor((i + 4) / len) * 12;
      
      let chord: number[];
      if (chordComplexity === 'Dyads') {
        chord = [rootNote, fifth];
      } else if (chordComplexity === 'Triads') {
        chord = [rootNote, third, fifth];
      } else if (chordComplexity === '7ths') {
        const seventh = rootMidi + intervals[(i + 6) % len] + Math.floor((i + 6) / len) * 12;
        chord = [rootNote, third, fifth, seventh];
      } else if (chordComplexity === '9ths') {
        const seventh = rootMidi + intervals[(i + 6) % len] + Math.floor((i + 6) / len) * 12;
        const ninth = rootMidi + intervals[(i + 8) % len] + Math.floor((i + 8) / len) * 12;
        chord = [rootNote, third, fifth, seventh, ninth];
      } else { // '11ths'
        const seventh = rootMidi + intervals[(i + 6) % len] + Math.floor((i + 6) / len) * 12;
        const ninth = rootMidi + intervals[(i + 8) % len] + Math.floor((i + 8) / len) * 12;
        const eleventh = rootMidi + intervals[(i + 10) % len] + Math.floor((i + 10) / len) * 12;
        chord = [rootNote, third, fifth, seventh, ninth, eleventh];
      }
      chords.push(chord);
    }
    return chords;
  }, [root, scaleName, chordComplexity]);

  const playbackRecent = async () => {
    if ((captureBufferRef.current.length === 0 && pianoRollNotes.length === 0) || isPlayingCapture) return;
    setIsPlayingCapture(true);
    isPlaybackActiveRef.current = true;
    let events = [...captureBufferRef.current];
    if (events.length === 0) {
      const now = performance.now();
      events = pianoRollNotes.map(n => ({
        notes: [n.note],
        timestamp: now + (n.startTime * 1000)
      })).sort((a, b) => a.timestamp - b.timestamp);
    }
    const startTime = events[0].timestamp;
    
    const octaveOffset = numpadMode === 'Chords' ? (octaveChords - 3) * 12 : (octaveDegrees - 4) * 12;
    const instrument = numpadMode === 'Chords' ? instChords : instDegrees;
    const section = numpadMode === 'Chords' ? 'chords' : 'degrees';

    for (const event of events) {
      const waitTime = event.timestamp - startTime;
      setTimeout(() => {
        const shiftedNotes = event.notes.map(n => n + octaveOffset);
        playSound(shiftedNotes, instrument, section);
      }, waitTime);
    }
    
    const totalDuration = events[events.length - 1].timestamp - startTime + 500;
    setTimeout(() => {
      setIsPlayingCapture(false);
      isPlaybackActiveRef.current = false;
    }, totalDuration);
  };

  const generateAlgorithmic = (type: 'chords' | 'melody') => {
    const secondsPerBar = 2.0; // 120 BPM => 2 seconds per bar
    const totalLength = genBars * secondsPerBar;
    const newNotesList: PianoRollNote[] = [];

    const addNote = (note: number, start: number, dur: number) => {
      newNotesList.push({
        note,
        startTime: start,
        duration: dur,
        id: `algo_${Math.random().toString(36).substr(2, 6)}`
      });
    };

    if (type === 'chords') {
      const chordDuration = (noteDensity <= 2) ? 2.0 : 1.0;
      const stepsCount = totalLength / chordDuration;

      const progressionTemplates = [
        [0, 4, 5, 3], // I - V - vi - IV
        [0, 3, 4, 0], // I - IV - V - I
        [1, 4, 0, 0], // ii - V - I - I
        [0, 5, 3, 4], // I - vi - IV - V
        [5, 3, 0, 4]  // vi - IV - I - V
      ];
      const template = progressionTemplates[Math.floor(Math.random() * progressionTemplates.length)];

      for (let step = 0; step < stepsCount; step++) {
        const stepStartTime = step * chordDuration;
        const scaleChordIdx = template[step % template.length] % chordsInScale.length;
        const baseChord = chordsInScale[scaleChordIdx];
        const shiftedChord = baseChord.map(n => n + (4 * 12) + OCTAVE_OFFSET);
        
        shiftedChord.forEach(notePitch => {
          addNote(notePitch, stepStartTime, chordDuration - 0.05);
        });
      }
    } else {
      let stepDuration = 0.5;
      let noteProb = 0.6;
      
      if (noteDensity === 1) {
        stepDuration = 0.5;
        noteProb = 0.45;
      } else if (noteDensity === 2) {
        stepDuration = 0.5;
        noteProb = 0.75;
      } else if (noteDensity === 3) {
        stepDuration = 0.25;
        noteProb = 0.65;
      } else {
        stepDuration = 0.25;
        noteProb = 0.85;
      }

      const stepsCount = totalLength / stepDuration;
      let lastMidiNote = baseScaleNotes[0] + (4 * 12) + OCTAVE_OFFSET;

      for (let step = 0; step < stepsCount; step++) {
        if (Math.random() > noteProb) continue;

        const stepStartTime = step * stepDuration;
        const scalePitches = baseScaleNotes.map(n => n + (4 * 12) + OCTAVE_OFFSET);
        
        const currentIdx = scalePitches.indexOf(lastMidiNote);
        let nextIdx = currentIdx === -1 ? 0 : currentIdx;
        
        const stepChange = Math.random() < 0.5 ? -1 : 1;
        nextIdx = Math.max(0, Math.min(scalePitches.length - 1, nextIdx + stepChange));
        let targetPitch = scalePitches[nextIdx];
        
        addNote(targetPitch, stepStartTime, stepDuration - 0.02);
        lastMidiNote = targetPitch;
      }
    }

    return newNotesList;
  };

  const handleGenerate = async (type: 'chords' | 'melody') => {
    // 1. Save Undo State
    setPianoRollUndoStack(prev => [...prev.slice(-9), pianoRollNotes]);

    const activeKeyId = localStorage.getItem('producer_lyria_selected_key_id') || '';
    const savedKeysStr = localStorage.getItem('producer_lyria_api_keys') || '[]';
    let savedKeys: any[] = [];
    try {
      savedKeys = JSON.parse(savedKeysStr);
    } catch {}
    const activeKeyObj = savedKeys.find((k: any) => k.id === activeKeyId);
    const apiKey = activeKeyObj ? activeKeyObj.apiKey : '';
    const provider = activeKeyObj ? activeKeyObj.provider : 'google';
    const requestedModel = activeKeyObj?.selectedModel || aiModelId;

    // Use central registry: if 'auto' pick best for music-structure task; also normalize
    const modelId = resolveModelForRequest(requestedModel, provider, 'music-structure' as AITask);
    // For Google, map music/lyria selections to a suitable text-capable model for structured JSON
    const actualModelToCall = provider === 'google' ? getBestModelForTask('music-structure' as AITask, 'google') : modelId;

    const snapNoteToScale = (note: number, baseScalePitches: number[]): number => {
      const allowedPCs = Array.from(new Set(baseScalePitches.map(p => p % 12)));
      if (allowedPCs.length === 0) return note;
      const notePC = note % 12;
      
      let bestPC = allowedPCs[0];
      let minDiff = 12;
      
      for (const pc of allowedPCs) {
        const diff = Math.min(Math.abs(pc - notePC), 12 - Math.abs(pc - notePC));
        if (diff < minDiff) {
          minDiff = diff;
          bestPC = pc;
        }
      }
      
      const octave = Math.floor(note / 12);
      let snappedNote = octave * 12 + bestPC;
      
      if (Math.abs(snappedNote - note) > 6) {
        if (snappedNote < note) {
          snappedNote += 12;
        } else {
          snappedNote -= 12;
        }
      }
      return snappedNote;
    };

    if (apiKey && modelId) {
      setIsGenerating(true);
      const isMapped = actualModelToCall !== modelId;
      setGenerationStatus({ 
        type: 'info', 
        message: isMapped 
          ? `Calling ${provider} model: ${actualModelToCall} (using best model for music structure)...`
          : `Calling ${provider} model: ${actualModelToCall}...` 
      });
      let promptText = '';
      try {
        const secondsCount = genBars * 2.0;
        const referenceOctave = 4;
        const standardScalePitches = baseScaleNotes.map(n => n + (referenceOctave * 12) + OCTAVE_OFFSET);
        const standardChordPitchesByDegree = chordsInScale.map(chord => chord.map(n => n + (referenceOctave * 12) + OCTAVE_OFFSET));
        if (type === 'melody') {
          promptText = `
            Generate a beautiful MIDI melody of length ${genBars} bars (${secondsCount} seconds) matching these parameters:
            - Key (Root note of key): ${root}
            - Scale Name: ${scaleName}
            - Tuning System: ${tuning} (represented in standard MIDI pitch elements)
            - Note Density: ${melodyDensity} (adjust the frequency and rhythm of notes based on this vibe)
            - BPM: 120. One bar is exactly 2.0 seconds.

            CRITICAL MUSIC THEORY REQUIREMENT:
            Each note's pitch MUST be strictly chosen from this set of allowed MIDI note integers in standard reference octave 4:
            ${JSON.stringify(standardScalePitches)}

            Do NOT write any pitches outside this allowed set.
            Keep startTime between 0 and ${secondsCount}.
            Ignore chosen instruments, custom octave selections, or synth sounds. Only write standard MIDI integers on the scale.

            Return strictly a JSON object matching this schema:
            {
              "notes": [
                 { "note": MIDI_NUMBER, "startTime": START_TIME_IN_SECONDS, "duration": DURATION_IN_SECONDS }
              ]
            }
            Raw JSON only. No triple backticks, markdown wrapper blocks, or text.
          `;
        } else {
          promptText = `
            Generate a beautiful MIDI chord progression of length ${genBars} bars (${secondsCount} seconds) matching these parameters:
            - Key (Root note of key): ${root}
            - Scale Name: ${scaleName}
            - Tuning System: ${tuning}
            - Chord Density: ${melodyDensity} (e.g., Change chords every 2.0s or 1.0s)
            - BPM: 120. One bar is exactly 2.0 seconds.

            CRITICAL MUSIC THEORY REQUIREMENT:
            Each chord MUST be strictly chosen from one of the allowed chords list in standard reference octave 4:
            ${JSON.stringify(standardChordPitchesByDegree)}

            Every note in your generated chords MUST belong to one of these allowed chords array elements.
            Keep startTime between 0 and ${secondsCount}.
            Ignore chosen instruments, custom octave selections, or synth sounds. Only write standard MIDI integers on the scale.

            Return strictly a JSON object matching this schema:
            {
              "notes": [
                 { "note": MIDI_NUMBER, "startTime": START_TIME_IN_SECONDS, "duration": DURATION_IN_SECONDS }
              ]
            }
            Raw JSON only. No triple backticks, markdown wrapper blocks, or text.
          `;
        }

        const response = await fetch(`/api/generate-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            promptText,
            clientApiKey: apiKey,
            clientProvider: provider,
            modelId: modelId   // already resolved via registry (auto -> task best)
          })
        });

        if (!response.ok) {
          let errMsg = `Server Error: ${response.status}`;
          try {
            const errJson = await response.json();
            if (errJson?.error) {
              errMsg += ` - ${errJson.error}`;
            }
          } catch {}
          throw new Error(errMsg);
        }

        const data = await response.json();
        let text = data.text;
        
        // Strip markdown code blocks if the model wrapped the JSON
        if (text && text.includes("```")) {
          text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        }

        if (!text) throw new Error("Empty text block returned from API");

        // Log successful transaction
        logTransaction({
          modelId: modelId,
          type: type === 'chords' ? 'Chord Generation' : 'Melody Generation',
          promptText: promptText,
          responseText: text,
          usageMetadata: data?.usageMetadata,
          success: true
        });

        // Clean up markdown block headers / code-fences if any are present
        let cleanText = text.trim();
        if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trim();
        }

        const parsed = JSON.parse(cleanText);
        if (parsed && Array.isArray(parsed.notes)) {
          const generated = parsed.notes.map((n: any) => {
            const rawNote = Number(n.note);
            const snappedNote = snapNoteToScale(rawNote, baseScaleNotes);
            return {
              note: snappedNote,
              exactPitch: snappedNote,
              startTime: Number(n.startTime),
              duration: Number(n.duration) || 0.25,
              id: `ai_${Math.random().toString(36).substr(2, 6)}`
            };
          });

          if (aiModelId === 'lyria-realtalk') {
            setPianoRollNotes([]);
            recordedNotesRef.current = [];
            isRecordingRef.current = true;
            setIsRecording(true);
            recordingStartTimeRef.current = performance.now();
            
            generated.forEach((note: any, idx: number) => {
              setTimeout(() => {
                setPianoRollNotes(prev => [...prev, note]);
                recordedNotesRef.current.push(note);
                if (isToneStarted) {
                   playSound([note.note], type === 'chords' ? instChords : instDegrees, type === 'chords' ? 'chords' : 'degrees');
                }
                
                if (idx === generated.length - 1) {
                  stopRecording();
                  setIsGenerating(false);
                  setGenerationStatus({ type: 'success', message: 'Lyria RealTalk session ended.' });
                }
              }, note.startTime * 1000); // 1000 ms per second
            });
            // Immediately resolve the waiting state since playback is async
          } else {
            setPianoRollNotes(generated);
            recordedNotesRef.current = generated;
            setIsGenerating(false);
            setGenerationStatus({ 
              type: 'success', 
              message: `Generation successful with ${provider} model: ${actualModelToCall}!` 
            });
          }
          return;
        } else {
          throw new Error("Invalid format in returned JSON (missing 'notes' array)");
        }
      } catch (err: any) {
        console.warn("API generation failed, falling back to local algorithmic engine", err);
        // Log failed transaction
        logTransaction({
          modelId: modelId,
          type: type === 'chords' ? 'Chord Generation' : 'Melody Generation',
          promptText: promptText,
          success: false
        });
        setGenerationStatus({ 
          type: 'error', 
          message: `API generation failed: ${err.message || 'unknown error'}. Local algorithmic engine fallback used.` 
        });
      }
    } else {
      setGenerationStatus({ 
        type: 'info', 
        message: "No active API Key selected. Standardized generation completed using local algorithmic engine." 
      });
    }

    // Call Algorithmic Fallback
    const generated = generateAlgorithmic(type);
    setPianoRollNotes(generated);
    recordedNotesRef.current = generated;
    setIsGenerating(false);
  };

  const exportMidi = async () => {
    const rawEvents = captureBufferRef.current;
    if (rawEvents.length === 0) return;

    const startOffset = rawEvents[0].timestamp;
    const events = rawEvents.map(e => ({ ...e, normalizedTime: e.timestamp - startOffset }));
    const lastEvent = events[events.length - 1];
    const actualDuration = lastEvent.normalizedTime + 500;
    const snappedDuration = Math.round(actualDuration / MS_PER_BAR) * MS_PER_BAR;
    const finalDuration = Math.max(MS_PER_BAR, snappedDuration);
    const encodeVLQ = (num: number) => {
      let v = num & 0x7F; let out = [v];
      while (num >>= 7) { v = (num & 0x7F) | 0x80; out.unshift(v); }
      return out;
    };
    const headerChunk = [0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x01, 0xe0];
    let trackData: number[] = []; let lastTick = 0;
    events.forEach(event => {
      const ticks = Math.round(event.normalizedTime * 0.96);
      const deltaTime = encodeVLQ(ticks - lastTick); lastTick = ticks;
      event.notes.forEach((note, idx) => { trackData.push(...(idx === 0 ? deltaTime : [0])); trackData.push(0x90, note, 0x64); });
      const offTicks = 480; const offDelta = encodeVLQ(offTicks);
      event.notes.forEach((note, idx) => { trackData.push(...(idx === 0 ? offDelta : [0])); trackData.push(0x80, note, 0x00); if (idx === 0) lastTick += offTicks; });
    });
    const finalTicks = Math.round(finalDuration * 0.96);
    if (finalTicks > lastTick) trackData.push(...encodeVLQ(finalTicks - lastTick), 0xFF, 0x2F, 0x00);
    else trackData.push(0x00, 0xFF, 0x2F, 0x00);
    const trackChunk = [0x4d, 0x54, 0x72, 0x6b, ...(new Uint8Array(new Uint32Array([trackData.length]).buffer).reverse()), ...trackData];
    const blob = new Blob([new Uint8Array([...headerChunk, ...trackChunk])], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `capture-${Math.round(finalDuration/1000)}s-${Date.now()}.mid`; a.click();
  };

  const exportPianoRollMidi = async () => {
    const rawNotes = pianoRollNotes;
    if (rawNotes.length === 0) return;

    const bpmVal = BPM || 120;
    const events: { tick: number; type: 'on' | 'off'; note: number }[] = [];
    rawNotes.forEach(noteObj => {
      const ticks = Math.round(noteObj.startTime * (bpmVal / 60) * 128);
      const offTick = ticks + Math.round(noteObj.duration * (bpmVal / 60) * 128); 
      events.push({ tick: ticks, type: 'on', note: noteObj.note });
      events.push({ tick: offTick, type: 'off', note: noteObj.note });
    });

    events.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      if (a.type !== b.type) return a.type === 'off' ? -1 : 1;
      return a.note - b.note;
    });

    const encodeVLQ = (num: number): number[] => {
      let v = num & 0x7F;
      let out = [v];
      while (num >>>= 7) {
        v = (num & 0x7F) | 0x80;
        out.unshift(v);
      }
      return out;
    };

    const headerChunk = [
      0x4D, 0x54, 0x68, 0x64,
      0x00, 0x00, 0x00, 0x06,
      0x00, 0x00,
      0x00, 0x01,
      0x00, 0x80
    ];

    let trackData: number[] = [];

    const tempoUs = Math.round(60_000_000 / bpmVal);
    const tempoBytes = [
      (tempoUs >>> 16) & 0xFF,
      (tempoUs >>> 8) & 0xFF,
      tempoUs & 0xFF
    ];
    trackData.push(0x00, 0xFF, 0x51, 0x03, ...tempoBytes);

    let lastTick = 0;
    events.forEach(event => {
      const deltaTicks = event.tick - lastTick;
      const deltaTimeBytes = encodeVLQ(deltaTicks);
      lastTick = event.tick;

      trackData.push(...deltaTimeBytes);
      if (event.type === 'on') {
        trackData.push(0x90, event.note, 0x64);
      } else {
        trackData.push(0x80, event.note, 0x00);
      }
    });

    trackData.push(0x00, 0xFF, 0x2F, 0x00);

    const len = trackData.length;
    const lenBytes = [
      (len >>> 24) & 0xFF,
      (len >>> 16) & 0xFF,
      (len >>> 8) & 0xFF,
      len & 0xFF
    ];

    const trackChunk = [
      0x4D, 0x54, 0x72, 0x6B,
      ...lenBytes,
      ...trackData
    ];

    const midiBytes = new Uint8Array([...headerChunk, ...trackChunk]);

    const blob = new Blob([midiBytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sequence.mid';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const bufferToWav = (buffer: AudioBuffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels: Float32Array[] = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // write WAV header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // chunk length
    setUint16(1); // sample format (raw)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample

    setUint32(0x61746164); // "data" chunk
    setUint32(length - pos - 4); // chunk length

    for (i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([bufferArr], { type: 'audio/wav' });
  };

  const exportPianoRollAudio = async (format: 'wav' | 'mp3') => {
    const rawNotes = pianoRollNotes;
    if (rawNotes.length === 0) {
      alert("No notes in sequence to export!");
      return;
    }

    const bpmVal = BPM || 120;
    let maxPlayTime = 0.5;
    rawNotes.forEach(n => {
      if (n.startTime > maxPlayTime) {
        maxPlayTime = n.startTime;
      }
    });
    const renderDuration = maxPlayTime + 1.2;

    try {
      const renderedBuffer = await Tone.Offline(async () => {
        // Setup a beautiful PolySynth with custom gorgeous ADSR configuration inside the offline context
        const synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: {
            attack: adsr.attack,
            decay: adsr.decay,
            sustain: adsr.sustain,
            release: adsr.release
          }
        }).toDestination();

        rawNotes.forEach(n => {
          const pitchName = getFullNoteName(n.note);
          synth.triggerAttackRelease(pitchName, "16n", n.startTime);
        });
      }, renderDuration);

      const wavBlob = bufferToWav(renderedBuffer.get() as AudioBuffer);
      const filename = `sequence-${Date.now()}.${format}`;
      
      const fileBlob = format === 'wav' ? wavBlob : new Blob([wavBlob], { type: 'audio/mp3' });
      const url = URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Offline audio compilation failed.");
    }
  };

  const getTheoryTip = () => {
    if (scaleName === 'Major' || scaleName === 'Ionian') return "The backbone of Western music. Bright and stable.";
    if (scaleName === 'Minor' || scaleName === 'Natural Minor') return "The 'Natural Minor'. Sad, serious, or introspective.";
    if (scaleName === 'Blues' || scaleName === 'Minor Blues') return "The classic blues palette — pentatonic with a passing blue note.";
    if (scaleName === 'Dorian') return "Cool jazz or funky soul. Brighter than natural minor.";
    return "Explore the unique interval relationships of this structure.";
  };

  const handleUndo = useCallback(() => {
    if (pianoRollUndoStack.length > 0) {
      const last = pianoRollUndoStack[pianoRollUndoStack.length - 1];
      setPianoRollNotes(last);
      setPianoRollUndoStack(prev => prev.slice(0, -1));
      recordedNotesRef.current = last;
    }
  }, [pianoRollUndoStack]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key repeat events (key held down)
      if (e.repeat) return;

      // Global Escape handling
      if (e.key === 'Escape') {
        onBack();
        return;
      }

      // Global Undo handling (Ctrl+Z / Cmd+Z)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Number keys 1-9: only active in Keyboard mode
      if (playMode === 'Keyboard') {
        const index = parseInt(e.key, 10) - 1;
        if (index >= 0) {
          if (numpadMode === 'Chords' && index < chordsInScale.length) {
            const chord = chordsInScale[index].map(n => n + (octaveChords * 12) + OCTAVE_OFFSET);
            playSound(chord, instChords, 'chords');
          } else if (numpadMode === 'Degrees' && index < baseScaleNotes.length) {
            const note = [baseScaleNotes[index] + (octaveDegrees * 12) + OCTAVE_OFFSET];
            playSound(note, instDegrees, 'degrees');
          }
          e.preventDefault();
          return;
        }
      }

      if (playMode !== 'Keyboard') return;

      // Hidden sequential keyboard piano mapping
      const keyStr = e.key.toLowerCase();
      const BOTTOM_ROW = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'];
      const MIDDLE_ROW = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"];
      const TOP_ROW    = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'];

      let normalizedKey = keyStr;
      if (e.key === '?') normalizedKey = '/';
      else if (e.key === '<') normalizedKey = ',';
      else if (e.key === '>') normalizedKey = '.';
      else if (e.key === ':') normalizedKey = ';';
      else if (e.key === '"') normalizedKey = "'";
      else if (e.key === '{') normalizedKey = '[';
      else if (e.key === '}') normalizedKey = ']';

      const fullLayout = [...BOTTOM_ROW, ...MIDDLE_ROW, ...TOP_ROW];
      const seqIdx = fullLayout.indexOf(normalizedKey);

      if (seqIdx !== -1) {
        const scaleIntervals = SCALES[scaleName as keyof typeof SCALES] || SCALES['Major'];
        const notesInScaleCount = scaleIntervals.length;
        if (notesInScaleCount > 0) {
          const degree = seqIdx % notesInScaleCount;
          const octaveShift = Math.floor(seqIdx / notesInScaleCount);
          
          if (numpadMode === 'Chords') {
            const baseChord = chordsInScale[degree];
            if (baseChord) {
              const octaveFactor = octaveChords + octaveShift;
              const chord = baseChord.map(n => n + (octaveFactor * 12) + OCTAVE_OFFSET);
              playSound(chord, instChords, 'chords');
            }
          } else {
            const midiPitch = continuousScale[seqIdx] + (octaveDegrees * 12) + OCTAVE_OFFSET;
            playSound([midiPitch], instDegrees, 'degrees');
          }
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chordsInScale, baseScaleNotes, continuousScale, numpadMode, isToneStarted, instDegrees, instChords, octaveDegrees, octaveChords, playMode, playSound, scaleName, handleUndo, onBack]);

  useEffect(() => {
    Object.values(samplers.current).forEach(inst => applyAdsr(inst));
    applyAdsr(fallbackSynth.current);
  }, [adsr, applyAdsr]);

  const handleInstrumentChange = async (val: string, section: 'degrees' | 'chords') => {
    // Sync both sections together so that instrument selector applies to everything
    const setInst = (v: string) => {
      setInstDegrees(v);
      setInstChords(v);
    };

    if (val === 'RANDOM_AI') {
      const picked = ALL_INSTRUMENTS[Math.floor(Math.random() * ALL_INSTRUMENTS.length)];
      setInst(picked);
    } else if (val === 'RANDOM_LIST') {
      const picked = ALL_INSTRUMENTS[Math.floor(Math.random() * ALL_INSTRUMENTS.length)];
      setInst(picked);
    } else {
      setInst(val);
    }
    setAdsr({ attack: 0.01, decay: 0.2, sustain: 0.4, release: 1.2 });
  };

  const handleScaleSelect = (val: string) => {
    setScaleName(val);
    setScaleMessage(null);
  };

  const OctaveControl = ({ val, onChange }: any) => (
    <div className="flex items-center gap-3 bg-bg border border-border rounded px-2 py-1 h-[26px]">
      <button onClick={() => onChange(Math.max(1, val - 1))} className="text-[var(--accent)] font-black hover:text-text">-</button>
      <span className="text-[11px] font-black uppercase text-text3 whitespace-nowrap">Octave: {val}</span>
      <button onClick={() => onChange(Math.min(8, val + 1))} className="text-accent font-black hover:text-text">+</button>
    </div>
  );



  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0 mb-8 font-sans">
      <div className="mb-4">
        <button onClick={onBack} className="text-text3 hover:text-text font-black uppercase text-[10px] bg-bg3 border border-border px-3 py-1.5 rounded-lg shrink-0 transition-colors">
          ← Back Launchpad
        </button>
      </div>
      <div className="p-3 sm:p-6 bg-bg2 text-text rounded-lg sm:rounded-xl shadow-2xl border border-border relative">
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-left shrink-0">
            <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent uppercase tracking-wide whitespace-nowrap animate-pulse">
              Chord Playground
            </h2>
            <p className="text-[11px] text-text3 tracking-wide hidden sm:block">Live synthesizer console</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto justify-start sm:justify-end">
            <div className="flex items-center gap-2 shrink-0 bg-bg3 border border-border rounded-lg px-2 py-1.5 w-full sm:w-auto justify-between sm:justify-start">
              <label htmlFor="global-tuning" className="text-[10px] font-black uppercase text-accent tracking-wider whitespace-nowrap">
                Tuning
              </label>
              <div className="relative">
                <select
                  id="global-tuning"
                  value={tuning}
                  onChange={(e) => setTuning(e.target.value as TuningId)}
                  style={{ fontFamily: 'system-ui', fontWeight: 'normal' }}
                  className="bg-bg border border-border rounded-lg pl-2 pr-7 py-1 text-[11px] text-text hover:border-[var(--accent)] transition-colors appearance-none cursor-pointer w-[10.5rem]"
                >
                  <option value={DEFAULT_TUNING}>{DEFAULT_TUNING}</option>
                  {TUNING_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text3 pointer-events-none" />
              </div>
            </div>
          </div>
        </header>

      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CARD 1: SCALE CONFIGURATION */}
          <div className="bg-bg3 p-4 rounded-xl border border-border min-h-[340px] flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-accent uppercase tracking-widest">Scale Configuration</h3>
              <button 
                onClick={() => {
                  const randomRoot = NOTES[Math.floor(Math.random() * NOTES.length)];
                  setRoot(randomRoot);
                  
                  const scalesList = ALL_SCALE_NAMES;
                  const randomScale = scalesList[Math.floor(Math.random() * scalesList.length)];
                  setScaleName(randomScale);
                  
                  const complexities: ('Dyads' | 'Triads' | '7ths' | '9ths' | '11ths')[] = ['Dyads', 'Triads', '7ths', '9ths', '11ths'];
                  const randomComplexity = complexities[Math.floor(Math.random() * complexities.length)];
                  setChordComplexity(randomComplexity);
                }}
                className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-[10px] text-amber-400 font-extrabold tracking-wider px-2.5 py-1 rounded-lg border border-amber-500/30 font-sans cursor-pointer transition-all uppercase"
              >
                🎲 RANDOMIZE
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-accent mb-1 tracking-wider">Root Key</label>
                <div className="relative">
                  <select
                    value={root}
                    onChange={(e) => setRoot(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl p-2.5 text-xs font-black text-text hover:border-[var(--accent)] transition-colors appearance-none pr-8 cursor-pointer truncate"
                  >
                    {NOTES.map(n => <option key={n} value={n} className="bg-bg2 text-text font-bold">{n}</option>)}
                  </select>
                  <div className="absolute right-3 top-[50%] -translate-y-[50%] pointer-events-none text-text3">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              <div className="relative">
                <label className="block text-[10px] font-black uppercase text-accent mb-1 tracking-wider">Scale Structure</label>
                <div className="relative">
                  <select
                    value={scaleName}
                    onChange={(e) => handleScaleSelect(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl p-2.5 text-xs font-black text-text hover:border-[var(--accent)] transition-colors appearance-none pr-8 cursor-pointer truncate"
                  >
                    {SCALE_GROUPS.map((group) => (
                      <React.Fragment key={group.label}>
                        <option disabled value={`__group_${group.label}__`} className="text-accent font-black uppercase">
                          {group.label}
                        </option>
                        {group.scales.map((s) => (
                          <option key={s} value={s} className="bg-bg2 text-text font-bold">
                            {s}
                          </option>
                        ))}
                      </React.Fragment>
                    ))}
                  </select>
                  <div className="absolute right-3 top-[50%] -translate-y-[50%] pointer-events-none text-text3">
                    <ChevronDown size={14} />
                  </div>
                </div>
                {scaleMessage && <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-amber-500 text-black text-[10px] font-black p-2 rounded shadow-lg">{scaleMessage}</div>}
              </div>
            </div>

            <div className="bg-bg p-2.5 rounded-xl border border-border">
              <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                {['Dyads', 'Triads', '7ths'].map(type => (
                  <button 
                    key={type} 
                    onClick={() => setChordComplexity(type as any)} 
                    style={
                      type === 'Dyads' || type === '7ths' 
                        ? { fontFamily: 'system-ui' } 
                        : undefined
                    }
                    className={`rounded-lg text-[10px] font-black py-2 text-center transition-all cursor-pointer whitespace-nowrap uppercase tracking-wider ${
                      chordComplexity === type 
                        ? 'bg-accent text-[var(--bg)] shadow-md shadow-accent/15' 
                        : 'text-text3 hover:text-text'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5 px-4">
                {['9ths', '11ths'].map(type => (
                  <button 
                    key={type} 
                    onClick={() => setChordComplexity(type as any)} 
                    style={
                      type === '9ths' || type === '11ths' 
                        ? { fontFamily: 'system-ui', fontWeight: 'bold' } 
                        : undefined
                    }
                    className={`rounded-lg text-[10px] font-black py-1.5 text-center transition-all cursor-pointer whitespace-nowrap uppercase tracking-wider ${
                      chordComplexity === type 
                        ? 'bg-accent text-[var(--bg)] shadow-md shadow-accent/15' 
                        : 'text-text3 hover:text-text font-semibold'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CARD 2: PLAY CONFIGURATION & KEYBOARD CONTROLS */}
          <div className="bg-bg3 p-4 rounded-xl border border-border min-h-[340px] flex flex-col justify-between min-w-0">
            <header className="flex items-center justify-between mb-2 shrink-0">
              <h3 className="text-xs font-black text-accent uppercase tracking-widest">Play Configuration</h3>
              <button
                onClick={handleUndoCard2}
                disabled={card2History.length === 0}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] uppercase font-black border transition-all cursor-pointer ${
                  card2History.length > 0
                    ? 'bg-accent/15 border-accent/40 text-accent hover:bg-accent/25'
                    : 'bg-neutral-900/50 border-neutral-800 text-neutral-600 cursor-not-allowed opacity-30'
                }`}
                title="Undo last play settings change"
              >
                <Undo size={11} /> Undo
              </button>
            </header>

            {playMode === 'Tap' ? (
              /* Segmented view for Tap mode */
              <div className="flex flex-col min-h-[238px] justify-between gap-3 animate-in fade-in duration-200">
                {/* Play Mode Selector */}
                <div className="flex bg-bg rounded-2xl p-1.5 border border-border/80 h-14 items-center relative overflow-hidden w-full shrink-0">
                  <div className="absolute inset-y-1.5 left-1.5 rounded-xl bg-accent shadow-lg shadow-accent/15 border border-white/5 transition-all duration-200 w-[calc(50%-6px)]" />
                  <button 
                    onClick={() => handlePlayModeChange('Tap')}
                    className="flex-grow flex-1 h-full z-10 flex items-center justify-center text-xs font-black uppercase tracking-wider transition-colors cursor-pointer text-[var(--bg)]"
                  >
                    Tap
                  </button>
                  <button 
                    onClick={() => handlePlayModeChange('Keyboard')}
                    className="flex-grow flex-1 h-full z-10 flex items-center justify-center text-xs font-black uppercase tracking-wider transition-colors cursor-pointer text-accent hover:opacity-80"
                  >
                    Keyboard
                  </button>
                </div>

                {/* Interactive Tap Mode Status Area */}
                <div className="bg-bg border border-border rounded-2xl p-4 flex flex-col justify-between h-[168px] shrink-0 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center text-[9px] font-black tracking-wider uppercase font-sans px-1">
                    <span className="text-text3">Interactive Tap Mode</span>
                    <span className="text-[var(--accent)] animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" /> Live Trigger
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center py-2 text-center">
                    <span className="text-2xl mb-1.5 animate-bounce">👆</span>
                    <p className="text-xs font-bold text-text leading-relaxed max-w-xs uppercase tracking-wide">
                      Tap the grids below to play notes and chords directly!
                    </p>
                    <p className="text-[10px] text-text3 mt-1 leading-normal uppercase tracking-wider">
                      Grids respond to dynamic mouse click and touch events
                    </p>
                  </div>
                  
                  <div className="text-[9px] font-mono font-bold text-center text-text3 leading-normal uppercase tracking-widest border-t border-border/50 pt-2">
                    Envelope parameters and base octaves remain active
                  </div>
                </div>
              </div>
            ) : (
              /* Segmented view for Keyboard mode */
              <div className="flex flex-col min-h-[238px] justify-between gap-3 animate-in fade-in duration-200">
                {/* Play Mode Selector */}
                <div className="flex bg-bg rounded-2xl p-1.5 border border-border/80 h-14 items-center relative overflow-hidden w-full shrink-0">
                  <div className="absolute inset-y-1.5 left-[50%] rounded-xl bg-accent shadow-lg shadow-accent/15 border border-white/5 transition-all duration-200 w-[calc(50%-6px)]" />
                  <button 
                    onClick={() => handlePlayModeChange('Tap')}
                    className="flex-grow flex-1 h-full z-10 flex items-center justify-center text-xs font-black uppercase tracking-wider transition-colors cursor-pointer text-accent hover:opacity-80"
                  >
                    Tap
                  </button>
                  <button 
                    onClick={() => handlePlayModeChange('Keyboard')}
                    className="flex-grow flex-1 h-full z-10 flex items-center justify-center text-xs font-black uppercase tracking-wider transition-colors cursor-pointer text-[var(--bg)]"
                  >
                    Keyboard
                  </button>
                </div>

                {/* Notes vs Chords Selector */}
                <div className="flex bg-bg rounded-2xl p-1.5 border border-border/80 h-14 items-center relative overflow-hidden w-full shrink-0">
                  <div className={`absolute inset-y-1.5 rounded-xl bg-accent2 shadow-lg shadow-accent2/15 border border-white/5 transition-all duration-200 ${numpadMode === 'Degrees' ? 'left-1.5 w-[calc(50%-6px)]' : 'left-[50%] w-[calc(50%-6px)]'}`} />
                  <button 
                    onClick={() => handleNumpadModeChange('Degrees')}
                    className={`flex-grow flex-1 h-full z-10 flex items-center justify-center text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ${
                      numpadMode === 'Degrees' 
                        ? 'text-[var(--bg)]' 
                        : 'text-accent hover:opacity-80'
                    }`}
                  >
                    Notes
                  </button>
                  <button 
                    onClick={() => handleNumpadModeChange('Chords')}
                    className={`flex-grow flex-1 h-full z-10 flex items-center justify-center text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ${
                      numpadMode === 'Chords' 
                        ? 'text-[var(--bg)]' 
                        : 'text-accent hover:opacity-80'
                    }`}
                  >
                    Chords
                  </button>
                </div>

                {/* QWERTY How to Guide Area */}
                <div className="bg-bg border border-border rounded-2xl p-3 flex flex-col justify-between h-[116px] shrink-0">
                  <div className="flex justify-between items-center text-[9px] font-black tracking-wider uppercase font-sans px-1">
                    <span className="text-text3">Main Keyboard Input</span>
                    <span className="text-[var(--accent)]">Focus & Play</span>
                  </div>
                  
                  <button
                    onClick={() => setShowKeyboardTutorial(true)}
                    className="w-full py-2 bg-bg/60 hover:bg-bg active:scale-[0.98] transition-all border-2 border-[var(--accent)]/30 hover:border-[var(--accent)]/80 rounded-xl text-xs font-black uppercase text-text2 hover:text-[var(--accent)] tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    Click to open How-To Guide <span className="text-[var(--accent)] text-[10px]">●</span>
                  </button>
                  
                  <div className="text-[9px] font-mono font-bold text-center text-text3 leading-normal uppercase tracking-widest">
                    Open tutorial guide and playable keys layout
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CARD 3: SOUND ENGINE - INSTRUMENT & BASE OCTAVE SETTINGS */}
          <div className="bg-bg3 p-4 rounded-xl border border-border min-h-[340px] flex flex-col justify-between min-w-0">
            <div>
              <h3 className="text-xs font-black text-accent uppercase tracking-widest">Sound Engine</h3>
              <p style={{ fontFamily: 'system-ui' }} className="text-[9px] text-accent tracking-widest uppercase mt-0.5">Instrument & Base Octave Settings</p>
            </div>

            <div className="space-y-3.5 flex-grow flex flex-col justify-around mt-2">
              {/* Base Pitch */}
              <div>
                <div className="flex justify-between items-center mb-1 px-0.5">
                  <span className="text-[10px] font-black uppercase text-text3 tracking-wider">Base Pitch</span>
                  <span className="text-[9px] font-mono text-text3 uppercase tracking-widest">Octave {octaveChords}</span>
                </div>
                <div className="flex bg-bg border border-border rounded-xl items-center h-12 p-1 relative">
                  <button
                    onClick={() => {
                      const next = Math.max(1, octaveChords - 1);
                      setOctaveChords(next);
                      setOctaveDegrees(next);
                    }}
                    className="w-10 h-full rounded-lg flex items-center justify-center text-text3 hover:text-[var(--accent)] hover:bg-bg2 transition-all text-base font-black cursor-pointer"
                  >
                    -
                  </button>
                  <span style={{ fontWeight: 'bold', fontFamily: 'system-ui' }} className="flex-1 text-center uppercase text-[10px] tracking-widest text-text2 select-none">
                    OCTAVE {octaveChords}
                  </span>
                  <button
                    onClick={() => {
                      const next = Math.min(8, octaveChords + 1);
                      setOctaveChords(next);
                      setOctaveDegrees(next);
                    }}
                    className="w-10 h-full rounded-lg flex items-center justify-center text-text3 hover:text-[var(--accent)] hover:bg-bg2 transition-all text-base font-black cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Sound Preset / Instrument */}
              <div>
                <div className="flex justify-between items-center mb-1 px-0.5">
                  <span className="text-[10px] font-black uppercase text-text3 tracking-wider">Sound Preset</span>
                  <span className="text-[9px] font-mono text-accent2 uppercase tracking-widest">
                    {instChords.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <select
                      value={INSTRUMENT_CATEGORIES.find(c => c.instruments.includes(instChords))?.name || INSTRUMENT_CATEGORIES[0].name}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        const insts = INSTRUMENT_CATEGORIES.find(c => c.name === newCat)?.instruments || [];
                        handleInstrumentChange(insts[0], 'chords');
                      }}
                      className="w-full bg-bg border border-border rounded-xl p-2 text-xs font-black text-[var(--accent)] hover:border-[var(--accent)] transition-colors uppercase appearance-none pr-8 cursor-pointer truncate"
                    >
                      {INSTRUMENT_CATEGORIES.map(c => <option key={c.name} value={c.name} className="bg-bg2 text-[var(--accent)] font-bold">{c.name}</option>)}
                    </select>
                    <div className="absolute right-3 top-[50%] -translate-y-[50%] pointer-events-none text-[var(--accent)]">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                  <div className="relative">
                    <select
                      value={instChords}
                      onChange={(e) => handleInstrumentChange(e.target.value, 'chords')}
                      className="w-full bg-bg border border-border rounded-xl p-2 text-xs font-black text-text hover:border-[var(--accent)] transition-colors uppercase appearance-none pr-8 cursor-pointer truncate"
                    >
                      {(INSTRUMENT_CATEGORIES.find(c => c.instruments.includes(instChords))?.instruments || INSTRUMENT_CATEGORIES[0].instruments).map(i => <option key={i} value={i} className="bg-bg2 text-text font-bold">{i}</option>)}
                    </select>
                    <div className="absolute right-3 top-[50%] -translate-y-[50%] pointer-events-none text-text3">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ADSR Controls */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-1 px-0.5">
                  <span className="text-[10px] font-black uppercase text-text3 tracking-wider">Envelope Controls</span>
                  <button onClick={() => setAdsr({ attack: 0.01, decay: 0.2, sustain: 0.4, release: 1.2 })} className="text-[9px] font-mono text-text3 hover:text-[var(--accent)] uppercase tracking-widest cursor-pointer">Reset</button>
                </div>
                <div className="grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-4 gap-2 bg-bg p-2 border border-border rounded-xl">
                  {[
                    { label: 'A', key: 'attack', min: 0.01, max: 2, step: 0.01 },
                    { label: 'D', key: 'decay', min: 0.01, max: 2, step: 0.01 },
                    { label: 'S', key: 'sustain', min: 0, max: 1, step: 0.01 },
                    { label: 'R', key: 'release', min: 0.1, max: 5, step: 0.1 }
                  ].map(param => (
                    <div key={param.key} className="flex flex-col items-center gap-1 group bg-bg2 p-1.5 rounded-lg border border-border text-center">
                      <span className="text-[8px] font-black text-text3 group-hover:text-[var(--accent)] transition-colors uppercase tracking-wider leading-none mb-0.5">{param.label}</span>
                      <span className="text-[8px] font-mono text-accent font-extrabold leading-none mb-1.5 select-none">{formatDawValue(param.key, (adsr as any)[param.key])}</span>
                      <input 
                        type="range" 
                        min={param.min} 
                        max={param.max} 
                        step={param.step}
                        value={(adsr as any)[param.key]}
                        onChange={(e) => setAdsr(prev => ({ ...prev, [param.key]: parseFloat(e.target.value) }))}
                        className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer accent-accent focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black text-accent uppercase tracking-normal flex items-center gap-2">
              Notes
            </h3>
          </div>
          <div className="flex justify-between gap-2 overflow-x-auto pb-2">
            {baseScaleNotes.map((note, i) => {
              const midi = note + (octaveDegrees * 12) + OCTAVE_OFFSET;
              const isActive = activeChord?.includes(midi);
              return (
                <button 
                  key={i} 
                  onClick={() => playSound([midi], instDegrees, 'degrees')} 
                  style={{
                    background: isActive 
                      ? 'var(--accent)' 
                      : 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 15%, var(--bg3)), var(--bg3))',
                    borderColor: isActive 
                      ? 'var(--accent)' 
                      : 'color-mix(in srgb, var(--accent) 30%, var(--border))'
                  }}
                  className={`flex-1 min-w-[56px] sm:min-w-[64px] aspect-[3/4] rounded-xl flex flex-col items-center justify-center py-3 border transition-all duration-200 transform hover:-translate-y-1 ${isActive ? 'shadow-[0_0_20px_var(--accent-glow)] scale-105' : 'hover:border-[var(--accent)] active:scale-95'}`}
                >
                  <span className={`text-lg font-black transition-colors ${isActive ? 'text-[var(--bg)]' : 'text-[var(--accent)]'}`}>
                    {getFullNoteName(midi)}
                  </span>
                  <span className={`text-[11px] font-mono mt-1 font-bold ${isActive ? 'text-[var(--bg)]/80' : 'text-text3'}`}>
                    {i + 1}
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 transition-all ${isActive ? 'bg-[var(--bg)] animate-ping scale-125' : 'bg-[var(--accent)]/30'}`} />
                </button>
              );
            })}
          </div>
        </section>

        {/* Chords Grid */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black text-accent2 uppercase tracking-normal flex items-center gap-2">
              Chords
            </h3>
          </div>
          <div className="grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-8 gap-2">
            {chordsInScale.map((chord, i) => {
              const midiChord = chord.map(n => n + (octaveChords * 12) + OCTAVE_OFFSET);
              const isActive = activeChord && activeChord.length === midiChord.length && activeChord.every((val, idx) => val === midiChord[idx]);
              const romans = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'VIII'];
              return (
                <button 
                  key={i} 
                  onClick={() => playSound(midiChord, instChords, 'chords')} 
                  style={{
                    background: isActive 
                      ? 'var(--accent2)' 
                      : 'linear-gradient(135deg, color-mix(in srgb, var(--accent2) 15%, var(--bg3)), var(--bg3))',
                    borderColor: isActive 
                      ? 'var(--accent2)' 
                      : 'color-mix(in srgb, var(--accent2) 30%, var(--border))'
                  }}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all duration-200 transform hover:-translate-y-1 ${isActive ? 'shadow-[0_0_20px_color-mix(in srgb,var(--accent2)_45%,transparent)] scale-105' : 'hover:border-[var(--accent2)] active:scale-95'}`}
                >
                  <span className={`text-lg font-black transition-colors ${isActive ? 'text-[var(--bg)]' : 'text-[var(--accent2)]'}`}>
                    {getFullNoteName(midiChord[0])}
                  </span>
                  <span className={`text-[11px] font-bold uppercase mt-1 ${isActive ? 'text-[var(--bg)]/80' : 'text-text3'}`}>
                    {romans[i] || 'I'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Pitch Analyzer Graph */}
        <section className="bg-bg3 p-6 rounded-2xl border border-border relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-normal text-text3">Live Frequency Analyzer</h3>
            <div className="flex flex-wrap gap-2 sm:gap-4 justify-end">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-[10px] text-text3 uppercase">Fundamental</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent2" />
                <span className="text-[10px] text-text3 uppercase">Harmonics Spectrum</span>
              </div>
            </div>
          </div>
          <div className="h-24 relative flex items-center">
            <div className="absolute inset-0 flex justify-between px-2 opacity-10">
              {Array.from({length: 37}).map((_, i) => (
                <div key={i} className={`h-full w-px ${i % 12 === 0 ? 'bg-white w-0.5' : 'bg-neutral-400'}`} />
              ))}
            </div>
            
            <div className="w-full h-px bg-border absolute top-1/2" />
            
            {activeChord && activeChord.map((note, idx) => (
              <div 
                key={idx}
                className={`absolute w-1 rounded-full transition-all duration-300 flex flex-col items-center ${
                  idx === 0 ? 'bg-accent h-16 shadow-[0_0_15px_var(--accent)]' : 'bg-accent2 h-10 shadow-[0_0_15px_var(--accent2)]'
                }`}
                style={{ 
                  left: `${((note - 48) / 48) * 100}%`,
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              >
                <div className="absolute bottom-full mb-2 flex flex-col items-center animate-in fade-in slide-in-from-bottom-1">
                  <span className="text-[10px] font-black text-text bg-bg3 px-1.5 py-0.5 rounded border border-border shadow-xl whitespace-nowrap flex flex-col items-center">
                    {getNoteName(note)}
                    <span className="text-[11px] text-text3 font-mono">
                      {Math.round(Tone.Frequency(note, 'midi').toFrequency())}Hz
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 px-1 text-[11px] font-mono text-text3">
            <span style={{ fontSize: '10px', fontWeight: 'normal' }}>C3 (fundamental)</span>
            <span style={{ lineHeight: '15.5px', fontSize: '10px' }}>C4 (receptors)</span>
            <span style={{ fontSize: '10px' }}>C5 (high)</span>
            <span style={{ fontSize: '10px' }}>C6</span>
            <span style={{ fontSize: '10px' }}>C7</span>
          </div>
        </section>

        <section className="flex flex-col bg-bg3/50 p-4 rounded-xl border border-border gap-4">
          <div className="flex flex-col justify-between gap-4 w-full">
            
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 w-full">
              <div className="flex flex-col shrink-0 w-full sm:w-auto text-center sm:text-left">
                <h4 className="text-[11px] font-black uppercase text-text2">Midi Sequence</h4>
                <p className="text-[11px] text-text3 italic">Continuous timeline rendering</p>
              </div>
              
              {/* Lyria Model Selector Slider */}
              <div className="flex flex-col gap-1 w-full flex-1 bg-bg/80 border border-border/60 py-2 px-3 rounded-xl min-w-[200px]">
                <span className="text-[10px] font-black uppercase text-text3 tracking-wider mb-1 text-center">Generation Model</span>
                <div className="relative w-full h-[26px] flex items-center bg-bg rounded-lg p-0.5 border border-border">
                  <div 
                    className="absolute h-5 bg-accent2/50 rounded-md transition-all duration-300 ease-in-out border border-accent2/50" 
                    style={{ 
                      width: '33.33%', 
                      left: aiModelId === 'lyria-3-clip-preview' ? '0%' : aiModelId === 'lyria-3-pro-preview' ? '33.33%' : '66.66%'
                    }} 
                  />
                  <button 
                    onClick={() => {
                      setAiModelId('lyria-3-clip-preview');
                      if (genBars > 16 || genBars < 2) setGenBars(4);
                    }}
                    className={`flex-1 z-10 text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${aiModelId === 'lyria-3-clip-preview' ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-text3 hover:text-[var(--accent2)]'}`}
                  >
                    Clip
                  </button>
                  <button 
                    onClick={() => {
                      setAiModelId('lyria-3-pro-preview');
                      if (genBars < 24) setGenBars(32);
                    }}
                    className={`flex-1 z-10 text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${aiModelId === 'lyria-3-pro-preview' ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-text3 hover:text-[var(--accent2)]'}`}
                  >
                    Song
                  </button>
                  <button 
                    onClick={() => setAiModelId('lyria-realtalk')}
                    className={`flex-1 z-10 text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer leading-tight py-0.5 ${aiModelId === 'lyria-realtalk' ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-text3 hover:text-[var(--accent2)]'}`}
                  >
                    Stream
                  </button>
                </div>
              </div>

              {/* Note Density Slider next to Midi Sequence */}
              <div className="flex flex-col gap-1 bg-bg/80 border border-border/60 py-2 px-4 rounded-xl flex-1 min-w-[200px] w-full">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black uppercase text-text3 tracking-wider">Note Density</span>
                  <span className="text-[11px] font-black uppercase text-accent font-mono">
                    {melodyDensity}
                  </span>
                </div>
                <div className="relative">
                  <input 
                    type="range" 
                    min="1" 
                    max="4" 
                    step="1"
                    value={noteDensity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNoteDensity(val);
                    }}
                    className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <div className="flex justify-between text-[9px] font-bold text-text3 mt-1 select-none">
                    <span>Sparse</span>
                    <span className="font-normal">Balanced</span>
                    <span className="font-normal">Detailed</span>
                    <span>Intricate</span>
                  </div>
                </div>
              </div>

              {/* Dropdown list for generation length in bars */}
              {aiModelId !== 'lyria-realtalk' && (
                <div className="flex flex-col gap-1 bg-bg/80 border border-border/60 py-2 px-4 rounded-xl w-full sm:w-32 shrink-0">
                  <span className="text-[10px] font-black uppercase text-text3 tracking-wider mb-1 text-center">Length</span>
                  <div className="relative w-full">
                    <select
                      value={genBars}
                      onChange={(e) => setGenBars(Number(e.target.value))}
                      style={{ fontSize: '11px' }}
                      className="w-full bg-bg border border-border rounded-lg pl-3 pr-8 py-[3px] mt-[1px] font-bold text-text hover:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
                    >
                      {aiModelId === 'lyria-3-clip-preview' ? (
                        <>
                          <option value={2}>2 Bars</option>
                          <option value={4}>4 Bars</option>
                          <option value={8}>8 Bars</option>
                          <option value={16}>16 Bars</option>
                        </>
                      ) : (
                        <>
                          <option value={24}>24 Bars</option>
                          <option value={32}>32 Bars</option>
                          <option value={48}>48 Bars</option>
                          <option value={64}>64 Bars</option>
                          <option value={72}>72 Bars</option>
                        </>
                      )}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 mt-[1px] pointer-events-none text-text3">
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
              <button
                onClick={() => handleGenerate('chords')}
                disabled={isGenerating}
                className={`flex-1 px-4 py-3 sm:py-2.5 h-[52px] rounded-lg border text-xs font-black uppercase tracking-wide transition-all ${
                  isGenerating
                    ? 'bg-bg3 border-border text-text3 cursor-not-allowed opacity-50'
                    : 'bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] hover:border-[var(--accent)] hover:scale-[1.02] cursor-pointer'
                }`}
              >
                {isGenerating ? 'Generating...' : '🛠️ Chords'}
              </button>

              <button
                onClick={() => handleGenerate('melody')}
                disabled={isGenerating}
                className={`flex-1 px-4 py-3 sm:py-2.5 h-[52px] rounded-lg border text-xs font-black uppercase tracking-wide transition-all ${
                  isGenerating 
                    ? 'bg-bg3 border-border text-text3 cursor-not-allowed opacity-50'
                    : 'bg-accent2/15 border-accent2/30 text-accent2 hover:bg-accent2 hover:text-white hover:border-accent2 hover:scale-[1.02] cursor-pointer'
                }`}
              >
                {isGenerating ? 'Generating...' : '✨ Melody'}
              </button>
            </div>
          </div>

          {/* API Generation Status Log Board */}
          {generationStatus.type !== 'idle' && (
            <div className={`mt-3 px-4 py-2 rounded-xl text-xs font-mono border flex items-center justify-between gap-3 transition-all duration-300 ${
              generationStatus.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : generationStatus.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : generationStatus.type === 'info' && generationStatus.message.includes('Calling')
                ? 'bg-accent/10 border-accent/30 text-accent animate-pulse'
                : 'bg-bg3 border-border text-text3'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-base select-none">
                  {generationStatus.type === 'success' ? '✅' : generationStatus.type === 'error' ? '⚠️' : '⚡'}
                </span>
                <span>{generationStatus.message}</span>
              </div>
              <button 
                onClick={() => setGenerationStatus({ type: 'idle', message: '' })}
                className="text-[10px] hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors uppercase font-bold"
              >
                Dismiss
              </button>
            </div>
          )}
        </section>

        {/* Piano Roll Grid & AI Progression draft */}
        <section className="space-y-4">

          <PianoRoll 
            numSteps={128} 
            isRecording={isRecording} 
            setIsRecording={stopRecording} 
            playSound={(notes, time) => {
              playSound(notes, instDegrees, 'degrees', time);
            }} 
            notes={pianoRollNotes} 
            scalePitchClasses={baseScaleNotes.map(n => n % 12)}
            setNotes={(notes) => { 
              setPianoRollUndoStack(prev => [...prev.slice(-9), pianoRollNotes]); 
              setPianoRollNotes(notes); 
              recordedNotesRef.current = notes; 
            }} 
            onUndo={handleUndo} 
            isPlaybackActiveRef={isPlaybackActiveRef} 
          />

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button 
              onClick={exportPianoRollMidi}
              className={`flex-1 py-3 border border-border rounded-xl text-xs font-black uppercase tracking-normal transition-all flex items-center justify-center gap-1.5 ${
                (!pianoRollNotes || pianoRollNotes.length === 0) 
                  ? 'bg-bg3 opacity-40 cursor-not-allowed' 
                  : 'bg-accent text-white hover:bg-opacity-80 shadow-lg shadow-accent/15 cursor-pointer'
              }`}
              disabled={!pianoRollNotes || pianoRollNotes.length === 0}
            >
              Export MIDI
            </button>

            <button 
              onClick={() => exportPianoRollAudio('mp3')}
              className={`flex-1 py-3 border border-border rounded-xl text-xs font-black uppercase tracking-normal transition-all flex items-center justify-center gap-1.5 ${
                (!pianoRollNotes || pianoRollNotes.length === 0) 
                  ? 'bg-bg3 opacity-40 cursor-not-allowed' 
                  : 'bg-accent2 text-white hover:bg-opacity-80 shadow-lg shadow-accent2/15 cursor-pointer'
              }`}
              disabled={!pianoRollNotes || pianoRollNotes.length === 0}
            >
              Export .mp3
            </button>

            <button 
              onClick={() => exportPianoRollAudio('wav')}
              className={`flex-1 py-3 border border-border rounded-xl text-xs font-black uppercase tracking-normal transition-all flex items-center justify-center gap-1.5 ${
                (!pianoRollNotes || pianoRollNotes.length === 0) 
                  ? 'bg-bg3 opacity-40 cursor-not-allowed' 
                  : 'bg-accent text-white hover:bg-opacity-80 shadow-lg shadow-accent/15 cursor-pointer'
              }`}
              disabled={!pianoRollNotes || pianoRollNotes.length === 0}
            >
              Export .wav
            </button>
          </div>
        </section>
      </div>

      {/* Keyboard Tutorial Modal */}
      {showKeyboardTutorial && (() => {
        const BOTTOM_ROW = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'];
        const MIDDLE_ROW = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"];
        const TOP_ROW    = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'];

        const getKeyDetails = (seqIdx: number, mode: 'Degrees' | 'Chords') => {
          const scaleIntervals = SCALES[scaleName as keyof typeof SCALES] || SCALES['Major'];
          const notesInScaleCount = scaleIntervals.length;
          if (notesInScaleCount === 0) return { noteName: '', degreeLabel: '' };
          
          const degree = seqIdx % notesInScaleCount;
          const octaveShift = Math.floor(seqIdx / notesInScaleCount);
          
          const romanNumerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'VIII'];
          const degreeLabel = romanNumerals[degree] || `${degree + 1}`;
          const octaveStr = octaveShift > 0 ? ` (+${octaveShift})` : '';
          
          if (mode === 'Chords') {
            const baseChord = chordsInScale[degree];
            if (!baseChord) return { noteName: '', degreeLabel: '' };
            const octaveFactor = octaveChords + octaveShift;
            const rootNote = baseChord[0] + (octaveFactor * 12) + OCTAVE_OFFSET;
            const noteName = getFullNoteName(rootNote);
            return { noteName, degreeLabel: `${degreeLabel}${octaveStr}` };
          } else {
            const midiPitch = continuousScale[seqIdx] + (octaveDegrees * 12) + OCTAVE_OFFSET;
            const noteName = getFullNoteName(midiPitch);
            return { noteName, degreeLabel: `${degreeLabel}${octaveStr}` };
          }
        };

        const handleKeyClick = (seqIdx: number) => {
          const scaleIntervals = SCALES[scaleName as keyof typeof SCALES] || SCALES['Major'];
          const notesInScaleCount = scaleIntervals.length;
          if (notesInScaleCount === 0) return;
          
          const degree = seqIdx % notesInScaleCount;
          const octaveShift = Math.floor(seqIdx / notesInScaleCount);
          
          if (numpadMode === 'Chords') {
            const baseChord = chordsInScale[degree];
            if (baseChord) {
              const octaveFactor = octaveChords + octaveShift;
              const chord = baseChord.map(n => n + (octaveFactor * 12) + OCTAVE_OFFSET);
              playSound(chord, instChords, 'chords');
            }
          } else {
            const midiPitch = continuousScale[seqIdx] + (octaveDegrees * 12) + OCTAVE_OFFSET;
            playSound([midiPitch], instDegrees, 'degrees');
          }
        };

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-bg2 border border-border rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 text-left">
              <button
                onClick={() => setShowKeyboardTutorial(false)}
                className="absolute top-5 right-5 text-text3 hover:text-text text-md font-bold w-8 h-8 flex items-center justify-center bg-bg3/60 rounded-full hover:bg-bg3 transition-colors cursor-pointer border border-border"
              >
                ✕
              </button>
              
              {/* Header */}
              <div className="flex gap-3 mb-6 items-start">
                <span className="text-xl leading-none">🎹</span>
                <div>
                  <h3 className="text-white text-[15px] font-black uppercase tracking-wider">Keyboard Mapping Tutorial</h3>
                  <p className="text-text3 text-xs mt-0.5">How standard QWERTY computer keys map to scale notes & chords</p>
                </div>
              </div>

              {/* Two Panel Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-bg3/60 rounded-2xl border border-border mb-5">
                {/* Left Column */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-[var(--accent2)] tracking-wider">Row Mapping Flow</h4>
                  <p className="text-text2 text-xs leading-relaxed">
                    Keys on your computer layout map left-to-right to sequential <span className="font-extrabold text-accent">{numpadMode === 'Chords' ? 'chords' : 'notes'}</span> starting from the octave base.
                  </p>
                </div>

                {/* Right Column */}
                <div className="space-y-3 md:border-l md:border-border md:pl-5">
                  <h4 className="text-[10px] font-black uppercase text-accent tracking-wider">Wrap Sequence Hierarchy</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold text-accent2 rounded border border-accent2/60 bg-bg3 font-mono">Z to /</span>
                        <span className="text-text2 font-extrabold">Bottom Row</span>
                      </div>
                      <span className="text-text3 font-mono text-[10px]">(Low octave range)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold text-teal-300 rounded border border-teal-800/60 bg-teal-950/40 font-mono">A to '</span>
                        <span className="text-text2 font-extrabold">Middle Row</span>
                      </div>
                      <span className="text-text3 font-mono text-[10px]">(Middle octave range)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold text-accent rounded border border-accent/60 bg-bg3 font-mono">Q to ]</span>
                        <span className="text-text2 font-extrabold">Top Row</span>
                      </div>
                      <span className="text-text3 font-mono text-[10px]">(High octave range)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Playback Mode Control + Floating prompt */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-bg3/80 border border-border rounded-xl p-3 mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-text3 tracking-wider">Playback Mode:</span>
                  <div className="flex bg-bg rounded border border-border p-0.5">
                    <button
                      onClick={() => handleNumpadModeChange('Degrees')}
                      className={`px-3 py-1 text-[9px] font-black rounded uppercase transition-colors cursor-pointer ${numpadMode === 'Degrees' ? 'bg-[var(--accent)] text-[var(--bg)]' : 'text-text3 hover:text-text'}`}
                    >
                      Notes
                    </button>
                    <button
                      onClick={() => handleNumpadModeChange('Chords')}
                      className={`px-3 py-1 text-[9px] font-black rounded uppercase transition-colors cursor-pointer ${numpadMode === 'Chords' ? 'bg-[var(--accent)] text-[var(--bg)]' : 'text-text3 hover:text-text'}`}
                    >
                      Chords
                    </button>
                  </div>
                </div>
                <div className="text-[9px] font-mono font-black uppercase tracking-wider text-text3 flex items-center gap-1">
                  <span>✨</span> TAP SCREEN SLOTS OR LAYOUT KEYS TO HEAR NOTES!
                </div>
              </div>

              {/* Visual Keyboard Wrapper */}
              <div className="border border-border rounded-2xl p-4 bg-bg shadow-inner flex flex-col gap-2 overflow-x-auto">
                
                {/* Row 3 (Q to ]) */}
                <div className="flex gap-1 sm:gap-1.5 justify-center w-full min-w-max sm:min-w-[500px]">
                  {TOP_ROW.map((keyChar, index) => {
                    const seqIdx = 21 + index;
                    const { noteName, degreeLabel } = getKeyDetails(seqIdx, numpadMode);
                    return (
                      <button
                        key={keyChar}
                        onClick={() => handleKeyClick(seqIdx)}
                        className="flex flex-col items-center justify-between border border-border bg-bg2 active:bg-bg3 hover:border-[var(--accent)] rounded-lg p-1 aspect-[3/4] flex-1 max-w-[48px] h-[52px] sm:h-[58px] transition-all cursor-pointer shadow-md"
                      >
                        <span className="text-[10px] sm:text-xs font-black text-text uppercase">{keyChar}</span>
                        <span className="text-[8px] sm:text-[10px] font-extrabold text-accent font-mono tracking-tight">{noteName}</span>
                        <span className="text-[7px] sm:text-[9px] font-medium text-text3 font-mono uppercase leading-none">{degreeLabel}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Row 2 (A to ') */}
                <div className="flex gap-1 sm:gap-1.5 justify-center w-full min-w-max sm:min-w-[500px] pr-2 pl-2 sm:pr-8 sm:pl-8">
                  {MIDDLE_ROW.map((keyChar, index) => {
                    const seqIdx = 10 + index;
                    const { noteName, degreeLabel } = getKeyDetails(seqIdx, numpadMode);
                    return (
                      <button
                        key={keyChar}
                        onClick={() => handleKeyClick(seqIdx)}
                        className="flex flex-col items-center justify-between border border-border bg-bg2 active:bg-bg3 hover:border-[var(--accent2)] rounded-lg p-1 aspect-[3/4] flex-1 max-w-[48px] h-[52px] sm:h-[58px] transition-all cursor-pointer shadow-md"
                      >
                        <span className="text-[10px] sm:text-xs font-black text-text uppercase">{keyChar}</span>
                        <span className="text-[8px] sm:text-[10px] font-extrabold text-teal-400 font-mono tracking-tight">{noteName}</span>
                        <span className="text-[7px] sm:text-[9px] font-medium text-text3 font-mono uppercase leading-none">{degreeLabel}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Row 1 (Z to /) */}
                <div className="flex gap-1 sm:gap-1.5 justify-center w-full min-w-max sm:min-w-[500px] pr-4 pl-4 sm:pr-16 sm:pl-16">
                  {BOTTOM_ROW.map((keyChar, index) => {
                    const seqIdx = index;
                    const { noteName, degreeLabel } = getKeyDetails(seqIdx, numpadMode);
                    return (
                      <button
                        key={keyChar}
                        onClick={() => handleKeyClick(seqIdx)}
                        className="flex flex-col items-center justify-between border border-border bg-bg2 active:bg-bg3 hover:border-[var(--accent2)] rounded-lg p-1 aspect-[3/4] flex-1 max-w-[48px] h-[52px] sm:h-[58px] transition-all cursor-pointer shadow-md"
                      >
                        <span className="text-[10px] sm:text-xs font-black text-text uppercase">{keyChar}</span>
                        <span className="text-[8px] sm:text-[10px] font-extrabold text-accent2 font-mono tracking-tight">{noteName}</span>
                        <span className="text-[7px] sm:text-[9px] font-medium text-text3 font-mono uppercase leading-none">{degreeLabel}</span>
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* Minimize Guide Footer Button */}
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setShowKeyboardTutorial(false)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[var(--accent)] hover:opacity-90 text-[var(--bg)] text-[10px] font-black uppercase rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  Minimize Guide
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
    </div>
  );
}
