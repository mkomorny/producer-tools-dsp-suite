import { RealFFT } from './fft';

export function applyHomomorphicPitchShift(
  input: Float32Array,
  pitchRatio: number,
  sampleRate: number,
  cutoffQuefrencyMs: number = 3.0 // roughly 50 samples at 16kHz
): Float32Array {
  const grainSizeMs = 40;
  const overlapMs = 20;
  const grainSize = Math.floor((grainSizeMs / 1000) * sampleRate);
  const overlap = Math.floor((overlapMs / 1000) * sampleRate);
  const stride = grainSize - overlap;
  
  // Find next power of 2 for FFT
  let N = 1;
  while (N < grainSize) N *= 2;
  // Pad further to avoid circular convolution artifacts
  N *= 2; 

  const cutoff = Math.floor((cutoffQuefrencyMs / 1000) * sampleRate);

  const output = new Float32Array(input.length);
  const window = new Float32Array(grainSize);
  for (let i = 0; i < grainSize; i++) {
    // Hann window
    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (grainSize - 1)));
  }

  const fft = new RealFFT(N);

  for (let n = 0; n < input.length - grainSize; n += stride) {
    const grain = new Float64Array(N);
    for (let i = 0; i < grainSize; i++) {
      grain[i] = input[n + i] * window[i];
    }
    
    // 1. Forward FFT
    const X = fft.forward(grain);
    
    // 2. Log magnitude
    const logMag = new Float64Array(N / 2 + 1);
    for (let k = 0; k <= N / 2; k++) {
      const mag = Math.sqrt(X.real[k] * X.real[k] + X.imag[k] * X.imag[k]);
      logMag[k] = Math.log(mag + 1e-10);
    }
    
    // 3. Real Cepstrum
    // IDFT of log magnitude (since logMag is real and even, we can just use inverse FFT with 0 imag)
    const logMagImag = new Float64Array(N / 2 + 1); // all zeros
    const c = fft.inverse(logMag, logMagImag);
    
    // 4. Liftering for vocal tract (minimum phase reconstruction)
    // Extract c_v[n] and convert to minimum phase complex cepstrum \hat{x}_v[n]
    const x_hat_v = new Float64Array(N);
    x_hat_v[0] = c[0];
    for (let i = 1; i < cutoff; i++) {
      x_hat_v[i] = 2 * c[i];
    }
    // all other x_hat_v[i] are 0
    
    // 5. FFT of \hat{x}_v[n] to get \hat{X}_v[k]
    const X_hat_v = fft.forward(x_hat_v);
    
    // 6. Vocal tract frequency response H_v[k] = exp(\hat{X}_v[k])
    const H_v_real = new Float64Array(N / 2 + 1);
    const H_v_imag = new Float64Array(N / 2 + 1);
    for (let k = 0; k <= N / 2; k++) {
      const exp_re = Math.exp(X_hat_v.real[k]);
      H_v_real[k] = exp_re * Math.cos(X_hat_v.imag[k]);
      H_v_imag[k] = exp_re * Math.sin(X_hat_v.imag[k]);
    }
    
    // 7. Get excitation spectrum E[k] = X[k] / H_v[k]
    const E_real = new Float64Array(N / 2 + 1);
    const E_imag = new Float64Array(N / 2 + 1);
    for (let k = 0; k <= N / 2; k++) {
      const den = H_v_real[k] * H_v_real[k] + H_v_imag[k] * H_v_imag[k] + 1e-10;
      E_real[k] = (X.real[k] * H_v_real[k] + X.imag[k] * H_v_imag[k]) / den;
      E_imag[k] = (X.imag[k] * H_v_real[k] - X.real[k] * H_v_imag[k]) / den;
    }
    
    // 8. Get excitation signal
    const e = fft.inverse(E_real, E_imag);
    
    // 9. Pitch shift excitation using linear interpolation
    const shifted_e = new Float64Array(N);
    // Only resample the original grain part, though e is length N
    for (let i = 0; i < N; i++) {
      const srcIdx = i * pitchRatio;
      const idx1 = Math.floor(srcIdx);
      const idx2 = idx1 + 1;
      const frac = srcIdx - idx1;
      if (idx1 >= 0 && idx2 < N) {
        shifted_e[i] = e[idx1] * (1 - frac) + e[idx2] * frac;
      }
    }
    
    // 10. Forward FFT of shifted excitation
    const E_shifted = fft.forward(shifted_e);
    
    // 11. Combine with vocal tract: Y[k] = E_shifted[k] * H_v[k]
    const Y_real = new Float64Array(N / 2 + 1);
    const Y_imag = new Float64Array(N / 2 + 1);
    for (let k = 0; k <= N / 2; k++) {
      Y_real[k] = E_shifted.real[k] * H_v_real[k] - E_shifted.imag[k] * H_v_imag[k];
      Y_imag[k] = E_shifted.real[k] * H_v_imag[k] + E_shifted.imag[k] * H_v_real[k];
    }
    
    // 12. Inverse FFT to get output grain
    const y = fft.inverse(Y_real, Y_imag);
    
    // 13. Overlap-add
    for (let i = 0; i < grainSize; i++) {
      if (n + i < output.length) {
        output[n + i] += y[i]; // No synthesis window to avoid double-windowing artifacts
      }
    }
  }
  
  return output;
}

export function extractMFCCs(
  input: Float32Array,
  sampleRate: number,
  numCoeffs: number = 13
): Float32Array {
  // A simplified MFCC extractor for a single frame or whole buffer average
  let N = 1;
  while (N < input.length) N *= 2;
  
  const padded = new Float64Array(N);
  for (let i = 0; i < input.length; i++) {
    padded[i] = input[i];
  }
  
  const fft = new RealFFT(N);
  const X = fft.forward(padded);
  
  const numFilters = 20; // from the lecture: "For 4 kHz bandwidth, approximately 20 filters are used"
  // Here we use it across the whole spectrum for simplicity
  const minMel = 0;
  const maxMel = 2595 * Math.log10(1 + (sampleRate / 2) / 700);
  
  const melPoints = new Float64Array(numFilters + 2);
  for (let i = 0; i < melPoints.length; i++) {
    const mel = minMel + i * (maxMel - minMel) / (numFilters + 1);
    const hz = 700 * (Math.pow(10, mel / 2595) - 1);
    melPoints[i] = Math.floor((N + 1) * hz / sampleRate);
  }
  
  const filterBank = new Float64Array(numFilters);
  for (let i = 0; i < numFilters; i++) {
    const start = melPoints[i];
    const center = melPoints[i + 1];
    const end = melPoints[i + 2];
    
    let sum = 0;
    for (let k = start; k < center; k++) {
      const mag = Math.sqrt(X.real[k] * X.real[k] + X.imag[k] * X.imag[k]);
      sum += mag * ((k - start) / (center - start || 1));
    }
    for (let k = center; k < end; k++) {
      const mag = Math.sqrt(X.real[k] * X.real[k] + X.imag[k] * X.imag[k]);
      sum += mag * ((end - k) / (end - center || 1));
    }
    filterBank[i] = Math.log(sum + 1e-10);
  }
  
  // Discrete Cosine Transform
  const mfccs = new Float32Array(numCoeffs);
  for (let i = 0; i < numCoeffs; i++) {
    let sum = 0;
    for (let j = 0; j < numFilters; j++) {
      sum += filterBank[j] * Math.cos(Math.PI * i * (j + 0.5) / numFilters);
    }
    mfccs[i] = sum;
  }
  
  return mfccs;
}

