// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioMp3ToWavOptions {
  sampleRate: 'Auto (keep original)' | '44.1 kHz' | '48 kHz' | '96 kHz';
  audioChannels: 'Auto (keep original)' | 'Mono (1 channel)' | 'Stereo (2 channels)';
  keepMetadata: boolean;
}

export async function applyAudioMp3ToWav(buffer: AudioBuffer, options: AudioMp3ToWavOptions, ctx: BaseAudioContext): Promise<AudioBuffer> {
  let targetSampleRate = buffer.sampleRate;
  if (options.sampleRate === '44.1 kHz') targetSampleRate = 44100;
  else if (options.sampleRate === '48 kHz') targetSampleRate = 48000;
  else if (options.sampleRate === '96 kHz') targetSampleRate = 96000;
  
  let targetChannels = buffer.numberOfChannels;
  if (options.audioChannels === 'Mono (1 channel)') targetChannels = 1;
  else if (options.audioChannels === 'Stereo (2 channels)') targetChannels = 2;
  
  const offlineCtx = new OfflineAudioContext(targetChannels, Math.ceil(buffer.duration * targetSampleRate), targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start();
  return await offlineCtx.startRendering();
}
