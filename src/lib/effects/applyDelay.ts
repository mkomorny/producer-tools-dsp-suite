// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioDelayOptions {
  delayTimeMs: number;
  feedback: number;
  wetDryMix: number;
  tempoSync: 'None' | 'Quarter note' | 'Eighth note' | 'Sixteenth note' | 'Half note' | 'Dotted quarter' | 'Quarter triplet';
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyDelay(buffer: AudioBuffer, options: AudioDelayOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const delayTimeMs = Math.max(1, Math.min(2000, options.delayTimeMs));
  const feedback = Math.max(0.0, Math.min(0.95, options.feedback));
  const wetDryMix = Math.max(0.0, Math.min(1.0, options.wetDryMix));
  
  const sampleRate = buffer.sampleRate;
  const outBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  
  const M = (delayTimeMs * sampleRate) / 1000;
  const N_buf = Math.ceil(2000 * sampleRate / 1000) + 10;
  
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const input = buffer.getChannelData(c);
    const output = outBuffer.getChannelData(c);
    const x_buf = new Float32Array(N_buf);
    let p_write = 0;
    
    const I = Math.floor(M);
    const f = M - I;
    
    for (let n = 0; n < input.length; n++) {
      const x_in = input[n];
      
      const p_read1 = (p_write - I + N_buf) % N_buf;
      const p_read2 = (p_write - I - 1 + N_buf) % N_buf;
      
      const y_delayed = (1 - f) * x_buf[p_read1] + f * x_buf[p_read2];
      
      x_buf[p_write] = x_in + feedback * y_delayed;
      
      output[n] = (1 - wetDryMix) * x_in + wetDryMix * y_delayed;
      
      p_write = (p_write + 1) % N_buf;
    }
  }
  
  return outBuffer;
}
