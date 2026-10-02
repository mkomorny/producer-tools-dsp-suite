export class NFCTSMPitchShifter {
  private sampleRate: number;
  
  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }
  
  // A simple envelope follower for normalization
  private envelopeFollower(signal: Float32Array, attack: number, release: number): Float32Array {
    const env = new Float32Array(signal.length);
    let currentEnv = 0;
    
    // Convert time constants to coefficients
    const attackCoeff = Math.exp(-1.0 / (this.sampleRate * attack));
    const releaseCoeff = Math.exp(-1.0 / (this.sampleRate * release));
    
    for (let i = 0; i < signal.length; i++) {
      const absVal = Math.abs(signal[i]);
      if (absVal > currentEnv) {
        currentEnv = attackCoeff * currentEnv + (1 - attackCoeff) * absVal;
      } else {
        currentEnv = releaseCoeff * currentEnv + (1 - releaseCoeff) * absVal;
      }
      env[i] = currentEnv;
    }
    return env;
  }
  
  // 1st order IIR Low Pass Filter (approx 70Hz as suggested by the paper)
  private lowPassFilter(signal: Float32Array, cutoff: number): Float32Array {
    const filtered = new Float32Array(signal.length);
    const rc = 1.0 / (cutoff * 2 * Math.PI);
    const dt = 1.0 / this.sampleRate;
    const alpha = dt / (rc + dt);
    
    let previous = signal[0];
    for (let i = 0; i < signal.length; i++) {
      previous = previous + (alpha * (signal[i] - previous));
      filtered[i] = previous;
    }
    return filtered;
  }
  
  // Truncated Sinc Interpolation
  private sincInterpolate(signal: Float32Array, index: number, N: number = 8): number {
    const intIndex = Math.floor(index);
    const frac = index - intIndex;
    if (frac === 0) return signal[intIndex] || 0;
    
    let sum = 0;
    for (let i = -N + 1; i <= N; i++) {
      const n = intIndex + i;
      if (n >= 0 && n < signal.length) {
        const x = Math.PI * (frac - i);
        const sinc = Math.sin(x) / x;
        // Apply Hann window to sinc
        const window = 0.5 * (1 + Math.cos(Math.PI * i / N));
        sum += signal[n] * sinc * window;
      }
    }
    return sum;
  }

  // Find the best splicing point using Average Magnitude Difference Function (AMDF)
  private findBestSplicingPoint(
    normalizedLPF: Float32Array,
    startSearchIdx: number,
    searchLength: number,
    corrWindowSize: number,
    targetIdx: number
  ): number {
    let minAmdf = Infinity;
    let bestIdx = startSearchIdx;
    
    // To ensure we don't go out of bounds
    const maxSearch = Math.min(startSearchIdx + searchLength, normalizedLPF.length - corrWindowSize);
    
    for (let m = startSearchIdx; m < maxSearch; m++) {
      let amdf = 0;
      for (let k = 0; k < corrWindowSize; k++) {
        // We compare the segment at `targetIdx` with the segment at `m`
        const valTarget = normalizedLPF[targetIdx + k] || 0;
        const valSearch = normalizedLPF[m + k] || 0;
        amdf += Math.abs(valTarget - valSearch);
      }
      
      if (amdf < minAmdf) {
        minAmdf = amdf;
        bestIdx = m;
      }
    }
    
    return bestIdx;
  }
  
  // Linear Crossfade
  private crossfade(buffer: Float32Array, writePos: number, sourceA: Float32Array, sourceB: Float32Array, crossfadeLen: number) {
     // This would blend two sources, but in our buffer-based implementation we can 
     // just apply the crossfade into the output buffer directly.
  }

  public process(inputSignal: Float32Array, pitchShiftFactor: number): Float32Array {
    if (pitchShiftFactor === 1.0) return Float32Array.from(inputSignal);
    
    // Resampling factor
    const alpha = 1.0 / pitchShiftFactor;
    
    // 1. Calculate fundamental parameters
    // Assuming lowest fundamental freq ~70Hz for max period calculation
    const fMin = 70;
    const maxPeriod = Math.floor(this.sampleRate / fMin);
    
    // Prepare Normalized Low-Pass Filtered signal for AMDF search
    const lpf = this.lowPassFilter(inputSignal, fMin);
    const env = this.envelopeFollower(inputSignal, 0.01, 0.05); // 10ms attack, 50ms release
    const normalizedLPF = new Float32Array(inputSignal.length);
    for (let i = 0; i < inputSignal.length; i++) {
      normalizedLPF[i] = lpf[i] / (env[i] + 1e-6); // Avoid div by zero
    }
    
    const crossfadeLength = Math.floor(this.sampleRate * 0.005); // 5ms crossfade
    const sincFilterLength = 8;
    
    // Output size estimation
    const outputLength = Math.floor(inputSignal.length * alpha);
    const outputSignal = new Float32Array(inputSignal.length); // We keep original duration in TSM!
    
    let inputPointer = 0;  // Input pointer (moves at 1x speed)
    let outputPointer = 0; // Output pointer for resampling
    let writePointer = 0;  // Where we are writing to the final output buffer
    
    const dMax = 2 * maxPeriod;
    const dMin = crossfadeLength + sincFilterLength;
    
    // AMDF Settings
    // The paper uses C = 3/8 of the max period for the correlation window
    const corrWindowSize = Math.floor(0.375 * maxPeriod); 
    const searchAreaSize = Math.floor((1 - 0.375) * maxPeriod);
    
    while (writePointer < outputSignal.length && inputPointer < inputSignal.length) {
      // Distance between pointers
      const d = outputPointer - inputPointer;
      
      let jumpPerformed = false;
      let newOutputPointer = outputPointer;
      
      if (d > dMax) {
        // Output pointer has moved too far ahead (pitch shifting down)
        // Needs to jump forward (closer to input pointer)
        const searchStart = outputPointer - maxPeriod; // Jump back by ~1 period
        
        // Find best splicing point in the search area
        const bestPoint = this.findBestSplicingPoint(
          normalizedLPF, 
          Math.max(0, searchStart), 
          searchAreaSize, 
          corrWindowSize, 
          outputPointer
        );
        
        newOutputPointer = bestPoint;
        jumpPerformed = true;
        
      } else if (d < -dMin) {
        // Output pointer is too far behind (pitch shifting up)
        // Needs to jump backward (further behind input pointer)
        const searchStart = outputPointer - maxPeriod; // Jump back by ~1 period
        
        const bestPoint = this.findBestSplicingPoint(
          normalizedLPF,
          Math.max(0, searchStart),
          searchAreaSize,
          corrWindowSize,
          outputPointer
        );
        
        newOutputPointer = bestPoint;
        jumpPerformed = true;
      }
      
      if (jumpPerformed) {
        // Apply crossfade between the old pointer trajectory and the new one
        for (let i = 0; i < crossfadeLength && writePointer < outputSignal.length; i++) {
          const fadeOut = 1 - (i / crossfadeLength);
          const fadeIn = (i / crossfadeLength);
          
          const valOld = this.sincInterpolate(inputSignal, outputPointer + (i * alpha), sincFilterLength);
          const valNew = this.sincInterpolate(inputSignal, newOutputPointer + (i * alpha), sincFilterLength);
          
          outputSignal[writePointer] = (valOld * fadeOut) + (valNew * fadeIn);
          writePointer++;
        }
        
        // Update pointers after crossfade
        outputPointer = newOutputPointer + (crossfadeLength * alpha);
        inputPointer += crossfadeLength; // Input pointer always moves 1 sample per output sample
      } else {
        // Normal resampling
        outputSignal[writePointer] = this.sincInterpolate(inputSignal, outputPointer, sincFilterLength);
        writePointer++;
        outputPointer += alpha;
        inputPointer++;
      }
    }
    
    return outputSignal;
  }
}
