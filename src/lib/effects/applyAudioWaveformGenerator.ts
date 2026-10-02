// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioWaveformGeneratorOptions {
  imageWidth: number;
  imageHeight: number;
  waveformColor: string;
  waveformStyle: 'Peak-to-Peak Envelopes' | 'RMS Density Power' | 'Mids/Sides Contour';
  outputFormat: 'JSON' | 'TXT';
}

export async function applyAudioWaveformGenerator(buffer: AudioBuffer, options: AudioWaveformGeneratorOptions): Promise<string> {
  const width = Math.max(100, Math.min(4000, Math.round(options.imageWidth)));
  const height = Math.max(50, Math.min(2000, Math.round(options.imageHeight)));
  
  const numChannels = buffer.numberOfChannels;
  const totalFrames = buffer.length;
  const N_total = totalFrames * numChannels;
  const H = Math.max(1, Math.floor(totalFrames / width)); // stride in frames per pixel
  
  const results = new Float32Array(width);
  let maxVal = 0;
  
  for (let m = 0; m < width; m++) {
      const startIdx = m * H;
      const endIdx = Math.min((m + 1) * H, totalFrames);
      let binVal = 0;
      
      if (options.waveformStyle === 'Peak-to-Peak Envelopes') {
          for (let c = 0; c < numChannels; c++) {
              const data = buffer.getChannelData(c);
              for (let k = startIdx; k < endIdx; k++) {
                  const val = Math.abs(data[k]);
                  if (val > binVal) binVal = val;
              }
          }
      } else if (options.waveformStyle === 'RMS Density Power') {
          let sumSq = 0;
          let count = 0;
          for (let c = 0; c < numChannels; c++) {
              const data = buffer.getChannelData(c);
              for (let k = startIdx; k < endIdx; k++) {
                  sumSq += data[k] * data[k];
                  count++;
              }
          }
          binVal = count > 0 ? Math.sqrt(sumSq / count) : 0;
      } else {
        // Fallback for Mids/Sides or others
        for (let c = 0; c < numChannels; c++) {
          const data = buffer.getChannelData(c);
          for (let k = startIdx; k < endIdx; k++) {
              const val = Math.abs(data[k]);
              if (val > binVal) binVal = val;
          }
        }
      }
      
      results[m] = binVal;
      if (binVal > maxVal) maxVal = binVal;
  }
  
  const normalized = Array.from(results).map(v => v / (maxVal + 1e-7));
  
  return JSON.stringify({
      width, height, color: options.waveformColor, style: options.waveformStyle,
      data: normalized
  });
}
