// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioPlateReverbOptions {
  plateType: 'Medium Plate' | 'Thin Plate' | 'Thick Plate' | 'Custom Settings';
  decayTime: number;
  highFrequencyDamping: number;
  diffusion: number;
  wetDryMix: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioPlateReverb(buffer: AudioBuffer, options: AudioPlateReverbOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const decayTime = Math.max(0.5, Math.min(10.0, options.decayTime));
  const hfd = Math.max(0.1, Math.min(1.0, options.highFrequencyDamping));
  const diff = Math.max(0.1, Math.min(1.0, options.diffusion));
  const mix = Math.max(0.0, Math.min(1.0, options.wetDryMix));
  const fs = buffer.sampleRate;

  const preDelayMs = 20; 
  const Ndelay = Math.round((preDelayMs * fs) / 1000);
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, fs);

  const primeDelays = [149, 317, 521, 827];
  const totalD = primeDelays.reduce((a,b)=>a+b, 0);
  const gPlate = Math.pow(10, -(3 * (totalD/fs)) / decayTime);
  const alpha = 1.0 - hfd;
  const gDiff = diff * 0.618;

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);
    const L = inData.length;
    
    let preDelayBuf = new Float32Array(Ndelay);
    let pIdx = 0;
    
    let apBufs = primeDelays.map(d => new Float32Array(d));
    let apIdxs = primeDelays.map(() => 0);
    
    let yDamp = 0;
    let feedback = 0;

    for (let n = 0; n < L; n++) {
      let x = inData[n];
      if (Math.abs(x) < 1e-10) x = 0;
      
      let xDel = preDelayBuf[pIdx];
      preDelayBuf[pIdx] = x;
      pIdx = (pIdx + 1) % Ndelay;
      
      let apOut = xDel + feedback * gPlate;
      for (let i = 0; i < 4; i++) {
        let wOld = apBufs[i][apIdxs[i]];
        let wNew = apOut - gDiff * wOld;
        let yAp = gDiff * wNew + wOld;
        apBufs[i][apIdxs[i]] = wNew;
        apIdxs[i] = (apIdxs[i] + 1) % primeDelays[i];
        apOut = yAp;
      }
      
      yDamp = alpha * apOut + (1 - alpha) * yDamp;
      feedback = yDamp;
      
      let wet = yDamp;
      outData[n] = x * (1.0 - mix) + wet * mix;
    }
  }

  return outBuffer;
}
