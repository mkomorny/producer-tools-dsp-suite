import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Upload, Square, Settings2, Music2 } from 'lucide-react';
import * as Tone from 'tone';

const BOTTOM_ROW = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'];
const MIDDLE_ROW = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"];
const TOP_ROW    = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'];
const KEY_MAPPINGS = [...BOTTOM_ROW, ...MIDDLE_ROW, ...TOP_ROW];

const REPITCH_SCALES: Record<string, number[]> = {
  'Default':          [],
  'Major':            [0,2,4,5,7,9,11],
  'Natural Minor':    [0,2,3,5,7,8,10],
  'Harmonic Minor':   [0,2,3,5,7,8,11],
  'Pentatonic Major': [0,2,4,7,9],
  'Pentatonic Minor': [0,3,5,7,10],
  'Blues':            [0,3,5,6,7,10],
  'Dorian':           [0,2,3,5,7,9,10],
  'Phrygian':         [0,1,3,5,7,8,10],
  'Lydian':           [0,2,4,6,7,9,11],
  'Mixolydian':       [0,2,4,5,7,9,10],
  'Whole Tone':       [0,2,4,6,8,10],
  'Chromatic':        [0,1,2,3,4,5,6,7,8,9,10,11],
};

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Find the minimum semitone shift to snap a MIDI note into the chosen scale.
// Tries all 12 transpositions and picks whichever in-scale note is closest.
function semitoneShiftForScale(midiNote: number, scaleIntervals: number[]): number {
  if (scaleIntervals.length === 0) return 0;
  const pc = ((Math.round(midiNote) % 12) + 12) % 12;
  let bestShift = 7; // > max possible
  for (let root = 0; root < 12; root++) {
    for (const interval of scaleIntervals) {
      const inScalePC = (root + interval) % 12;
      let diff = inScalePC - pc;
      if (diff > 6)  diff -= 12;
      if (diff < -6) diff += 12;
      if (Math.abs(diff) < Math.abs(bestShift)) bestShift = diff;
    }
  }
  return bestShift;
}

// Autocorrelation pitch detector — returns Hz or 0 if no clear pitch found
function detectPitchHz(data: Float32Array, sampleRate: number): number {
  const minPeriod = Math.floor(sampleRate / 1600); // max ~1600 Hz
  const maxPeriod = Math.floor(sampleRate / 60);   // min ~60 Hz
  const windowSize = Math.min(data.length, 4096);
  if (windowSize < maxPeriod * 2) return 0;

  // Compute RMS; reject silence
  let energy = 0;
  for (let i = 0; i < windowSize; i++) energy += data[i] * data[i];
  energy /= windowSize;
  if (energy < 0.0002) return 0;

  // Normalized autocorrelation (NSDF-like)
  let bestCorr = 0;
  let bestPeriod = 0;
  for (let lag = minPeriod; lag <= maxPeriod; lag++) {
    let corr = 0;
    for (let i = 0; i < windowSize - lag; i++) {
      corr += data[i] * data[i + lag];
    }
    const norm = (windowSize - lag) * energy;
    const normalised = norm > 0 ? corr / norm : 0;
    if (normalised > bestCorr) {
      bestCorr = normalised;
      bestPeriod = lag;
    }
  }

  if (bestCorr < 0.35 || bestPeriod === 0) return 0;
  return sampleRate / bestPeriod;
}

function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

function freqToNoteName(freq: number): string {
  if (freq <= 0) return '-';
  const midi = Math.round(freqToMidi(freq));
  const octave = Math.floor(midi / 12) - 1;
  const pc = ((midi % 12) + 12) % 12;
  if (octave < 0 || octave > 9) return '-';
  return NOTE_NAMES[pc] + octave;
}

// Apply linear fade-in and fade-out directly to sample data to eliminate clicks
function applyFadeInOut(data: Float32Array, fadeInSamples: number, fadeOutSamples: number) {
  const fi = Math.min(fadeInSamples, data.length);
  const fo = Math.min(fadeOutSamples, data.length);
  for (let i = 0; i < fi; i++) data[i] *= i / fi;
  for (let i = 0; i < fo; i++) data[data.length - 1 - i] *= i / fo;
}

// Search nearby samples for a zero crossing (positive-going: neg→pos)
function snapToZeroCrossing(channelData: Float32Array, index: number, maxSearch: number): number {
  for (let k = 0; k < maxSearch; k++) {
    const fwd = index + k;
    if (fwd < channelData.length - 1 && channelData[fwd] <= 0 && channelData[fwd + 1] > 0) return fwd;
    const bwd = index - k;
    if (bwd > 0 && channelData[bwd] <= 0 && channelData[bwd + 1] > 0) return bwd;
  }
  return index;
}

interface SliceInfo {
  buffer: Tone.ToneAudioBuffer;
  id: number;
  note: string;
  detectedMidi: number; // 0 if unpitched
}

interface AudioSlicerInterfaceProps {
  onBack: () => void;
}

export function AudioSlicerInterface({ onBack }: AudioSlicerInterfaceProps) {
  const [slicingMode, setSlicingMode]   = useState<'Transients' | 'Beats' | 'Equal Intervals' | 'Notes'>('Transients');
  const [sliceDensity, setSliceDensity] = useState<number>(50);
  const [beatsPerSlice, setBeatsPerSlice] = useState<number>(1);
  const [sliceBpm, setSliceBpm] = useState<number>(120);
  const [playbackMode, setPlaybackMode] = useState<'One-Shot' | 'Gate' | 'Loop'>('One-Shot');
  const [repitchScale, setRepitchScale] = useState<string>('Default');

  const [audioBuffer, setAudioBuffer] = useState<Tone.ToneAudioBuffer | null>(null);
  const [slices, setSlices]           = useState<SliceInfo[]>([]);
  const [activePad, setActivePad]     = useState<number | null>(null);

  const playersRef = useRef<Tone.Player[]>([]);

  // ─── Slicing ─────────────────────────────────────────────────────────────────

  const sliceAudio = useCallback((
    buffer: Tone.ToneAudioBuffer,
    mode: string,
    density: number,
    beats: number,
    bpm: number,
    scaleKey: string,
  ) => {
    if (!buffer || !buffer.get()) return;

    const audioBuf   = buffer.get() as AudioBuffer;
    const sampleRate = audioBuf.sampleRate;
    const channelData = audioBuf.getChannelData(0);
    const totalLen    = channelData.length;
    const slicePoints: number[] = [0];

    if (mode === 'Equal Intervals') {
      const numSlices = Math.max(2, Math.round(2 + (density / 100) * 30));
      const step = Math.floor(totalLen / numSlices);
      for (let i = 1; i < numSlices; i++) {
        slicePoints.push(snapToZeroCrossing(channelData, i * step, 1024));
      }

    } else if (mode === 'Beats') {
      const samplesPerBeat  = (60 * sampleRate) / bpm;
      const samplesPerSlice = Math.floor(samplesPerBeat * beats);
      for (let i = samplesPerSlice; i < totalLen; i += samplesPerSlice) {
        slicePoints.push(snapToZeroCrossing(channelData, i, 1024));
      }

    } else if (mode === 'Notes') {
      const windowSize     = Math.floor(sampleRate * 0.05);
      const centsThreshold = 50 + ((100 - density) / 100) * 150;
      const minGapSamples  = Math.floor(sampleRate * 0.08);
      let lastNoteFreq  = 0;
      let lastSliceAt   = 0;

      for (let i = 0; i < totalLen - windowSize; i += windowSize) {
        const frame = channelData.subarray(i, i + windowSize);
        const freq  = detectPitchHz(frame, sampleRate);
        if (freq > 0) {
          if (lastNoteFreq === 0) {
            lastNoteFreq = freq;
          } else {
            const cents = Math.abs(1200 * Math.log2(freq / lastNoteFreq));
            if (cents > centsThreshold && (i - lastSliceAt) > minGapSamples) {
              const zc = snapToZeroCrossing(channelData, i, 1024);
              slicePoints.push(zc);
              lastSliceAt  = zc;
              lastNoteFreq = freq;
            }
          }
        } else {
          lastNoteFreq = 0;
        }
      }

    } else {
      // Transients — energy-ratio onset detection with proper adaptive tracking
      const frameSize   = Math.floor(sampleRate * 0.01); // 10 ms frames
      const minGap      = Math.floor(sampleRate * 0.06); // 60 ms minimum between onsets
      // threshold scales with density: high density → more sensitive
      const threshold   = 3.0 - (density / 100) * 1.8;  // 1.2 … 3.0
      let   longTermRMS = 0.0001;
      let   lastOnset   = 0;

      for (let i = frameSize; i < totalLen - frameSize; i += frameSize) {
        let energy = 0;
        for (let j = 0; j < frameSize; j++) energy += channelData[i + j] ** 2;
        const rms = Math.sqrt(energy / frameSize);

        // Update long-term average BEFORE comparing (key fix: don't reset to rms after onset)
        longTermRMS = longTermRMS * 0.92 + rms * 0.08;

        if (rms > 0.003 && rms / longTermRMS > threshold && (i - lastOnset) > minGap) {
          const zc = snapToZeroCrossing(channelData, i, frameSize);
          slicePoints.push(zc);
          lastOnset = zc;
          // Do NOT reset longTermRMS here — let it keep adapting naturally
        }
      }
    }

    slicePoints.push(totalLen);
    const pts = Array.from(new Set(slicePoints)).sort((a, b) => a - b);

    // Dispose old players
    playersRef.current.forEach(p => p.dispose());
    playersRef.current = [];

    const ctx       = Tone.getContext().rawContext as AudioContext;
    const fadeIn    = Math.floor(sampleRate * 0.005); // 5 ms
    const fadeOut   = Math.floor(sampleRate * 0.015); // 15 ms
    const minSlice  = Math.floor(sampleRate * 0.025); // 25 ms

    const scaleIntervals = REPITCH_SCALES[scaleKey] ?? [];
    const newSlices: SliceInfo[] = [];

    for (let i = 0; i < pts.length - 1; i++) {
      const start = pts[i];
      const end   = pts[i + 1];
      const len   = end - start;
      if (len < minSlice) continue;

      // Detect pitch from the first 4096 samples of the slice
      const analysisWindow = channelData.subarray(start, Math.min(start + 4096, end));
      const freq        = detectPitchHz(analysisWindow, sampleRate);
      const note        = freqToNoteName(freq);
      const detectedMidi = freq > 0 ? freqToMidi(freq) : 0;

      // Build per-channel slice buffer with fades baked in
      const newBuf = ctx.createBuffer(audioBuf.numberOfChannels, len, sampleRate);
      for (let c = 0; c < audioBuf.numberOfChannels; c++) {
        const out = newBuf.getChannelData(c);
        out.set(audioBuf.getChannelData(c).subarray(start, end));
        applyFadeInOut(out, fadeIn, fadeOut);
      }

      const toneBuf = new Tone.ToneAudioBuffer(newBuf);
      const player  = new Tone.Player(toneBuf).toDestination();

      // Pitch-shift via playbackRate when a scale is selected
      if (scaleIntervals.length > 0 && detectedMidi > 0) {
        const shift = semitoneShiftForScale(detectedMidi, scaleIntervals);
        player.playbackRate = 2 ** (shift / 12);
      }

      playersRef.current.push(player);
      newSlices.push({ buffer: toneBuf, id: i, note, detectedMidi });

      if (newSlices.length >= 32) break;
    }

    setSlices(newSlices);
  }, []);

  // Re-slice when any parameter changes
  useEffect(() => {
    if (audioBuffer) {
      sliceAudio(audioBuffer, slicingMode, sliceDensity, beatsPerSlice, sliceBpm, repitchScale);
    }
  }, [slicingMode, sliceDensity, beatsPerSlice, sliceBpm, repitchScale, audioBuffer, sliceAudio]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await Tone.start();
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = Tone.getContext().rawContext as AudioContext;
      const decodedBuf = await audioCtx.decodeAudioData(arrayBuffer);
      const toneBuf = new Tone.ToneAudioBuffer(decodedBuf);
      setAudioBuffer(toneBuf);
    } catch (err) {
      console.error("Failed to load audio file:", err);
      alert("Failed to load audio file.");
    }
  };

  // ─── Playback ─────────────────────────────────────────────────────────────────

  const triggerPad = useCallback((index: number, state: 'start' | 'stop') => {
    if (index >= playersRef.current.length) return;
    const player = playersRef.current[index];
    if (state === 'start') {
      if (player.state === 'started') player.stop();
      setActivePad(index);
      player.loop = playbackMode === 'Loop';
      player.start();
    } else {
      setActivePad(prev => prev === index ? null : prev);
      if (playbackMode === 'Gate' || playbackMode === 'Loop') player.stop();
    }
  }, [playbackMode]);

  useEffect(() => {
    const norm = (key: string) => {
      const map: Record<string, string> = { '?': '/', '<': ',', '>': '.', ':': ';', '"': "'", '{': '[', '}': ']' };
      return map[key] ?? key.toUpperCase();
    };
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
      const idx = KEY_MAPPINGS.indexOf(norm(e.key));
      if (idx !== -1) triggerPad(idx, 'start');
    };
    const onUp = (e: KeyboardEvent) => {
      const idx = KEY_MAPPINGS.indexOf(norm(e.key));
      if (idx !== -1) triggerPad(idx, 'stop');
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup',   onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup',   onUp);
    };
  }, [triggerPad]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 font-sans text-text">
      <button onClick={onBack} className="flex items-center gap-2 mb-6 text-text2 hover:text-text transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium tracking-wide uppercase text-sm">Back to Launchpad</span>
      </button>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-4xl font-normal tracking-tight font-display bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] bg-clip-text text-transparent uppercase">
            Audio Slicer
          </h2>
          <p className="text-text2 mt-2">Chop samples into an MPC-style pad grid</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Settings ── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--bg2)] rounded-2xl border border-[var(--border)] p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-[var(--accent)]" /> Slice Settings
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text2 mb-2">Slicing Mode</label>
                <select
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:border-[var(--accent)] outline-none"
                  value={slicingMode}
                  onChange={e => setSlicingMode(e.target.value as any)}
                >
                  <option value="Transients">Transients</option>
                  <option value="Beats">Beats</option>
                  <option value="Equal Intervals">Equal Intervals</option>
                  <option value="Notes">Notes (Pitch)</option>
                </select>
              </div>

              {slicingMode === 'Beats' ? (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text2 mb-2">BPM</label>
                    <input
                      type="number" min="30" max="300"
                      value={sliceBpm}
                      onChange={e => setSliceBpm(Number(e.target.value))}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text2 mb-2">Beats/Slice</label>
                    <input
                      type="number" min="1" max="16"
                      value={beatsPerSlice}
                      onChange={e => setBeatsPerSlice(Number(e.target.value))}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="flex justify-between text-xs font-semibold uppercase tracking-wider text-text2 mb-2">
                    <span>{slicingMode === 'Equal Intervals' ? 'Number of Slices' : 'Density / Sensitivity'}</span>
                    <span className="text-[var(--accent)]">{sliceDensity}%</span>
                  </label>
                  <input
                    type="range" min="1" max="100"
                    value={sliceDensity}
                    onChange={e => setSliceDensity(Number(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                </div>
              )}

              {/* Repitch Scale */}
              <div className="pt-2 border-t border-[var(--border)]">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text2 mb-2 flex items-center gap-1.5">
                  <Music2 className="w-3.5 h-3.5 text-[var(--accent)]" /> Repitch to Scale
                </label>
                <select
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:border-[var(--accent)] outline-none"
                  value={repitchScale}
                  onChange={e => setRepitchScale(e.target.value)}
                >
                  {Object.keys(REPITCH_SCALES).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {repitchScale !== 'Default' && (
                  <p className="text-[10px] text-text2 mt-1.5 leading-tight">
                    Pitches are shifted by the minimum semitones to land in the selected scale. Playback speed changes slightly.
                  </p>
                )}
              </div>

              {/* Playback Mode */}
              <div className="pt-2 border-t border-[var(--border)]">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text2 mb-2">Playback Mode</label>
                <div className="flex bg-[var(--bg)] rounded-xl border border-[var(--border)] p-1">
                  {(['One-Shot', 'Gate', 'Loop'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setPlaybackMode(m)}
                      className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${playbackMode === m ? 'bg-[var(--accent)] text-white' : 'text-text2 hover:text-text'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <label className="flex w-full cursor-pointer justify-center items-center gap-2 py-3 px-4 bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent)] text-sm rounded-xl transition-all">
                <Upload className="w-4 h-4 text-[var(--accent)]" />
                <span className="font-semibold uppercase tracking-wide">Upload Sample</span>
                <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        </div>

        {/* ── Pad Grid ── */}
        <div className="lg:col-span-2">
          <div className="bg-[var(--bg2)] rounded-2xl border border-[var(--border)] p-6 shadow-sm min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold uppercase tracking-wider">Pad Grid</h3>
              {slices.length > 0 && (
                <span className="text-xs text-text2">{slices.length} slice{slices.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {slices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-text2">
                <Square className="w-12 h-12 mb-4 opacity-20" />
                <p>Upload a sample to generate slices</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                {slices.map((slice, i) => {
                  const isActive = activePad === i;
                  return (
                    <button
                      key={slice.id}
                      onMouseDown={() => triggerPad(i, 'start')}
                      onMouseUp={() => triggerPad(i, 'stop')}
                      onMouseLeave={() => triggerPad(i, 'stop')}
                      style={{
                        background: isActive
                          ? 'linear-gradient(135deg, var(--accent), var(--accent2))'
                          : 'var(--bg)',
                      }}
                      className={`
                        aspect-square rounded-xl border flex flex-col items-center justify-center transition-all duration-75 relative
                        ${isActive
                          ? 'border-transparent shadow-[0_0_15px_var(--accent-glow)] scale-95'
                          : 'border-[var(--border)] hover:border-[var(--accent)] shadow-sm'}
                      `}
                    >
                      <span className={`text-xl font-black font-display opacity-20 ${isActive ? 'text-white' : 'text-text2'}`}>
                        {i + 1}
                      </span>
                      {slice.note && slice.note !== '-' && (
                        <span className={`absolute top-1.5 right-1.5 text-[10px] font-bold ${isActive ? 'text-white/80' : 'text-text2'}`}>
                          {slice.note}
                        </span>
                      )}
                      <span className={`absolute bottom-1 left-1.5 text-[9px] font-bold ${isActive ? 'text-white' : 'text-[var(--accent)]'}`}>
                        [{KEY_MAPPINGS[i] || '-'}]
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
