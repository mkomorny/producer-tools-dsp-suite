#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync, spawn } from 'child_process';
import readline from 'readline';
import { program } from 'commander';
import chalk from 'chalk';

// ==========================================
// 1. External Binary Contract
// ==========================================
function resolveBinary(name) {
  const envVar = name === 'yt-dlp' ? process.env.YTFILE_YTDLP : process.env.YTFILE_FFMPEG;
  if (envVar) return envVar;

  const localPath = path.join(process.cwd(), 'bin', process.platform === 'win32' ? `${name}.exe` : name);
  if (fs.existsSync(localPath)) return localPath;

  if (process.pkg || (process.versions && process.versions.electron)) {
    const resPath = process.resourcesPath || path.dirname(process.execPath);
    const pkgPath = path.join(resPath, process.platform === 'win32' ? `${name}.exe` : name);
    if (fs.existsSync(pkgPath)) return pkgPath;
  }

  return name;
}

function commandExists(cmd) {
  try {
    const res = spawnSync(cmd, ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
    return res.status === 0 && res.stdout && res.stdout.length > 0;
  } catch (e) {
    return false;
  }
}

const ytdlpPath = resolveBinary('yt-dlp');
const ffmpegPath = resolveBinary('ffmpeg');

function checkDependencies() {
  if (!commandExists(ytdlpPath)) {
    console.error(chalk.red('[Error] yt-dlp not found. Please make sure it is installed or placed in the same folder.'));
    process.exit(1);
  }
  if (!commandExists(ffmpegPath)) {
    console.error(chalk.red('[Error] ffmpeg not found. Please make sure it is installed or placed in the same folder.'));
    process.exit(1);
  }
}

// ==========================================
// 3. Playlist Detection and Iteration Logic
// ==========================================
function isPlaylistUrl(url) {
  return url.toLowerCase().includes('playlist?');
}

// ==========================================
// 5. Filename Sanitization and Unique Name Allocation
// ==========================================
function sanitizeFilename(s) {
  if (!s) return 'output';
  return s.replace(/[\\/:*?"<>|]/g, '').trim() || 'output';
}

function getAvailablePath(basePath) {
  if (!fs.existsSync(basePath)) return basePath;
  const ext = path.extname(basePath);
  const name = basePath.slice(0, -ext.length);
  let i = 1;
  while (fs.existsSync(`${name} (${i})${ext}`)) {
    i++;
  }
  return `${name} (${i})${ext}`;
}

// ==========================================
// 4. Title / Metadata Prefetch Algorithms
// ==========================================
function prefetchTitle(url, isPlaylist) {
  try {
    const args = isPlaylist
      ? [url, '--no-download', '--dump-single-json', '--flat-playlist', '--no-warnings']
      : [url, '--no-download', '--print', '%(title)s', '--no-warnings', '--no-playlist'];
    
    const res = spawnSync(ytdlpPath, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    if (res.status !== 0) return null;
    
    if (isPlaylist) {
      const data = JSON.parse(res.stdout);
      return data.title || null;
    }
    return res.stdout.trim() || null;
  } catch (e) {
    return null;
  }
}

// ==========================================
// 6. Output Template and Directory Construction Engine
// ==========================================
function buildOutputTemplate({ isPlaylist, playlistName, outputName, mode, outputDir }) {
  const fallback = mode === 'audio' ? 'Music' : 'Video';
  const folderPart = isPlaylist ? (playlistName || '%(playlist_title)s') : fallback;
  const basePart = (isPlaylist || !outputName) ? '%(title)s' : sanitizeFilename(outputName);
  const extPart = '%(ext)s';
  
  const targetDir = path.join(outputDir, folderPart);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  return `${targetDir.replace(/\\/g, '/')}/${basePart}.${extPart}`;
}

// ==========================================
// 8. yt-dlp Argument Synthesis
// ==========================================
function buildArgs({ url, mode, audioFormat, outputTemplate, isPlaylist, overwrite, noEmbed }) {
  const args = [url, '--ffmpeg-location', ffmpegPath, '-o', outputTemplate, '--no-warnings'];
  
  if (isPlaylist) {
    args.push('--yes-playlist', '--ignore-errors');
  } else {
    args.push('--no-playlist');
  }

  if (overwrite) {
    args.push('--force-overwrites');
  }

  if (mode === 'audio') {
    args.push('-f', 'bestaudio', '-x', '--audio-format', audioFormat, '--audio-quality', '0');
  } else {
    args.push('-f', 'bestvideo[ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]/best[ext=mp4][vcodec^=avc1]', '--merge-output-format', 'mp4');
  }

  if (!noEmbed) {
    args.push('--embed-thumbnail', '--add-metadata');
  }

  return args;
}

// ==========================================
// 11. Supported Audio Formats
// ==========================================
const SUPPORTED_AUDIO_FORMATS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus'];

// ==========================================
// 12. Configuration Persistence
// ==========================================
const configPath = path.join(os.homedir(), '.ytfile', 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {}
  return { defaultOutputDir: path.join(process.cwd(), 'Downloads'), defaultMode: 'audio', maxConcurrency: 2 };
}

function saveConfig(config) {
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {}
}

// ==========================================
// 10. Execution Flow State Machine
// ==========================================

async function runInteractive() {
  console.log(chalk.cyan(`===============================================`));
  console.log(chalk.cyan(`      YouTube Downloader (MP3 / MP4)`));
  console.log(chalk.cyan(`      Powered by yt-dlp + ffmpeg`));
  console.log(chalk.cyan(`===============================================`));
  
  checkDependencies();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (query) => new Promise(resolve => rl.question(query, resolve));

  const modeSel = await question('Please select a download mode: [1] Download music (MP3) [2] Download video (MP4) ');
  if (modeSel !== '1' && modeSel !== '2') {
    console.error(chalk.red('[Error] Input error, please try again.'));
    process.exit(1);
  }
  const mode = modeSel === '1' ? 'audio' : 'video';

  const url = (await question('Enter YouTube URL: ')).trim();
  if (!url || !url.startsWith('http')) {
    console.error(chalk.red('[Error] Invalid URL provided. Must start with http.'));
    process.exit(1);
  }

  const config = loadConfig();
  const isPlaylist = isPlaylistUrl(url);
  const title = prefetchTitle(url, isPlaylist) || (mode === 'audio' ? 'Music' : 'Video');
  const template = buildOutputTemplate({ isPlaylist, mode, outputDir: config.defaultOutputDir });

  console.log(chalk.green(`\nPreparing to download ${mode === 'audio' ? 'Audio' : 'Video'}: ${title}`));
  
  const args = buildArgs({ url, mode, audioFormat: 'mp3', outputTemplate: template, isPlaylist, overwrite: false, noEmbed: false });
  
  const child = spawn(ytdlpPath, args, { stdio: 'inherit' });
  child.on('close', async (code) => {
    if (code === 0) {
      console.log(chalk.green(`\nSuccess! Download complete.`));
    } else {
      console.error(chalk.red(`\n[Error] Download failed with exit code ${code} ❌ ⚠️`));
    }
    await question('Press Enter to exit...');
    rl.close();
    process.exit(code);
  });
}

function runBatch(opts) {
  checkDependencies();
  const config = loadConfig();
  
  const urls = opts.url;
  const mode = opts.mode || config.defaultMode;
  const outputDir = opts.outputDir || config.defaultOutputDir;
  const audioFormat = opts.format || 'mp3';

  if (!SUPPORTED_AUDIO_FORMATS.includes(audioFormat)) {
    console.error(chalk.red(`[Error] Unsupported format. Supported: ${SUPPORTED_AUDIO_FORMATS.join(', ')}`));
    process.exit(1);
  }

  let hasError = false;
  
  for (const u of urls) {
    if (!u.trim().startsWith('http')) {
      console.error(chalk.red(`[Error] Invalid URL provided: ${u}`));
      process.exit(1);
    }
    const isPlaylist = isPlaylistUrl(u);
    const title = prefetchTitle(u, isPlaylist) || (mode === 'audio' ? 'Music' : 'Video');
    const template = buildOutputTemplate({ 
      isPlaylist, mode, outputDir, 
      playlistName: opts.playlistName, 
      outputName: opts.outputName 
    });

    if (!opts.quiet) console.log(chalk.green(`Downloading: ${title}`));
    
    const args = buildArgs({ 
      url: u, mode, audioFormat, 
      outputTemplate: template, isPlaylist, 
      overwrite: opts.overwrite, noEmbed: opts.noEmbed 
    });
    
    const child = spawnSync(ytdlpPath, args, { stdio: opts.quiet ? 'ignore' : 'inherit' });
    if (child.status !== 0) hasError = true;
  }
  
  if (hasError) process.exit(1);
}

program
  .option('-u, --url <url>', 'YouTube URL to download (repeatable)', (val, prev) => prev.concat([val]), [])
  .option('-m, --mode <mode>', 'Mode: audio or video', 'audio')
  .option('-f, --format <fmt>', 'Audio format (e.g. mp3, wav, flac)')
  .option('--output-name <name>', 'Custom output name (single video only)')
  .option('--playlist-name <name>', 'Custom folder name for playlist')
  .option('-o, --output-dir <dir>', 'Base output directory')
  .option('--overwrite', 'Overwrite existing files')
  .option('--no-embed', 'Do not embed thumbnail and metadata')
  .option('--quiet', 'Suppress output')
  .parse(process.argv);

const opts = program.opts();

if (opts.url && opts.url.length > 0) {
  runBatch(opts);
} else {
  runInteractive();
}

/*
Verification Commands:
# 1. Interactive (No arguments)
node index.js

# 2. Missing binary test (Rename bin/ or change PATH)
node index.js

# 3. Single audio mp3
node index.js -u "https://www.youtube.com/watch?v=BaW_jenozKc" -m audio -f mp3

# 4. Single video mp4
node index.js -u "https://www.youtube.com/watch?v=BaW_jenozKc" -m video

# 5. Playlist test
node index.js -u "https://www.youtube.com/playlist?list=PL4lCAOvn4e1-q0_Y8D5w8N_qI0O8l2Vf2" -m audio --playlist-name "Archive"

# 6. Format test wav
node index.js -u "https://www.youtube.com/watch?v=BaW_jenozKc" -m audio -f wav

# 7. Output name test
node index.js -u "https://www.youtube.com/watch?v=BaW_jenozKc" --output-name "Custom" -m audio
*/
