import * as Tone from 'tone';

export const DEFAULT_TUNING = 'Default (12-TET)' as const;

export const TUNING_OPTIONS = [
  '15-EDO',
  '19-EDO',
  '22-EDO',
  '24-EDO',
  'Bohlen-Pierce Scale',
  'Equal Temperament',
  'Just Intonation',
  'Mean-tone Temperament',
  'Pythagorean Tuning',
  'Well Temperaments (Circulating Temperaments)',
] as const;

export type TuningId = typeof TUNING_OPTIONS[number] | typeof DEFAULT_TUNING;

/** 12-TET: octave divided into 12 equal semitones of 100 cents each. */
export function isTwelveToneEqualTemperament(tuning: TuningId): boolean {
  return tuning === DEFAULT_TUNING || tuning === 'Equal Temperament';
}

function twelveToneEqualTemperamentCents(semitone: number): number {
  return semitone * 100;
}

const JUST_INTONATION_CENTS = [0, 111.731, 203.91, 315.641, 386.314, 498.045, 582.512, 701.955, 813.686, 884.359, 996.09, 1088.269];
const PYTHAGOREAN_CENTS = [0, 113.685, 203.91, 294.135, 386.314, 498.045, 588.27, 701.955, 792.18, 882.405, 996.09, 1088.269];
const MEANTONE_CENTS = [0, 76.049, 193.157, 269.205, 386.314, 502.711, 579.47, 696.578, 772.627, 889.735, 965.784, 1082.892];
const WELL_TEMPERAMENT_CENTS = [0, 0, -1.96, 0, -1.96, 0, 0, 0, -1.96, 0, 0, -1.96];
function semitoneInOctave(semitone: number): number {
  return ((semitone % 12) + 12) % 12;
}

function edoCents(semitone: number, divisions: number): number {
  const octaves = Math.floor(semitone / 12);
  const degree = semitoneInOctave(semitone);
  const targetCents = degree * 100;
  const stepSize = 1200 / divisions;
  const edoStep = Math.round(targetCents / stepSize);
  return octaves * 1200 + edoStep * stepSize;
}

function bohlenPierceCents(semitone: number): number {
  const tritaveCents = 1200 * Math.log2(3);
  const octaves = Math.floor(semitone / 12);
  const degree = semitoneInOctave(semitone);
  const bpStep = (degree * 13) / 12;
  const centsWithinTritave = bpStep * (tritaveCents / 13);
  const folded = centsWithinTritave % 1200;
  return octaves * 1200 + folded;
}

export function intervalToCents(semitone: number, tuning: TuningId): number {
  if (isTwelveToneEqualTemperament(tuning)) {
    return twelveToneEqualTemperamentCents(semitone);
  }

  const degree = semitoneInOctave(semitone);
  const octaves = Math.floor(semitone / 12);

  switch (tuning) {
    case '15-EDO':
      return edoCents(semitone, 15);
    case '19-EDO':
      return edoCents(semitone, 19);
    case '22-EDO':
      return edoCents(semitone, 22);
    case '24-EDO':
      return edoCents(semitone, 24);
    case 'Just Intonation':
      return octaves * 1200 + JUST_INTONATION_CENTS[degree];
    case 'Pythagorean Tuning':
      return octaves * 1200 + PYTHAGOREAN_CENTS[degree];
    case 'Mean-tone Temperament':
      return octaves * 1200 + MEANTONE_CENTS[degree];
    case 'Well Temperaments (Circulating Temperaments)':
      return octaves * 1200 + WELL_TEMPERAMENT_CENTS[degree] + degree * 100;
    case 'Bohlen-Pierce Scale':
      return bohlenPierceCents(semitone);
    default:
      return twelveToneEqualTemperamentCents(semitone);
  }
}

export function intervalFromRoot(midi: number, rootPitchClass: number): number {
  const octave = Math.floor(midi / 12);
  let rootMidi = rootPitchClass + octave * 12;
  if (rootMidi > midi) rootMidi -= 12;
  return midi - rootMidi;
}

export function getTunedFrequency(midi: number, rootPitchClass: number, tuning: TuningId): number {
  const interval = intervalFromRoot(midi, rootPitchClass);
  const rootMidi = midi - interval;
  const rootFreq = Tone.Frequency(rootMidi, 'midi').toFrequency();
  const cents = intervalToCents(interval, tuning);
  return rootFreq * Math.pow(2, cents / 1200);
}

export function getPlaybackDetune(midi: number, rootPitchClass: number, tuning: TuningId): number {
  if (isTwelveToneEqualTemperament(tuning)) return 0;
  const equalFreq = Tone.Frequency(midi, 'midi').toFrequency();
  const tunedFreq = getTunedFrequency(midi, rootPitchClass, tuning);
  return 1200 * Math.log2(tunedFreq / equalFreq);
}

export function resolvePlaybackPitch(midi: number, rootPitchClass: number, tuning: TuningId): Tone.Unit.Frequency {
  if (isTwelveToneEqualTemperament(tuning)) return Tone.Frequency(midi, 'midi').toNote();
  return getTunedFrequency(midi, rootPitchClass, tuning);
}