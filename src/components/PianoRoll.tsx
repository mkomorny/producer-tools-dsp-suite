import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Trash2, Undo, Play, Pause, Square, Repeat, Music, ToggleLeft, ToggleRight, Magnet, Scissors, Maximize } from 'lucide-react';

export type PianoRollNote = {
  note: number;
  exactPitch?: number; // Stores the raw, unrounded pitch float
  startTime: number;
  duration: number;
  id: string;
};

interface PianoRollProps {
  notes: PianoRollNote[];
  setNotes: (notes: PianoRollNote[]) => void;
  onUndo: () => void;
  playSound: (note: number[], time: number) => void;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  isPlaybackActiveRef: React.MutableRefObject<boolean>;
  numSteps?: number;
  scalePitchClasses?: number[];
}

const getNoteName = (midi: number): string => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 2; // C3 = 60 (Ableton/Logic Standard)
  return `${notes[midi % 12]}${octave}`;
};

const analyzeKeyAndScale = (midiNotes: PianoRollNote[]): { key: string; scale: string } => {
  if (midiNotes.length === 0) return { key: 'None', scale: 'None' };

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const pitchCounts = new Array(12).fill(0);
  midiNotes.forEach(n => {
    const pc = Math.round(n.note) % 12;
    pitchCounts[pc]++;
  });

  const DETECTOR_SCALES: Record<string, number[]> = {
    Major: [0, 2, 4, 5, 7, 9, 11],
    Minor: [0, 2, 3, 5, 7, 8, 10],
    Dorian: [0, 2, 3, 5, 7, 9, 10],
    Phrygian: [0, 1, 3, 5, 7, 8, 10],
    Lydian: [0, 2, 4, 6, 7, 9, 11],
    Mixolydian: [0, 2, 4, 5, 7, 9, 10],
    Locrian: [0, 1, 3, 5, 6, 8, 10],
    'Pentatonic Major': [0, 2, 4, 7, 9],
    'Pentatonic Minor': [0, 3, 5, 7, 10],
    Blues: [0, 3, 5, 6, 7, 10],
    'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
    'Melodic Minor': [0, 2, 3, 5, 7, 9, 11],
    'Spanish Phrygian': [0, 1, 4, 5, 7, 8, 10],
    'Whole Tone': [0, 2, 4, 6, 8, 10],
    'Japanese (In Sen)': [0, 1, 5, 7, 8],
    'Bebop Dominant': [0, 2, 4, 5, 7, 9, 10, 11],
    'Natural Minor': [0, 2, 3, 5, 7, 8, 10],
    'Harmonic Major': [0, 2, 4, 5, 7, 8, 11],
    'Double Harmonic Major': [0, 1, 4, 5, 7, 8, 11],
    'Hungarian Minor': [0, 2, 3, 6, 7, 8, 11],
    'Neapolitan Major': [0, 1, 3, 5, 7, 9, 11],
    'Neapolitan Minor': [0, 1, 3, 5, 7, 8, 11],
    Enigmatic: [0, 1, 4, 6, 8, 10, 11],
    Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    'Diminished (Whole-Half)': [0, 2, 3, 5, 6, 8, 9, 11],
    'Diminished (Half-Whole)': [0, 1, 3, 4, 6, 7, 9, 10],
    Hirajoshi: [0, 2, 3, 7, 8],
    Kumoi: [0, 2, 3, 7, 9],
    Pelog: [0, 1, 3, 7, 8],
    'Super Locrian': [0, 1, 3, 4, 6, 8, 10],
    Slendro: [0, 2, 5, 7, 9],
    Prometheus: [0, 2, 4, 6, 9, 10],
    'Locrian Natural 2': [0, 2, 3, 5, 6, 8, 10],
    'Bebop Major': [0, 2, 4, 5, 7, 8, 9, 11],
    'Phrygian Dominant': [0, 1, 4, 5, 7, 8, 10],
    'Lydian Minor': [0, 3, 4, 6, 7, 9, 10],
    'Mixolydian b6': [0, 2, 4, 5, 7, 8, 10],
    'Dorian b2': [0, 1, 3, 5, 7, 9, 10],
    'Lydian b7': [0, 2, 4, 6, 7, 9, 10],
    'Major Pentatonic b3': [0, 3, 4, 7, 9],
    'Nine-Tone Scale': [0, 2, 3, 4, 6, 7, 8, 9, 11],
    'Eighth-Mode Sphinx': [0, 2, 4, 6, 7, 9, 10, 11],
    'Prometheus Neapolitan': [0, 1, 3, 6, 9, 10],
    'Romanian Minor': [0, 2, 3, 6, 7, 9, 10],
    'Mixolydian b2 b6': [0, 1, 4, 5, 7, 8, 10],
    'Half-Diminished Bebop': [0, 2, 3, 5, 6, 8, 9, 11],
    'Minor Bebop': [0, 2, 3, 5, 7, 8, 9, 11],
    'Leading Whole-Tone': [0, 2, 4, 6, 8, 9, 11],
    Ionian: [0, 2, 4, 5, 7, 9, 11],
    'Fibonacci Scale': [0, 1, 3, 5, 8, 10],
    'Golden Ratio Scale': [0, 2, 3, 5, 8, 10],
    'Stochastic Scale': [0, 2, 5, 7, 8, 11],
    'Chaos Scale': [0, 1, 4, 5, 8, 9, 11],
    'Whole-Tone': [0, 2, 4, 6, 8, 10],
    'Messiaen Modes': [0, 1, 3, 4, 6, 7, 9, 10],
    'Minor Blues': [0, 3, 5, 6, 7, 10],
  };

  let bestKey = 'C';
  let bestScale = 'Major';
  let maxScore = -999999;

  for (let root = 0; root < 12; root++) {
    for (const [scaleName, intervals] of Object.entries(DETECTOR_SCALES)) {
      const allowedPitches = intervals.map(interval => (root + interval) % 12);
      
      let scaleScore = 0;
      // Evaluate standard MIR fitness
      for (let pc = 0; pc < 12; pc++) {
        if (pitchCounts[pc] > 0) {
          if (allowedPitches.includes(pc)) {
            scaleScore += pitchCounts[pc] * 4; // Reward matches
          } else {
            scaleScore -= pitchCounts[pc] * 5; // Heavily penalize non-scale notes
          }
        }
      }
      
      // Fine-grained score tie-breaker preferring fewer pitch-class excess
      scaleScore -= intervals.length * 0.05;

      if (scaleScore > maxScore) {
        maxScore = scaleScore;
        bestKey = noteNames[root];
        bestScale = scaleName;
      }
    }
  }

  return { key: bestKey, scale: bestScale };
};

export function PianoRoll({
  notes,
  setNotes,
  onUndo,
  playSound,
  isRecording,
  setIsRecording,
  isPlaybackActiveRef,
  scalePitchClasses
}: PianoRollProps) {
  const minNote = 36; 
  const maxNote = 84; 
  const noteRows = maxNote - minNote + 1;

  // Quantization state: turned OFF by default as requested
  const [isQuantized, setIsQuantized] = useState(false);
  const [showScaleOnly, setShowScaleOnly] = useState(false);
  const [highlightScale, setHighlightScale] = useState(false);

  const [totalDuration, setTotalDuration] = useState(8);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(100);
  const [cellHeight, setCellHeight] = useState(22);
  const pianoRollContainerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  const notesRef = useRef(notes);
  const isQuantizedRef = useRef(isQuantized);
  const scheduledEventsRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const [scaleAnalysis, setScaleAnalysis] = useState({ key: 'None', scale: 'None' });

  // List of midis rendered from top to bottom
  const visibleMidis = React.useMemo(() => {
    const arr = [];
    for (let m = maxNote; m >= minNote; m--) {
      if (showScaleOnly && scalePitchClasses) {
        if (scalePitchClasses.includes(m % 12)) {
          arr.push(m);
        }
      } else {
        arr.push(m);
      }
    }
    return arr;
  }, [showScaleOnly, scalePitchClasses, maxNote, minNote]);

  const activeNoteRows = visibleMidis.length;

  useEffect(() => {
    isQuantizedRef.current = isQuantized;
    if (isPlaying) {
      schedulePlayback();
    }
  }, [isQuantized]);

  useEffect(() => {
    notesRef.current = notes;
    if (notes.length > 0) {
      const maxTime = Math.max(...notes.map(n => n.startTime + n.duration));
      setTotalDuration(prev => Math.max(prev, maxTime));
      setScaleAnalysis(analyzeKeyAndScale(notes));
    } else {
      setScaleAnalysis({ key: 'None', scale: 'None' });
    }
    if (isPlaying) schedulePlayback();
  }, [notes]);

  const handleCrop = () => {
    if (notes.length === 0) return;
    const minStart = Math.min(...notes.map(n => n.startTime));
    if (minStart > 0) {
      const cropped = notes.map(n => ({
        ...n,
        startTime: Math.max(0, n.startTime - minStart)
      }));
      setNotes(cropped);
    }
    // Set totalDuration to precisely the end of the last note
    const maxTime = Math.max(...notes.map(n => (n.startTime - minStart) + n.duration));
    setTotalDuration(Math.max(0.5, maxTime));
  };

  const handleSnapToView = () => {
    if (!pianoRollContainerRef.current || notes.length === 0) return;
    const container = pianoRollContainerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight || 300;
    const leftLabelWidth = 65;

    const targetWidth = containerWidth - leftLabelWidth - 20; 
    const maxTime = Math.max(...notes.map(n => n.startTime + n.duration));
    const activePitches = notes.map(n => isQuantized ? Math.round(n.note) : (n.exactPitch || n.note));
    const minActive = Math.min(...activePitches);
    const maxActive = Math.max(...activePitches);

    const safeMaxTime = Math.max(0.5, maxTime);
    const newPixelsPerSecond = targetWidth / safeMaxTime;
    setPixelsPerSecond(Math.max(10, newPixelsPerSecond));

    const activeRowsCount = Math.max(1, maxActive - minActive + 4);
    const newCellHeight = containerHeight / activeRowsCount;
    setCellHeight(Math.max(12, newCellHeight));

    setTimeout(() => {
      if (!pianoRollContainerRef.current) return;
      const targetRowIndex = maxNote - Math.ceil(maxActive) - 1;
      pianoRollContainerRef.current.scrollTop = Math.max(0, targetRowIndex * newCellHeight);
      pianoRollContainerRef.current.scrollLeft = 0;
    }, 50);
  };

  const handleSnapToMidi = () => {
    if (notes.length === 0) return;
    const snapped = notes.map(n => {
      const snappedMidi = Math.round(n.note);
      const roundedStart = Math.round(n.startTime * 8) / 8;
      const roundedDur = Math.max(0.125, Math.round(n.duration * 8) / 8);
      return {
        ...n,
        note: snappedMidi,
        exactPitch: snappedMidi,
        startTime: roundedStart,
        duration: roundedDur
      };
    });
    setNotes(snapped);
  };

  useEffect(() => {
    const container = pianoRollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        setPixelsPerSecond(prev => Math.min(500, Math.max(30, prev * factor)));
        setCellHeight(prev => Math.min(60, Math.max(12, prev * factor)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [cellHeight]);

  const clearScheduledEvents = () => {
    scheduledEventsRef.current.forEach(id => {
      try { Tone.Transport.clear(id); } catch (e) {}
    });
    scheduledEventsRef.current = [];
  };

  const schedulePlayback = () => {
    clearScheduledEvents();
    notesRef.current.forEach(noteObj => {
      // Dynamic pitch selection based on active toggle preference
      const playbackPitch = isQuantizedRef.current 
        ? Math.round(noteObj.note) 
        : (noteObj.exactPitch || noteObj.note);

      const id = Tone.Transport.schedule((time) => {
        playSound([playbackPitch], time);
      }, noteObj.startTime);
      scheduledEventsRef.current.push(id);
    });
  };

  useEffect(() => {
    const updatePlayhead = () => {
      if (isPlaying) {
        setPlaybackTime(Tone.Transport.seconds);
        animationFrameRef.current = requestAnimationFrame(updatePlayhead);
      }
    };
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      setPlaybackTime(0);
      Tone.Transport.seconds = 0;
      schedulePlayback();
      Tone.Transport.start();
      isPlaybackActiveRef.current = true;
    } else {
      Tone.Transport.stop();
      clearScheduledEvents();
      setPlaybackTime(0);
      isPlaybackActiveRef.current = false;
    }
    return () => clearScheduledEvents();
  }, [isPlaying, isPlaybackActiveRef]);

  useEffect(() => {
    Tone.Transport.loop = isLooping;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = totalDuration;
  }, [isLooping, totalDuration]);

  const handleNoteMouseDown = (noteId: string, initialEvent: React.MouseEvent) => {
    initialEvent.stopPropagation();
    initialEvent.preventDefault();

    const targetNote = notes.find(n => n.id === noteId);
    if (!targetNote) return;

    const startX = initialEvent.clientX;
    const startY = initialEvent.clientY;
    const initialStartTime = targetNote.startTime;
    const initialNoteNumber = targetNote.note;
    const initialExactPitch = targetNote.exactPitch || targetNote.note;
    const initialDuration = targetNote.duration;

    const isEdgeClick = startX > initialEvent.currentTarget.getBoundingClientRect().right - 12;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / pixelsPerSecond;
      const deltaY = Math.round((moveEvent.clientY - startY) / cellHeight);

      setNotes(notesRef.current.map(n => {
        if (n.id !== noteId) return n;
        if (isEdgeClick) {
          let newDuration = Math.max(0.04, initialDuration + deltaX);
          if (isQuantizedRef.current) {
            newDuration = Math.max(0.125, Math.round(newDuration * 8) / 8);
          }
          return { ...n, duration: newDuration };
        } else {
          let updatedNote = initialNoteNumber;
          let updatedExact = initialExactPitch;
          if (showScaleOnly) {
             const startVisibleIndex = visibleMidis.indexOf(Math.round(initialNoteNumber));
             if (startVisibleIndex !== -1) {
                const newVisibleIndex = Math.max(0, Math.min(visibleMidis.length - 1, startVisibleIndex + deltaY));
                updatedNote = visibleMidis[newVisibleIndex];
                updatedExact = visibleMidis[newVisibleIndex]; 
             }
          } else {
             updatedNote = Math.min(maxNote, Math.max(minNote, initialNoteNumber - deltaY));
             updatedExact = Math.min(maxNote, Math.max(minNote, initialExactPitch - deltaY));
          }
          let newStartTime = Math.max(0, initialStartTime + deltaX);
          if (isQuantizedRef.current) {
            newStartTime = Math.round(newStartTime * 8) / 8;
          }
          return {
            ...n,
            startTime: newStartTime,
            note: updatedNote,
            exactPitch: isQuantizedRef.current || showScaleOnly ? updatedNote : updatedExact
          };
        }
      }));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleGridDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return; // ignore if clicking on a note itself
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let startTime = clickX / pixelsPerSecond;
    if (isQuantizedRef.current) {
        startTime = Math.round(startTime * 8) / 8;
    }

    const rowIndex = Math.floor(clickY / cellHeight);
    const clickedNote = showScaleOnly && rowIndex < visibleMidis.length 
      ? visibleMidis[rowIndex] 
      : maxNote - rowIndex;

    const newNote: PianoRollNote = {
      id: Math.random().toString(),
      note: clickedNote,
      startTime,
      duration: 0.25,
      exactPitch: clickedNote,
    };
    setNotes([...notes, newNote]);
  };

  const handleNoteDoubleClick = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(notes.filter(n => n.id !== noteId));
  };

  return (
    <div className="p-4 rounded-xl border select-none font-sans" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4 w-full">

        {/* LEFT: title | scale badge | toggles */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <h3 className="text-xs font-black uppercase tracking-widest shrink-0" style={{ color: 'var(--text2)' }}>Piano Roll</h3>

          <div className="w-[1px] h-4 shrink-0 hidden sm:block" style={{ background: 'var(--border)' }} />

          {/* Scale badge */}
          <div
            style={{ fontFamily: 'Courier New', background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--accent)' }}
            className="flex items-center gap-1.5 px-2 py-0.5 border rounded text-[11px] shrink-0"
          >
            <Music size={11} />
            <span>{scaleAnalysis.key} {scaleAnalysis.scale} · detected</span>
          </div>

          <div className="w-[1px] h-4 shrink-0 hidden sm:block" style={{ background: 'var(--border)' }} />

          {/* SNAP toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider shrink-0" style={{ color: 'var(--text3)' }}>Snap</span>
            <button onClick={() => setIsQuantized(!isQuantized)} className="cursor-pointer flex items-center">
              {isQuantized
                ? <ToggleRight size={20} style={{ color: 'var(--accent)' }}/>
                : <ToggleLeft size={20} style={{ color: 'var(--border)' }}/>}
            </button>
          </div>

          {/* SCALE ONLY toggle */}
          {scalePitchClasses && (
            <>
              <div className="w-[1px] h-8 shrink-0 hidden sm:block" style={{ background: 'var(--border)' }} />
              <div className="flex flex-col gap-1 sm:gap-1.5 justify-center">
                <div className="flex items-center gap-1.5 justify-between">
                  <span className="text-[10px] uppercase tracking-wider shrink-0" style={{ color: 'var(--text3)' }} title="Highlight keys in the active musical scale">Highlight Scale</span>
                  <button onClick={() => setHighlightScale(!highlightScale)} className="cursor-pointer flex items-center">
                    {highlightScale
                      ? <ToggleRight size={16} style={{ color: 'var(--accent2)' }}/>
                      : <ToggleLeft size={16} style={{ color: 'var(--border)' }}/>}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 justify-between">
                  <span className="text-[10px] uppercase tracking-wider shrink-0" style={{ color: 'var(--text3)' }} title="Hide piano roll keys outside the active musical scale">Fold to Scale</span>
                  <button onClick={() => setShowScaleOnly(!showScaleOnly)} className="cursor-pointer flex items-center">
                    {showScaleOnly
                      ? <ToggleRight size={16} style={{ color: 'var(--accent2)' }}/>
                      : <ToggleLeft size={16} style={{ color: 'var(--border)' }}/>}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: action buttons | playback icons | edit icons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto justify-start lg:justify-end">
          {isRecording && (
            <button onClick={() => setIsRecording(false)} className="flex items-center gap-1 px-2 py-1 text-red-400 hover:text-white font-black uppercase text-[10px]">
              <Square size={12} className="fill-current"/> Stop Rec
            </button>
          )}

          {/* QUANTIZE */}
          <button
            onClick={handleSnapToMidi}
            disabled={notes.length === 0}
            style={{ background: 'var(--accent-bg)', borderColor: 'var(--accent)', color: 'var(--accent)' }}
            className="flex items-center gap-1 px-2 py-1 border rounded text-[10px] uppercase tracking-wider font-black hover:opacity-80 cursor-pointer disabled:opacity-40"
            title="Snap all note pitches and timing to the grid"
          >
            <Music size={11} /> Quantize
          </button>

          {/* CROP */}
          <button
            onClick={handleCrop}
            disabled={notes.length === 0}
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text2)' }}
            className="flex items-center gap-1 px-2 py-1 border rounded text-[10px] uppercase tracking-wider font-black hover:opacity-80 cursor-pointer disabled:opacity-40"
            title="Crop silence before and after notes"
          >
            <Scissors size={11} /> Crop
          </button>

          {/* FIT VIEW (Snap) */}
          <button
            onClick={handleSnapToView}
            disabled={notes.length === 0}
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text2)' }}
            className="flex items-center gap-1 px-2 py-1 border rounded text-[10px] uppercase tracking-wider font-black hover:opacity-80 cursor-pointer disabled:opacity-40"
            title="Automatically crop and zoom the view to fit the entire MIDI sequence"
          >
            <Maximize size={11} /> Fit View
          </button>

          <div className="w-[1px] h-4 mx-0.5" style={{ background: 'var(--border)' }} />

          {/* Playback controls */}
          <button onClick={() => setIsPlaying(!isPlaying)} className="p-1 hover:opacity-80" style={{ color: isPlaying ? 'var(--accent)' : 'var(--text3)' }}>
            {isPlaying ? <Pause size={14}/> : <Play size={14}/>}
          </button>
          <button onClick={() => setIsLooping(!isLooping)} className="p-1 hover:opacity-80" style={{ color: isLooping ? 'var(--accent)' : 'var(--text3)' }}>
            <Repeat size={14}/>
          </button>
          <button onClick={() => { setIsPlaying(false); setPlaybackTime(0); }} className="p-1 hover:opacity-80" style={{ color: 'var(--text3)' }}>
            <Square size={14}/>
          </button>

          <div className="w-[1px] h-4 mx-0.5" style={{ background: 'var(--border)' }} />

          <button onClick={onUndo} className="p-1 hover:opacity-80" style={{ color: 'var(--text3)' }}><Undo size={14}/></button>
          <button onClick={() => setNotes([])} className="p-1 hover:text-red-400" style={{ color: 'var(--text3)' }}><Trash2 size={14}/></button>
        </div>
      </div>

      <div
        ref={pianoRollContainerRef}
        className="flex overflow-auto custom-scroll rounded-lg max-h-[400px] relative"
        style={{ border: '1px solid var(--border)' }}
      >
        <div className="flex flex-col" style={{ width: `${65 + (totalDuration * pixelsPerSecond)}px`, background: 'var(--bg)' }}>

          {/* BAR TIMELINE HEADER ROW */}
          <div className="flex h-7 select-none text-[10px] font-mono font-black sticky top-0 z-30" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text3)' }}>
            <div className="w-[65px] z-40 flex items-center justify-center font-black text-[9px] uppercase shrink-0 sticky left-0" style={{ borderRight: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--accent)' }}>
              BARS
            </div>
            <div className="relative flex-grow h-full" style={{ background: 'var(--bg)' }}>
              {Array.from({ length: Math.ceil(totalDuration / 2.0) + 1 }).map((_, barIdx) => {
                const barNum = barIdx + 1;
                const leftPos = barIdx * 2.0 * pixelsPerSecond;
                return (
                  <div
                    key={barNum}
                    className="piano-bar-divider absolute top-0 bottom-0 pl-1.5 flex items-center"
                    style={{ left: `${leftPos}px` }}
                  >
                    <span>{barNum}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex">
            <div className="flex flex-col sticky left-0 z-20 shadow-xl w-[65px] shrink-0" style={{ background: 'var(--bg)', borderRight: '1px solid var(--border)' }}>
              {visibleMidis.map((currentMidi) => {
                const noteLabel = getNoteName(currentMidi);
                const isSharp = noteLabel.includes('#');
                const isScaleNote = highlightScale && scalePitchClasses && scalePitchClasses.includes(currentMidi % 12);

                return (
                  <div
                    key={`label-${currentMidi}`}
                    className={`flex items-center justify-between px-2 text-[10px] font-mono select-none w-full shrink-0 border-b border-[var(--border)] ${isSharp ? 'piano-key-sharp' : 'piano-key-natural'}`}
                    style={{ 
                      height: `${cellHeight}px`,
                      ...(isScaleNote ? { background: 'var(--accent-bg)', color: 'var(--accent)' } : {}) 
                    }}
                  >
                    <span className="text-[8px] opacity-60">{currentMidi}</span>
                    <span>{noteLabel}</span>
                  </div>
                );
              })}
            </div>

            <div className="relative flex-grow" style={{ height: `${activeNoteRows * cellHeight}px`, background: 'var(--bg2)' }} onDoubleClick={handleGridDoubleClick}>
              {visibleMidis.map((currentMidi, rowIndex) => {
                const isSharp = getNoteName(currentMidi).includes('#');
                const isScaleNote = highlightScale && scalePitchClasses && scalePitchClasses.includes(currentMidi % 12);

                return (
                  <div
                    key={`row-${currentMidi}`}
                    className={`absolute left-0 right-0 shrink-0 border-b border-[var(--border)] ${isSharp ? 'piano-row-sharp' : 'piano-row-natural'}`}
                    style={{ 
                      top: `${rowIndex * cellHeight}px`, 
                      height: `${cellHeight}px`,
                      ...(isScaleNote ? { background: 'var(--accent-bg)' } : {})
                    }}
                  />
                );
              })}

              {notes.map((noteObj) => {
                const exactPitchValue = noteObj.exactPitch || noteObj.note;
                const roundedPitch = Math.round(exactPitchValue);

                if (roundedPitch < minNote || roundedPitch > maxNote) return null;

                if (showScaleOnly && scalePitchClasses && !scalePitchClasses.includes(roundedPitch % 12)) {
                  return null;
                }

                let rowTopIndex;
                if (showScaleOnly) {
                  rowTopIndex = visibleMidis.indexOf(roundedPitch);
                  if (rowTopIndex === -1) return null;
                } else {
                  rowTopIndex = isQuantized
                    ? maxNote - roundedPitch
                    : maxNote - exactPitchValue;
                }

                const blockTop = rowTopIndex * cellHeight;
                const blockLeft = noteObj.startTime * pixelsPerSecond;
                const blockWidth = noteObj.duration * pixelsPerSecond;

                return (
                  <div
                    key={noteObj.id}
                    onMouseDown={(e) => handleNoteMouseDown(noteObj.id, e)}
                    onDoubleClick={(e) => handleNoteDoubleClick(noteObj.id, e)}
                    className="piano-note-block absolute rounded shadow-md cursor-grab active:cursor-grabbing group"
                    style={{ top: `${blockTop}px`, left: `${blockLeft}px`, width: `${blockWidth}px`, height: `${cellHeight}px` }}
                  >
                    <span className="piano-note-label absolute left-1 top-0.5 text-[8px] font-bold pointer-events-none whitespace-nowrap overflow-hidden">
                      {getNoteName(roundedPitch)}
                    </span>
                    <div className="piano-note-resize-handle absolute right-0 top-0 bottom-0 w-2 rounded-r cursor-ew-resize opacity-0 group-hover:opacity-100" />
                  </div>
                );
              })}

              <div
                className="absolute top-0 bottom-0 w-[2px] z-10 pointer-events-none"
                style={{ left: `${playbackTime * pixelsPerSecond}px`, background: 'var(--accent2)' }}
              />
            </div>
          </div> {/* CLOSE THE WRAPPING FLEX GRID */}
        </div>
      </div>
    </div>
  );
}