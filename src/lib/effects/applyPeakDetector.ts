// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioPeakDetectorOptions {
  channelMode: 'Global Peak (Both Channels)' | 'Left Channel Only' | 'Right Channel Only';
  outputFormat: 'JSON' | 'TXT';
}

export async function applyPeakDetector(buffer: AudioBuffer, options: AudioPeakDetectorOptions): Promise<string> {
  if (!buffer) throw new Error("Source audio file is required");
  let maxPeakLinear = 0.0;
  let timestamp = 0.0;
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  
  const checkLeft = options.channelMode === 'Global Peak (Both Channels)' || options.channelMode === 'Left Channel Only';
  const checkRight = options.channelMode === 'Global Peak (Both Channels)' || options.channelMode === 'Right Channel Only';
  
  if (checkLeft && numChannels > 0) {
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const rect = Math.abs(data[i]);
      if (rect > maxPeakLinear) {
        maxPeakLinear = rect;
        timestamp = i / sampleRate;
      }
    }
  }
  
  if (checkRight && numChannels > 1) {
    const data = buffer.getChannelData(1);
    for (let i = 0; i < data.length; i++) {
      const rect = Math.abs(data[i]);
      if (rect > maxPeakLinear) {
        maxPeakLinear = rect;
        timestamp = i / sampleRate;
      }
    }
  }
  
  const peakDbfs = 20 * Math.log10(maxPeakLinear + 1e-7);
  
  const result = {
    Peak_dBFS: peakDbfs,
    Maximum_Linear_Value: maxPeakLinear,
    Timestamp_Seconds: timestamp,
    Channel_Mode: options.channelMode
  };
  
  if (options.outputFormat === 'TXT') {
    return `Peak Amplitude Report\nChannel Mode: ${options.channelMode}\nPeak dBFS: ${peakDbfs.toFixed(2)} dB\nMax Linear Value: ${maxPeakLinear.toFixed(6)}\nTimestamp: ${timestamp.toFixed(4)} s`;
  }
  
  return JSON.stringify(result, null, 2);
}
