export function biasedAutocorrelation(x: Float32Array, p: number): Float32Array {
  const L = x.length;
  const r = new Float32Array(p + 1);
  for (let m = 0; m <= p; m++) {
    let sum = 0;
    for (let n = 0; n < L - m; n++) {
      sum += x[n] * x[n + m];
    }
    r[m] = sum / L;
  }
  return r;
}

export function levinsonDurbin(r: Float32Array, order: number): Float32Array {
  const a = new Float32Array(order + 1);
  const a_prev = new Float32Array(order + 1);
  
  a[0] = 1;
  a_prev[0] = 1;
  
  if (r[0] === 0) return a;
  
  let g = r[1] / r[0];
  a[1] = g;
  let v = (1 - g * g) * r[0];
  
  for (let i = 1; i < order; i++) {
    for (let j = 1; j <= i; j++) {
      a_prev[j] = a[j];
    }
    
    let sum = 0;
    for (let j = 1; j <= i; j++) {
      sum += a_prev[j] * r[i + 1 - j];
    }
    
    g = (r[i + 1] - sum) / v;
    a[i + 1] = g;
    
    for (let j = 1; j <= i; j++) {
      a[j] = a_prev[j] - g * a_prev[i + 1 - j];
    }
    
    v *= (1 - g * g);
  }
  
  // Return coefficients of A(z)
  const A = new Float32Array(order + 1);
  A[0] = 1;
  for (let i = 1; i <= order; i++) {
    A[i] = -a[i];
  }
  return A;
}

export function computeLPC(x: Float32Array, order: number): Float32Array {
  const r = biasedAutocorrelation(x, order);
  return levinsonDurbin(r, order);
}

export function inverseFilter(x: Float32Array, a: Float32Array): Float32Array {
  const order = a.length - 1;
  const e = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) {
    let sum = x[n];
    for (let k = 1; k <= order; k++) {
      if (n - k >= 0) {
        sum += a[k] * x[n - k];
      }
    }
    e[n] = sum;
  }
  return e;
}

export function forwardFilter(e: Float32Array, a: Float32Array): Float32Array {
  const order = a.length - 1;
  const y = new Float32Array(e.length);
  for (let n = 0; n < e.length; n++) {
    let sum = e[n];
    for (let k = 1; k <= order; k++) {
      if (n - k >= 0) {
        sum -= a[k] * y[n - k]; // a[k] has negative sign in Levinson, wait A is [1, -a1, -a2]
      }
    }
    y[n] = sum;
  }
  return y;
}

export function applyLPCPitchShift(input: Float32Array, pitchRatio: number, sampleRate: number): Float32Array {
  // Simplified offline grain-based LPC pitch shifter
  const order = 32; // LPC order
  const grainSizeMs = 30;
  const overlapMs = 15;
  const grainSize = Math.floor((grainSizeMs / 1000) * sampleRate);
  const overlap = Math.floor((overlapMs / 1000) * sampleRate);
  const stride = grainSize - overlap;
  
  const output = new Float32Array(input.length);
  const window = new Float32Array(grainSize);
  for (let i = 0; i < grainSize; i++) {
    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (grainSize - 1))); // Hann window
  }

  for (let n = 0; n < input.length - grainSize; n += stride) {
    const grain = new Float32Array(grainSize);
    for (let i = 0; i < grainSize; i++) {
      grain[i] = input[n + i] * window[i];
    }
    
    // 1. Compute LPC
    const a = computeLPC(grain, order);
    
    // 2. Inverse filter to get excitation
    const excitation = inverseFilter(grain, a);
    
    // 3. Pitch shift excitation using linear interpolation (resampling)
    const shiftedExcitation = new Float32Array(grainSize);
    for (let i = 0; i < grainSize; i++) {
      const srcIdx = i * pitchRatio;
      const idx1 = Math.floor(srcIdx);
      const idx2 = idx1 + 1;
      const frac = srcIdx - idx1;
      if (idx1 >= 0 && idx2 < grainSize) {
        shiftedExcitation[i] = excitation[idx1] * (1 - frac) + excitation[idx2] * frac;
      }
    }
    
    // 4. Forward filter shifted excitation
    const outputGrain = forwardFilter(shiftedExcitation, a);
    
    // 5. Overlap add
    for (let i = 0; i < grainSize; i++) {
      if (n + i < output.length) {
        output[n + i] += outputGrain[i] * window[i];
      }
    }
  }
  
  return output;
}

export function applyAlienVoiceAM(input: Float32Array, f_mod: number, sampleRate: number): Float32Array {
  const output = new Float32Array(input.length);
  const w_mod = 2 * Math.PI * (f_mod / sampleRate);
  
  let x_prev = 0;
  for (let n = 0; n < input.length; n++) {
    // High pass filter to remove DC noise
    const hp = input[n] - x_prev;
    x_prev = input[n];
    
    // AM modulation
    output[n] = hp * Math.sin(w_mod * n);
  }
  
  return output;
}
