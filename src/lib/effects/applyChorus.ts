// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface ChorusVoiceOptions {
  inGain: number;
  outGain: number;
  delay: number;
  decay: number;
  speed: number;
  depth: number;
}

export interface ChorusOptions {
  voices: ChorusVoiceOptions[];
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyChorus(buffer: AudioBuffer, options: ChorusOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const numVoices = Math.min(8, options.voices.length);
  const voices = options.voices.slice(0, numVoices).map(v => ({
    inGain: Math.max(0.0, Math.min(1.0, v.inGain)),
    outGain: Math.max(0.0, Math.min(1.0, v.outGain)),
    delay: Math.max(10.0, Math.min(100.0, v.delay)),
    decay: Math.max(0.0, Math.min(0.95, v.decay)),
    speed: Math.max(0.1, Math.min(5.0, v.speed)),
    depth: Math.max(0.0, Math.min(10.0, v.depth)),
    phase: Math.random() * 2 * Math.PI
  }));

  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  const maxDelayMs = 120; // safe buffer size
  const bufLen = Math.ceil((maxDelayMs / 1000) * sampleRate);

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    const ringBuf = new Float32Array(bufLen);
    let head = 0;

    // Reset voice phases per channel to keep stereo image somewhat consistent, though chorus naturally widens it
    voices.forEach(v => v.phase = 0);

    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      ringBuf[head] = x_in;

      let sum = x_in; // Assuming dry mix is 1.0

      for (let m = 0; m < voices.length; m++) {
        const v = voices[m];
        v.phase = (v.phase + (2 * Math.PI * v.speed) / sampleRate) % (2 * Math.PI);
        const x_lfo = Math.sin(v.phase);
        const tau = v.delay + v.depth * x_lfo;
        const M = (tau * sampleRate) / 1000;
        
        const I_m = Math.floor(M);
        const frac = M - I_m;
        
        const readIdx1 = (head - I_m + bufLen) % bufLen;
        const readIdx2 = (head - I_m - 1 + bufLen) % bufLen;
        
        const y_m = (1 - frac) * ringBuf[readIdx1] + frac * ringBuf[readIdx2];
        
        // Note: basic chorus, not feeding back into ringbuf in this simple implementation
        sum += v.outGain * y_m;
      }
      
      output[n] = Math.max(-1.0, Math.min(1.0, sum)); // strict clipping prevention
      head = (head + 1) % bufLen;
    }
  }

  return outBuffer;
}
