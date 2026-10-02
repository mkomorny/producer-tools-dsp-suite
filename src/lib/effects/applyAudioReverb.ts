// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioReverbOptions {
  reverbPreset: 'Medium Room' | 'Small Room' | 'Large Room' | 'Concert Hall' | 'Custom Settings';
  roomSize: number;
  damping: number;
  reverbLevel: number;
  preDelayMs: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioReverb(buffer: AudioBuffer, options: AudioReverbOptions, audioCtx: BaseAudioContext): AudioBuffer {
  let roomSize = options.roomSize;
  let damping = options.damping;
  let reverbLevel = options.reverbLevel;
  let preDelayMs = options.preDelayMs;
  
  if (options.reverbPreset === 'Small Room') { roomSize = 0.2; damping = 0.2; reverbLevel = 0.2; preDelayMs = 20; }
  else if (options.reverbPreset === 'Medium Room') { roomSize = 0.5; damping = 0.5; reverbLevel = 0.3; preDelayMs = 50; }
  else if (options.reverbPreset === 'Large Room') { roomSize = 0.8; damping = 0.7; reverbLevel = 0.5; preDelayMs = 100; }
  else if (options.reverbPreset === 'Concert Hall') { roomSize = 0.95; damping = 0.8; reverbLevel = 0.6; preDelayMs = 150; }
  
  roomSize = Math.max(0.1, Math.min(1.0, roomSize));
  damping = Math.max(0.1, Math.min(1.0, damping));
  reverbLevel = Math.max(0.0, Math.min(1.0, reverbLevel));
  preDelayMs = Math.max(0.0, Math.min(250.0, preDelayMs));

  const fs = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const outBuffer = audioCtx.createBuffer(numChannels, buffer.length, fs);

  const Ndelay = Math.ceil((preDelayMs * fs) / 1000);
  const primeDelays = [1103, 1249, 1423, 1601];
  const gFeedback = roomSize * 0.82;
  const alpha = 1.0 - damping;

  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);
    
    let preDelayBuf = new Float32Array(Math.max(1, Ndelay));
    let pIdx = 0;
    
    let combBufs = primeDelays.map(d => new Float32Array(d));
    let combIdxs = primeDelays.map(() => 0);
    
    let yDamped = 0;
    
    for (let n = 0; n < inData.length; n++) {
      let xIn = inData[n];
      if (Math.abs(xIn) < 1e-10) { xIn = 0; }
      
      let xDelayed = xIn;
      if (Ndelay > 0) {
        xDelayed = preDelayBuf[pIdx];
        preDelayBuf[pIdx] = xIn;
        pIdx = (pIdx + 1) % Ndelay;
      }
      
      let outSum = 0;
      for (let i = 0; i < 4; i++) {
        let yi = combBufs[i][combIdxs[i]];
        let wNew = xDelayed + gFeedback * yi;
        combBufs[i][combIdxs[i]] = wNew;
        combIdxs[i] = (combIdxs[i] + 1) % primeDelays[i];
        outSum += yi;
      }
      
      yDamped = alpha * (outSum * 0.25) + (1 - alpha) * yDamped;
      
      outData[n] = xIn * (1.0 - reverbLevel) + yDamped * reverbLevel;
    }
  }

  return outBuffer;
}
