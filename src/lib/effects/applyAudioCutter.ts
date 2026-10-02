// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioCutterOptions {
  startTime: string | number;
  endTime?: string | number | null;
  outputFormat: 'MP3' | 'WAV' | 'FLAC' | 'AAC' | 'OGG' | 'M4A';
}

function parseTime(time: string | number): number {
  if (typeof time === 'number') return Math.max(0, time);
  if (typeof time === 'string') {
    const parts = time.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return parseFloat(time) || 0;
  }
  return 0;
}

export function applyAudioCutter(buffer: AudioBuffer, options: AudioCutterOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const sourceDuration = buffer.duration;
  const startSec = Math.max(0, Math.min(sourceDuration, parseTime(options.startTime)));
  const endSec = options.endTime != null ? Math.max(startSec, Math.min(sourceDuration, parseTime(options.endTime))) : sourceDuration;
  
  const sampleRate = buffer.sampleRate;
  const n_start = Math.floor(startSec * sampleRate);
  let n_end = Math.floor(endSec * sampleRate);
  if (options.endTime == null) n_end = buffer.length - 1;
  
  const length_cut = Math.max(0, n_end - n_start + 1);
  if (length_cut <= 0) throw new Error("Invalid start/end time boundary selection");
  
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, length_cut, sampleRate);
  let R = Math.floor(0.01 * sampleRate);
  if (length_cut < 2 * R) R = Math.floor(length_cut / 2);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    for (let m = 0; m < length_cut; m++) {
      let val = input[n_start + m] || 0;
      
      if (m < R) {
        val *= (m / R);
      } else if (m >= length_cut - R) {
        val *= ((length_cut - 1 - m) / R);
      }
      
      output[m] = val;
    }
  }
  
  return outBuffer;
}
