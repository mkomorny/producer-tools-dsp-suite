// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioEchoOptions {
  delayMs: number;
  feedback: number;
  echoMix: number;
  echoCount: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyEcho(buffer: AudioBuffer, options: AudioEchoOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const delayMs = Math.max(50, Math.min(2000, options.delayMs));
  const feedback = Math.max(0.1, Math.min(0.9, options.feedback));
  const echoMix = Math.max(0.1, Math.min(0.8, options.echoMix));
  const echoCount = Math.max(1, Math.min(10, options.echoCount));
  
  const sampleRate = buffer.sampleRate;
  const S_delay = Math.floor((delayMs * sampleRate) / 1000);
  const N_buf = S_delay * echoCount + 10;
  
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    
    const x_buf = new Float32Array(N_buf);
    let p_write = 0;
    
    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      let y_wet = 0;
      
      for (let k = 1; k <= echoCount; k++) {
        const p_read_k = (p_write - (k * S_delay) + N_buf) % N_buf;
        y_wet += x_buf[p_read_k] * Math.pow(feedback, k);
      }
      
      x_buf[p_write] = x_in + y_wet * feedback;
      output[n] = (1 - echoMix) * x_in + echoMix * y_wet;
      
      p_write = (p_write + 1) % N_buf;
    }
  }
  
  return outBuffer;
}
