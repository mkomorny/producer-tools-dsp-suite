// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

// ==========================================
// ADDITIONAL DSP EFFECTS PART 3 (Vocal Reducer, Mid/Side, WahWah, Waveform Gen)
// ==========================================

export interface KaraokeVocalReducerOptions {
  vocalRemovalStrength: number;
  highPassCutoff: number;
  lowPassCutoff: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyKaraokeVocalReducer(buffer: AudioBuffer, options: KaraokeVocalReducerOptions, ctx: BaseAudioContext): AudioBuffer {
  const S = Math.max(0.0, Math.min(1.5, options.vocalRemovalStrength));
  const f_hp = Math.max(0, Math.min(2000, options.highPassCutoff));
  const f_lp = Math.max(2000, Math.min(20000, options.lowPassCutoff));
  const fs = buffer.sampleRate;
  
  if (buffer.numberOfChannels < 2) {
      throw new Error("Stereo audio required for phase cancellation");
  }

  const outBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, fs);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const outL = outBuffer.getChannelData(0);
  const outR = outBuffer.getChannelData(1);

  // High Pass Coeffs
  const w0_hp = (2 * Math.PI * f_hp) / fs;
  const alpha_hp = Math.sin(w0_hp) / (2 * 0.707);
  const a0_hp = 1 + alpha_hp;
  const a1_hp = -2 * Math.cos(w0_hp) / a0_hp;
  const a2_hp = (1 - alpha_hp) / a0_hp;
  const b1_hp = -(1 + Math.cos(w0_hp)) / a0_hp;
  const b0_hp = (1 + Math.cos(w0_hp)) / 2 / a0_hp;
  const b2_hp = b0_hp;

  // Low Pass Coeffs
  const w0_lp = (2 * Math.PI * f_lp) / fs;
  const alpha_lp = Math.sin(w0_lp) / (2 * 0.707);
  const a0_lp = 1 + alpha_lp;
  const a1_lp = -2 * Math.cos(w0_lp) / a0_lp;
  const a2_lp = (1 - alpha_lp) / a0_lp;
  const b1_lp = (1 - Math.cos(w0_lp)) / a0_lp;
  const b0_lp = b1_lp / 2;
  const b2_lp = b0_lp;

  let x1_hp_L = 0, x2_hp_L = 0, y1_hp_L = 0, y2_hp_L = 0;
  let x1_lp_L = 0, x2_lp_L = 0, y1_lp_L = 0, y2_lp_L = 0;
  
  let x1_hp_R = 0, x2_hp_R = 0, y1_hp_R = 0, y2_hp_R = 0;
  let x1_lp_R = 0, x2_lp_R = 0, y1_lp_R = 0, y2_lp_R = 0;

  for (let i = 0; i < buffer.length; i++) {
      const diff = left[i] - right[i];
      const wetL = left[i] - S * ((right[i] + diff) / 2);
      const wetR = right[i] - S * ((left[i] - diff) / 2);
      
      // HP L
      let hpL = b0_hp * wetL + b1_hp * x1_hp_L + b2_hp * x2_hp_L - a1_hp * y1_hp_L - a2_hp * y2_hp_L;
      x2_hp_L = x1_hp_L; x1_hp_L = wetL;
      y2_hp_L = y1_hp_L; y1_hp_L = hpL;
      
      // LP L
      let lpL = b0_lp * hpL + b1_lp * x1_lp_L + b2_lp * x2_lp_L - a1_lp * y1_lp_L - a2_lp * y2_lp_L;
      x2_lp_L = x1_lp_L; x1_lp_L = hpL;
      y2_lp_L = y1_lp_L; y1_lp_L = lpL;
      
      outL[i] = Math.max(-1.0, Math.min(1.0, lpL));

      // HP R
      let hpR = b0_hp * wetR + b1_hp * x1_hp_R + b2_hp * x2_hp_R - a1_hp * y1_hp_R - a2_hp * y2_hp_R;
      x2_hp_R = x1_hp_R; x1_hp_R = wetR;
      y2_hp_R = y1_hp_R; y1_hp_R = hpR;
      
      // LP R
      let lpR = b0_lp * hpR + b1_lp * x1_lp_R + b2_lp * x2_lp_R - a1_lp * y1_lp_R - a2_lp * y2_lp_R;
      x2_lp_R = x1_lp_R; x1_lp_R = hpR;
      y2_lp_R = y1_lp_R; y1_lp_R = lpR;
      
      outR[i] = Math.max(-1.0, Math.min(1.0, lpR));
  }

  return outBuffer;
}
