// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioFrequencyAnalyzerOptions {
  fftSize: 512 | 1024 | 2048 | 4096 | 8128;
  smoothingTimeConstant: number;
  decayRateDb: number;
  outputFormat: 'JSON' | 'TXT';
}

export async function analyzeFrequencySpectrum(buffer: AudioBuffer, options: AudioFrequencyAnalyzerOptions): Promise<string> {
  const fftSize = options.fftSize;
  const sampleRate = buffer.sampleRate;
  
  // Real implementation using RealFFT
  const channelData = buffer.getChannelData(0);
  // Apply a Hanning window and take the first fftSize samples (or pad with zeros)
  const input = new Float32Array(fftSize);
  for (let i = 0; i < fftSize && i < channelData.length; i++) {
    const windowMultiplier = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
    input[i] = channelData[i] * windowMultiplier;
  }
  
  const fft = new RealFFT(fftSize);
  const { real, imag } = fft.forward(input);
  
  const magnitudes = new Float32Array(fftSize / 2);
  for (let i = 0; i < fftSize / 2; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  
  // Calculate RMS for different bands
  // Bass: 20-250Hz, Low-Mid: 250-500Hz, Mid: 500-2000Hz, High-Mid: 2000-4000Hz, Treble: 4000-20000Hz
  const binFreq = sampleRate / fftSize;
  
  const getBandRMS = (startFreq: number, endFreq: number) => {
    let sum = 0;
    let count = 0;
    const startIndex = Math.floor(startFreq / binFreq);
    const endIndex = Math.ceil(endFreq / binFreq);
    for (let i = startIndex; i < endIndex && i < magnitudes.length; i++) {
      sum += magnitudes[i] * magnitudes[i];
      count++;
    }
    return count > 0 ? Math.sqrt(sum / count) : 0;
  };
  
  const bassRMS = getBandRMS(20, 250);
  const lowMidRMS = getBandRMS(250, 500);
  const midRMS = getBandRMS(500, 2000);
  const highMidRMS = getBandRMS(2000, 4000);
  const trebleRMS = getBandRMS(4000, 20000);
  
  const result = {
    bass: 20 * Math.log10(bassRMS + 1e-7),
    lowMid: 20 * Math.log10(lowMidRMS + 1e-7),
    mid: 20 * Math.log10(midRMS + 1e-7),
    highMid: 20 * Math.log10(highMidRMS + 1e-7),
    treble: 20 * Math.log10(trebleRMS + 1e-7),
    fftSize,
    sampleRate
  };
  
  if (options.outputFormat === 'JSON') return JSON.stringify(result, null, 2);
  return `Frequency Analysis:
Bass: ${result.bass.toFixed(2)} dB
Low-Mid: ${result.lowMid.toFixed(2)} dB
Mid: ${result.mid.toFixed(2)} dB
High-Mid: ${result.highMid.toFixed(2)} dB
Treble: ${result.treble.toFixed(2)} dB`;
}
