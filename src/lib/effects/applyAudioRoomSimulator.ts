// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

// ==========================================
// DSP ENHANCED OFFLINE AUDIO PROCESSING FX
// ==========================================

export interface AudioRoomSimulatorOptions {
  roomPreset: 'Closet (1-2m)' | 'Bedroom (3-4m)' | 'Living Room (5-6m)' | 'Concert Hall (10m+)' | 'Custom Settings' | number;
  roomSize: number;
  reverbDecay: number;
  hfDamping: number;
  earlyReflections: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioRoomSimulator(buffer: AudioBuffer, options: AudioRoomSimulatorOptions, audioCtx: BaseAudioContext): AudioBuffer {
  let roomPreset = options.roomPreset;
  let roomSize = options.roomSize;
  let reverbDecay = options.reverbDecay;
  let hfDamping = options.hfDamping;
  let earlyReflections = options.earlyReflections;

  if (roomPreset === 'Closet (1-2m)' || roomPreset === 0) {
    roomSize = 0.15; reverbDecay = 0.4; hfDamping = 0.8; earlyReflections = 0.6;
  } else if (roomPreset === 'Bedroom (3-4m)' || roomPreset === 1) {
    roomSize = 0.35; reverbDecay = 0.8; hfDamping = 0.6; earlyReflections = 0.5;
  } else if (roomPreset === 'Living Room (5-6m)' || roomPreset === 2) {
    roomSize = 0.55; reverbDecay = 1.5; hfDamping = 0.4; earlyReflections = 0.4;
  } else if (roomPreset === 'Concert Hall (10m+)' || roomPreset === 3) {
    roomSize = 0.95; reverbDecay = 4.5; hfDamping = 0.25; earlyReflections = 0.3;
  }

  roomSize = Math.max(0.1, Math.min(1.0, roomSize));
  reverbDecay = Math.max(0.1, Math.min(10.0, reverbDecay));
  hfDamping = Math.max(0.1, Math.min(1.0, hfDamping));
  earlyReflections = Math.max(0.0, Math.min(1.0, earlyReflections));

  const fs = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const outBuffer = audioCtx.createBuffer(numChannels, buffer.length, fs);

  const baseTapsMs = [15.3, 22.1, 35.7, 44.9];
  const tapGains = [0.7, 0.5, 0.35, 0.25];
  const activeTaps = baseTapsMs.map(ms => Math.max(1, Math.floor(ms * 0.001 * roomSize * fs)));

  const primeDelays = [1103, 1249, 1423, 1601];
  const gFeedbacks = primeDelays.map(delaySamples => {
    const delayMs = (delaySamples / fs) * 1000;
    return Math.pow(10, -(3 * delayMs) / (reverbDecay * 1000));
  });

  const alpha = 1.0 - hfDamping;

  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);

    const maxTapSamples = Math.max(...activeTaps);
    const earlyBuf = new Float32Array(maxTapSamples);
    let earlyIdx = 0;

    const fdnBufs = primeDelays.map(d => new Float32Array(d));
    const fdnIdxs = primeDelays.map(() => 0);
    const fdnFilterStates = new Float32Array(4);

    for (let n = 0; n < inData.length; n++) {
      let xIn = inData[n];
      if (Math.abs(xIn) < 1e-15) xIn = 0.0;

      earlyBuf[earlyIdx] = xIn;
      let yEarly = 0;
      for (let t = 0; t < activeTaps.length; t++) {
        let tapPos = (earlyIdx - activeTaps[t] + maxTapSamples) % maxTapSamples;
        yEarly += earlyBuf[tapPos] * tapGains[t];
      }
      yEarly *= earlyReflections;
      earlyIdx = (earlyIdx + 1) % maxTapSamples;

      const delayOut = new Float32Array(4);
      for (let i = 0; i < 4; i++) {
        delayOut[i] = fdnBufs[i][fdnIdxs[i]];
      }

      const dampedOut = new Float32Array(4);
      for (let i = 0; i < 4; i++) {
        fdnFilterStates[i] = alpha * delayOut[i] + (1.0 - alpha) * fdnFilterStates[i];
        if (Math.abs(fdnFilterStates[i]) < 1e-15) fdnFilterStates[i] = 0.0;
        dampedOut[i] = fdnFilterStates[i];
      }

      const mixed = new Float32Array(4);
      mixed[0] = (dampedOut[0] + dampedOut[1] + dampedOut[2] + dampedOut[3]) * 0.5;
      mixed[1] = (dampedOut[0] - dampedOut[1] + dampedOut[2] - dampedOut[3]) * 0.5;
      mixed[2] = (dampedOut[0] + dampedOut[1] - dampedOut[2] - dampedOut[3]) * 0.5;
      mixed[3] = (dampedOut[0] - dampedOut[1] - dampedOut[2] + dampedOut[3]) * 0.5;

      for (let i = 0; i < 4; i++) {
        let val = xIn + mixed[i] * gFeedbacks[i];
        if (Math.abs(val) < 1e-15) val = 0.0;
        fdnBufs[i][fdnIdxs[i]] = val;
        fdnIdxs[i] = (fdnIdxs[i] + 1) % primeDelays[i];
      }

      const yLate = (dampedOut[0] + dampedOut[1] + dampedOut[2] + dampedOut[3]) * 0.25;
      const yWet = yEarly + yLate;
      const yOut = xIn * 0.5 + yWet * 0.5;

      outData[n] = Math.max(-1.0, Math.min(1.0, yOut));
    }
  }

  return outBuffer;
}
