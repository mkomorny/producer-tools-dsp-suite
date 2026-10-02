// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioSpringReverbOptions {
  springType: 'Medium Spring' | 'Light Spring' | 'Heavy Spring' | 'Custom Settings' | number;
  springCount: number;
  resonance: number;
  decayTime: number;
  wetDryMix: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioSpringReverb(buffer: AudioBuffer, options: AudioSpringReverbOptions, audioCtx: BaseAudioContext): AudioBuffer {
  let springType = options.springType;
  if (typeof springType === 'number') {
    const types = ['Medium Spring', 'Light Spring', 'Heavy Spring', 'Custom Settings'] as const;
    springType = types[springType] || 'Medium Spring';
  }
  const springCount = Math.max(1, Math.min(4, Math.floor(options.springCount)));
  const resonance = Math.max(0.1, Math.min(1.0, options.resonance));
  const decayTime = Math.max(0.3, Math.min(5.0, options.decayTime));
  const wetDryMix = Math.max(0.0, Math.min(1.0, options.wetDryMix));

  const fs = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const outBuffer = audioCtx.createBuffer(numChannels, buffer.length, fs);

  // Band-pass filter for drive (approx 200Hz to 4kHz)
  const fLow = 200 / fs;
  const fHigh = 4000 / fs;
  const a1 = -2 * Math.cos(2 * Math.PI * (fLow + fHigh) / 2);
  const a2 = 0.95; 
  const b0 = 0.1;
  const b1 = 0;
  const b2 = -0.1;

  const basePrimeDelays = [347, 577, 769, 1021];
  const gSpring = Math.pow(10, -(3 * (600 / fs * 1000)) / (decayTime * 1000));
  const alphaSpring = (-1.0 * resonance) * 0.45;

  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);

    let w1 = 0, w2 = 0;
    
    const springBufs = Array.from({ length: springCount }, (_, i) => new Float32Array(basePrimeDelays[i]));
    const springIdxs = Array.from({ length: springCount }, () => 0);
    const allpassStates = Array.from({ length: springCount }, () => 0.0);
    const ykPrev = Array.from({ length: springCount }, () => 0.0);

    let feedbackAccum = 0;

    for (let n = 0; n < inData.length; n++) {
      let xIn = inData[n];
      if (Math.abs(xIn) < 1e-15) xIn = 0.0;

      let w0 = xIn - a1 * w1 - a2 * w2;
      let xDrive = b0 * w0 + b1 * w1 + b2 * w2;
      w2 = w1;
      w1 = w0;
      
      xDrive += feedbackAccum * gSpring;

      let yWetSum = 0;
      for (let s = 0; s < springCount; s++) {
        let xAp = springBufs[s][springIdxs[s]];
        let yk = alphaSpring * xAp + allpassStates[s] - alphaSpring * ykPrev[s];
        if (Math.abs(yk) < 1e-15) yk = 0.0;
        
        allpassStates[s] = xAp;
        ykPrev[s] = yk;
        
        yWetSum += yk;

        springBufs[s][springIdxs[s]] = xDrive;
        springIdxs[s] = (springIdxs[s] + 1) % basePrimeDelays[s];
      }

      feedbackAccum = yWetSum;
      const xWet = yWetSum * gSpring;

      let yOut = xIn * (1.0 - wetDryMix) + xWet * wetDryMix;
      outData[n] = Math.max(-1.0, Math.min(1.0, yOut));
    }
  }

  return outBuffer;
}
