// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioPitchDownOptions {
  semitones: number;
  windowSizeMs: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export function applyAudioPitchDown(buffer: AudioBuffer, options: AudioPitchDownOptions, audioCtx: BaseAudioContext): AudioBuffer {
  const semitones = Math.max(-12.0, Math.min(-0.1, options.semitones));
  const windowSizeMs = Math.max(20, Math.min(120, options.windowSizeMs));
  const SR = Math.pow(2, semitones / 12);
  const fs = buffer.sampleRate;
  const Nwin = Math.floor((windowSizeMs * fs) / 1000);
  const H = Math.floor(Nwin / 4);
  
  const numChannels = buffer.numberOfChannels;
  const outBuffer = audioCtx.createBuffer(numChannels, buffer.length, fs);

  const w = new Float32Array(Nwin);
  for (let m = 0; m < Nwin; m++) {
    w[m] = Math.pow(Math.sin((Math.PI * m) / (Nwin - 1)), 2);
  }

  for (let c = 0; c < numChannels; c++) {
    const inData = buffer.getChannelData(c);
    const outData = outBuffer.getChannelData(c);
    
    let pRead = 0;
    for (let mFrame = 0; mFrame < Math.floor((buffer.length - Nwin) / H); mFrame++) {
      let outOffset = mFrame * H;
      let frameRead = pRead;
      
      for (let m = 0; m < Nwin; m++) {
        let I = Math.floor(frameRead);
        let f = frameRead - I;
        
        let val1 = I >= 0 && I < inData.length ? inData[I] : 0;
        let val2 = I+1 >= 0 && I+1 < inData.length ? inData[I+1] : 0;
        let xInterp = (1 - f) * val1 + f * val2;
        
        if (outOffset + m < outData.length) {
          outData[outOffset + m] += xInterp * w[m];
        }
        frameRead += SR;
      }
      pRead += H;
    }
  }

  return outBuffer;
}
