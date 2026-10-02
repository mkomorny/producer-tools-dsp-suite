// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface Audio3DSpectrumOptions {
  fftSize: 512 | 1024 | 2048;
  heightScale: number;
  rotationAngle: number;
  historyDepth: number;
  colorTheme: 'Neon Cyber' | 'Forest Green' | 'Classic Amber' | 'Ocean Wave';
  outputFormat: 'JSON' | 'TXT';
}

export async function extract3DSpectrum(
  buffer: AudioBuffer,
  options: Audio3DSpectrumOptions
): Promise<string> {
  const fftSize = options.fftSize;
  const heightScale = Math.max(0.5, Math.min(2.5, options.heightScale));
  const rotationAngle = Math.max(0, Math.min(360, options.rotationAngle));
  const historyDepth = Math.max(16, Math.min(64, options.historyDepth));
  
  const numFrames = Math.floor(buffer.length / fftSize);
  const result = [];
  
  const theta = rotationAngle * Math.PI / 180;
  const phi = 30 * Math.PI / 180;
  
  const hanningWindow = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    hanningWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
  }
  
  const input = buffer.getChannelData(0);
  
  for (let z = 0; z < Math.min(historyDepth, numFrames); z++) {
    const offset = z * fftSize;
    for (let k = 0; k < fftSize / 2; k++) {
      const val = Math.abs(input[offset + k] || 0) * hanningWindow[k] + 1e-7;
      const magDb = 20 * Math.log10(val);
      
      const x = k;
      const y = magDb;
      
      const x_rot = x * Math.cos(theta) - z * Math.sin(theta);
      const z_rot = x * Math.sin(theta) + z * Math.cos(theta);
      
      const x_center = 0;
      const y_center = 0;
      
      const x_canvas = x_center + x_rot;
      const y_canvas = y_center - (Math.abs(magDb) * heightScale) + z_rot * Math.sin(phi);
      
      result.push({ x: x_canvas, y: y_canvas, z, k });
    }
  }
  
  return JSON.stringify({
    theme: options.colorTheme,
    resolution: fftSize,
    coordinates: result
  });
}
