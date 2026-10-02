// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioRmsNormalizeOptions {
  targetRmsDb: number;
  maxGainDb: number;
  gatingThresholdDb: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioRmsNormalize(buffer: AudioBuffer, options: AudioRmsNormalizeOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const targetRmsDb = Math.max(-32.0, Math.min(-10.0, options.targetRmsDb));
  const maxGainDb = Math.max(0.0, Math.min(30.0, options.maxGainDb));
  const gatingThresholdDb = Math.max(-80.0, Math.min(-30.0, options.gatingThresholdDb));

  const fs = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const outBuffer = audioCtx.createBuffer(numChannels, buffer.length, fs);

  const blockSamples = Math.floor(0.05 * fs);
  const totalBlocks = Math.floor(buffer.length / blockSamples);

  let energySum = 0;
  let activeBlockCount = 0;

  for (let m = 0; m < totalBlocks; m++) {
    let sumSq = 0;
    for (let c = 0; c < numChannels; c++) {
      const inData = buffer.getChannelData(c);
      for (let n = 0; n < blockSamples; n++) {
        const val = inData[m * blockSamples + n];
        sumSq += val * val;
      }
    }

    const frameRms = Math.sqrt(sumSq / (blockSamples * numChannels));
    const frameDb = 20 * Math.log10(Math.max(1e-5, frameRms));

    if (frameDb > gatingThresholdDb) {
      energySum += frameRms * frameRms;
      activeBlockCount++;
    }
  }

  let Xglobal = 0;
  if (activeBlockCount > 0) {
    Xglobal = Math.sqrt(energySum / activeBlockCount);
  } else {
    let sumSqAll = 0;
    for (let c = 0; c < numChannels; c++) {
      const inData = buffer.getChannelData(c);
      for (let n = 0; n < inData.length; n++) {
        sumSqAll += inData[n] * inData[n];
      }
    }
    Xglobal = Math.sqrt(sumSqAll / (buffer.length * numChannels));
  }

  const Atarget = Math.pow(10, targetRmsDb / 20);
  const Graw = Xglobal > 1e-5 ? Atarget / Xglobal : 1.0;
  const Gfinal = Math.min(Graw, Math.pow(10, maxGainDb / 20));

  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);

    for (let n = 0; n < inData.length; n++) {
      outData[n] = Math.max(-1.0, Math.min(1.0, inData[n] * Gfinal));
    }
  }

  return outBuffer;
}
