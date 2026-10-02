// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface AudioFingerprintOptions {
  analysisSeconds: number;
  hashAlgorithm: 'MD5' | 'SHA-1' | 'SHA-256';
  outputFormat: 'JSON' | 'TXT' | 'XML';
}

export async function generateFingerprint(buffer: AudioBuffer, options: AudioFingerprintOptions): Promise<string> {
  const analysisSeconds = Math.max(10, Math.min(600, options.analysisSeconds));
  const sampleRate = buffer.sampleRate;
  
  // 1. Mono Downmix
  const monoBuffer = new Float32Array(buffer.length);
  for (let n = 0; n < buffer.length; n++) {
    let sum = 0;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      sum += buffer.getChannelData(c)[n];
    }
    monoBuffer[n] = sum / buffer.numberOfChannels;
  }
  
  // 2. Downsample to 11.025kHz
  const targetRate = 11025;
  const rho = targetRate / sampleRate;
  const numSamplesToAnalyze = Math.min(Math.floor(analysisSeconds * targetRate), Math.floor(monoBuffer.length * rho));
  const int16Array = new Int16Array(numSamplesToAnalyze);
  
  for (let n = 0; n < numSamplesToAnalyze; n++) {
    const p_source = n / rho;
    const p_floor = Math.floor(p_source);
    const frac = p_source - p_floor;
    const s1 = monoBuffer[p_floor] || 0;
    const s2 = monoBuffer[p_floor + 1] || 0;
    const val = s1 * (1 - frac) + s2 * frac;
    int16Array[n] = Math.max(-32768, Math.min(32767, Math.floor(val * 32767)));
  }
  
  // 3. Hash
  let hashAlg = 'SHA-256'; // Fallback to SHA-256 if MD5 requested since browser crypto only supports SHA
  if (options.hashAlgorithm === 'SHA-1') hashAlg = 'SHA-1';
  
  const hashBuffer = await crypto.subtle.digest(hashAlg, int16Array.buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // 4. Output
  if (options.outputFormat === 'JSON') {
    return JSON.stringify({ fingerprint: hashHex, algorithm: hashAlg, analyzedSeconds: analysisSeconds });
  } else if (options.outputFormat === 'XML') {
    return `<AudioFingerprint>\n  <Fingerprint>${hashHex}</Fingerprint>\n  <Algorithm>${hashAlg}</Algorithm>\n  <AnalyzedSeconds>${analysisSeconds}</AnalyzedSeconds>\n</AudioFingerprint>`;
  } else {
    return `Fingerprint: ${hashHex}\nAlgorithm: ${hashAlg}\nAnalyzed Seconds: ${analysisSeconds}`;
  }
}
