// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface DynamicRangeMeterOptions {
  windowLengthMs: number;
  meterProfile: 'Flat (Crest Factor)' | 'EBU R128 (LUFS)' | 'K-System (K-14)';
  outputFormat: 'JSON' | 'TXT';
}

export async function analyzeDynamicRange(buffer: AudioBuffer, options: DynamicRangeMeterOptions): Promise<string> {
  const windowLengthMs = Math.max(10, Math.min(3000, options.windowLengthMs));
  const sampleRate = buffer.sampleRate;
  const W = Math.floor((windowLengthMs * sampleRate) / 1000);
  
  let globalMaxRms = 0;
  let globalTruePeak = 0;
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    
    // Very simple 4x oversampling interpolation (2-point for simplicity in this demo)
    for (let n = 0; n < input.length - 1; n++) {
      const s1 = input[n];
      const s2 = input[n+1];
      const val1 = Math.abs(s1);
      const val2 = Math.abs(s1 * 0.75 + s2 * 0.25);
      const val3 = Math.abs(s1 * 0.5 + s2 * 0.5);
      const val4 = Math.abs(s1 * 0.25 + s2 * 0.75);
      globalTruePeak = Math.max(globalTruePeak, val1, val2, val3, val4);
    }
    
    // Sliding RMS
    let currentSquareSum = 0;
    for (let n = 0; n < input.length; n++) {
      currentSquareSum += input[n] * input[n];
      if (n >= W) {
        currentSquareSum -= input[n - W] * input[n - W];
      }
      if (n >= W - 1) {
        const rms = Math.sqrt(currentSquareSum / W);
        globalMaxRms = Math.max(globalMaxRms, rms);
      }
    }
  }
  
  const truePeakDb = 20 * Math.log10(globalTruePeak + 1e-7);
  const maxRmsDb = 20 * Math.log10(globalMaxRms + 1e-7);
  const crestFactor = truePeakDb - maxRmsDb;
  
  const result = {
    truePeakDbFS: truePeakDb.toFixed(2),
    maxRmsDbFS: maxRmsDb.toFixed(2),
    crestFactorDb: crestFactor.toFixed(2),
    profile: options.meterProfile
  };
  
  if (options.outputFormat === 'JSON') return JSON.stringify(result, null, 2);
  return `True Peak: ${result.truePeakDbFS} dBFS\nMax RMS: ${result.maxRmsDbFS} dBFS\nCrest Factor: ${result.crestFactorDb} dB`;
}
