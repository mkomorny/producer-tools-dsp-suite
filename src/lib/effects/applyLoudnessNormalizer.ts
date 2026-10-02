// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioLoudnessNormalizeOptions {
  targetI: number;
  targetTP: number;
  targetLRA: number;
  outputFormat?: string;
}

export function applyLoudnessNormalizer(buffer: AudioBuffer, options: AudioLoudnessNormalizeOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const targetI = Math.max(-32.0, Math.min(-9.0, options.targetI));
  const targetTP = Math.max(-5.0, Math.min(0.0, options.targetTP));
  const sampleRate = buffer.sampleRate;
  
  const BlockSamplesSize = Math.floor(0.400 * sampleRate);
  const hopSize = Math.floor(0.100 * sampleRate); // 75% overlap
  
  // High-Shelving Filter (Stage 1)
  const b0_1 = 1.0, b1_1 = -1.69065929318241, b2_1 = 0.71615812836224;
  const a1_1 = -1.69065929318241, a2_1 = 0.71615812836224;
  
  // High-Pass Filter (Stage 2)
  const b0_2 = 1.0, b1_2 = -2.0, b2_2 = 1.0;
  const a1_2 = -1.99004745483398, a2_2 = 0.99007225036621;
  
  const numChannels = buffer.numberOfChannels;
  const channelData = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }
  
  let totalBlocks = Math.floor((buffer.length - BlockSamplesSize) / hopSize) + 1;
  if (totalBlocks <= 0) totalBlocks = 0;
  
  const blockEnergies = new Float32Array(totalBlocks);
  
  const kWeighted = [];
  for (let c = 0; c < numChannels; c++) {
    kWeighted.push(new Float32Array(buffer.length));
  }
  
  for (let c = 0; c < numChannels; c++) {
    let w1_1 = 0, w1_2 = 0;
    let w2_1 = 0, w2_2 = 0;
    const input = channelData[c];
    const out = kWeighted[c];
    
    for (let n = 0; n < buffer.length; n++) {
      const x = input[n];
      // Stage 1
      const w_1 = x - a1_1 * w1_1 - a2_1 * w1_2;
      const y_1 = b0_1 * w_1 + b1_1 * w1_1 + b2_1 * w1_2;
      w1_2 = w1_1;
      w1_1 = w_1;
      
      // Stage 2
      const w_2 = y_1 - a1_2 * w2_1 - a2_2 * w2_2;
      const y_2 = b0_2 * w_2 + b1_2 * w2_1 + b2_2 * w2_2;
      w2_2 = w2_1;
      w2_1 = w_2;
      
      out[n] = y_2;
    }
  }
  
  for (let m = 0; m < totalBlocks; m++) {
    let energy = 0;
    const startSample = m * hopSize;
    for (let c = 0; c < numChannels; c++) {
      let sum = 0;
      for (let n = 0; n < BlockSamplesSize; n++) {
        const val = kWeighted[c][startSample + n];
        sum += val * val;
      }
      energy += sum / BlockSamplesSize;
    }
    blockEnergies[m] = energy;
  }
  
  let sumAboveAbsolute = 0;
  let countAboveAbsolute = 0;
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
  
  let currentI = -70;
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
  
  const deltaL = targetI - currentI;
  const G_linear = Math.pow(10, deltaL / 20);
  const tpLinearCeiling = Math.pow(10, targetTP / 20);
  
  const newBuffer = audioCtx.createBuffer(numChannels, buffer.length, sampleRate);
  
  for (let c = 0; c < numChannels; c++) {
    const input = channelData[c];
    const out = newBuffer.getChannelData(c);
    
    for (let n = 0; n < buffer.length; n++) {
      let val = input[n] * G_linear;
      if (Math.abs(val) > tpLinearCeiling) {
        val = tpLinearCeiling * Math.sign(val);
      }
      out[n] = val;
    }
  }
  
  return newBuffer;
}
