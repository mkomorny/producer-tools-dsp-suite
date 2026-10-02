# Producer Tools DSP Suite

[![Automated Release](https://img.shields.io/badge/release-automated_batch_pipeline-blue.svg)](https://github.com/mkomorny)
[![Pipeline Execution](https://img.shields.io/badge/dispatched_by-background_script-informational.svg)](https://github.com/mkomorny)

> [!NOTE]
> **Automated Distribution**: This repository was automatically sanitized, packaged, and published via a scheduled background batch staging pipeline. All file bundling, licensing, and repository synchronization were dispatched automatically by an automated release runner.

A modern, full-stack WebAudio and DSP audio production workbench built with **React 19**, **TypeScript**, **Electron**, and **Vite**. Features 60+ algorithmic audio transformations, real-time waveform visualization, Praat-WASM acoustic phonetics analysis, an interactive Tone.js Piano Roll, and client-side multi-model AI integrations.

## Core Architecture & Features

### 1. WebAudio DSP Effects Engine (`src/lib/effects/`)
Contains over 60 hand-crafted, algorithmic audio digital signal processing modules implemented in clean TypeScript:
- **Dynamics**: Multi-Band Compressor, Broadcast DRC, Audio Limiter, Noise Gate, Peak Normalizer, RMS Normalizer, Expander.
- **Spectral & Modulation**: Phaser, Flanger, Chorus, Tremolo, Vibrato, Ring Modulator, Spectral Filters, Notch Filter, Band-Pass / Band-Reject.
- **Space & Ambience**: Algorithmic Reverbs (Plate, Spring, Room, Hall, Gated, Reverse Reverb), Delay, Stereo Panner, Mid-Side Encoder/Decoder.
- **Restoration & Forensics**: De-Esser, De-Clicker, De-Crackler, De-Clipper, Denoise Chain, Hum Removal, Phase Fix, Mid-Side Vocal Isolator.
- **Creative & Pitch**: Time Stretch, Sinc Resampler, Pitch Shifter, Stutter, Granulator, Robotize, Bitcrusher, Vinyl Crackle.

### 2. Forensic Vocal & Acoustic Analysis
- Integrates **Praat-WASM** for client-side phonetic analysis: Fundamental Frequency (F0), formant tracking (F1–F4), jitter, shimmer, harmonics-to-noise ratio (HNR), and long-term average spectrum (LTAS).

### 3. Interactive Piano Roll
- Canvas and DOM-based interactive MIDI piano roll powered by **Tone.js**, featuring polyphonic playback, velocity editing, and scale quantization.

### 4. Full-Stack Local Architecture
- **Frontend**: React 19, Tailwind CSS, Lucide icons, Motion animations.
- **Backend / Desktop**: Node.js / Express server (`server.ts`) and Electron desktop runner (`electron-main.cjs`).

## Dependencies

- **Node.js**: v18+
- **TypeScript**: v5+
- Key packages: `react`, `react-dom`, `@tailwindcss/vite`, `tone`, `praat-wasm`, `audiobuffer-to-wav`, `fft.js`, `lucide-react`, `motion`, `express`, `electron`.

## Instructions

See [INSTRUCTIONS.md](./INSTRUCTIONS.md) for local web server and Electron desktop startup commands.

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0) - see the [LICENSE](./LICENSE) file for details.
