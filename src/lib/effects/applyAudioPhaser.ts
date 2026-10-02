// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioPhaserOptions {
  inGain: number;
  outGain: number;
  delayMs: number;
  decay: number;
  speedHz: number;
  type: 'Sine' | 'Triangle';
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioPhaser(buffer: AudioBuffer, options: AudioPhaserOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const inGain = Math.max(0.0, Math.min(1.0, options.inGain));
  const outGain = Math.max(0.0, Math.min(2.0, options.outGain));
  const delayMs = Math.max(1.0, Math.min(10.0, options.delayMs));
  const decay = Math.max(0.0, Math.min(0.95, options.decay));
  const speedHz = Math.max(0.05, Math.min(10.0, options.speedHz));
  
  const fs = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const outBuffer = audioCtx.createBuffer(numChannels, buffer.length, fs);

  const deltaTheta = (2 * Math.PI * speedHz) / fs;
  const fBase = 1000 / delayMs;

  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);
    
    let theta = 0;
    let apX = [0, 0, 0, 0];
    let apY = [0, 0, 0, 0];
    let feedback = 0;
    
    for (let n = 0; n < inData.length; n++) {
      let xIn = inData[n];
      
      theta = (theta + deltaTheta) % (2 * Math.PI);
      let Alfo = 0;
      if (options.type === 'Sine') {
        Alfo = 0.5 * (1.0 + Math.sin(theta));
      } else {
        Alfo = (2 / Math.PI) * Math.abs(((theta + Math.PI/2) % (2*Math.PI)) - Math.PI);
      }
      
      let fc = fBase * Math.pow(2, Alfo * 2);
      fc = Math.min(fc, (fs / 2) * 0.85);
      
      let w0 = (2 * Math.PI * fc) / fs;
      let alpha = (Math.tan(w0/2) - 1) / (Math.tan(w0/2) + 1);
      
      let apIn = (xIn * inGain) + (feedback * decay);
      let currentSignal = apIn;
      
      for (let stage = 0; stage < 4; stage++) {
        let xNew = currentSignal;
        let yNew = alpha * xNew + apX[stage] - alpha * apY[stage];
        apX[stage] = xNew;
        apY[stage] = yNew;
        currentSignal = yNew;
      }
      
      feedback = currentSignal;
      outData[n] = (xIn * inGain + currentSignal) * outGain;
    }
  }

  return outBuffer;
}
