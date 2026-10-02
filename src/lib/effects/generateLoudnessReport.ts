// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioLoudnessReportOptions {
  targetLoudness: number;
  lraWindowSeconds: number;
  outputFormat?: string;
}

export async function generateLoudnessReport(buffer: AudioBuffer, options: AudioLoudnessReportOptions): Promise<string> {
  const sampleRate = buffer.sampleRate;
  const BlockSamplesSize = Math.floor(0.400 * sampleRate);
  const hopSize = Math.floor(0.100 * sampleRate);
  const numChannels = buffer.numberOfChannels;
  
  const b0_1 = 1.0, b1_1 = -1.69065929318241, b2_1 = 0.71615812836224;
  const a1_1 = -1.69065929318241, a2_1 = 0.71615812836224;
  
  const b0_2 = 1.0, b1_2 = -2.0, b2_2 = 1.0;
  const a1_2 = -1.99004745483398, a2_2 = 0.99007225036621;
  
  const kWeighted = [];
  for (let c = 0; c < numChannels; c++) {
    kWeighted.push(new Float32Array(buffer.length));
    let w1_1 = 0, w1_2 = 0;
    let w2_1 = 0, w2_2 = 0;
    const input = buffer.getChannelData(c);
    const out = kWeighted[c];
    for (let n = 0; n < buffer.length; n++) {
      const x = input[n];
      const w_1 = x - a1_1 * w1_1 - a2_1 * w1_2;
      const y_1 = b0_1 * w_1 + b1_1 * w1_1 + b2_1 * w1_2;
      w1_2 = w1_1; w1_1 = w_1;
      const w_2 = y_1 - a1_2 * w2_1 - a2_2 * w2_2;
      const y_2 = b0_2 * w_2 + b1_2 * w2_1 + b2_2 * w2_2;
      w2_2 = w2_1; w2_1 = w_2;
      out[n] = y_2;
    }
  }
  
  let totalBlocks = Math.floor((buffer.length - BlockSamplesSize) / hopSize) + 1;
  if (totalBlocks <= 0) totalBlocks = 0;
  const blockEnergies = new Float32Array(totalBlocks);
  const shortTermLoudness = [];
  
  for (let m = 0; m < totalBlocks; m++) {
    let energy = 0;
    const startSample = m * hopSize;
    for (let c = 0; c < numChannels; c++) {
      let sum = 0;
      for (let n = 0; n < BlockSamplesSize; n++) {
        sum += kWeighted[c][startSample + n] * kWeighted[c][startSample + n];
      }
      energy += sum / BlockSamplesSize;
    }
    blockEnergies[m] = energy;
    if (energy > 0) {
      shortTermLoudness.push(-0.691 + 10 * Math.log10(energy));
    }
  }
  
  let currentI = -70;
  let countAboveAbsolute = 0;
  let sumAboveAbsolute = 0;
  
  for (let m = 0; m < totalBlocks; m++) {
    const e = blockEnergies[m];
    if (e > 0) {
      const LUFS = -0.691 + 10 * Math.log10(e);
      if (LUFS > -70.0) {
        sumAboveAbsolute += e;
        countAboveAbsolute++;
      }
    }
  }
  
  if (countAboveAbsolute > 0) {
    const L_base = -0.691 + 10 * Math.log10(sumAboveAbsolute / countAboveAbsolute);
    const relativeThresholdLUFS = L_base - 10.0;
    
    let sumAboveRelative = 0;
    let countAboveRelative = 0;
    for (let m = 0; m < totalBlocks; m++) {
      const e = blockEnergies[m];
      if (e > 0) {
        const LUFS = -0.691 + 10 * Math.log10(e);
        if (LUFS > relativeThresholdLUFS && LUFS > -70.0) {
          sumAboveRelative += e;
          countAboveRelative++;
        }
      }
    }
    if (countAboveRelative > 0) {
      currentI = -0.691 + 10 * Math.log10(sumAboveRelative / countAboveRelative);
    }
  }
  
  let LRA = 0;
  const shortTerm3s = [];
  const Block3sSize = Math.floor(3.0 * sampleRate);
  const hop3sSize = Math.floor(1.0 * sampleRate);
  let total3sBlocks = Math.floor((buffer.length - Block3sSize) / hop3sSize) + 1;
  for (let m = 0; m < total3sBlocks; m++) {
    let energy = 0;
    const startSample = m * hop3sSize;
    for (let c = 0; c < numChannels; c++) {
      let sum = 0;
      for (let n = 0; n < Block3sSize; n++) {
        sum += kWeighted[c][startSample + n] * kWeighted[c][startSample + n];
      }
      energy += sum / Block3sSize;
    }
    if (energy > 0) {
      shortTerm3s.push(-0.691 + 10 * Math.log10(energy));
    }
  }
  
  if (shortTerm3s.length > 0) {
    const LRA_abs_thresh = -70.0;
    let LRA_sum = 0;
    let LRA_count = 0;
    for (let i = 0; i < shortTerm3s.length; i++) {
      if (shortTerm3s[i] > LRA_abs_thresh) {
        LRA_sum += Math.pow(10, (shortTerm3s[i] + 0.691)/10);
        LRA_count++;
      }
    }
    if (LRA_count > 0) {
      const LRA_rel_thresh = -0.691 + 10 * Math.log10(LRA_sum/LRA_count) - 20.0;
      const validLRA = shortTerm3s.filter(l => l > LRA_rel_thresh && l > LRA_abs_thresh);
      if (validLRA.length > 0) {
        validLRA.sort((a,b) => a-b);
        const p10 = validLRA[Math.floor(validLRA.length * 0.1)];
        const p95 = validLRA[Math.floor(validLRA.length * 0.95)];
        LRA = p95 - p10;
      }
    }
  }
  
  let peak = 0;
  for (let c = 0; c < numChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) > peak) peak = Math.abs(data[i]);
    }
  }
  const truePeakDb = 20 * Math.log10(peak + 1e-7);
  
  const report = {
    integratedLoudnessLUFS: currentI.toFixed(2),
    loudnessRangeLU: LRA.toFixed(2),
    truePeakdBTP: truePeakDb.toFixed(2),
    compliant: currentI >= options.targetLoudness - 0.5 && currentI <= options.targetLoudness + 0.5
  };
  
  if (options.outputFormat === 'TXT') {
    return `Loudness Report\n----------------\nIntegrated Loudness: ${report.integratedLoudnessLUFS} LUFS\nLoudness Range: ${report.loudnessRangeLU} LU\nTrue Peak: ${report.truePeakdBTP} dBTP\nCompliant with ${options.targetLoudness} LUFS target: ${report.compliant}`;
  }
  
  return JSON.stringify(report, null, 2);
}
