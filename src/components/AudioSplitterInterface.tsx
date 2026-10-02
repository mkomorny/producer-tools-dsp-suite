import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Play, Pause, Square, SkipBack, Download, FileAudio, Disc, Scissors, Layers, Activity, AlertCircle, Info } from 'lucide-react';
import * as Tone from 'tone';

const STEM_COLORS: Record<string, string> = {
  vocals:       'var(--accent)',
  drums:        'var(--accent2)',
  bass:         '#f59e0b',
  other:        '#10b981',
  instrumental: '#8b5cf6',
};

export function AudioSplitterInterface({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(null);

  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'demucs' | 'basic' | null>(null);

  const [stems, setStems] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [stemBlobUrls, setStemBlobUrls] = useState<Record<string, string>>({});

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [soloStates, setSoloStates] = useState<Record<string, boolean>>({});
  const [muteStates, setMuteStates] = useState<Record<string, boolean>>({});

  const playersRef = useRef<Record<string, Tone.Player>>({});
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      Object.values(playersRef.current).forEach(p => { try { p?.dispose(); } catch {} });
      Object.values(stemBlobUrls).forEach(u => URL.revokeObjectURL(u));
    };
  }, []);

  const updateProgress = useCallback(() => {
    if (Tone.Transport.state === 'started') {
      setCurrentTime(Tone.Transport.seconds);
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  useEffect(() => {
    const isAnySolo = Object.values(soloStates).some(s => s);
    for (const [stem, player] of Object.entries(playersRef.current)) {
      if (stem === 'original') continue;
      player.mute = muteStates[stem] || (isAnySolo && !soloStates[stem]);
    }
  }, [soloStates, muteStates]);

  const stopPlayback = () => {
    Tone.Transport.stop();
    setIsPlaying(false);
    setCurrentTime(0);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setStems([]);
    setJobId(null);
    setStemBlobUrls({});
    setMode(null);
    setStatus('');
    stopPlayback();
    Tone.Transport.cancel(0);

    // Dispose previous players
    Object.values(playersRef.current).forEach(p => { try { p?.dispose(); } catch {} });
    playersRef.current = {};

    // Decode locally for original playback preview
    try {
      await Tone.start();
      const arrayBuf = await f.arrayBuffer();
      const decoded = await Tone.context.decodeAudioData(arrayBuf.slice(0));
      setOriginalBuffer(decoded);
      playersRef.current.original = new Tone.Player(decoded).toDestination().sync().start(0);
    } catch {
      setOriginalBuffer(null);
    }
  };

  const handleSplit = async () => {
    if (!file || isProcessing) return;

    stopPlayback();
    Tone.Transport.cancel(0);
    setIsProcessing(true);
    setStems([]);
    setJobId(null);
    setStemBlobUrls({});
    setMode(null);

    try {
      setStatus('Uploading audio to server…');
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/stem-split', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
      }

      const { jobId: jId, stems: stemList, mode: sepMode } = await res.json();
      setJobId(jId);
      setMode(sepMode);
      setStatus(`Separation complete (${sepMode === 'demucs' ? 'Demucs AI' : 'Basic ffmpeg'}). Loading stems…`);

      // Dispose original player, mute it
      if (playersRef.current.original) {
        playersRef.current.original.mute = true;
      }

      // Fetch and decode each stem
      const newBlobUrls: Record<string, string> = {};
      const newSolo: Record<string, boolean> = {};
      const newMute: Record<string, boolean> = {};

      for (const stem of stemList) {
        setStatus(`Loading stem: ${stem}…`);
        const r = await fetch(`/api/stem-split/${jId}/${stem}`);
        if (!r.ok) throw new Error(`Failed to fetch stem: ${stem}`);
        const arrayBuf = await r.arrayBuffer();

        // Save blob URL for downloads
        const blob = new Blob([arrayBuf.slice(0)], { type: 'audio/mpeg' });
        newBlobUrls[stem] = URL.createObjectURL(blob);

        // Decode for Tone.js playback
        const audioBuf = await Tone.context.decodeAudioData(arrayBuf);
        if (playersRef.current[stem]) playersRef.current[stem].dispose();
        playersRef.current[stem] = new Tone.Player(audioBuf).toDestination().sync().start(0);

        newSolo[stem] = false;
        newMute[stem] = false;
      }

      setStemBlobUrls(newBlobUrls);
      setSoloStates(newSolo);
      setMuteStates(newMute);
      setStems(stemList);
      setStatus('');

    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const playPlayback = async () => {
    await Tone.start();
    Tone.Transport.start();
    setIsPlaying(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateProgress);
  };

  const pausePlayback = () => {
    Tone.Transport.pause();
    setIsPlaying(false);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    Tone.Transport.seconds = t;
    setCurrentTime(t);
  };

  const downloadStem = (stem: string) => {
    const url = stemBlobUrls[stem];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.replace(/\.[^.]+$/, '') || 'audio'}_${stem}.mp3`;
    a.click();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  const duration = originalBuffer ? originalBuffer.duration : 0;

  return (
    <div className="max-w-5xl mx-auto px-6 font-sans">
      <div className="flex items-center justify-between mb-8 pt-6">
        <h2 className="text-4xl font-normal tracking-tight bg-gradient-to-r from-[var(--accent)] via-[var(--accent2)] to-[var(--accent)] bg-clip-text text-transparent uppercase font-display">
          Audio Stem Splitter
        </h2>
        <button
          onClick={onBack}
          className="px-5 py-2 border border-[var(--border)] hover:border-[var(--accent)] rounded-full text-sm font-medium text-text2 hover:text-[var(--accent)] transition-colors"
        >
          Exit Tool
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="md:col-span-1 space-y-6 min-w-0">
          {/* Upload */}
          <div className="p-6 bg-bg2 border border-[var(--border)] rounded-2xl shadow-xl">
            <h3 className="text-sm font-bold text-text uppercase tracking-wider mb-4 flex items-center gap-2">
              <Upload size={16} className="text-[var(--accent)]" /> Input Source
            </h3>

            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border)] rounded-xl hover:border-[var(--accent)] transition-colors cursor-pointer mb-4">
              <div className="flex flex-col items-center justify-center py-4">
                <FileAudio size={28} className="text-text3 mb-2" />
                {file ? (
                  <p className="text-xs text-text2 font-bold text-center px-2">{file.name}</p>
                ) : (
                  <>
                    <p className="text-xs text-text2 font-medium">Click to upload mix</p>
                    <p className="text-[10px] text-text3 mt-1">WAV, MP3, FLAC, OGG…</p>
                  </>
                )}
              </div>
              <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
            </label>

            <button
              disabled={!file || isProcessing}
              onClick={handleSplit}
              className={`w-full py-3 rounded-lg font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 ${
                !file || isProcessing
                  ? 'bg-bg3 text-text3 cursor-not-allowed border border-[var(--border)]'
                  : 'bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--bg)] shadow-[0_0_15px_var(--accent-glow)]'
              }`}
            >
              {isProcessing
                ? <><Activity size={14} className="animate-pulse" /> Separating…</>
                : <><Scissors size={16} /> Split Stems</>
              }
            </button>

            {status && (
              <div className={`mt-3 p-3 rounded-lg text-xs font-mono leading-relaxed whitespace-pre-wrap ${
                status.startsWith('Error')
                  ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                  : 'bg-[var(--bg)] border border-[var(--border)] text-text2'
              }`}>
                {status.startsWith('Error') && <AlertCircle size={12} className="inline mr-1 mb-0.5" />}
                {status}
              </div>
            )}

            {mode && (
              <div className="mt-3 p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex items-start gap-2">
                <Info size={12} className="text-[var(--accent)] mt-0.5 shrink-0" />
                <p className="text-[10px] text-text2 leading-relaxed">
                  {mode === 'demucs'
                    ? 'Separated using Demucs AI (4 stems: vocals, drums, bass, other).'
                    : 'Separated using ffmpeg mid/side extraction. Install Demucs for AI-quality 4-stem separation: pip install demucs'}
                </p>
              </div>
            )}

            {!file && (
              <p className="mt-3 text-[10px] text-text3 leading-relaxed">
                Uses <span className="font-mono text-[var(--accent)]">Demucs</span> (AI, 4 stems) or <span className="font-mono">ffmpeg</span> (basic). Install Demucs: <span className="font-mono">pip install demucs</span>
              </p>
            )}
          </div>

          {/* Transport */}
          <div className="p-6 bg-bg2 border border-[var(--border)] rounded-2xl shadow-xl">
            <h3 className="text-sm font-bold text-text uppercase tracking-wider mb-4 flex items-center gap-2">
              <Disc size={16} className="text-[var(--accent2)]" /> Transport
            </h3>

            <div className="mb-4">
              <div className="flex justify-between text-[10px] text-text3 font-mono mb-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <input
                type="range" min="0" max={duration || 100} step="0.01"
                value={currentTime} onChange={handleSeek}
                disabled={!originalBuffer}
                className="w-full h-2 bg-bg3 rounded-lg appearance-none cursor-pointer accent-[var(--accent2)]"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { Tone.Transport.position = 0; setCurrentTime(0); }}
                disabled={!originalBuffer}
                className="flex-1 py-3 rounded-xl flex items-center justify-center border border-[var(--border)] text-text2 hover:text-[var(--accent2)] hover:border-[var(--accent2)] disabled:opacity-50 transition-colors"
              >
                <SkipBack size={18} />
              </button>

              {!isPlaying ? (
                <button
                  onClick={playPlayback}
                  disabled={!originalBuffer}
                  className="flex-[2] py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-2 border border-[var(--accent2)] text-[var(--accent2)] hover:bg-[var(--accent2)] hover:text-white disabled:opacity-50 disabled:border-[var(--border)] disabled:text-text3"
                >
                  <Play size={18} /> Play
                </button>
              ) : (
                <button
                  onClick={pausePlayback}
                  className="flex-[2] py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-2 border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                >
                  <Pause size={18} /> Pause
                </button>
              )}

              <button
                onClick={stopPlayback}
                disabled={!originalBuffer}
                className="flex-1 py-3 rounded-xl flex items-center justify-center border border-[var(--border)] text-text2 hover:text-red-400 hover:border-red-400/50 disabled:opacity-50 transition-colors"
              >
                <Square size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Stem Mixer */}
        <div className="md:col-span-2 min-w-0">
          <div className="p-6 bg-bg2 border border-[var(--border)] rounded-2xl shadow-xl h-full">
            <h3 className="text-sm font-bold text-text uppercase tracking-wider mb-6 flex items-center gap-2">
              <Layers size={16} className="text-[var(--accent)]" /> Stem Mixer
            </h3>

            {stems.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-xl text-text3">
                <Layers size={48} className="mb-4 opacity-50" />
                <p className="text-sm font-medium text-center px-6">
                  {isProcessing
                    ? 'Separating stems… this may take 1–5 minutes for longer tracks.'
                    : 'Upload audio and click "Split Stems" to separate instruments.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stems.map((stem) => {
                  const color = STEM_COLORS[stem] || 'var(--accent)';
                  return (
                    <div key={stem} className="flex items-center gap-4 bg-bg3 p-4 rounded-xl border border-[var(--border)]">
                      <div className="w-28 shrink-0">
                        <span className="font-display text-lg uppercase tracking-wider font-bold" style={{ color }}>
                          {stem}
                        </span>
                      </div>

                      <div className="flex-1 flex gap-2">
                        <button
                          onClick={() => setMuteStates(p => ({ ...p, [stem]: !p[stem] }))}
                          className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg border transition-all ${
                            muteStates[stem]
                              ? 'bg-red-500 border-red-500 text-white'
                              : 'bg-bg border-[var(--border)] text-text2 hover:border-red-400'
                          }`}
                        >
                          Mute
                        </button>
                        <button
                          onClick={() => setSoloStates(p => ({ ...p, [stem]: !p[stem] }))}
                          style={soloStates[stem] ? { backgroundColor: color, borderColor: color, color: 'var(--bg)' } : undefined}
                          className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg border transition-all ${
                            soloStates[stem] ? '' : 'bg-bg border-[var(--border)] text-text2 hover:border-[var(--accent)]'
                          }`}
                        >
                          Solo
                        </button>
                      </div>

                      <button
                        onClick={() => downloadStem(stem)}
                        className="w-12 h-10 flex items-center justify-center bg-bg border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] rounded-lg transition-colors text-text2"
                        title={`Download ${stem}.mp3`}
                      >
                        <Download size={16} />
                      </button>
                    </div>
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
