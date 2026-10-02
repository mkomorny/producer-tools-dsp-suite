import FFT from 'fft.js';

export type InstrumentStem = 'vocals' | 'bass' | 'drums' | 'guitar' | 'piano' | 'synth' | 'other';

export interface SplitResult {
  [stem: string]: AudioBuffer;
}

// -------------------------------------------------------------------------
// MATHEMATICAL SPECIFICATIONS (from Spleeter & Demucs References)
// -------------------------------------------------------------------------
// STFT Parameters
const N_FFT = 4096;
const HOP_LENGTH = 1024;
const WINDOW_COMPENSATION_FACTOR = 2.0 / 3.0;
const EPSILON = 1e-10;

/**
 * Generates a periodic Hann window.
 * Equation: w[n] = 0.5 - 0.5 * cos(2 * π * n / N_FFT)
 */
function generatePeriodicHannWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
  }
  return window;
}

const windowFrame = generatePeriodicHannWindow(N_FFT);
const f = new FFT(N_FFT);

/**
 * Mathematical STFT (Short-Time Fourier Transform)
 * Converts a time-domain signal to a complex time-frequency representation.
 */
async function computeSTFT(channelData: Float32Array): Promise<{ real: Float32Array[], imag: Float32Array[] }> {
  // Pre-pad with zeros for phase alignment (as per Spleeter spec)
  const paddedLength = channelData.length + N_FFT;
  const paddedData = new Float32Array(paddedLength);
  paddedData.set(channelData, N_FFT); // padding at the beginning

  const numFrames = Math.floor((paddedLength - N_FFT) / HOP_LENGTH) + 1;
  
  const realFrames: Float32Array[] = [];
  const imagFrames: Float32Array[] = [];

  const inputComplex = f.createComplexArray();
  const outputComplex = f.createComplexArray();
  const asyncYield = () => new Promise(r => setTimeout(r, 0));

  for (let t = 0; t < numFrames; t++) {
    if (t % 100 === 0) await asyncYield();
    const offset = t * HOP_LENGTH;
    
    // Windowing
    for (let i = 0; i < N_FFT; i++) {
      inputComplex[2 * i] = paddedData[offset + i] * windowFrame[i]; // Real
      inputComplex[2 * i + 1] = 0; // Imaginary
    }

    // Fast Fourier Transform
    f.transform(outputComplex, inputComplex);

    // Keep non-negative frequencies (0 to N_FFT/2 inclusive) => 2049 bins
    const numBins = N_FFT / 2 + 1;
    const realBin = new Float32Array(numBins);
    const imagBin = new Float32Array(numBins);

    for (let i = 0; i < numBins; i++) {
      realBin[i] = outputComplex[2 * i];
      imagBin[i] = outputComplex[2 * i + 1];
    }
    realFrames.push(realBin);
    imagFrames.push(imagBin);
  }

  return { real: realFrames, imag: imagFrames };
}

/**
 * Inverse Short-Time Fourier Transform (iSTFT)
 * Converts complex time-frequency domain back to time-domain waveform.
 */
async function computeISTFT(
  realFrames: Float32Array[],
  imagFrames: Float32Array[],
  originalLength: number
): Promise<Float32Array> {
  const numFrames = realFrames.length;
  const paddedLength = (numFrames - 1) * HOP_LENGTH + N_FFT;
  const outSignal = new Float32Array(paddedLength);

  const inputComplex = f.createComplexArray();
  const outputComplex = f.createComplexArray();
  const asyncYield = () => new Promise(r => setTimeout(r, 0));

  for (let t = 0; t < numFrames; t++) {
    if (t % 100 === 0) await asyncYield();
    const realBin = realFrames[t];
    const imagBin = imagFrames[t];

    // Reconstruct full complex spectrum (mirroring conjugate for negative frequencies)
    for (let i = 0; i < N_FFT / 2 + 1; i++) {
      inputComplex[2 * i] = realBin[i];
      inputComplex[2 * i + 1] = imagBin[i];
    }
    for (let i = 1; i < N_FFT / 2; i++) {
      const mirrorIdx = N_FFT - i;
      inputComplex[2 * mirrorIdx] = realBin[i];
      inputComplex[2 * mirrorIdx + 1] = -imagBin[i];
    }

    // Inverse FFT
    f.inverseTransform(outputComplex, inputComplex);

    const offset = t * HOP_LENGTH;
    // Overlap-Add with periodic Hann window synthesis
    for (let i = 0; i < N_FFT; i++) {
      // outputComplex contains interleaved real/imag. We only need the real part [2*i].
      const val = outputComplex[2 * i] * windowFrame[i];
      outSignal[offset + i] += val;
    }
  }

  // Multiply by WINDOW_COMPENSATION_FACTOR (2/3 for Hann window with hop 1/4)
  // And remove the pre-pad
  const finalSignal = new Float32Array(originalLength);
  for (let i = 0; i < originalLength; i++) {
    finalSignal[i] = outSignal[i + N_FFT] * WINDOW_COMPENSATION_FACTOR;
  }

  return finalSignal;
}

export async function analyzeAudioInstruments(buffer: AudioBuffer): Promise<InstrumentStem[]> {
  // We return the typical 4-stem or 5-stem profile for analysis compatibility
  return ['vocals', 'drums', 'bass', 'other'];
}

/**
 * Computes the soft ratio mask based on Spleeter/Demucs methodology.
 * In the absence of a loaded UNet/Transformer weight set, this applies
 * DSP heuristics (Harmonic/Percussive/Vocal filtering) natively on the STFT magnitude.
 * 
 * Mask Formula:
 * M_i = (S_i^α + ε) / (Σ S_i^α + ε)
 * where α is separation_exponent (2 for Spleeter).
 */
export async function applyAudioSplit(buffer: AudioBuffer, targetStems: InstrumentStem[]): Promise<SplitResult> {
  const sr = buffer.sampleRate;
  
  const channels = buffer.numberOfChannels;
  const numBins = N_FFT / 2 + 1;
  const ctx = new OfflineAudioContext(1, 1, sr); // Safe way to create buffers without limits
  
  const asyncYield = () => new Promise(r => setTimeout(r, 0));

  // 1. Forward STFT for each channel
  const mixSTFT: { real: Float32Array[], imag: Float32Array[] }[] = [];
  for (let c = 0; c < channels; c++) {
    mixSTFT.push(await computeSTFT(buffer.getChannelData(c)));
    await asyncYield();
  }

  const numFrames = mixSTFT[0].real.length;

  // 2. Compute Magnitude Spectrograms and Center Panning Mask
  const magSpec = new Float32Array(numFrames * numBins);
  const centerMask = new Float32Array(numFrames * numBins);

  for (let t = 0; t < numFrames; t++) {
    if (t % 100 === 0) await asyncYield();
    for (let f = 0; f < numBins; f++) {
      let energy = 0;
      let isCenter = 1.0;

      if (channels === 2) {
        const lRe = mixSTFT[0].real[t][f];
        const lIm = mixSTFT[0].imag[t][f];
        const rRe = mixSTFT[1].real[t][f];
        const rIm = mixSTFT[1].imag[t][f];
        
        const magL = Math.sqrt(lRe * lRe + lIm * lIm);
        const magR = Math.sqrt(rRe * rRe + rIm * rIm);
        energy = magL * magL + magR * magR;
        
        // Use Mid/Side energy for robust panning detection
        const midRe = (lRe + rRe) * 0.5;
        const midIm = (lIm + rIm) * 0.5;
        const sideRe = (lRe - rRe) * 0.5;
        const sideIm = (lIm - rIm) * 0.5;
        
        const midEnergy = midRe * midRe + midIm * midIm;
        const sideEnergy = sideRe * sideRe + sideIm * sideIm;
        
        // panIndex: 1.0 = center, 0.5 = hard L/R, 0.0 = anti-phase
        const panIndex = midEnergy / (midEnergy + sideEnergy + EPSILON);
        isCenter = panIndex; // Use raw panIndex instead of aggressive cutoff
      } else {
        for (let c = 0; c < channels; c++) {
          const re = mixSTFT[c].real[t][f];
          const im = mixSTFT[c].imag[t][f];
          energy += re * re + im * im;
        }
      }
      
      magSpec[t * numBins + f] = Math.sqrt(energy);
      centerMask[t * numBins + f] = isCenter;
    }
  }

  // 3. Estimate Source Magnitudes (Algorithmic approximation of UNet Inference)
  const estimates: Record<string, Float32Array> = {}; // flattened magnitudes
  
  const bassMask = new Float32Array(numFrames * numBins);
  const vocalMask = new Float32Array(numFrames * numBins);
  const drumMask = new Float32Array(numFrames * numBins);
  const otherMask = new Float32Array(numFrames * numBins);
  
  const binWidth = sr / N_FFT;
  const bassMaxBin = Math.round(250 / binWidth);
  const vocalMinBin = Math.round(150 / binWidth);
  const vocalMaxBin = Math.round(8000 / binWidth);

  for (let t = 0; t < numFrames; t++) {
    if (t % 100 === 0) await asyncYield();
    
    for (let f = 0; f < numBins; f++) {
      const idx = t * numBins + f;
      const mag = magSpec[idx];
      const isCenter = channels === 2 ? centerMask[idx] : 1.0;
      
      let bassVal = 0;
      let drumVal = 0;
      let vocalVal = 0;
      let otherVal = mag * 0.8; // Solid baseline competition for 'other'
      
      // Bass allocation (< 250 Hz)
      if (f < bassMaxBin) {
        bassVal = mag * 1.5;
      }

      // Drum allocation (transient approximation)
      if (t > 0 && f > 10) { // Skip extreme lows to avoid bass thumps being drums
        const prevMag = magSpec[(t - 1) * numBins + f];
        const diff = mag - prevMag;
        if (diff > mag * 0.15) { // 15% jump in magnitude
          drumVal = diff * 2.0; 
        }
      }

      // Vocal allocation (150 Hz - 8000 Hz)
      if (f >= vocalMinBin && f <= vocalMaxBin) {
        // Boost mid-range frequencies where vocals dominate (300Hz - 3000Hz)
        const isMid = f > (300 / binWidth) && f < (3000 / binWidth);
        const freqWeight = isMid ? 1.5 : 1.0;
        
        // Vocals are primarily center-panned.
        // isCenter ranges from 0.5 (side) to 1.0 (center)
        // We use Math.pow(isCenter, 2.0) to prefer the center without instantly gating.
        const centerWeight = Math.pow(isCenter, 2.0);
        
        // Suppress vocal probability if it's a strong percussive transient
        const transientSuppression = drumVal > mag ? 0.2 : 1.0;
        
        vocalVal = mag * centerWeight * freqWeight * transientSuppression * 1.2;
      }
      
      // Other allocation (Side signals + non-vocal/non-bass/non-drum)
      // Boost side energy heavily into 'other'
      otherVal += mag * (1.0 - isCenter) * 2.5;

      bassMask[idx] = bassVal;
      drumMask[idx] = drumVal;
      vocalMask[idx] = vocalVal;
      otherMask[idx] = otherVal;
    }
  }
  
  estimates['bass'] = bassMask;
  estimates['vocals'] = vocalMask;
  estimates['drums'] = drumMask;
  estimates['other'] = otherMask;

  const totalBins = numFrames * numBins;
  const energySum = new Float32Array(totalBins);
  const estimateVals = Object.values(estimates);
  const SEPARATION_EXPONENT = 2; // Increased isolation

  for (let i = 0; i < totalBins; i++) {
    if (i % 100000 === 0) await asyncYield();
    let sum = EPSILON;
    for (let e = 0; e < estimateVals.length; e++) {
      const val = estimateVals[e][i];
      sum += Math.pow(val, SEPARATION_EXPONENT);
    }
    energySum[i] = sum;
  }

  // 4. Soft Ratio Masking & iSTFT
  const results: SplitResult = {};

  for (const stem of targetStems) {
    if (!estimates[stem]) continue;

    const outBuffer = ctx.createBuffer(channels, buffer.length, sr);
    const stemMask = estimates[stem];

    for (let c = 0; c < channels; c++) {
      const stemReal = [];
      const stemImag = [];
      const mixReal = mixSTFT[c].real;
      const mixImag = mixSTFT[c].imag;

      for (let t = 0; t < numFrames; t++) {
        if (t % 100 === 0) await asyncYield();
        const rBin = new Float32Array(numBins);
        const iBin = new Float32Array(numBins);
        const tReal = mixReal[t];
        const tImag = mixImag[t];

        for (let f = 0; f < numBins; f++) {
          const idx = t * numBins + f;
          
          const stemEnergy = (stemMask[idx] * stemMask[idx]) + (EPSILON / 4);
          const softMask = stemEnergy / energySum[idx];

          // Apply mask to complex STFT
          rBin[f] = tReal[f] * softMask;
          iBin[f] = tImag[f] * softMask;
        }
        stemReal.push(rBin);
        stemImag.push(iBin);
      }

      // Inverse STFT
      const reconstructed = await computeISTFT(stemReal, stemImag, buffer.length);
      outBuffer.getChannelData(c).set(reconstructed);
    }
    
    results[stem] = outBuffer;
  }

  return results;
}

