export interface AudioPitchUpOptions {
  semitones: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export interface AudioPlateReverbOptions {
  plateType: 'Medium Plate' | 'Thin Plate' | 'Thick Plate' | 'Custom Settings';
  decayTime: number;
  highFrequencyDamping: number;
  diffusion: number;
  wetDryMix: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export interface AudioRemoveSilenceOptions {
  thresholdDb: number;
  minSilenceDuration: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export interface AudioPhaserOptions {
  inGain: number;
  outGain: number;
  delayMs: number;
  decay: number;
  speedHz: number;
  type: 'Sine' | 'Triangle';
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export interface AudioPitchDownOptions {
  semitones: number;
  windowSizeMs: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

export interface AudioPitchShifterOptions {
  semitones: number;
  windowSizeMs: number;
  outputFormat: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}
