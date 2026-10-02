// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioKeyDetectorOptions {
  analysisSeconds?: number;
  profile?: 'Krumhansl-Schmuckler' | 'Temperley' | 'Schenkerian';
  profileType?: 'Krumhansl-Schmuckler' | 'Temperley' | 'Schenkerian';
  minFrequencyHz?: number;
  outputFormat?: string;
}

export async function detectAudioKey(buffer: AudioBuffer, options: AudioKeyDetectorOptions): Promise<string> {
  const profiles: Record<'Krumhansl-Schmuckler' | 'Temperley' | 'Schenkerian', { major: number[]; minor: number[] }> = {
    'Krumhansl-Schmuckler': {
      major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
      minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
    },
    'Temperley': {
      major: [5.0, 2.0, 3.5, 2.0, 4.5, 4.0, 2.0, 4.5, 2.0, 3.5, 1.5, 4.0],
      minor: [5.0, 2.0, 3.5, 4.5, 2.0, 4.0, 2.0, 4.5, 3.5, 2.0, 1.5, 4.0]
    },
    'Schenkerian': {
      major: [1.0, 0.0, 0.5, 0.0, 0.8, 0.3, 0.0, 0.9, 0.0, 0.4, 0.0, 0.3],
      minor: [1.0, 0.0, 0.2, 0.8, 0.0, 0.3, 0.0, 0.9, 0.4, 0.0, 0.2, 0.3]
    }
  };
  
  const profileKey = options.profile || options.profileType || 'Krumhansl-Schmuckler';
  const selectedProfile = profiles[profileKey] || profiles['Krumhansl-Schmuckler'];
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  
  // Create a pitch class profile (chromagram)
  const pcp: number[] = new Array(12).fill(0);
  
  // We'll use multiple FFT frames across the buffer
  const fftSize = 4096;
  const fft = new RealFFT(fftSize);
  
  // Process 10 frames spread out across the audio
  const numFrames = Math.min(10, Math.floor(channelData.length / fftSize));
  const step = Math.floor((channelData.length - fftSize) / Math.max(1, numFrames - 1));
  
  for (let frame = 0; frame < numFrames; frame++) {
    const offset = frame * step;
    if (offset + fftSize > channelData.length) break;
    
    const input = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      const windowMultiplier = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
      input[i] = channelData[offset + i] * windowMultiplier;
    }
    
    const { real, imag } = fft.forward(input);
    const magnitudes = new Float32Array(fftSize / 2);
    for (let i = 0; i < fftSize / 2; i++) {
      magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    }
    
    for (let i = 1; i < fftSize / 2; i++) {
      const freq = i * sampleRate / fftSize;
      if (freq < 20 || freq > 8000) continue; // Focus on musical range
      
      // Calculate pitch class (0 = C, 1 = C#, etc.)
      const midiNote = Math.round(69 + 12 * Math.log2(freq / 440));
      const pitchClass = (midiNote + 240) % 12; // Ensure positive modulo
      
      pcp[pitchClass] += magnitudes[i];
    }
  }
  
  // Calculate correlations with profiles
  let bestKey = "C";
  let bestScale = "Major";
  let maxCorrelation = -Infinity;
  
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  
  for (let i = 0; i < 12; i++) {
    for (const scale of ['major', 'minor'] as const) {
      let correlation = 0;
      let pcpSum = 0;
      let profSum = 0;
      let pcpMean = pcp.reduce((a, b) => a + b, 0) / 12;
      let profMean = selectedProfile[scale].reduce((a, b) => a + b, 0) / 12;
      
      let num = 0;
      let denom1 = 0;
      let denom2 = 0;
      
      for (let j = 0; j < 12; j++) {
        const pVal = pcp[(i + j) % 12] - pcpMean;
        const profVal = selectedProfile[scale][j] - profMean;
        num += pVal * profVal;
        denom1 += pVal * pVal;
        denom2 += profVal * profVal;
      }
      
      correlation = num / Math.sqrt(denom1 * denom2 || 1);
      
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestKey = notes[i];
        bestScale = scale.charAt(0).toUpperCase() + scale.slice(1);
      }
    }
  }
  
  // Calculate confidence (0 to 1 based on correlation)
  const confidence = Math.max(0, Math.min(1, (maxCorrelation + 1) / 2));
  
  return JSON.stringify({
    detectedKey: bestKey,
    scale: bestScale,
    confidence: Number(confidence.toFixed(2))
  }, null, 2);
}
