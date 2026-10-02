import * as Tone from 'tone';

export const INSTRUMENT_CATEGORIES = [
  {
    name: 'Pianos & Keys',
    instruments: ['Grand Piano', 'Bright Piano', 'Electric Grand', 'Honky-tonk', 'Electric Piano 1', 'Electric Piano 2', 'Harpsichord', 'Clavinet', 'Celesta', 'Glockenspiel', 'Music Box', 'Vibraphone', 'Marimba']
  },
  {
    name: 'Organs',
    instruments: ['Drawbar Organ', 'Percussive Organ', 'Rock Organ', 'Church Organ', 'Reed Organ', 'Accordion', 'Harmonica', 'Tango Accordion']
  },
  {
    name: 'Guitars',
    instruments: ['Nylon Guitar', 'Steel Guitar', 'Jazz Guitar', 'Clean Guitar', 'Muted Guitar', 'Overdriven', 'Distortion', 'Guitar Harmonics']
  },
  {
    name: 'Bass',
    instruments: ['Acoustic Bass', 'Finger Bass', 'Pick Bass', 'Fretless Bass', 'Slap Bass 1', 'Slap Bass 2', 'Synth Bass 1', 'Synth Bass 2']
  },
  {
    name: 'Strings',
    instruments: ['Violin', 'Viola', 'Cello', 'Contrabass', 'Tremolo Strings', 'Pizzicato', 'Harp', 'Timpani']
  },
  {
    name: 'Ensembles',
    instruments: ['String Ensemble 1', 'String Ensemble 2', 'Synth Strings 1', 'Synth Strings 2', 'Choir Aahs', 'Voice Oohs', 'Synth Choir', 'Orchestra Hit']
  },
  {
    name: 'Brass',
    instruments: ['Trumpet', 'Trombone', 'Tuba', 'Muted Trumpet', 'French Horn', 'Brass Section', 'Synth Brass 1', 'Synth Brass 2']
  },
  {
    name: 'Reeds & Flutes',
    instruments: ['Soprano Sax', 'Alto Sax', 'Tenor Sax', 'Baritone Sax', 'Oboe', 'English Horn', 'Bassoon', 'Clarinet', 'Piccolo', 'Flute', 'Recorder', 'Pan Flute', 'Blown Bottle', 'Shakuhachi', 'Whistle', 'Ocarina']
  },
  {
    name: 'Ethnic & Percussion',
    instruments: ['Sitar', 'Banjo', 'Shamisen', 'Koto', 'Kalimba', 'Bagpipe', 'Fiddle', 'Shanai', 'Tinkle Bell', 'Agogo', 'Steel Drums', 'Woodblock', 'Taiko Drum', 'Melodic Tom', 'Synth Drum', 'Reverse Cymbal']
  },
  {
    name: 'Synth Essentials',
    instruments: ['Moog Lead', '808 Bass', 'Classic Pluck', 'Synth Brass', 'Warm Pad']
  },
  {
    name: 'Cosmic Soundtrack',
    instruments: ['Nebula Pad', 'Event Horizon', 'Pulsar Lead', 'Spacewalk', 'Starlight Bell', 'Void Strings', 'Comet Tail']
  },
  {
    name: 'Retro Arcade Game',
    instruments: ['8-Bit Square', 'Laser Blast', 'Chiptune Arp', 'Boss Synth', 'Pixel Bass', 'Coin Drop', 'Level Up']
  },
  {
    name: 'Dinosaurs',
    instruments: ['T-Rex Roar Synth', 'Bronto Stomp', 'Ptero Screech', 'Velociraptor Pluck', 'Jungle Drum', 'Fossil Keys', 'Dino Lead']
  }
];

export const SYNTH_PRESETS: Record<string, () => any> = {
  // Synth Essentials
  'Classic Pluck': () => new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'square' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 },
  }),
  'Synth Brass': () => new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 1,
    modulationIndex: 1,
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.8 },
    modulation: { type: 'sawtooth' },
    modulationEnvelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.8 },
  }),
  'Warm Pad': () => new Tone.PolySynth(Tone.AMSynth, {
    harmonicity: 2.5,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.5, decay: 1, sustain: 1, release: 2 },
    modulation: { type: 'triangle' },
    modulationEnvelope: { attack: 0.5, decay: 1, sustain: 1, release: 2 },
  }),
  // Cosmic Soundtrack
  'Nebula Pad': () => new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 3.01,
    modulationIndex: 5,
    oscillator: { type: 'triangle' },
    envelope: { attack: 1.5, decay: 1, sustain: 0.8, release: 3 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 1.5, decay: 1, sustain: 0.8, release: 3 },
  }),
  'Event Horizon': () => new Tone.PolySynth(Tone.AMSynth, {
    oscillator: { type: 'square' },
    envelope: { attack: 2, decay: 2, sustain: 0.4, release: 4 },
  }),
  'Pulsar Lead': () => new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 1,
    modulationIndex: 10,
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 1 },
  }),
  'Spacewalk': () => {
    return new Tone.PolySynth(Tone.MetalSynth, {
      envelope: { attack: 0.05, decay: 0.5, release: 0.8 }
    })
  },
  'Starlight Bell': () => new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 8,
    modulationIndex: 2,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 1, sustain: 0.1, release: 2 },
    modulation: { type: 'square' },
    modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 2 },
  }),
  'Void Strings': () => new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'pwm', modulationFrequency: 0.2 },
    envelope: { attack: 1, decay: 0.5, sustain: 0.6, release: 2 },
  }),
  'Comet Tail': () => new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 0.5,
    modulationIndex: 10,
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.1, decay: 1.5, sustain: 0, release: 1.5 },
  }),
  // Retro Arcade
  '8-Bit Square': () => new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'square' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 },
  }),
  'Laser Blast': () => new Tone.PolySynth(Tone.MembraneSynth, {
    pitchDecay: 0.01,
    octaves: 10,
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
  }),
  'Chiptune Arp': () => new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 1,
    modulationIndex: 0,
    oscillator: { type: 'square' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 },
  }),
  'Boss Synth': () => new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 0.5,
    modulationIndex: 5,
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.1, decay: 0.3, sustain: 0.5, release: 0.5 },
  }),
  'Pixel Bass': () => new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.05, decay: 0.3, sustain: 0.8, release: 0.5 },
  }),
  'Coin Drop': () => new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0 },
  }),
  'Level Up': () => new Tone.PolySynth(Tone.AMSynth, {
    harmonicity: 1.5,
    oscillator: { type: 'square' },
    envelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0 },
  }),
  // Dinosaurs
  'T-Rex Roar Synth': () => new Tone.PolySynth(Tone.AMSynth, {
    harmonicity: 0.2,
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.5, decay: 1.5, sustain: 0.2, release: 1 },
    modulation: { type: 'square' },
    modulationEnvelope: { attack: 0.5, decay: 1, sustain: 0.5, release: 1 },
  }),
  'Bronto Stomp': () => new Tone.PolySynth(Tone.MembraneSynth, {
    pitchDecay: 0.05,
    octaves: 2,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.8, sustain: 0.1, release: 1 },
  }),
  'Ptero Screech': () => new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 5,
    modulationIndex: 20,
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.1, decay: 0.5, sustain: 0.1, release: 0.5 },
  }),
  'Velociraptor Pluck': () => {
    return new Tone.PolySynth(Tone.MetalSynth, {
      envelope: { attack: 0.01, decay: 0.1, release: 0.1 }
    })
  },
  'Jungle Drum': () => new Tone.PolySynth(Tone.MembraneSynth, {
    pitchDecay: 0.05,
    octaves: 4,
    oscillator: { type: 'square' },
    envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.4 },
  }),
  'Fossil Keys': () => new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 1.5,
    modulationIndex: 2,
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.05, decay: 0.5, sustain: 0.2, release: 1 },
  }),
  'Dino Lead': () => new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.8 }
  }),
  // Additional defaults like moog lead, etc.
  'Moog Lead': () => new Tone.PolySynth(Tone.MonoSynth, {
    oscillator: { type: 'sawtooth' },
    filter: { Q: 2, type: 'lowpass', rolloff: -24 },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 1 },
    filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 1, baseFrequency: 200, octaves: 4 }
  }),
  '808 Bass': () => new Tone.PolySynth(Tone.MonoSynth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.05, decay: 1, sustain: 0.4, release: 1.5 },
    filterEnvelope: { attack: 0.01, decay: 0.1, baseFrequency: 150, octaves: -2 }
  })
};
