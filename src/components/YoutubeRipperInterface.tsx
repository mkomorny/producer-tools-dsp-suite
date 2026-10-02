import React, { useState } from 'react';
import { ArrowLeft, Download, Youtube, Video, Music, ChevronDown } from 'lucide-react';

const AUDIO_FORMATS = [
  { value: 'mp3',  label: 'MP3 — Most compatible' },
  { value: 'wav',  label: 'WAV — Lossless PCM' },
  { value: 'flac', label: 'FLAC — Lossless compressed' },
  { value: 'aac',  label: 'AAC — High efficiency' },
  { value: 'm4a',  label: 'M4A — Apple audio' },
  { value: 'ogg',  label: 'OGG — Open format' },
  { value: 'opus', label: 'OPUS — Low-bitrate quality' },
];

const VIDEO_FORMATS = [
  { value: 'mp4',  label: 'MP4 — Most compatible' },
  { value: 'mkv',  label: 'MKV — High quality container' },
  { value: 'webm', label: 'WebM — Open web format' },
];

export function YoutubeRipperInterface({ onBack }: { onBack: () => void }) {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<'audio' | 'video'>('audio');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [videoFormat, setVideoFormat] = useState('mp4');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const format = mode === 'audio' ? audioFormat : videoFormat;

  const handleDownload = async () => {
    if (!url || isLoading) return;
    
    try {
      const urlObj = new URL(url);
      if (!['youtube.com', 'www.youtube.com', 'youtu.be'].includes(urlObj.hostname)) {
        setStatus('Error: Please enter a valid YouTube URL');
        return;
      }
    } catch {
      setStatus('Error: Invalid URL format');
      return;
    }

    setIsLoading(true);
    setStatus('Fetching from YouTube...');
    try {
      const res = await fetch('/api/yt-dl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode, format })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
      }
      setStatus('Download received, saving file...');
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `download.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      setStatus('Done! File saved.');
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectClass = "w-full bg-bg border border-border rounded-lg pl-4 pr-10 py-3 text-text focus:border-[var(--accent)] outline-none transition-colors appearance-none cursor-pointer";

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-bg2 rounded-full transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-text2 group-hover:text-text" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-text tracking-tight flex items-center gap-3">
            <Youtube className="w-6 h-6 text-[var(--accent)]" />
            YouTube Ripper
          </h1>
          <p className="text-text2 text-sm mt-1">Download audio or video from YouTube</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-border/50 rounded-xl overflow-hidden bg-bg2/30 backdrop-blur-sm p-6 flex flex-col gap-6">
        {/* URL input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-text2 uppercase tracking-wider">YouTube URL</label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleDownload()}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text focus:border-[var(--accent)] outline-none transition-colors"
          />
        </div>

        {/* Mode toggle */}
        <div className="flex gap-4">
          <button
            onClick={() => setMode('audio')}
            style={mode === 'audio' ? { backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${mode === 'audio' ? '' : 'bg-bg border-border text-text2 hover:border-[var(--accent)]/50'}`}
          >
            <Music className="w-5 h-5" />
            <span className="font-bold">Audio</span>
          </button>
          <button
            onClick={() => setMode('video')}
            style={mode === 'video' ? { backgroundColor: 'color-mix(in srgb, var(--accent2) 15%, transparent)', borderColor: 'var(--accent2)', color: 'var(--accent2)' } : undefined}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${mode === 'video' ? '' : 'bg-bg border-border text-text2 hover:border-[var(--accent2)]/50'}`}
          >
            <Video className="w-5 h-5" />
            <span className="font-bold">Video</span>
          </button>
        </div>

        {/* Format selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-text2 uppercase tracking-wider">Export Format</label>
          <div className="relative">
            {mode === 'audio' ? (
              <select
                value={audioFormat}
                onChange={e => setAudioFormat(e.target.value)}
                className={selectClass}
              >
                {AUDIO_FORMATS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            ) : (
              <select
                value={videoFormat}
                onChange={e => setVideoFormat(e.target.value)}
                className={selectClass}
              >
                {VIDEO_FORMATS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            )}
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text2 pointer-events-none" />
          </div>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={!url || isLoading}
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: 'var(--bg)' }}
          className="w-full py-4 hover:opacity-95 font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_4px_12px_var(--accent-glow)]"
        >
          <Download className="w-5 h-5" />
          {isLoading ? 'Downloading...' : `Download ${format.toUpperCase()}`}
        </button>

        {status && (
          <div className={`p-4 bg-bg rounded-lg border text-center text-sm font-mono ${status.startsWith('Error') ? 'border-red-500/50 text-red-400' : 'border-border text-text2'}`}>
            {status}
          </div>
        )}

        {/* Dependencies note */}
        <p className="text-xs text-text2/50 text-center">
          Requires <span className="font-mono">yt-dlp</span> and <span className="font-mono">ffmpeg</span> installed in PATH or in the <span className="font-mono">bin/</span> folder
        </p>
      </div>
    </div>
  );
}
