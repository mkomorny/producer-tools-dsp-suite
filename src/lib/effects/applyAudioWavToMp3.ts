// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioWavToMp3Options {
  audioFile: File | null;
  bitrate: '128 kbps' | '160 kbps' | '192 kbps' | '256 kbps' | '320 kbps';
  sampleRate: 'Auto (keep original)' | '44.1 kHz' | '48 kHz';
  channels: 'Auto (keep original)' | 'Mono (1 channel)' | 'Stereo (2 channels)';
  keepMetadata: boolean;
  outputFormat: 'MP3';
}

export async function applyAudioWavToMp3(buffer: AudioBuffer, options: AudioWavToMp3Options, ctx: BaseAudioContext): Promise<AudioBuffer> {
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
