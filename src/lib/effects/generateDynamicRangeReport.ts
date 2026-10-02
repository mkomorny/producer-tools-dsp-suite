// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface DynamicRangeReportOptions {
  analysisWindowMs: number;
  loudnessStandard: 'Crest Factor (Flat)' | 'EBU R128 (LUFS)' | 'K-System (K-14)';
  outputFormat: 'JSON' | 'TXT' | 'XML';
}

export async function generateDynamicRangeReport(buffer: AudioBuffer, options: DynamicRangeReportOptions): Promise<string> {
  const windowLengthMs = Math.max(50, Math.min(2000, options.analysisWindowMs));
  const sampleRate = buffer.sampleRate;
  const W = Math.floor((windowLengthMs * sampleRate) / 1000);
  
  let globalMaxRms = 0;
  let globalMinRms = Infinity;
  let sumRms = 0;
  let rmsCount = 0;
  let globalTruePeak = 0;
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    
    for (let n = 0; n < input.length - 1; n++) {
      const s1 = input[n];
      const s2 = input[n+1];
      const val1 = Math.abs(s1);
      const val2 = Math.abs(s1 * 0.75 + s2 * 0.25);
      const val3 = Math.abs(s1 * 0.5 + s2 * 0.5);
      const val4 = Math.abs(s1 * 0.25 + s2 * 0.75);
      globalTruePeak = Math.max(globalTruePeak, val1, val2, val3, val4);
    }
    
    let currentSquareSum = 0;
    for (let n = 0; n < input.length; n++) {
      currentSquareSum += input[n] * input[n];
      if (n >= W) {
        currentSquareSum -= input[n - W] * input[n - W];
      }
      if (n >= W - 1) {
        const rms = Math.sqrt(currentSquareSum / W);
        globalMaxRms = Math.max(globalMaxRms, rms);
        globalMinRms = Math.min(globalMinRms, rms);
        sumRms += rms;
        rmsCount++;
      }
    }
  }
  
  if (globalMinRms === Infinity) globalMinRms = 0;
  const avgRms = rmsCount > 0 ? sumRms / rmsCount : 0;
  
  const truePeakDb = 20 * Math.log10(globalTruePeak + 1e-7);
  const maxRmsDb = 20 * Math.log10(globalMaxRms + 1e-7);
  const minRmsDb = 20 * Math.log10(globalMinRms + 1e-7);
  const avgRmsDb = 20 * Math.log10(avgRms + 1e-7);
  const crestFactor = truePeakDb - maxRmsDb;
  
  const result = {
    truePeakDbFS: truePeakDb.toFixed(2),
    maxRmsDbFS: maxRmsDb.toFixed(2),
    minRmsDbFS: minRmsDb.toFixed(2),
    averageRmsDbFS: avgRmsDb.toFixed(2),
    crestFactorDb: crestFactor.toFixed(2),
    standard: options.loudnessStandard
  };
  
  if (options.outputFormat === 'JSON') {
    return JSON.stringify(result, null, 2);
  } else if (options.outputFormat === 'XML') {
    return `<DynamicRangeReport>\n  <TruePeak>${result.truePeakDbFS}</TruePeak>\n  <MaxRMS>${result.maxRmsDbFS}</MaxRMS>\n  <MinRMS>${result.minRmsDbFS}</MinRMS>\n  <AverageRMS>${result.averageRmsDbFS}</AverageRMS>\n  <CrestFactor>${result.crestFactorDb}</CrestFactor>\n  <Standard>${result.standard}</Standard>\n</DynamicRangeReport>`;
  } else {
    return `True Peak: ${result.truePeakDbFS} dBFS\nMax RMS: ${result.maxRmsDbFS} dBFS\nMin RMS: ${result.minRmsDbFS} dBFS\nAverage RMS: ${result.averageRmsDbFS} dBFS\nCrest Factor: ${result.crestFactorDb} dB\nStandard: ${result.standard}`;
  }
}
