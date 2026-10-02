import { RealFFT } from './fft';

function symmetricWindow(size: number) {
  const w = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / size);
  }
  return w;
}

function asymmetricAnalysisWindow(analysisSize: number, synthesisSize: number) {
  const n = analysisSize;
  const m = Math.floor(synthesisSize / 2);

  const left = symmetricWindow(2 * n - 2 * m);
  const right = symmetricWindow(2 * m);

  const w = new Float64Array(n);
  for (let i = 0; i < n - m; i++) {
    w[i] = left[i];
  }
  for (let i = 0; i < m; i++) {
    w[n - m + i] = right[m + i];
  }
  return w;
}

function asymmetricSynthesisWindow(analysisSize: number, synthesisSize: number) {
  const n = analysisSize;
  const m = Math.floor(synthesisSize / 2);

  const left = symmetricWindow(2 * n - 2 * m);
  const right = symmetricWindow(2 * m);

  const w = new Float64Array(n);
  for (let i = 0; i < m; i++) {
    w[n - m - m + i] = (right[i] * right[i]) / left[n - m - m + i];
  }
  for (let i = 0; i < m; i++) {
    w[n - m + i] = right[m + i];
  }
  return w;
}

function getWindows(analysisSize: number, synthesisSize: number) {
  if (analysisSize === synthesisSize) {
    const w = symmetricWindow(analysisSize);
    return { analysis: w, synthesis: w };
  } else {
    return {
      analysis: asymmetricAnalysisWindow(analysisSize, synthesisSize),
      synthesis: asymmetricSynthesisWindow(analysisSize, synthesisSize)
    };
  }
}

function stftFrames(signal: Float32Array | Float64Array, analysisSize: number, hopsize: number) {
  const numFrames = Math.floor((signal.length - analysisSize) / hopsize) + 1;
  const frames = [];
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopsize;
    const frame = new Float64Array(analysisSize);
    for (let j = 0; j < analysisSize; j++) {
      frame[j] = signal[start + j];
    }
    frames.push(frame);
  }
  return frames;
}

function stft(signal: Float32Array | Float64Array, analysisSize: number, synthesisSize: number, hopsize: number, fft: RealFFT) {
  const { analysis: analysisWindow } = getWindows(analysisSize, synthesisSize);
  const frames = stftFrames(signal, analysisSize, hopsize);
  const spectra = [];

  for (const frame of frames) {
    const windowed = new Float64Array(analysisSize);
    for (let i = 0; i < analysisSize; i++) {
      windowed[i] = frame[i] * analysisWindow[i];
    }
    const spec = fft.forward(windowed);
    spec.real[0] = 0;
    spec.real[spec.real.length - 1] = 0;
    spec.imag[0] = 0;
    spec.imag[spec.imag.length - 1] = 0;
    spectra.push(spec);
  }
  return spectra;
}

function istft(spectra: {real: Float64Array, imag: Float64Array}[], analysisSize: number, synthesisSize: number, hopsize: number, fft: RealFFT) {
  const { analysis: analysisWin, synthesis: synthesisWin } = getWindows(analysisSize, synthesisSize);

  let sumAS = 0;
  for (let i = 0; i < analysisSize; i++) {
    sumAS += analysisWin[i] * synthesisWin[i];
  }
  const norm = hopsize / sumAS;

  const scaledSynth = new Float64Array(synthesisWin.length);
  for (let i = 0; i < synthesisWin.length; i++) {
    scaledSynth[i] = synthesisWin[i] * norm;
  }

  const totalLength = (spectra.length - 1) * hopsize + analysisSize;
  const output = new Float64Array(totalLength);

  for (let i = 0; i < spectra.length; i++) {
    const spec = spectra[i];
    let time = fft.inverse(spec.real, spec.imag);

    const start = i * hopsize;
    for (let j = 0; j < analysisSize; j++) {
      output[start + j] += time[j] * scaledSynth[j];
    }
  }

  return output;
}

function createVocoderState(numBins: number) {
  return {
    prevPhase: new Float64Array(numBins)
  };
}

function wrapPhase(p: number) {
  return (p + Math.PI) % (2 * Math.PI) - Math.PI;
}

function encodeToVocoder(spectra: {real: Float64Array, imag: Float64Array}[], analysisSize: number, hopsize: number, samplerate: number, state: any) {
  const freqInc = samplerate / analysisSize;
  const phaseInc = 2 * Math.PI * hopsize / analysisSize;
  const numBins = Math.floor(analysisSize / 2) + 1;

  const vocoded = [];

  for (let m = 0; m < spectra.length; m++) {
    const spec = spectra[m];
    const mag = new Float64Array(numBins);
    const freq = new Float64Array(numBins);

    for (let k = 0; k < numBins; k++) {
      const re = spec.real[k];
      const im = spec.imag[k];
      const magnitude = Math.hypot(re, im);
      const phase = Math.atan2(im, re);

      let delta = phase - state.prevPhase[k];
      state.prevPhase[k] = phase;

      const j = wrapPhase(delta - k * phaseInc) / phaseInc;
      const instantaneousFreq = (k + j) * freqInc;

      mag[k] = magnitude;
      freq[k] = instantaneousFreq;
    }

    vocoded.push({ mag, freq });
  }

  return vocoded;
}

function decodeFromVocoder(vocodedFrames: {mag: Float64Array, freq: Float64Array}[], analysisSize: number, synthesisSize: number, hopsize: number, samplerate: number, state: any) {
  const freqInc = samplerate / analysisSize;
  const phaseInc = 2 * Math.PI * hopsize / analysisSize;
  const numBins = Math.floor(analysisSize / 2) + 1;

  let timeshift: Float64Array | null = null;
  if (synthesisSize !== analysisSize) {
    timeshift = new Float64Array(numBins);
    for (let k = 0; k < numBins; k++) {
      timeshift[k] = 2 * Math.PI * synthesisSize * k / analysisSize;
    }
  }

  const spectra = [];

  for (let m = 0; m < vocodedFrames.length; m++) {
    const vf = vocodedFrames[m];
    const re = new Float64Array(numBins);
    const im = new Float64Array(numBins);

    for (let k = 0; k < numBins; k++) {
      const magnitude = vf.mag[k];
      const frequency = vf.freq[k];

      const j = (frequency - k * freqInc) / freqInc;
      let delta = (k + j) * phaseInc;

      state.prevPhase[k] += delta;
      let phase = state.prevPhase[k];

      if (timeshift) {
        phase -= timeshift[k];
      }

      re[k] = magnitude * Math.cos(phase);
      im[k] = magnitude * Math.sin(phase);
    }

    re[0] = 0; im[0] = 0;
    re[numBins - 1] = 0; im[numBins - 1] = 0;

    spectra.push({ real: re, imag: im });
  }

  return spectra;
}

function linearResample(x: Float64Array, factor: number) {
  if (factor === 1.0) {
    return x.slice();
  }

  const n = x.length;
  const m = Math.floor(n * factor);
  const y = new Float64Array(n);

  const q = n / m;

  if (factor < 1.0) {
    for (let i = 0; i < m; i++) {
      const k = i * q;
      const j = Math.trunc(k);
      const frac = k - j;
      if (j >= 0 && j < n - 1) {
        y[i] = (1 - frac) * x[j] + frac * x[j + 1];
      }
    }
  } else {
    for (let i = n - 1; i >= 0; i--) {
      const k = i * q;
      const j = Math.trunc(k);
      const frac = k - j;
      if (j >= 0 && j < n - 1) {
        y[i] = (1 - frac) * x[j] + frac * x[j + 1];
      }
    }
  }

  return y;
}

function shiftPitchOneFrame(vframe: {mag: Float64Array, freq: Float64Array}, factors: number[], samplerate: number, numBins: number) {
  const nyquist = samplerate / 2;
  if (factors.length === 0) return vframe;

  const allMags = [];
  const allFreqs = [];

  for (const factor of factors) {
    const mag = linearResample(vframe.mag, factor);
    let frq = linearResample(vframe.freq, factor);

    for (let k = 0; k < numBins; k++) {
      frq[k] *= factor;
      if (frq[k] <= 0 || frq[k] >= nyquist) {
        mag[k] = 0;
      }
    }

    allMags.push(mag);
    allFreqs.push(frq);
  }

  if (factors.length === 1) {
    return { mag: allMags[0], freq: allFreqs[0] };
  }

  const outMag = new Float64Array(numBins);
  const outFreq = new Float64Array(numBins);

  for (let k = 0; k < numBins; k++) {
    let bestMag = -Infinity;
    let bestIdx = 0;
    for (let i = 0; i < factors.length; i++) {
      if (allMags[i][k] > bestMag) {
        bestMag = allMags[i][k];
        bestIdx = i;
      }
    }
    outMag[k] = allMags[bestIdx][k];
    outFreq[k] = allFreqs[bestIdx][k];
  }

  return { mag: outMag, freq: outFreq };
}

function shiftPitchAllFrames(vocoded: {mag: Float64Array, freq: Float64Array}[], factors: number[], samplerate: number) {
  const numBins = vocoded[0].mag.length;
  const result = [];
  for (const vf of vocoded) {
    result.push(shiftPitchOneFrame(vf, factors, samplerate, numBins));
  }
  return result;
}

function lifterEnvelope(vocodedFrames: {mag: Float64Array, freq: Float64Array}[], quefrencySamples: number, fullSizeFFT: RealFFT) {
  const envelopes = [];

  for (const vf of vocodedFrames) {
    const mag = vf.mag;
    const N = mag.length;
    const fullSize = (N - 1) * 2;

    const logSpec = new Float64Array(fullSize);
    for (let i = 0; i < N; i++) {
      const val = mag[i];
      logSpec[i] = (val > 0 && isFinite(val)) ? Math.log10(val) : -12.0;
    }
    for (let i = 1; i < N - 1; i++) {
      logSpec[fullSize - i] = logSpec[i];
    }

    const cepstrum = fullSizeFFT.inverse(logSpec, new Float64Array(fullSize));

    const q = Math.min(quefrencySamples, cepstrum.length);
    for (let i = 1; i < q; i++) {
      cepstrum[i] *= 2.0;
    }
    for (let i = q + 1; i < cepstrum.length; i++) {
      cepstrum[i] = 0.0;
    }

    const back = fullSizeFFT.forward(cepstrum);
    const env = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      env[i] = Math.pow(10, back.real[i]);
    }

    envelopes.push(env);
  }

  return envelopes;
}

function normalizeFrames(shiftedVocoded: {mag: Float64Array, freq: Float64Array}[], originalVocodedBeforeShift: {mag: Float64Array, freq: Float64Array}[]) {
  for (let i = 0; i < shiftedVocoded.length; i++) {
    const a = originalVocodedBeforeShift[i].mag;
    const b = shiftedVocoded[i].mag;

    let energyA = 0, energyB = 0;
    for (let k = 0; k < a.length; k++) {
      energyA += a[k] * a[k];
      energyB += b[k] * b[k];
    }

    if (energyB === 0) continue;

    const scale = Math.sqrt(energyA / energyB);

    for (let k = 0; k < b.length; k++) {
      b[k] *= scale;
    }
  }
}

export function processChannel(inputSamples: Float32Array | Float64Array, framesize: number | [number, number], hopsize: number, samplerate: number,
                        factors: number[], quefrencySeconds: number, distortion: number, doNormalize: boolean, fft: RealFFT) {

  const analysisSize = Array.isArray(framesize) ? framesize[0] : framesize;
  const synthesisSize = Array.isArray(framesize) ? framesize[1] : framesize;

  const quefrencySamples = Math.round(quefrencySeconds * samplerate);
  const numBins = Math.floor(analysisSize / 2) + 1;

  const spectra = stft(inputSamples, analysisSize, synthesisSize, hopsize, fft);

  const encodeState = createVocoderState(numBins);
  let vocoded = encodeToVocoder(spectra, analysisSize, hopsize, samplerate, encodeState);

  let originalForNorm = null;
  if (doNormalize) {
    originalForNorm = vocoded.map(v => ({ mag: v.mag.slice(), freq: v.freq.slice() }));
  }

  let envelopes: Float64Array[] | null = null;
  let validMask: Float64Array[] | null = null;

  if (quefrencySamples > 0) {
    const cepstralFFT = new RealFFT(analysisSize);

    envelopes = lifterEnvelope(vocoded, quefrencySamples, cepstralFFT);

    validMask = new Array(envelopes.length);
    for (let i = 0; i < envelopes.length; i++) {
      const env = envelopes[i];
      const mask = new Float64Array(env.length);
      for (let k = 0; k < env.length; k++) {
        const e = env[k];
        const invalid = !isFinite(e) || e < 1e-300;
        if (invalid) {
          mask[k] = 1;
          vocoded[i].mag[k] = 0;
        } else {
          vocoded[i].mag[k] /= e;
        }
      }
      validMask[i] = mask;
    }

    if (distortion !== 1) {
      for (let i = 0; i < envelopes.length; i++) {
        envelopes[i] = linearResample(envelopes[i], distortion);
        for (let k = 0; k < envelopes[i].length; k++) {
          if (validMask[i][k]) envelopes[i][k] = 0;
        }
      }
    }
  }

  vocoded = shiftPitchAllFrames(vocoded, factors, samplerate);

  if (quefrencySamples > 0 && envelopes && validMask) {
    for (let i = 0; i < vocoded.length; i++) {
      const env = envelopes[i];
      for (let k = 0; k < env.length; k++) {
        if (validMask[i][k] === 0) {
          vocoded[i].mag[k] *= env[k];
        }
      }
    }
  }

  if (doNormalize && originalForNorm) {
    normalizeFrames(vocoded, originalForNorm);
  }

  const decodeState = createVocoderState(Math.floor(analysisSize / 2) + 1);
  const outSpectra = decodeFromVocoder(vocoded, analysisSize, synthesisSize, hopsize, samplerate, decodeState);

  let output = istft(outSpectra, analysisSize, synthesisSize, hopsize, fft);

  output = output.slice(0, inputSamples.length);

  for (let i = 0; i < output.length; i++) {
    if (output[i] > 0.999) output[i] = 0.999;
    if (output[i] < -0.999) output[i] = -0.999;
  }

  return output;
}
