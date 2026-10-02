// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioMp3ToM4aOptions {
  audioFile: File | null;
  bitrate: '96 kbps' | '128 kbps' | '160 kbps' | '192 kbps' | '256 kbps' | '320 kbps';
  sampleRate: 'Auto (keep original)' | '44.1 kHz' | '48 kHz';
  channels: 'Auto (keep original)' | 'Mono (1 channel)' | 'Stereo (2 channels)';
  keepMetadata: boolean;
  outputFormat: 'M4A';
}

export async function applyAudioMp3ToM4a(buffer: AudioBuffer, options: AudioMp3ToM4aOptions, ctx: BaseAudioContext): Promise<AudioBuffer> {
  let targetSampleRate = buffer.sampleRate;
  if (options.sampleRate === '44.1 kHz') targetSampleRate = 44100;
  else if (options.sampleRate === '48 kHz') targetSampleRate = 48000;
  
  let targetChannels = buffer.numberOfChannels;
  if (options.channels === 'Mono (1 channel)') targetChannels = 1;
  else if (options.channels === 'Stereo (2 channels)') targetChannels = 2;
  
  const offlineCtx = new OfflineAudioContext(targetChannels, Math.ceil(buffer.duration * targetSampleRate), targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start();
  return await offlineCtx.startRendering();
}
