import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, Settings2, Download, Film, Music2, X, FileAudio } from 'lucide-react';

interface AudioConverterInterfaceProps {
  onBack: () => void;
}

const AUDIO_FORMATS = [
  { value: 'mp3',  label: 'MP3',  desc: 'Most compatible' },
  { value: 'wav',  label: 'WAV',  desc: 'Lossless PCM' },
  { value: 'flac', label: 'FLAC', desc: 'Lossless compressed' },
  { value: 'aac',  label: 'AAC',  desc: 'High efficiency' },
  { value: 'm4a',  label: 'M4A',  desc: 'Apple audio' },
  { value: 'ogg',  label: 'OGG',  desc: 'Open format' },
  { value: 'opus', label: 'OPUS', desc: 'Low-bitrate quality' },
  { value: 'wma',  label: 'WMA',  desc: 'Windows Media Audio' },
  { value: 'aiff', label: 'AIFF', desc: 'Apple lossless' },
];

const VIDEO_FORMATS = [
  { value: 'mp4',  label: 'MP4',  desc: 'Most compatible' },
  { value: 'mkv',  label: 'MKV',  desc: 'High quality container' },
  { value: 'webm', label: 'WebM', desc: 'Open web format' },
  { value: 'avi',  label: 'AVI',  desc: 'Legacy Windows format' },
  { value: 'mov',  label: 'MOV',  desc: 'Apple QuickTime' },
];

const BITRATES = ['64k', '96k', '128k', '192k', '256k', '320k'];
const SAMPLE_RATES = [
  { value: '22050', label: '22.05 kHz' },
  { value: '44100', label: '44.1 kHz (CD)' },
  { value: '48000', label: '48 kHz' },
  { value: '96000', label: '96 kHz (Hi-Res)' },
];

// All popular audio/video input types the browser can accept
const ACCEPTED_INPUT = [
  'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac',
  'audio/aac', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/opus',
  'audio/x-ms-wma', 'audio/aiff', 'audio/x-aiff',
  'video/mp4', 'video/x-matroska', 'video/webm', 'video/x-msvideo',
  'video/quicktime', 'video/mpeg',
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.opus',
  '.wma', '.aiff', '.aif', '.mp4', '.mkv', '.webm', '.avi', '.mov', '.mpeg', '.mpg',
].join(',');

export function AudioConverterInterface({ onBack }: AudioConverterInterfaceProps) {
  const [file, setFile] = useState<File | null>(null);
  const [outputType, setOutputType] = useState<'audio' | 'video'>('audio');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [videoFormat, setVideoFormat] = useState('mp4');
  const [bitrate, setBitrate] = useState('192k');
  const [sampleRate, setSampleRate] = useState('44100');
  const [channels, setChannels] = useState('0');
  const [volume, setVolume] = useState(1.0);
  const [status, setStatus] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const outputFormat = outputType === 'audio' ? audioFormat : videoFormat;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setStatus(''); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setStatus(''); }
  };

  const handleConvert = async () => {
    if (!file || isConverting) return;
    setIsConverting(true);
    setStatus('Uploading and converting...');

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('outputFormat', outputFormat);
      form.append('bitrate', bitrate);
      form.append('sampleRate', sampleRate);
      form.append('channels', channels);
      form.append('volume', String(volume));

      const res = await fetch('/api/audio-convert', { method: 'POST', body: form });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
      }

      setStatus('Saving file...');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stem = file.name.replace(/\.[^.]+$/, '');
      a.download = `${stem}_converted.${outputFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus('Done! File saved.');
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  const selectClass = "w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm focus:border-[var(--accent)] outline-none transition-colors appearance-none cursor-pointer text-text";

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-[var(--bg2)] rounded-full transition-colors group cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-text2 group-hover:text-text" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-text tracking-tight flex items-center gap-3">
            <FileAudio className="w-6 h-6 text-[var(--accent)]" />
            Audio Converter
          </h1>
          <p className="text-text2 text-sm mt-1">Convert between all popular audio and video formats</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
        {/* Drop zone */}
        <div
          onDrop={handleFileDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors group"
        >
          <input ref={fileInputRef} type="file" accept={ACCEPTED_INPUT} className="hidden" onChange={handleFileChange} />
          <Upload className="w-8 h-8 text-text2 group-hover:text-[var(--accent)] transition-colors" />
          {file ? (
            <div className="text-center">
              <p className="font-bold text-text">{file.name}</p>
              <p className="text-xs text-text2 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB — click to change</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-semibold text-text2">Drop audio or video file here</p>
              <p className="text-xs text-text2/60 mt-1">MP3, WAV, FLAC, AAC, OGG, M4A, OPUS, WMA, AIFF, MP4, MKV, WebM, AVI, MOV…</p>
            </div>
          )}
        </div>

        {/* Output type toggle */}
        <div className="flex gap-3">
          <button
            onClick={() => setOutputType('audio')}
            style={outputType === 'audio' ? { backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-sm transition-all ${outputType === 'audio' ? '' : 'bg-[var(--bg2)] border-[var(--border)] text-text2 hover:border-[var(--accent)]/50'}`}
          >
            <Music2 className="w-4 h-4" />
            Audio Output
          </button>
          <button
            onClick={() => setOutputType('video')}
            style={outputType === 'video' ? { backgroundColor: 'color-mix(in srgb, var(--accent2) 15%, transparent)', borderColor: 'var(--accent2)', color: 'var(--accent2)' } : undefined}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-sm transition-all ${outputType === 'video' ? '' : 'bg-[var(--bg2)] border-[var(--border)] text-text2 hover:border-[var(--accent2)]/50'}`}
          >
            <Film className="w-4 h-4" />
            Video (audio + logo)
          </button>
        </div>

        {/* Format grid */}
        <div className="bg-[var(--bg2)] rounded-xl border border-[var(--border)] p-5 space-y-5">
          {/* Output format */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text2 mb-2">Output Format</label>
            {outputType === 'audio' ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {AUDIO_FORMATS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setAudioFormat(f.value)}
                    style={audioFormat === f.value ? { backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)', borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
                    className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all ${audioFormat === f.value ? '' : 'bg-[var(--bg)] border-[var(--border)] text-text2 hover:border-[var(--accent)]/40'}`}
                  >
                    <div>{f.label}</div>
                    <div className="font-normal opacity-60 text-[10px] mt-0.5">{f.desc}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {VIDEO_FORMATS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setVideoFormat(f.value)}
                    style={videoFormat === f.value ? { backgroundColor: 'color-mix(in srgb, var(--accent2) 20%, transparent)', borderColor: 'var(--accent2)', color: 'var(--accent2)' } : undefined}
                    className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all ${videoFormat === f.value ? '' : 'bg-[var(--bg)] border-[var(--border)] text-text2 hover:border-[var(--accent2)]/40'}`}
                  >
                    <div>{f.label}</div>
                    <div className="font-normal opacity-60 text-[10px] mt-0.5">{f.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {outputType === 'audio' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text2 mb-1.5">Bitrate</label>
                <select value={bitrate} onChange={e => setBitrate(e.target.value)} className={selectClass}>
                  {BITRATES.map(b => <option key={b} value={b}>{b.replace('k', ' kbps')}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text2 mb-1.5">Sample Rate</label>
              <select value={sampleRate} onChange={e => setSampleRate(e.target.value)} className={selectClass}>
                {SAMPLE_RATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text2 mb-1.5">Channels</label>
              <select value={channels} onChange={e => setChannels(e.target.value)} className={selectClass}>
                <option value="0">Auto (keep original)</option>
                <option value="1">Mono</option>
                <option value="2">Stereo</option>
              </select>
            </div>

            <div className={outputType === 'audio' ? '' : 'col-span-2'}>
              <label className="flex justify-between text-xs font-bold uppercase tracking-wider text-text2 mb-1.5">
                <span>Volume</span>
                <span style={{ color: 'var(--accent)' }}>{Math.round(volume * 100)}%</span>
              </label>
              <input
                type="range" min="0.1" max="20.0" step="0.05"
                value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-full accent-[var(--accent)] mt-1"
              />
            </div>
          </div>
        </div>

        {/* Convert button */}
        <button
          onClick={handleConvert}
          disabled={!file || isConverting}
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: 'var(--bg)' }}
          className="w-full py-4 font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:opacity-95"
        >
          {isConverting
            ? <><Settings2 className="w-5 h-5 animate-spin" /> Converting…</>
            : <><Download className="w-5 h-5" /> Convert &amp; Download {outputFormat.toUpperCase()}</>
          }
        </button>

        {status && (
          <div className={`p-4 rounded-xl border text-center text-sm font-mono ${status.startsWith('Error') ? 'border-red-500/50 text-red-400 bg-red-500/5' : 'border-[var(--border)] text-text2 bg-[var(--bg2)]'}`}>
            {status}
          </div>
        )}

        <p className="text-xs text-text2/40 text-center pb-2">
          Requires <span className="font-mono">ffmpeg</span> installed in PATH or in the <span className="font-mono">bin/</span> folder
        </p>
      </div>
    </div>
  );
}
