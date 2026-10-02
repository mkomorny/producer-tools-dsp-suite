import { PianoRollNote } from '../components/PianoRoll';
// @ts-ignore
import FFT from 'fft.js';

export const getRMS = (data: Float32Array | number[], start: number, length: number): number => {
  let sum = 0;
  const end = Math.min(start + length, data.length);
  for (let i = start; i < end; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / length);
};

export const medianFilter = (arr: number[], kernel: number = 5): number[] => {
  const result = [...arr];
  const half = Math.floor(kernel / 2);
  for (let i = half; i < arr.length - half; i++) {
    const window = arr.slice(i - half, i + half + 1).filter(p => p !== -1);
    if (window.length > 0) {
      window.sort((a, b) => a - b);
      result[i] = window[Math.floor(window.length / 2)];
    }
  }
  return result;
};

export function yinPitchDetect(timeDomainData: Float32Array | number[], sampleRate: number): number {
  const bufferSize = timeDomainData.length;
  const halfBufferSize = Math.floor(bufferSize / 2);
  const yinBuffer = new Float32Array(halfBufferSize);
  
  for (let tau = 0; tau < halfBufferSize; tau++) {
    for (let i = 0; i < halfBufferSize; i++) {
      const delta = timeDomainData[i] - timeDomainData[i + tau];
      yinBuffer[tau] += delta * delta;
    }
  }
  
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfBufferSize; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] = yinBuffer[tau] / (runningSum / tau);
  }
  
  const threshold = 0.20;
  let tauFound = -1;
  
  for (let tau = 1; tau < halfBufferSize; tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < halfBufferSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauFound = tau;
      break;
    }
  }
  
  if (tauFound === -1) {
    let minVal = 1e10;
    for (let tau = 1; tau < halfBufferSize; tau++) {
      if (yinBuffer[tau] < minVal) {
        minVal = yinBuffer[tau];
        tauFound = tau;
      }
    }
  }
  
  if (tauFound === -1 || tauFound === 0) return 0;
  
  const frequency = sampleRate / tauFound;
  if (frequency >= 80 && frequency <= 600) {
    return frequency;
  }
  return 0;
}

export function padCenter(data: Float32Array, size: number): Float32Array {
  if (data.length >= size) return data.slice(0, size);
  const out = new Float32Array(size);
  const start = Math.floor((size - data.length) / 2);
  out.set(data, start);
  return out;
}

export function getHannWindow(winLength: number): Float32Array {
  const win = new Float32Array(winLength);
  for (let i = 0; i < winLength; i++) {
    win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / winLength);
  }
  return win;
}

export function stft(
  y: Float32Array,
  n_fft: number = 2048,
  hop_length: number = 512,
  win_length: number = 2048,
  center: boolean = true
): { mags: Float32Array[] } {
  const window = getHannWindow(win_length);
  const padLen = center ? Math.floor(n_fft / 2) : 0;
  
  let y_padded = y;
  if (center) {
    y_padded = new Float32Array(y.length + n_fft);
    y_padded.set(y, padLen);
  }

  const n_frames = 1 + Math.floor((y_padded.length - n_fft) / hop_length);
  const fft = new FFT(n_fft);
  const complexOut = fft.createComplexArray();
  const mags: Float32Array[] = [];

  for (let i = 0; i < n_frames; i++) {
    const start = i * hop_length;
    const frame = new Float32Array(n_fft);
    const yFrame = y_padded.subarray(start, start + n_fft);
    
    const winStart = Math.floor((n_fft - win_length) / 2);
    for (let j = 0; j < win_length; j++) {
      if (j < yFrame.length) {
        frame[winStart + j] = yFrame[winStart + j] * window[j];
      }
    }

    fft.realTransform(complexOut, Array.from(frame));
    
    const mag = new Float32Array(Math.floor(n_fft / 2) + 1);
    for (let k = 0; k <= Math.floor(n_fft / 2); k++) {
      const re = complexOut[2 * k];
      const im = complexOut[2 * k + 1];
      mag[k] = Math.sqrt(re * re + im * im);
    }
    mags.push(mag);
  }
  
  return { mags };
}

export function hzToMel(hz: number, htk: boolean = false): number {
  if (htk) {
    return 2595 * Math.log10(1 + hz / 700);
  }
  const f_min = 0.0;
  const f_sp = 200.0 / 3;
  let mel = (hz - f_min) / f_sp;
  const min_log_hz = 1000.0;
  const min_log_mel = (min_log_hz - f_min) / f_sp;
  const logstep = Math.log(6.4) / 27.0;
  if (hz >= min_log_hz) {
    mel = min_log_mel + Math.log(hz / min_log_hz) / logstep;
  }
  return mel;
}

export function melToHz(mel: number, htk: boolean = false): number {
  if (htk) {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  }
  const f_min = 0.0;
  const f_sp = 200.0 / 3;
  let hz = f_min + f_sp * mel;
  const min_log_hz = 1000.0;
  const min_log_mel = (min_log_hz - f_min) / f_sp;
  const logstep = Math.log(6.4) / 27.0;
  if (mel >= min_log_mel) {
    hz = min_log_hz * Math.exp(logstep * (mel - min_log_mel));
  }
  return hz;
}

export function melFrequencies(n_mels: number, fmin: number, fmax: number): Float32Array {
  const minMel = hzToMel(fmin);
  const maxMel = hzToMel(fmax);
  const mels = new Float32Array(n_mels);
  const step = (maxMel - minMel) / (n_mels - 1);
  for (let i = 0; i < n_mels; i++) {
    mels[i] = melToHz(minMel + i * step);
  }
  return mels;
}

export function melFilterbank(
  sr: number,
  n_fft: number,
  n_mels: number = 128,
  fmin: number = 0,
  fmax: number | null = null
): Float32Array[] {
  fmax = fmax || sr / 2;
  const fftFreqs = new Float32Array(Math.floor(n_fft / 2) + 1);
  for (let i = 0; i < fftFreqs.length; i++) {
    fftFreqs[i] = (i * sr) / n_fft;
  }
  
  const melFreqs = melFrequencies(n_mels + 2, fmin, fmax);
  const fdiff = new Float32Array(n_mels + 1);
  for (let i = 0; i < melFreqs.length - 1; i++) {
    fdiff[i] = melFreqs[i + 1] - melFreqs[i];
  }
  
  const weights: Float32Array[] = [];
  for (let i = 0; i < n_mels; i++) {
    const row = new Float32Array(fftFreqs.length);
    const enorm = 2.0 / (melFreqs[i + 2] - melFreqs[i]);
    for (let j = 0; j < fftFreqs.length; j++) {
      const lower = (fftFreqs[j] - melFreqs[i]) / fdiff[i];
      const upper = (melFreqs[i + 2] - fftFreqs[j]) / fdiff[i + 1];
      row[j] = Math.max(0, Math.min(lower, upper)) * enorm;
    }
    weights.push(row);
  }
  return weights;
}

export function melspectrogram(
  y: Float32Array,
  sr: number,
  n_fft: number = 2048,
  hop_length: number = 512,
  n_mels: number = 128
): Float32Array[] {
  const { mags } = stft(y, n_fft, hop_length, n_fft, true);
  const fb = melFilterbank(sr, n_fft, n_mels);
  const melSpec: Float32Array[] = [];
  
  for (let i = 0; i < mags.length; i++) {
    const frame = mags[i];
    const melFrame = new Float32Array(n_mels);
    for (let m = 0; m < n_mels; m++) {
      let sum = 0;
      for (let k = 0; k < frame.length; k++) {
        sum += fb[m][k] * (frame[k] * frame[k]); // Power spectrogram
      }
      melFrame[m] = sum;
    }
    melSpec.push(melFrame);
  }
  return melSpec;
}

export function powerToDb(melSpec: Float32Array[], ref: number = 1.0, amin: number = 1e-10, top_db: number = 80): Float32Array[] {
  const logSpec: Float32Array[] = [];
  let maxDb = -Infinity;
  
  for (let i = 0; i < melSpec.length; i++) {
    const frame = new Float32Array(melSpec[i].length);
    for (let j = 0; j < frame.length; j++) {
      const val = 10 * Math.log10(Math.max(amin, melSpec[i][j])) - 10 * Math.log10(Math.max(amin, ref));
      frame[j] = val;
      if (val > maxDb) maxDb = val;
    }
    logSpec.push(frame);
  }
  
  if (top_db !== null) {
    const threshold = maxDb - top_db;
    for (let i = 0; i < logSpec.length; i++) {
      for (let j = 0; j < logSpec[i].length; j++) {
        logSpec[i][j] = Math.max(logSpec[i][j], threshold);
      }
    }
  }
  return logSpec;
}

export function onsetStrength(dbMel: Float32Array[], maxSize: number = 3, lag: number = 1): Float32Array {
  const n_frames = dbMel.length;
  const n_mels = dbMel[0].length;
  const onsetEnv = new Float32Array(n_frames);
  
  for (let t = lag; t < n_frames; t++) {
    let sum = 0;
    for (let m = 0; m < n_mels; m++) {
      let start = Math.max(0, m - Math.floor(maxSize / 2));
      let end = Math.min(n_mels, m + Math.floor(maxSize / 2) + 1);
      let refVal = dbMel[t - lag][start];
      for (let k = start + 1; k < end; k++) {
        if (dbMel[t - lag][k] > refVal) refVal = dbMel[t - lag][k];
      }
      
      const diff = dbMel[t][m] - refVal;
      if (diff > 0) {
        sum += diff;
      }
    }
    onsetEnv[t] = sum / n_mels;
  }
  return onsetEnv;
}

export function onsetDetect(onsetEnv: Float32Array, threshold: number = 0.5, wait: number = 3): number[] {
  const onsets: number[] = [];
  const meanEnv = onsetEnv.reduce((a, b) => a + b, 0) / onsetEnv.length;
  
  let lastOnset = -wait;
  for (let i = 1; i < onsetEnv.length - 1; i++) {
    if (onsetEnv[i] > onsetEnv[i - 1] && onsetEnv[i] > onsetEnv[i + 1]) {
      if (onsetEnv[i] > meanEnv + threshold && i - lastOnset >= wait) {
        onsets.push(i);
        lastOnset = i;
      }
    }
  }
  return onsets;
}

export async function processAudioBuffer(buffer: AudioBuffer): Promise<PianoRollNote[]> {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);

  const n_fft = 2048;
  const hop_length = 512;

  // 1. Mel spectrogram → dB → onset envelope
  const melSpec = melspectrogram(channelData, sampleRate, n_fft, hop_length, 128);
  const dbMel = powerToDb(melSpec);
  const onsetEnv = onsetStrength(dbMel, 3, 1);

  // Higher threshold + longer wait = one onset per syllable, not one per vibrato cycle
  const onsetsFrames = onsetDetect(onsetEnv, 1.5, 8);

  const notes: PianoRollNote[] = [];
  const segments = onsetsFrames.concat([melSpec.length]);

  let noteId = 0;
  for (let i = 0; i < segments.length - 1; i++) {
    const startFrame = segments[i];
    const endFrame = segments[i + 1];

    const startSample = startFrame * hop_length;
    const endSample = Math.min(endFrame * hop_length, channelData.length);
    const durationSec = (endSample - startSample) / sampleRate;

    if (durationSec < 0.08) continue;

    const segmentData = channelData.subarray(startSample, endSample);
    const rms = getRMS(segmentData, 0, segmentData.length);
    if (rms < 0.02) continue;

    // Collect one pitch estimate per sub-frame across the segment
    const pitchCandidates: number[] = [];
    for (let j = 0; j + n_fft <= segmentData.length; j += hop_length) {
      const frame = segmentData.subarray(j, j + n_fft);
      if (getRMS(frame, 0, n_fft) > 0.015) {
        const freq = yinPitchDetect(frame, sampleRate);
        if (freq > 0) {
          pitchCandidates.push(Math.round(69 + 12 * Math.log2(freq / 440)));
        }
      }
    }

    if (pitchCandidates.length === 0) continue;

    // Pick the dominant (most-voted) pitch rather than the median.
    // This suppresses vibrato oscillations and formant-doubling errors.
    const counts: Record<number, number> = {};
    for (const p of pitchCandidates) {
      counts[p] = (counts[p] || 0) + 1;
    }
    const sorted = Object.entries(counts)
      .map(([k, v]) => ({ midi: parseInt(k), count: v }))
      .sort((a, b) => b.count - a.count);

    const dominant = sorted[0];
    // Reject segments where no single pitch captures at least 25% of frames (unvoiced/noise)
    if (dominant.count / pitchCandidates.length < 0.25) continue;

    const midiNote = dominant.midi;
    // Vocal range guard: C2 (36) – C6 (84)
    if (midiNote < 36 || midiNote > 84) continue;

    notes.push({
      id: `note-${noteId++}`,
      note: midiNote,
      exactPitch: midiNote,
      startTime: startSample / sampleRate,
      duration: durationSec,
    });
  }

  return notes;
}

export function cleanMidiSequence(notes: PianoRollNote[]): PianoRollNote[] {
  if (notes.length === 0) return notes;

  // 1. Drop very short notes (< 100 ms)
  const filtered = notes.filter(n => n.duration >= 0.1);

  // 2. Merge adjacent notes whose pitches are within 1 semitone and gap is < 150 ms
  const merged: PianoRollNote[] = [];
  for (const note of filtered) {
    const prev = merged[merged.length - 1];
    const gap = prev ? note.startTime - (prev.startTime + prev.duration) : Infinity;
    if (prev && Math.abs(prev.note - note.note) <= 1 && gap < 0.15) {
      prev.duration = (note.startTime + note.duration) - prev.startTime;
    } else {
      merged.push({ ...note });
    }
  }

  // 3. Remove isolated octave-jump errors (note jumps 12 semitones then immediately back)
  const deOctaved: PianoRollNote[] = [];
  for (let i = 0; i < merged.length; i++) {
    const prev = deOctaved[deOctaved.length - 1];
    const next = merged[i + 1];
    if (
      prev && next &&
      Math.abs(merged[i].note - prev.note) === 12 &&
      Math.abs(next.note - prev.note) <= 2
    ) {
      continue; // skip the octave-error note
    }
    deOctaved.push(merged[i]);
  }

  return deOctaved;
}

export function complexEnvelopeIntensity(frame: Float32Array | number[]): number {
  const N = frame.length;
  // Pad to next power of 2 for FFT
  let n_fft = 1;
  while (n_fft < N) n_fft *= 2;
  
  const fft = new FFT(n_fft);
  const complexData = fft.createComplexArray();
  const paddedFrame = new Float32Array(n_fft);
  paddedFrame.set(frame);
  
  fft.realTransform(complexData, Array.from(paddedFrame));
  
  // Create analytic signal in frequency domain:
  // Positive frequencies are doubled, negative frequencies are zeroed
  for (let i = 1; i < n_fft / 2; i++) {
    complexData[2 * i] *= 2;     // Real
    complexData[2 * i + 1] *= 2; // Imag
  }
  for (let i = n_fft / 2 + 1; i < n_fft; i++) {
    complexData[2 * i] = 0;
    complexData[2 * i + 1] = 0;
  }
  
  const analyticSignal = fft.createComplexArray();
  fft.inverseTransform(analyticSignal, complexData);
  
  // Compute mean envelope magnitude
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const re = analyticSignal[2 * i];
    const im = analyticSignal[2 * i + 1];
    sum += Math.sqrt(re * re + im * im) / n_fft; // IFFT scaling
  }
  return sum / N;
}