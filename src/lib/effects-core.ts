import * as Tone from 'tone';
import { RealFFT } from './fft';

export class RingModulator extends Tone.ToneAudioNode<any> {
    name = "RingModulator";
    input: Tone.Gain;
    output: Tone.CrossFade;
    private osc: Tone.Oscillator;
    private mult: Tone.Multiply;
    
    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.CrossFade(options.mix || 1);
        
        this.osc = new Tone.Oscillator({
            frequency: options.frequency || 440,
            type: options.type || "sine"
        }).start();
        
        this.mult = new Tone.Multiply();
        
        this.input.connect(this.mult, 0, 0);
        this.osc.connect(this.mult, 0, 1);
        
        // Dry signal
        this.input.connect(this.output.a);
        // Wet signal
        this.mult.connect(this.output.b);
    }
    
    get frequency() {
        return this.osc.frequency;
    }
    
    set type(value: Tone.ToneOscillatorType) {
        this.osc.type = value;
    }
    
    get wet() {
        return this.output.fade;
    }
    
    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this.osc.dispose();
        this.mult.dispose();
        return this;
    }
}

export class AdaptiveChorus extends Tone.ToneAudioNode<any> {
    name = "AdaptiveChorus";
    input: Tone.Gain;
    output: Tone.Gain;
    private chorus: Tone.Chorus;
    private meter: Tone.Meter;
    private intervalId: any;
    
    baseDepth: number = 0.5;
    sensitivity: number = 0.5;
    
    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        
        this.chorus = new Tone.Chorus().start();
        this.meter = new Tone.Meter({ smoothing: 0.8 });
        
        this.input.connect(this.chorus);
        this.chorus.connect(this.output);
        this.input.connect(this.meter);
        
        this.intervalId = setInterval(() => {
            const level = this.meter.getValue() as number; 
            const amp = Tone.dbToGain(level);
            const targetDepth = Math.max(0, Math.min(1, this.baseDepth + (amp * 2 * this.sensitivity)));
            this.chorus.depth = targetDepth;
        }, 30);
    }
    
    dispose() {
        super.dispose();
        clearInterval(this.intervalId);
        this.input.dispose();
        this.output.dispose();
        this.chorus.dispose();
        this.meter.dispose();
        return this;
    }
}

export class SmartVibrato extends Tone.ToneAudioNode<any> {
    name = "SmartVibrato";
    input: Tone.Gain;
    output: Tone.Gain;
    private vibrato: Tone.Vibrato;
    private meter: Tone.Meter;
    private intervalId: any;
    
    baseDepth: number = 0.5;
    
    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        
        this.vibrato = new Tone.Vibrato();
        this.meter = new Tone.Meter({ smoothing: 0.95 });
        
        this.input.connect(this.vibrato);
        this.vibrato.connect(this.output);
        this.input.connect(this.meter);
        
        this.intervalId = setInterval(() => {
            const level = this.meter.getValue() as number; 
            const amp = Tone.dbToGain(level);
            const targetDepth = Math.max(0, Math.min(1, (amp * 3) * this.baseDepth));
            if (this.vibrato.depth && this.vibrato.depth.value !== undefined) {
                 this.vibrato.depth.value = targetDepth;
            }
        }, 30);
    }
    
    set rate(val: number) { 
        if (this.vibrato.frequency && this.vibrato.frequency.value !== undefined) {
             this.vibrato.frequency.value = val; 
        }
    }
    set likeliness(val: number) {
        this.meter.smoothing = 0.5 + (val / 100) * 0.49;
    }
    
    dispose() {
        super.dispose();
        clearInterval(this.intervalId);
        this.input.dispose();
        this.output.dispose();
        this.vibrato.dispose();
        this.meter.dispose();
        return this;
    }
}

export class AdaptiveTremolo extends Tone.ToneAudioNode<any> {
    name = "AdaptiveTremolo";
    input: Tone.Gain;
    output: Tone.Gain;
    private tremolo: Tone.Tremolo;
    private meter: Tone.Meter;
    private intervalId: any;
    
    baseDepth: number = 0.5;
    sensitivity: number = 0.5;
    
    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        
        this.tremolo = new Tone.Tremolo().start();
        this.meter = new Tone.Meter({ smoothing: 0.8 });
        
        this.input.connect(this.tremolo);
        this.tremolo.connect(this.output);
        this.input.connect(this.meter);
        
        this.intervalId = setInterval(() => {
            const level = this.meter.getValue() as number; 
            const amp = Tone.dbToGain(level);
            const targetDepth = Math.max(0, Math.min(1, this.baseDepth + (amp * 2 * this.sensitivity)));
            if (this.tremolo.depth && this.tremolo.depth.value !== undefined) {
                 this.tremolo.depth.value = targetDepth;
            }
        }, 30);
    }
    
    set rate(val: number) { 
        if (this.tremolo.frequency && this.tremolo.frequency.value !== undefined) {
             this.tremolo.frequency.value = val; 
        }
    }
    
    dispose() {
        super.dispose();
        clearInterval(this.intervalId);
        this.input.dispose();
        this.output.dispose();
        this.tremolo.dispose();
        this.meter.dispose();
        return this;
    }
}

export class AnalogTape extends Tone.ToneAudioNode<any> {
    name = "AnalogTape";
    input: Tone.Gain;
    output: Tone.Gain;
    private wow: Tone.Vibrato;
    private flutter: Tone.Vibrato;
    private saturation: Tone.WaveShaper;
    private lowpass: Tone.Filter;
    
    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        
        // Wow: Slow pitch variation (e.g., 0.5 - 2 Hz)
        this.wow = new Tone.Vibrato();
        
        // Flutter: Fast pitch variation (e.g., 5 - 15 Hz)
        this.flutter = new Tone.Vibrato();
        
        // Saturation: S-curve for tape compression (using tanh)
        this.saturation = new Tone.WaveShaper((val) => {
            const drive = 2.0;
            return Math.tanh(val * drive);
        });
        
        // Head bump / loss effects: lowpass filter (e.g., 15kHz)
        this.lowpass = new Tone.Filter({
            type: "lowpass",
            frequency: 15000,
            rolloff: -12
        });
        
        this.input.connect(this.saturation);
        this.saturation.connect(this.wow);
        this.wow.connect(this.flutter);
        this.flutter.connect(this.lowpass);
        this.lowpass.connect(this.output);
    }
    
    set tapeAge(val: number) {
        const age = val / 100;
        this.wow.depth.value = age * 0.5;
        this.flutter.depth.value = age * 0.3;
        this.lowpass.frequency.value = 15000 - (age * 10000); 
    }
    
    set drive(val: number) {
        const driveAmt = 1 + (val / 100) * 4;
        this.saturation.setMap((v) => Math.tanh(v * driveAmt));
    }
    
    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this.wow.dispose();
        this.flutter.dispose();
        this.saturation.dispose();
        this.lowpass.dispose();
        return this;
    }
}

export class DopplerFreeDelay extends Tone.ToneAudioNode<any> {
    name = "DopplerFreeDelay";
    input: Tone.Gain;
    output: Tone.Gain;
    
    private delayA: Tone.Delay;
    private delayB: Tone.Delay;
    private crossFade: Tone.CrossFade;
    
    private currentDelay: number;
    private targetDelay: number;
    private activeDelay: 'A' | 'B' = 'A';
    private transitionTime: number = 0.1;
    
    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        
        this.delayA = new Tone.Delay(options.delayTime || 0.5, 2);
        this.delayB = new Tone.Delay(options.delayTime || 0.5, 2);
        this.crossFade = new Tone.CrossFade(0); // 0 = A, 1 = B
        
        this.currentDelay = options.delayTime || 0.5;
        this.targetDelay = this.currentDelay;
        
        this.input.connect(this.delayA);
        this.input.connect(this.delayB);
        
        this.delayA.connect(this.crossFade.a);
        this.delayB.connect(this.crossFade.b);
        this.crossFade.connect(this.output);
    }
    
    set delayTime(time: number) {
        if (time === this.targetDelay) return;
        this.targetDelay = time;
        
        if (this.activeDelay === 'A') {
            this.delayB.delayTime.value = time;
            this.crossFade.fade.rampTo(1, this.transitionTime);
            this.activeDelay = 'B';
        } else {
            this.delayA.delayTime.value = time;
            this.crossFade.fade.rampTo(0, this.transitionTime);
            this.activeDelay = 'A';
        }
    }
    
    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this.delayA.dispose();
        this.delayB.dispose();
        this.crossFade.dispose();
        return this;
    }
}

export class AnalyticFrequencyShifter extends Tone.ToneAudioNode<any> {
    name = "AnalyticFrequencyShifter";
    input: Tone.Gain;
    output: Tone.Gain;
    private hilbertConvolver: Tone.Convolver;
    private delayNetwork: Tone.Delay; 
    private oscSine: Tone.Oscillator;
    private oscCosine: Tone.Oscillator;
    private multReal: Tone.Multiply;
    private multImag: Tone.Multiply;
    private subtract: Tone.Subtract; 
    private add: Tone.Add;
    private sidebandMix: Tone.CrossFade;
    private _shift: number = 0;

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();

        // Generate Hilbert Transformer FIR
        const numTaps = 127; 
        const M = Math.floor(numTaps / 2);
        const ir = new Float32Array(numTaps);
        for (let n = 0; n < numTaps; n++) {
            if (n === M) {
                ir[n] = 0;
            } else {
                const diff = n - M;
                if (diff % 2 !== 0) {
                    ir[n] = 2 / (Math.PI * diff);
                } else {
                    ir[n] = 0;
                }
            }
            // Hamming window
            ir[n] *= 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (numTaps - 1));
        }

        const audioContext = Tone.getContext().rawContext as AudioContext;
        const buffer = audioContext.createBuffer(1, numTaps, audioContext.sampleRate);
        buffer.copyToChannel(ir, 0);

        this.hilbertConvolver = new Tone.Convolver(buffer);
        
        // Delay to match the M samples latency of the FIR filter
        this.delayNetwork = new Tone.Delay(M / audioContext.sampleRate);

        this.oscCosine = new Tone.Oscillator({
            frequency: 0,
            type: "sine",
            phase: 90 
        }).start();

        this.oscSine = new Tone.Oscillator({
            frequency: 0,
            type: "sine",
            phase: 0
        }).start();

        this.multReal = new Tone.Multiply();
        this.multImag = new Tone.Multiply();
        this.subtract = new Tone.Subtract();
        this.add = new Tone.Add();
        this.sidebandMix = new Tone.CrossFade(0); // 0 = upper sideband (shift up), 1 = lower sideband (shift down)

        // Split input
        this.input.connect(this.delayNetwork);
        this.input.connect(this.hilbertConvolver);

        // Real path: x(t-M) * cos(w t)
        this.delayNetwork.connect(this.multReal, 0, 0);
        this.oscCosine.connect(this.multReal, 0, 1);

        // Imag path: H{x}(t) * sin(w t)
        this.hilbertConvolver.connect(this.multImag, 0, 0);
        this.oscSine.connect(this.multImag, 0, 1);

        // Combine for upper sideband: Real - Imag
        this.multReal.connect(this.subtract, 0, 0);
        this.multImag.connect(this.subtract, 0, 1);
        
        // Combine for lower sideband: Real + Imag
        this.multReal.connect(this.add, 0, 0);
        this.multImag.connect(this.add, 0, 1);

        this.subtract.connect(this.sidebandMix.a);
        this.add.connect(this.sidebandMix.b);

        this.sidebandMix.connect(this.output);
        
        this.shift = options.shift || 0;
    }

    get shift() {
        return this._shift;
    }

    set shift(val: number) {
        this._shift = val;
        const absFreq = Math.abs(val);
        this.oscSine.frequency.value = absFreq;
        this.oscCosine.frequency.value = absFreq;
        // If shift is negative, we want the lower sideband
        this.sidebandMix.fade.value = val < 0 ? 1 : 0;
    }

    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this.hilbertConvolver.dispose();
        this.delayNetwork.dispose();
        this.oscSine.dispose();
        this.oscCosine.dispose();
        this.multReal.dispose();
        this.multImag.dispose();
        this.subtract.dispose();
        this.add.dispose();
        this.sidebandMix.dispose();
        return this;
    }
}

export class EnhancedWideNotchComb extends Tone.ToneAudioNode<any> {
    name = "EnhancedWideNotchComb";
    input: Tone.Gain;
    output: Tone.Gain;
    private convolver: ConvolverNode;
    private _frequency: number = 50; 
    private _c: number = 0.05;

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        const audioContext = Tone.getContext().rawContext as AudioContext;
        this.convolver = audioContext.createConvolver();
        
        this._frequency = options.frequency || 50;
        this._c = options.c || 0.05;
        
        Tone.connect(this.input, this.convolver);
        Tone.connect(this.convolver, this.output);
        
        this.updateFilter();
    }
    
    private updateFilter() {
        const audioContext = Tone.getContext().rawContext as AudioContext;
        const fs = audioContext.sampleRate;
        const D = Math.max(2, Math.round(fs / this._frequency));
        const C = this._c;
        
        const len = 3 * D + 1;
        const B = new Float64Array(len);
        B[0] = 1;
        B[D - 1] = -C;
        B[D] = 2 * C - 3;
        B[D + 1] = -C;
        B[2 * D - 1] = C;
        B[2 * D] = 3 - 2 * C;
        B[2 * D + 1] = C;
        B[3 * D] = -1;
        
        const dcGain = Math.pow(D, 3) - D * C;
        for (let i = 0; i < len; i++) {
            B[i] = B[i] / dcGain;
        }
        
        const A = [1, -3, 3, -1];
        
        const ir = new Float32Array(len);
        const y = new Float64Array(len);
        
        for (let n = 0; n < len; n++) {
            let sum = 0;
            if (n < B.length) sum += B[n]; 
            
            for (let j = 1; j <= 3; j++) {
                if (n - j >= 0) {
                    sum -= A[j] * y[n - j];
                }
            }
            y[n] = sum;
            ir[n] = sum;
        }
        
        const buffer = audioContext.createBuffer(1, len, fs);
        buffer.copyToChannel(ir, 0);
        
        this.convolver.buffer = buffer;
    }

    get frequency() { return this._frequency; }
    set frequency(val: number) { this._frequency = val; this.updateFilter(); }
    
    get c() { return this._c; }
    set c(val: number) { this._c = val; this.updateFilter(); }

    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this.convolver.disconnect();
        return this;
    }
}

export class DualPathFilter extends Tone.ToneAudioNode<any> {
    name = "DualPathFilter";
    input: Tone.Gain;
    output: Tone.Gain;
    private topPath: Tone.Gain;
    private bottomPath: Tone.Gain;
    private filterA0_1: IIRFilterNode;
    private filterA0_2: IIRFilterNode;
    private filterA1_1: IIRFilterNode;
    private invert: Tone.Multiply;
    private mix: Tone.Gain;
    
    private _type: "lowpass" | "highpass" = "lowpass";

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        
        this.topPath = new Tone.Gain();
        this.bottomPath = new Tone.Gain();
        
        const audioContext = Tone.getContext().rawContext as AudioContext;
        
        const c1 = -0.8005;
        this.filterA0_1 = audioContext.createIIRFilter(
            [c1, 1], 
            [1, c1]
        );
        
        const c2_top = -1.6517;
        const c3_top = 0.8791;
        this.filterA0_2 = audioContext.createIIRFilter(
            [c3_top, c2_top, 1], 
            [1, c2_top, c3_top]
        );
        
        const c2_bot = -1.5978;
        const c3_bot = 0.7041;
        this.filterA1_1 = audioContext.createIIRFilter(
            [c3_bot, c2_bot, 1], 
            [1, c2_bot, c3_bot]
        );
        
        this.invert = new Tone.Multiply(1);
        
        this.input.connect(this.topPath);
        this.input.connect(this.bottomPath);
        
        Tone.connect(this.topPath, this.filterA0_1);
        Tone.connect(this.filterA0_1, this.filterA0_2);
        
        Tone.connect(this.bottomPath, this.filterA1_1);
        Tone.connect(this.filterA1_1, this.invert);
        
        this.mix = new Tone.Gain(0.5);
        Tone.connect(this.filterA0_2, this.mix);
        Tone.connect(this.invert, this.mix);
        this.mix.connect(this.output);
        
        this.type = options.type || "lowpass";
    }

    get type() { return this._type; }
    set type(val: "lowpass" | "highpass") { 
        this._type = val; 
        this.invert.value = val === "lowpass" ? 1 : -1;
    }

    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this.topPath.dispose();
        this.bottomPath.dispose();
        this.invert.dispose();
        this.mix.dispose();
        this.filterA0_1.disconnect();
        this.filterA0_2.disconnect();
        this.filterA1_1.disconnect();
        return this;
    }
}

export class SmartZCRFilter extends Tone.ToneAudioNode<any> {
    name = "SmartZCRFilter";
    input: Tone.Gain;
    output: Tone.Gain;
    private filter: Tone.Filter;
    private scriptNode?: ScriptProcessorNode;
    private dummyGain?: Tone.Gain;
    
    baseCutoff: number = 200;
    sensitivity: number = 50;
    
    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        
        this.filter = new Tone.Filter({
            type: "lowpass",
            frequency: this.baseCutoff,
            rolloff: -24
        });
        
        const audioContext = Tone.getContext().rawContext as AudioContext;
        if (typeof audioContext.createScriptProcessor === 'function') {
            this.scriptNode = audioContext.createScriptProcessor(1024, 1, 1);
            
            this.scriptNode.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                
                let zcr = 0;
                for (let i = 1; i < inputData.length; i++) {
                    if ((inputData[i] >= 0 && inputData[i-1] < 0) || (inputData[i] < 0 && inputData[i-1] >= 0)) {
                        zcr++;
                    }
                }
                
                const normalizedZCR = zcr / inputData.length; 
                const targetFreq = this.baseCutoff + (normalizedZCR * 20000 * (this.sensitivity / 100));
                
                if (this.filter.frequency && this.filter.frequency.value !== undefined) {
                    this.filter.frequency.rampTo(Math.min(20000, targetFreq), 0.05);
                }
            };
            Tone.connect(this.input, this.scriptNode as any);
            this.dummyGain = new Tone.Gain(0);
            Tone.connect(this.scriptNode, this.dummyGain);
            this.dummyGain.toDestination();
        }
        
        this.input.connect(this.filter);
        this.filter.connect(this.output);
    }

    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this.filter.dispose();
        if (this.dummyGain) this.dummyGain.dispose();
        if (this.scriptNode) this.scriptNode.disconnect();
        return this;
    }
}

export class FarrowFractionalDelay extends Tone.ToneAudioNode<any> {
    name = "FarrowFractionalDelay";
    input: Tone.Gain;
    output: Tone.Gain;
    private scriptNode?: ScriptProcessorNode;
    private buffer!: Float32Array;
    private writeIndex: number = 0;
    
    private _delayTime: number = 0.005; // 5ms
    private _modulationRate: number = 1;
    private _modulationDepth: number = 0.002;
    private _mix: number = 0.5;

    private phase: number = 0;
    private dryGain: Tone.Gain;
    private wetGain: Tone.Gain;

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        this.dryGain = new Tone.Gain(1 - this._mix);
        this.wetGain = new Tone.Gain(this._mix);
        
        const ctx = Tone.getContext().rawContext as AudioContext;
        if (typeof ctx.createScriptProcessor === 'function') {
            this.scriptNode = ctx.createScriptProcessor(1024, 1, 1);
            
            const fs = ctx.sampleRate;
            this.buffer = new Float32Array(fs * 2); // 2 seconds max
            
            this.scriptNode.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const outputData = e.outputBuffer.getChannelData(0);
                
                for (let i = 0; i < inputData.length; i++) {
                    this.buffer[this.writeIndex] = inputData[i];
                    
                    const currentDelay = this._delayTime + this._modulationDepth * Math.sin(this.phase);
                    this.phase += 2 * Math.PI * this._modulationRate / fs;
                    if (this.phase > 2 * Math.PI) this.phase -= 2 * Math.PI;
                    
                    const delaySamples = currentDelay * fs;
                    let readPos = this.writeIndex - delaySamples;
                    if (readPos < 0) readPos += this.buffer.length;
                    
                    const n = Math.floor(readPos);
                    const delta = readPos - n;
                    
                    const idx0 = n % this.buffer.length;
                    const idx1 = (n - 1 + this.buffer.length) % this.buffer.length;
                    const idx2 = (n - 2 + this.buffer.length) % this.buffer.length;
                    const idx3 = (n - 3 + this.buffer.length) % this.buffer.length;
                    
                    const y0 = this.buffer[idx0];
                    const y1 = this.buffer[idx1];
                    const y2 = this.buffer[idx2];
                    const y3 = this.buffer[idx3];
                    
                    const d2 = delta * delta;
                    const d3 = d2 * delta;
                    
                    const c0 = -0.1666667 * y3 + 0.5 * y2 - 0.5 * y1 + 0.1666667 * y0;
                    const c1 = 0.5 * y3 - y2 + 0.5 * y1;
                    const c2 = -0.3333333 * y3 - 0.5 * y2 + y1 - 0.1666667 * y0;
                    const c3 = y2;
                    
                    outputData[i] = c0 * d3 + c1 * d2 + c2 * delta + c3;
                    
                    this.writeIndex = (this.writeIndex + 1) % this.buffer.length;
                }
            };
            
            Tone.connect(this.input, this.scriptNode as any);
            Tone.connect(this.scriptNode, this.wetGain);
        }
        
        this.input.connect(this.dryGain);
        
        this.dryGain.connect(this.output);
        this.wetGain.connect(this.output);
        
        if (options.delayTime !== undefined) this.delayTime = options.delayTime;
        if (options.modulationRate !== undefined) this.modulationRate = options.modulationRate;
        if (options.modulationDepth !== undefined) this.modulationDepth = options.modulationDepth;
        if (options.mix !== undefined) this.mix = options.mix;
    }

    get delayTime() { return this._delayTime; }
    set delayTime(val) { this._delayTime = val; }
    get modulationRate() { return this._modulationRate; }
    set modulationRate(val) { this._modulationRate = val; }
    get modulationDepth() { return this._modulationDepth; }
    set modulationDepth(val) { this._modulationDepth = val; }
    get mix() { return this._mix; }
    set mix(val) { 
        this._mix = val; 
        this.dryGain.gain.value = 1 - val;
        this.wetGain.gain.value = val;
    }

    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this.dryGain.dispose();
        this.wetGain.dispose();
        if (this.scriptNode) this.scriptNode.disconnect();
        return this;
    }
}

export class HilbertEnvelopeWah extends Tone.ToneAudioNode<any> {
    name = "HilbertEnvelopeWah";
    input: Tone.Gain;
    output: Tone.Gain;

    private nativeConvolver: ConvolverNode;
    private delay: Tone.Delay;
    
    private squareI: Tone.WaveShaper;
    private squareQ: Tone.WaveShaper;
    private sqrtEnv: Tone.WaveShaper;
    
    private addEnv: Tone.Add;
    private scaleEnv: Tone.Multiply;
    private baseFreqAdd: Tone.Add;
    
    private filter: Tone.Filter;
    
    private _baseCutoff: number = 200;
    private _sensitivity: number = 2000;

    private envSmoothing: Tone.Filter;

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        
        const ctx = Tone.getContext().rawContext as AudioContext;
        
        const filterLen = 255;
        this.nativeConvolver = ctx.createConvolver();
        this.nativeConvolver.normalize = false;
        this.nativeConvolver.buffer = this.createHilbertIR(filterLen, ctx.sampleRate);
        
        this.delay = new Tone.Delay((Math.floor(filterLen / 2)) / ctx.sampleRate);
        
        Tone.connect(this.input, this.nativeConvolver as any);
        this.input.connect(this.delay);
        
        const makeSquare = () => {
            const curve = new Float32Array(1024);
            for (let i = 0; i < 1024; i++) {
                const x = (i * 2 / 1023) - 1;
                curve[i] = x * x;
            }
            return curve;
        };
        const makeSqrt = () => {
            const curve = new Float32Array(1024);
            for (let i = 0; i < 1024; i++) {
                const x = (i * 2 / 1023) - 1;
                curve[i] = Math.sqrt(Math.max(0, x));
            }
            return curve;
        };
        
        this.squareI = new Tone.WaveShaper(makeSquare());
        this.squareQ = new Tone.WaveShaper(makeSquare());
        this.sqrtEnv = new Tone.WaveShaper(makeSqrt());
        
        this.envSmoothing = new Tone.Filter({
            type: "lowpass",
            frequency: 30, // Smooth the extracted envelope to reduce noise artifacts
            rolloff: -12
        });
        
        this.delay.connect(this.squareI);
        Tone.connect(this.nativeConvolver, this.squareQ);
        
        this.addEnv = new Tone.Add();
        this.squareI.connect(this.addEnv, 0, 0);
        this.squareQ.connect(this.addEnv, 0, 1);
        
        this.addEnv.connect(this.sqrtEnv);
        this.sqrtEnv.connect(this.envSmoothing);
        
        this.scaleEnv = new Tone.Multiply(this._sensitivity);
        this.envSmoothing.connect(this.scaleEnv);
        
        this.baseFreqAdd = new Tone.Add(this._baseCutoff);
        this.scaleEnv.connect(this.baseFreqAdd);
        
        this.filter = new Tone.Filter({
            type: "lowpass",
            Q: 4,
            rolloff: -24
        });
        this.filter.frequency.value = 0; // modulated by Add
        
        Tone.connect(this.baseFreqAdd, this.filter.frequency);
        
        this.delay.connect(this.filter);
        this.filter.connect(this.output);
        
        if (options.baseCutoff !== undefined) this.baseCutoff = options.baseCutoff;
        if (options.sensitivity !== undefined) this.sensitivity = options.sensitivity;
    }
    
    private createHilbertIR(length: number, sampleRate: number): AudioBuffer {
        const audioContext = Tone.getContext().rawContext as AudioContext;
        const buffer = audioContext.createBuffer(1, length, sampleRate);
        const channel = buffer.getChannelData(0);
        const center = Math.floor(length / 2);
        for (let i = 0; i < length; i++) {
            const n = i - center;
            if (n !== 0 && n % 2 !== 0) {
                const val = 2 / (Math.PI * n);
                const window = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (length - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (length - 1));
                channel[i] = val * window;
            } else {
                channel[i] = 0;
            }
        }
        return buffer;
    }

    get baseCutoff() { return this._baseCutoff; }
    set baseCutoff(val) { 
        this._baseCutoff = val; 
        this.baseFreqAdd.addend.value = val;
    }
    
    get sensitivity() { return this._sensitivity; }
    set sensitivity(val) { 
        this._sensitivity = val;
        this.scaleEnv.factor.value = val;
    }

    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this.nativeConvolver.disconnect();
        this.delay.dispose();
        this.squareI.dispose();
        this.squareQ.dispose();
        this.sqrtEnv.dispose();
        this.addEnv.dispose();
        this.scaleEnv.dispose();
        this.baseFreqAdd.dispose();
        this.filter.dispose();
        return this;
    }
}

export class PhasingSSBModulator extends Tone.ToneAudioNode<any> {
    name = "PhasingSSBModulator";
    input: Tone.Gain;
    output: Tone.Gain;

    private nativeConvolver: ConvolverNode;
    private delay: Tone.Delay;
    
    private multI: Tone.Multiply;
    private multQ: Tone.Multiply;
    
    private cosOsc: Tone.Oscillator;
    private sinOsc: Tone.Oscillator;
    
    private mixNode: Tone.Gain;
    private _qGain: GainNode;

    private _frequency: number = 100;
    private _mode: "USB" | "LSB" = "USB";

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        
        const ctx = Tone.getContext().rawContext as AudioContext;
        
        const filterLen = 255;
        this.nativeConvolver = ctx.createConvolver();
        this.nativeConvolver.normalize = false;
        this.nativeConvolver.buffer = this.createHilbertIR(filterLen, ctx.sampleRate);
        
        this.delay = new Tone.Delay((Math.floor(filterLen / 2)) / ctx.sampleRate);
        
        Tone.connect(this.input, this.nativeConvolver as any);
        this.input.connect(this.delay);
        
        this.cosOsc = new Tone.Oscillator({
            frequency: this._frequency,
            type: "sine",
            phase: 90
        }).start();
        
        this.sinOsc = new Tone.Oscillator({
            frequency: this._frequency,
            type: "sine",
            phase: 0
        }).start();
        
        this.multI = new Tone.Multiply();
        this.multQ = new Tone.Multiply();
        
        this.delay.connect(this.multI, 0, 0);
        this.cosOsc.connect(this.multI, 0, 1);
        
        Tone.connect(this.nativeConvolver, this.multQ, 0, 0);
        this.sinOsc.connect(this.multQ, 0, 1);
        
        this.mixNode = new Tone.Gain();
        
        this.multI.connect(this.mixNode);
        
        this._qGain = ctx.createGain();
        this._qGain.gain.value = this._mode === "USB" ? -1 : 1;
        Tone.connect(this.multQ, this._qGain);
        Tone.connect(this._qGain, this.mixNode);
        
        this.mixNode.connect(this.output);
        
        if (options.frequency !== undefined) this.frequency = options.frequency;
        if (options.mode !== undefined) this.mode = options.mode;
    }
    
    private createHilbertIR(length: number, sampleRate: number): AudioBuffer {
        const audioContext = Tone.getContext().rawContext as AudioContext;
        const buffer = audioContext.createBuffer(1, length, sampleRate);
        const channel = buffer.getChannelData(0);
        const center = Math.floor(length / 2);
        for (let i = 0; i < length; i++) {
            const n = i - center;
            if (n !== 0 && n % 2 !== 0) {
                const val = 2 / (Math.PI * n);
                const window = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (length - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (length - 1));
                channel[i] = val * window;
            } else {
                channel[i] = 0;
            }
        }
        return buffer;
    }

    get frequency() { return this._frequency; }
    set frequency(val) { 
        this._frequency = val; 
        this.cosOsc.frequency.value = val;
        this.sinOsc.frequency.value = val;
    }
    
    get mode() { return this._mode; }
    set mode(val) { 
        this._mode = val;
        if (this._qGain) {
            this._qGain.gain.value = val === "USB" ? -1 : 1;
        }
    }

    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this.nativeConvolver.disconnect();
        this.delay.dispose();
        this.multI.dispose();
        this.multQ.dispose();
        this.cosOsc.dispose();
        this.sinOsc.dispose();
        this.mixNode.dispose();
        if (this._qGain) this._qGain.disconnect();
        return this;
    }
}

export class FormantBank extends Tone.ToneAudioNode<any> {
    name = "FormantBank";
    input: Tone.Gain;
    output: Tone.Gain;
    
    private filters: Tone.Filter[] = [];
    private _vowel: number = 0;
    private _mixNode: Tone.CrossFade;
    
    // Formant frequencies and bandwidths (Hz) for typical vowels
    // [F1, F2, F3], [BW1, BW2, BW3]
    private vowelData = [
        { f: [700, 1220, 2600], bw: [130, 70, 160] }, // 'A' (father)
        { f: [400, 1600, 2200], bw: [70, 80, 100] },  // 'E' (bed)
        { f: [270, 2200, 2800], bw: [60, 90, 120] },  // 'I' (see)
        { f: [400, 800, 2600],  bw: [70, 80, 100] },  // 'O' (boat)
        { f: [300, 900, 2500],  bw: [60, 70, 100] }   // 'U' (boot)
    ];

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        this._mixNode = new Tone.CrossFade(1);
        
        this.input.connect(this._mixNode.a);
        
        for (let i = 0; i < 3; i++) {
            const filter = new Tone.Filter({
                type: "bandpass",
                rolloff: -12
            });
            this.input.connect(filter);
            filter.connect(this._mixNode.b);
            this.filters.push(filter);
        }
        
        this._mixNode.connect(this.output);
        
        this.vowel = options.vowel || 0;
    }
    
    get vowel() { return this._vowel; }
    set vowel(val: number) {
        this._vowel = val;
        const data = this.vowelData[Math.floor(val) % this.vowelData.length];
        
        for (let i = 0; i < 3; i++) {
            const freq = data.f[i];
            const bw = data.bw[i];
            const q = freq / bw;
            
            this.filters[i].frequency.value = freq;
            this.filters[i].Q.value = q;
        }
    }
    
    get mix() { return this._mixNode.fade.value; }
    set mix(val: number) { this._mixNode.fade.value = val; }
    
    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this._mixNode.dispose();
        this.filters.forEach(f => f.dispose());
        return this;
    }
}

export class DopplerPitchShiftNode extends Tone.ToneAudioNode<any> {
    name = "DopplerPitchShiftNode";
    input: Tone.Gain;
    output: Tone.Gain;
    private scriptNode?: ScriptProcessorNode;
    private buffer!: Float32Array;
    private writeIndex: number = 0;
    
    private _pitch: number = 0;
    private _delayLength: number = 40; // ms

    private phasorPhase: number = 0;

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        
        const ctx = Tone.getContext().rawContext as AudioContext;
        if (typeof ctx.createScriptProcessor === 'function') {
            this.scriptNode = ctx.createScriptProcessor(1024, 1, 1);
            
            const fs = ctx.sampleRate;
            this.buffer = new Float32Array(fs * 2); // 2 seconds max
            
            this.scriptNode.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const outputData = e.outputBuffer.getChannelData(0);
                
                const delayLengthSec = Math.max(0.01, this._delayLength / 1000);
                const pitchScale = Math.pow(2, this._pitch / 12);
                const phasorFreq = (1.0 - pitchScale) / delayLengthSec;
                const phasorPhaseInc = phasorFreq / fs;
                
                for (let i = 0; i < inputData.length; i++) {
                    this.buffer[this.writeIndex] = inputData[i];
                    
                    const phase1 = this.phasorPhase;
                    const phase2 = (this.phasorPhase + 0.5) % 1.0;
                    
                    const delayTap1 = delayLengthSec * phase1 * fs;
                    const delayTap2 = delayLengthSec * phase2 * fs;
                    
                    const gain1 = Math.cos(Math.PI * (phase1 - 0.5));
                    const gain2 = Math.cos(Math.PI * (phase2 - 0.5));
                    
                    // Tap 1
                    let readPos1 = this.writeIndex - delayTap1;
                    if (readPos1 < 0) readPos1 += this.buffer.length;
                    
                    // linear interpolation
                    const n1 = Math.floor(readPos1);
                    const n1_next = (n1 + 1) % this.buffer.length;
                    const frac1 = readPos1 - n1;
                    const sample1 = (this.buffer[n1] || 0) * (1 - frac1) + (this.buffer[n1_next] || 0) * frac1;
                    
                    // Tap 2
                    let readPos2 = this.writeIndex - delayTap2;
                    if (readPos2 < 0) readPos2 += this.buffer.length;
                    
                    const n2 = Math.floor(readPos2);
                    const n2_next = (n2 + 1) % this.buffer.length;
                    const frac2 = readPos2 - n2;
                    const sample2 = (this.buffer[n2] || 0) * (1 - frac2) + (this.buffer[n2_next] || 0) * frac2;
                    
                    outputData[i] = sample1 * gain1 + sample2 * gain2;
                    
                    this.phasorPhase += phasorPhaseInc;
                    if (this.phasorPhase >= 1.0) this.phasorPhase -= 1.0;
                    if (this.phasorPhase < 0.0) this.phasorPhase += 1.0;
                    
                    this.writeIndex = (this.writeIndex + 1) % this.buffer.length;
                }
            };
            
            Tone.connect(this.input, this.scriptNode as any);
            Tone.connect(this.scriptNode, this.output);
        } else {
             this.input.connect(this.output);
        }
        
        if (options.pitch !== undefined) this.pitch = options.pitch;
        if (options.delayLength !== undefined) this.delayLength = options.delayLength;
    }

    get pitch() { return this._pitch; }
    set pitch(val) { this._pitch = val; }
    get delayLength() { return this._delayLength; }
    set delayLength(val) { this._delayLength = val; }

    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        if (this.scriptNode) this.scriptNode.disconnect();
        return this;
    }
}

// --- Complex & Matrix Helpers for Rabenstein Filter ---
function cPolar(mag: number, ang: number) { return { re: mag * Math.cos(ang), im: mag * Math.sin(ang) }; }
function cMul(a: any, b: any) { return { re: a.re*b.re - a.im*b.im, im: a.re*b.im + a.im*b.re }; }
function cDiv(a: any, b: any) { const d = b.re*b.re + b.im*b.im; return { re: (a.re*b.re + a.im*b.im)/d, im: (a.im*b.re - a.re*b.im)/d }; }
function cAbs(c: any) { return Math.sqrt(c.re*c.re + c.im*c.im); }
function cSqrt(c: any) {
  if (c.re === 0 && c.im === 0) return { re: 0, im: 0 };
  const r = cAbs(c);
  let re = Math.sqrt((r + c.re) / 2);
  let im = Math.sqrt((r - c.re) / 2);
  if (c.im < 0) im = -im;
  return { re, im };
}

function mat2(a00: number, a01: number, a10: number, a11: number) { return [[a00, a01], [a10, a11]]; }
function vec2(v0: number, v1: number) { return [v0, v1]; }
function mat2Mul(A: any, B: any) { return [[A[0][0]*B[0][0]+A[0][1]*B[1][0], A[0][0]*B[0][1]+A[0][1]*B[1][1]], [A[1][0]*B[0][0]+A[1][1]*B[1][0], A[1][0]*B[0][1]+A[1][1]*B[1][1]]]; }
function mat2MulVec(A: any, v: any) { return [A[0][0]*v[0]+A[0][1]*v[1], A[1][0]*v[0]+A[1][1]*v[1]]; }
function mat2Add(A: any, B: any) { return [[A[0][0]+B[0][0], A[0][1]+B[0][1]], [A[1][0]+B[1][0], A[1][1]+B[1][1]]]; }
function mat2Scale(A: any, s: number) { return [[A[0][0]*s, A[0][1]*s], [A[1][0]*s, A[1][1]*s]]; }
function mat2Identity() { return [[1,0],[0,1]]; }
function mat2Inverse2x2(A: any) { const det = A[0][0]*A[1][1]-A[0][1]*A[1][0]; return [[A[1][1]/det, -A[0][1]/det], [-A[1][0]/det, A[0][0]/det]]; }

function lowpassCoefficients(w0: number, q: number) {
  const cosw0 = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  return [
    0.5 * (1 - cosw0) / a0,
    (1 - cosw0) / a0,
    0.5 * (1 - cosw0) / a0,
    -2 * cosw0 / a0,
    (1 - alpha) / a0
  ];
}

export class RabensteinSweeper extends Tone.ToneAudioNode<any> {
    name = "RabensteinSweeper";
    input: Tone.Gain;
    output: Tone.Gain;
    private scriptNode?: ScriptProcessorNode;
    
    private _lfoRate: number = 1.0;
    private _depth: number = 500;
    private _baseCutoff: number = 1000;
    private _q: number = 2.0;

    private phase: number = 0;
    private s0: number = 0;
    private s1: number = 0;
    private R_prev: number = 0;

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        
        const ctx = Tone.getContext().rawContext as AudioContext;
        if (typeof ctx.createScriptProcessor === 'function') {
            this.scriptNode = ctx.createScriptProcessor(1024, 1, 1);
            const fs = ctx.sampleRate;
            
            this.scriptNode.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const outputData = e.outputBuffer.getChannelData(0);
                
                const phaseInc = 2 * Math.PI * this._lfoRate / fs;
                
                for (let i = 0; i < inputData.length; i++) {
                    const lfoVal = Math.sin(this.phase);
                    this.phase += phaseInc;
                    if (this.phase >= 2 * Math.PI) this.phase -= 2 * Math.PI;
                    
                    const freq = Math.max(20, Math.min(20000, this._baseCutoff + lfoVal * this._depth));
                    const w0 = freq * 2 * Math.PI / fs;
                    
                    const c = lowpassCoefficients(w0, this._q);
                    const b0=c[0], b1=c[1], b2=c[2], a1=c[3], a2=c[4];
                    const ns = cSqrt({re:-1-a1-a2,im:0});
                    const ps = cSqrt({re:-1+a1-a2,im:0});
                    
                    const ns_ps = cMul(ns, ps);
                    let denom = ns_ps.re;
                    if (Math.abs(denom) < 1e-10) denom = 1e-10 * Math.sign(denom) || 1e-10;
                    
                    const g = cDiv(ns,ps).re;
                    const R = (a2-1) / denom;
                    const g2 = g*g;
                    
                    const denomHP = 1-a1+a2;
                    const denomLP = 1+a1+a2;
                    const chp=(b0-b1+b2)/(denomHP === 0 ? 1e-10 : denomHP);
                    const cbp=-2*(b0-b2)/denom;
                    const clp=(b0+b1+b2)/(denomLP === 0 ? 1e-10 : denomLP);
                    
                    const A = mat2(-2*R, -1, 1, 0);
                    const gA = mat2Scale(A, g);
                    const H = mat2Inverse2x2(mat2Add(mat2Identity(), mat2Scale(gA, -1)));
                    const Pa = mat2Add(mat2Identity(), mat2Scale(mat2Mul(mat2Scale(A, 2*g), H), 1));
                    const Pb = vec2(2*g2*(A[0][0]*H[0][0]+A[0][1]*H[1][0])+2*g, 2*g2*(A[0][0]*H[0][1]+A[0][1]*H[1][1])+2*g);
                    const Pc0 = cbp-2*R*chp, Pc1=clp-chp, Pd=chp;
                    
                    const Rn = this.R_prev === 0 ? R : this.R_prev;
                    
                    let sd = Math.sqrt(Math.max(0, R*R-1));
                    let sn = Math.sqrt(Math.max(0, Rn*Rn-1));
                    if (sd === 0) sd = 1e-10;
                    
                    const TT00 = sn/sd;
                    const TT01 = -(R-Rn)/sd;
                    
                    this.s0 = TT00*this.s0 + TT01*this.s1;
                    
                    outputData[i] = Pc0*this.s0 + Pc1*this.s1 + Pd*inputData[i];
                    
                    const ns0 = Pa[0][0]*this.s0 + Pa[0][1]*this.s1 + Pb[0]*inputData[i];
                    const ns1 = Pa[1][0]*this.s0 + Pa[1][1]*this.s1 + Pb[1]*inputData[i];
                    this.s0=ns0; this.s1=ns1; 
                    this.R_prev = R;
                }
            };
            
            Tone.connect(this.input, this.scriptNode as any);
            Tone.connect(this.scriptNode, this.output);
        } else {
            this.input.connect(this.output);
        }
    }

    get lfoRate() { return this._lfoRate; }
    set lfoRate(val) { this._lfoRate = val; }
    get depth() { return this._depth; }
    set depth(val) { this._depth = val; }
    get baseCutoff() { return this._baseCutoff; }
    set baseCutoff(val) { this._baseCutoff = val; }
    get q() { return this._q; }
    set q(val) { this._q = val; }

    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        if (this.scriptNode) this.scriptNode.disconnect();
        return this;
    }
}

export class PitchShiftedDelay extends Tone.ToneAudioNode<any> {
    name = "PitchShiftedDelay";
    input: Tone.Gain;
    output: Tone.Gain;

    private _delay: Tone.Delay;
    private _pitchShift: Tone.PitchShift;
    private _feedback: Tone.Gain;
    private _dry: Tone.Gain;
    private _wet: Tone.Gain;

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        this._delay = new Tone.Delay(options.delayTime !== undefined ? options.delayTime : 0.25, 2);
        this._pitchShift = new Tone.PitchShift(options.pitch !== undefined ? options.pitch : 12);
        this._feedback = new Tone.Gain(options.feedback !== undefined ? options.feedback : 0.5);
        
        this._dry = new Tone.Gain(1);
        this._wet = new Tone.Gain(0.5);

        // Dry path
        this.input.connect(this._dry);
        this._dry.connect(this.output);

        // Wet path
        this.input.connect(this._delay);
        this._delay.connect(this._pitchShift);
        this._pitchShift.connect(this._wet);
        this._wet.connect(this.output);

        // Feedback loop
        this._pitchShift.connect(this._feedback);
        this._feedback.connect(this._delay);
    }

    get delayTime() { return this._delay.delayTime.value; }
    set delayTime(val) { this._delay.delayTime.value = val; }
    
    get pitch() { return this._pitchShift.pitch; }
    set pitch(val) { this._pitchShift.pitch = val; }
    
    get feedback() { return this._feedback.gain.value; }
    set feedback(val) { this._feedback.gain.value = val; }
    
    get mix() { return this._wet.gain.value; }
    set mix(val) { 
        this._wet.gain.value = val;
        this._dry.gain.value = 1 - val;
    }

    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this._delay.dispose();
        this._pitchShift.dispose();
        this._feedback.dispose();
        this._dry.dispose();
        this._wet.dispose();
        return this;
    }
}

export type EffectParamConfig = {
  label: string;
  min: number;
  max: number;
  step: number;
  options?: {label: string, value: number}[];
};

export type Effect = {
    id: string;
    category: string;
    label: string;
    icon: string;
    enabled: boolean;
    params: { [key: string]: number };
    paramConfig: { [key: string]: EffectParamConfig };
    isOfflineTool?: boolean;
}

// --- Vocal Processing Classes ---

export class VocalEQ extends Tone.ToneAudioNode<any> {
    name = "VocalEQ";
    input: Tone.Gain;
    output: Tone.Gain;

    private hp: Tone.Filter;
    private warmth: Tone.Filter;
    private boxy: Tone.Filter;
    private bite: Tone.Filter;
    private sibilance: Tone.Filter;
    private air: Tone.Filter;

    private _lowCut: number = 1;
    private _warmthGain: number = 0;
    private _boxyGain: number = 0;
    private _biteGain: number = 0;
    private _sibilanceGain: number = 0;
    private _airGain: number = 0;

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();

        // 80Hz HPF for Rumble
        this.hp = new Tone.Filter({ type: 'highpass', frequency: 80, Q: 0.707 });
        
        // 200Hz Peaking for Warmth/Mud
        this.warmth = new Tone.Filter({ type: 'peaking', frequency: 200, Q: 1.0 });
        
        // 450Hz Peaking for Boxiness
        this.boxy = new Tone.Filter({ type: 'peaking', frequency: 450, Q: 1.5 });
        
        // 2.5kHz Peaking for Mid-Range Bite
        this.bite = new Tone.Filter({ type: 'peaking', frequency: 2500, Q: 1.0 });
        
        // 6.5kHz Peaking for Sibilance
        this.sibilance = new Tone.Filter({ type: 'peaking', frequency: 6500, Q: 1.5 });
        
        // 12kHz Highshelf for Air
        this.air = new Tone.Filter({ type: 'highshelf', frequency: 12000, Q: 0.707 });

        this.input.chain(this.hp, this.warmth, this.boxy, this.bite, this.sibilance, this.air, this.output);
    }

    get lowCut() { return this._lowCut; }
    set lowCut(val: number) {
        this._lowCut = val;
        this.hp.frequency.value = val > 0 ? 80 : 10; 
    }

    get warmthGain() { return this._warmthGain; }
    set warmthGain(val: number) {
        this._warmthGain = val;
        this.warmth.gain.value = val;
    }

    get boxyGain() { return this._boxyGain; }
    set boxyGain(val: number) {
        this._boxyGain = val;
        this.boxy.gain.value = val;
    }

    get biteGain() { return this._biteGain; }
    set biteGain(val: number) {
        this._biteGain = val;
        this.bite.gain.value = val;
    }

    get sibilanceGain() { return this._sibilanceGain; }
    set sibilanceGain(val: number) {
        this._sibilanceGain = val;
        this.sibilance.gain.value = val;
    }

    get airGain() { return this._airGain; }
    set airGain(val: number) {
        this._airGain = val;
        this.air.gain.value = val;
    }

    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this.hp.dispose();
        this.warmth.dispose();
        this.boxy.dispose();
        this.bite.dispose();
        this.sibilance.dispose();
        this.air.dispose();
        return this;
    }
}

export class VocalCompressor extends Tone.ToneAudioNode<any> {
    name = "VocalCompressor";
    input: Tone.Gain;
    output: Tone.Gain;
    
    private comp: Tone.Compressor;
    private makeup: Tone.Gain;
    
    private _mode: number = 0; // 0 = Control Dynamics, 1 = Tame Transients, 2 = Accentuate
    private _intensity: number = 50; // 0-100 scales the threshold

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.comp = new Tone.Compressor({
            threshold: -24,
            ratio: 3,
            attack: 0.005,
            release: 0.020,
            knee: 0
        });
        this.makeup = new Tone.Gain({ gain: 1 });
        this.output = new Tone.Gain();
        
        this.input.chain(this.comp, this.makeup, this.output);
        this.updateParams();
    }

    get mode() { return this._mode; }
    set mode(val: number) {
        this._mode = Math.round(val);
        this.updateParams();
    }

    get intensity() { return this._intensity; }
    set intensity(val: number) {
        this._intensity = val;
        this.updateParams();
    }

    private updateParams() {
        const thresh = -10 - (this._intensity / 100) * 30;
        this.comp.threshold.rampTo(thresh, 0.1);

        if (this._mode === 0) {
            this.comp.ratio.value = 3;
            this.comp.attack.value = 0.005;
            this.comp.release.value = 0.020;
            this.comp.knee.value = 0;
            this.makeup.gain.value = Math.pow(10, Math.abs(thresh) * 0.15 / 20);
        } else if (this._mode === 1) {
            this.comp.ratio.value = 1.5;
            this.comp.attack.value = 0.010;
            this.comp.release.value = 0.040;
            this.comp.knee.value = 12;
            this.makeup.gain.value = Math.pow(10, Math.abs(thresh) * 0.1 / 20);
        } else {
            this.comp.ratio.value = 1.5;
            this.comp.attack.value = 0.030;
            this.comp.release.value = 0.040;
            this.comp.knee.value = 12;
            this.makeup.gain.value = Math.pow(10, Math.abs(thresh) * 0.1 / 20);
        }
    }

    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this.comp.dispose();
        this.makeup.dispose();
        return this;
    }
}

export class RotarySpeaker extends Tone.ToneAudioNode<any> {
    name = "RotarySpeaker";
    input: Tone.Gain;
    output: Tone.Gain;

    private filterHorn: Tone.Filter;
    private tremoloHorn: Tone.Tremolo;
    private vibratoHorn: Tone.Vibrato;
    
    private filterDrum: Tone.Filter;
    private tremoloDrum: Tone.Tremolo;
    private vibratoDrum: Tone.Vibrato;

    private _speed: number = 50; 

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        
        this.filterHorn = new Tone.Filter({ type: "highpass", frequency: 800 });
        this.tremoloHorn = new Tone.Tremolo({ frequency: 6, depth: 0.8, spread: 180 }).start();
        this.vibratoHorn = new Tone.Vibrato();
        
        this.filterDrum = new Tone.Filter({ type: "lowpass", frequency: 800 });
        this.tremoloDrum = new Tone.Tremolo({ frequency: 5, depth: 0.5, spread: 0 }).start();
        this.vibratoDrum = new Tone.Vibrato();
        
        this.input.connect(this.filterHorn);
        this.input.connect(this.filterDrum);
        
        this.filterHorn.chain(this.vibratoHorn, this.tremoloHorn, this.output);
        this.filterDrum.chain(this.vibratoDrum, this.tremoloDrum, this.output);
        
        this.updateSpeed();
    }

    get speed() { return this._speed; }
    set speed(val: number) {
        this._speed = val;
        this.updateSpeed();
    }

    private updateSpeed() {
        const hornFreq = 0.8 + (this._speed / 100) * 5.2;
        const drumFreq = 0.6 + (this._speed / 100) * 4.4;
        
        this.tremoloHorn.frequency.rampTo(hornFreq, 0.5);
        this.vibratoHorn.frequency.rampTo(hornFreq, 0.5);
        
        this.tremoloDrum.frequency.rampTo(drumFreq, 0.5);
        this.vibratoDrum.frequency.rampTo(drumFreq, 0.5);
    }

    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this.filterHorn.dispose();
        this.tremoloHorn.dispose();
        this.vibratoHorn.dispose();
        this.filterDrum.dispose();
        this.tremoloDrum.dispose();
        this.vibratoDrum.dispose();
        return this;
    }
}

export class UnivibeNode extends Tone.ToneAudioNode<any> {
    name = "UnivibeNode";
    input: Tone.Gain;
    output: Tone.Gain;
    
    private phaser: Tone.Phaser;
    private vibrato: Tone.Vibrato;
    private wetNode: Tone.Gain;
    private dryNode: Tone.Gain;

    private _rate: number = 3;
    private _depth: number = 50;
    private _mode: number = 0; 

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        
        this.dryNode = new Tone.Gain({ gain: 0.5 });
        this.wetNode = new Tone.Gain({ gain: 0.5 });
        
        this.phaser = new Tone.Phaser();
        this.vibrato = new Tone.Vibrato();
        
        this.input.connect(this.dryNode);
        this.input.chain(this.phaser, this.vibrato, this.wetNode);
        
        this.dryNode.connect(this.output);
        this.wetNode.connect(this.output);
        
        this.updateParams();
    }

    get rate() { return this._rate; }
    set rate(val: number) {
        this._rate = val;
        this.updateParams();
    }

    get depth() { return this._depth; }
    set depth(val: number) {
        this._depth = val;
        this.updateParams();
    }

    get mode() { return this._mode; }
    set mode(val: number) {
        this._mode = Math.round(val);
        this.updateParams();
    }

    private updateParams() {
        const r = 0.5 + (this._rate / 100) * 8; 
        this.phaser.frequency.value = r;
        this.vibrato.frequency.value = r;
        
        const d = this._depth / 100;
        this.phaser.octaves = 1 + d * 4;
        this.vibrato.depth.value = d * 0.2;
        
        if (this._mode === 0) {
            this.dryNode.gain.value = 0.5;
            this.wetNode.gain.value = 0.5;
        } else {
            this.dryNode.gain.value = 0;
            this.wetNode.gain.value = 1.0;
        }
    }

    dispose() {
        super.dispose();
        this.input.dispose();
        this.output.dispose();
        this.dryNode.dispose();
        this.wetNode.dispose();
        this.phaser.dispose();
        this.vibrato.dispose();
        return this;
    }
}

export class HumRemovalNode extends Tone.ToneAudioNode<any> {
    name = "HumRemoval";
    input: Tone.Gain;
    output: Tone.Gain;
    private filters: Tone.Filter[] = [];
    private wetNode: Tone.Gain;
    private dryNode: Tone.Gain;
    
    private _baseFreq: number = 60;
    private _width: number = 3;
    private _reductionDepthDb: number = -30;
    private _includeHarmonics: boolean = true;

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        this.wetNode = new Tone.Gain();
        this.dryNode = new Tone.Gain();
        
        this.input.connect(this.dryNode);
        this.dryNode.connect(this.output);
        this.wetNode.connect(this.output);
        
        this.updateFilters();
    }
    
    get baseFreq() { return this._baseFreq; }
    set baseFreq(val: number) { this._baseFreq = val; this.updateFilters(); }
    
    get width() { return this._width; }
    set width(val: number) { this._width = val; this.updateFilters(); }
    
    get reductionDepthDb() { return this._reductionDepthDb; }
    set reductionDepthDb(val: number) { this._reductionDepthDb = val; this.updateFilters(); }
    
    get includeHarmonics() { return this._includeHarmonics; }
    set includeHarmonics(val: boolean) { this._includeHarmonics = val; this.updateFilters(); }

    private updateFilters() {
        if (this.filters.length > 0) this.input.disconnect(this.filters[0]);
        this.filters.forEach(f => f.dispose());
        this.filters = [];
        
        const maxHarmonics = this._includeHarmonics ? Math.floor(2000 / this._baseFreq) : 1;
        
        let prevNode: any = this.input;
        for (let k = 1; k <= maxHarmonics; k++) {
            const fk = this._baseFreq * k;
            if (fk >= 20000) continue;
            
            const q = fk / this._width; 
            const filter = new Tone.Filter({ type: "notch", frequency: fk, Q: q });
            this.filters.push(filter);
            prevNode.connect(filter);
            prevNode = filter;
        }
        
        prevNode.connect(this.wetNode);
        
        const gDepth = Math.pow(10, this._reductionDepthDb / 20);
        this.wetNode.gain.value = gDepth;
        this.dryNode.gain.value = 1.0 - gDepth;
    }
}

export class CascadedHighPassNode extends Tone.ToneAudioNode<any> {
    name = "CascadedHighPass";
    input: Tone.Gain;
    output: Tone.Gain;
    private filters: Tone.Filter[] = [];
    private _cutoffHz: number = 80;
    private _order: number = 1;

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        this.updateFilters();
    }

    get cutoffHz() { return this._cutoffHz; }
    set cutoffHz(val: number) {
        this._cutoffHz = val;
        this.filters.forEach(f => f.frequency.value = val);
    }

    get order() { return this._order; }
    set order(val: number) {
        if (this._order !== val) {
            this._order = val;
            this.updateFilters();
        }
    }

    private updateFilters() {
        if (this.filters.length > 0) this.input.disconnect(this.filters[0]);
        this.filters.forEach(f => f.dispose());
        this.filters = [];

        const numStages = Math.floor((this._order + 1) / 2);
        if (numStages <= 0) {
            this.input.connect(this.output);
            return;
        }
        
        let prevNode: any = this.input;
        for (let m = 1; m <= numStages; m++) {
            const actualQ = (this._order % 2 !== 0 && m === numStages) ? 0.5 : (1.0 / (-2 * Math.cos((2 * m + this._order - 1) * Math.PI / (2 * this._order))));
            const filter = new Tone.Filter({ type: "highpass", frequency: this._cutoffHz, Q: actualQ });
            this.filters.push(filter);
            prevNode.connect(filter);
            prevNode = filter;
        }
        prevNode.connect(this.output);
    }
}

export const DEFAULT_EFFECTS: Effect[] = [

  { id: 'offline_m4a_to_mp3', category: 'Format Conversion', label: 'M4A to MP3', icon: '🔁', enabled: false, isOfflineTool: true, params: { bitrate: 2, sampleRate: 0, audioChannels: 0, keepMetadata: 1 }, paramConfig: { bitrate: { label: 'Bitrate', min: 0, max: 4, step: 1, options: [{label:'128 kbps',value:0},{label:'160 kbps',value:1},{label:'192 kbps',value:2},{label:'256 kbps',value:3},{label:'320 kbps',value:4}] }, sampleRate: { label: 'Sample Rate', min: 0, max: 2, step: 1, options: [{label:'Auto',value:0},{label:'44.1 kHz',value:1},{label:'48 kHz',value:2}] }, audioChannels: { label: 'Channels', min: 0, max: 2, step: 1, options: [{label:'Auto',value:0},{label:'Mono',value:1},{label:'Stereo',value:2}] }, keepMetadata: { label: 'Keep Metadata', min: 0, max: 1, step: 1 } } },
  { id: 'offline_mp3_to_wav', category: 'Format Conversion', label: 'MP3 to WAV', icon: '🔁', enabled: false, isOfflineTool: true, params: { sampleRate: 0, audioChannels: 0, keepMetadata: 1 }, paramConfig: { sampleRate: { label: 'Sample Rate', min: 0, max: 3, step: 1, options: [{label:'Auto',value:0},{label:'44.1 kHz',value:1},{label:'48 kHz',value:2},{label:'96 kHz',value:3}] }, audioChannels: { label: 'Channels', min: 0, max: 2, step: 1, options: [{label:'Auto',value:0},{label:'Mono',value:1},{label:'Stereo',value:2}] }, keepMetadata: { label: 'Keep Metadata', min: 0, max: 1, step: 1 } } },
  { id: 'offline_wav_to_m4a', category: 'Format Conversion', label: 'WAV to M4A', icon: '🔁', enabled: false, isOfflineTool: true, params: { bitrate: 3, sampleRate: 0, audioChannels: 0, keepMetadata: 1 }, paramConfig: { bitrate: { label: 'Bitrate', min: 0, max: 5, step: 1, options: [{label:'96 kbps',value:0},{label:'128 kbps',value:1},{label:'160 kbps',value:2},{label:'192 kbps',value:3},{label:'256 kbps',value:4},{label:'320 kbps',value:5}] }, sampleRate: { label: 'Sample Rate', min: 0, max: 2, step: 1, options: [{label:'Auto',value:0},{label:'44.1 kHz',value:1},{label:'48 kHz',value:2}] }, audioChannels: { label: 'Channels', min: 0, max: 2, step: 1, options: [{label:'Auto',value:0},{label:'Mono',value:1},{label:'Stereo',value:2}] }, keepMetadata: { label: 'Keep Metadata', min: 0, max: 1, step: 1 } } },
  { id: 'offline_wav_to_mp3', category: 'Format Conversion', label: 'WAV to MP3', icon: '🔁', enabled: false, isOfflineTool: true, params: { bitrate: 2, sampleRate: 0, channels: 0, keepMetadata: 1, outputFormat: 0 }, paramConfig: { bitrate: { label: 'Bitrate', min: 0, max: 4, step: 1, options: [{label:'128 kbps',value:0},{label:'160 kbps',value:1},{label:'192 kbps',value:2},{label:'256 kbps',value:3},{label:'320 kbps',value:4}] }, sampleRate: { label: 'Sample Rate', min: 0, max: 2, step: 1, options: [{label:'Auto',value:0},{label:'44.1 kHz',value:1},{label:'48 kHz',value:2}] }, channels: { label: 'Channels', min: 0, max: 2, step: 1, options: [{label:'Auto',value:0},{label:'Mono',value:1},{label:'Stereo',value:2}] }, keepMetadata: { label: 'Keep Metadata', min: 0, max: 1, step: 1 }, outputFormat: { label: 'Format', min: 0, max: 0, step: 1, options: [{label:'MP3',value:0}] } } },
  { id: 'offline_wma_to_mp3', category: 'Format Conversion', label: 'WMA to MP3', icon: '🔁', enabled: false, isOfflineTool: true, params: { bitrate: 2, sampleRate: 0, channels: 0, keepMetadata: 1, outputFormat: 0 }, paramConfig: { bitrate: { label: 'Bitrate', min: 0, max: 4, step: 1, options: [{label:'128 kbps',value:0},{label:'160 kbps',value:1},{label:'192 kbps',value:2},{label:'256 kbps',value:3},{label:'320 kbps',value:4}] }, sampleRate: { label: 'Sample Rate', min: 0, max: 2, step: 1, options: [{label:'Auto',value:0},{label:'44.1 kHz',value:1},{label:'48 kHz',value:2}] }, channels: { label: 'Channels', min: 0, max: 2, step: 1, options: [{label:'Auto',value:0},{label:'Mono',value:1},{label:'Stereo',value:2}] }, keepMetadata: { label: 'Keep Metadata', min: 0, max: 1, step: 1 }, outputFormat: { label: 'Format', min: 0, max: 0, step: 1, options: [{label:'MP3',value:0}] } } },
  { id: 'offline_mp3_to_hq', category: 'Format Conversion', label: 'MP3 to High Quality', icon: '🔁', enabled: false, isOfflineTool: true, params: { bitrate: 2, sampleRate: 0, audioChannels: 0, keepMetadata: 1 }, paramConfig: { bitrate: { label: 'Bitrate', min: 0, max: 2, step: 1, options: [{label:'192 kbps',value:0},{label:'256 kbps',value:1},{label:'320 kbps (max)',value:2}] }, sampleRate: { label: 'Sample Rate', min: 0, max: 2, step: 1, options: [{label:'Auto',value:0},{label:'44.1 kHz',value:1},{label:'48 kHz',value:2}] }, audioChannels: { label: 'Channels', min: 0, max: 2, step: 1, options: [{label:'Auto',value:0},{label:'Mono',value:1},{label:'Stereo',value:2}] }, keepMetadata: { label: 'Keep Metadata', min: 0, max: 1, step: 1 } } },
  { id: 'offline_mp3_to_m4a', category: 'Format Conversion', label: 'MP3 to M4A', icon: '🔁', enabled: false, isOfflineTool: true, params: { bitrate: 3, sampleRate: 0, channels: 0, keepMetadata: 1, outputFormat: 0 }, paramConfig: { bitrate: { label: 'Bitrate', min: 0, max: 5, step: 1, options: [{label:'96 kbps',value:0},{label:'128 kbps',value:1},{label:'160 kbps',value:2},{label:'192 kbps',value:3},{label:'256 kbps',value:4},{label:'320 kbps',value:5}] }, sampleRate: { label: 'Sample Rate', min: 0, max: 2, step: 1, options: [{label:'Auto',value:0},{label:'44.1 kHz',value:1},{label:'48 kHz',value:2}] }, channels: { label: 'Channels', min: 0, max: 2, step: 1, options: [{label:'Auto',value:0},{label:'Mono',value:1},{label:'Stereo',value:2}] }, keepMetadata: { label: 'Keep Metadata', min: 0, max: 1, step: 1 }, outputFormat: { label: 'Format', min: 0, max: 0, step: 1, options: [{label:'M4A',value:0}] } } },
  { id: 'offline_deesser', category: 'Vocal Processing', label: 'De-Esser', icon: '🐍', enabled: false, isOfflineTool: true, params: { centerFrequency: 6500, bandwidth: 4000, threshold: 0.1, ratio: 4.0 }, paramConfig: { centerFrequency: { label: 'Center Freq (Hz)', min: 3000, max: 9900, step: 10 }, bandwidth: { label: 'Bandwidth (Hz)', min: 1000, max: 6000, step: 10 }, threshold: { label: 'Threshold', min: 0, max: 1, step: 0.01 }, ratio: { label: 'Ratio', min: 1, max: 20, step: 0.1 } } },


  { id: 'offline_vocal_reducer', category: 'Vocal Processing', label: 'Karaoke Vocal Reducer', icon: '🎤', enabled: false, isOfflineTool: true, params: { vocalRemovalStrength: 1.0, highPassCutoff: 80, lowPassCutoff: 16000 }, paramConfig: { vocalRemovalStrength: { label: 'Removal Strength', min: 0, max: 1.5, step: 0.1 }, highPassCutoff: { label: 'High Pass (Hz)', min: 0, max: 2000, step: 10 }, lowPassCutoff: { label: 'Low Pass (Hz)', min: 2000, max: 20000, step: 100 } } },
  { id: 'offline_midside_encode', category: 'Vocal Processing', label: 'Mid/Side Encoder', icon: '🎭', enabled: false, isOfflineTool: true, params: { midLevel: 1.0, sideLevel: 1.0, outputFormat: 0 }, paramConfig: { midLevel: { label: 'Mid Level', min: 0, max: 1, step: 0.05 }, sideLevel: { label: 'Side Level', min: 0, max: 1, step: 0.05 }, outputFormat: { label: 'Format', min: 0, max: 6, step: 1, options: [{label:'WAV',value:0},{label:'MP3',value:1}] } } },
  { id: 'offline_hq_resampler', category: 'Offline Pitch & Time', label: 'HQ Polyphase Resampler', icon: '📈', enabled: false, isOfflineTool: true, params: { targetSampleRate: 1, windowSize: 32 }, paramConfig: { targetSampleRate: { label: 'Target Rate', min: 0, max: 2, step: 1, options: [{label:'44.1 kHz',value:0},{label:'48.0 kHz',value:1},{label:'96.0 kHz',value:2}] }, windowSize: { label: 'Window Size (K)', min: 16, max: 64, step: 8 } } },
  { id: 'offline_midside_vocal_isolator', category: 'Vocal Processing', label: 'Mid/Side Isolator', icon: '🎛️', enabled: false, isOfflineTool: true, params: { midLevel: 1.5, sideLevel: 0.2 }, paramConfig: { midLevel: { label: 'Mid (Vocal) Level', min: 0, max: 2, step: 0.05 }, sideLevel: { label: 'Side (Ambiance) Level', min: 0, max: 2, step: 0.05 } } },
  { id: 'offline_psychoacoustic_masking', category: 'Creative Effects', label: 'MP3 Artifact Simulator', icon: '🗜️', enabled: false, isOfflineTool: true, params: { bitrateTarget: 64, maskingThreshold: 10 }, paramConfig: { bitrateTarget: { label: 'Simulated Bitrate (kbps)', min: 16, max: 192, step: 16 }, maskingThreshold: { label: 'Masking Sensitivity', min: 1, max: 30, step: 1 } } },
  { id: 'offline_midside_decode', category: 'Vocal Processing', label: 'Mid/Side Decoder', icon: '🎭', enabled: false, isOfflineTool: true, params: { midLevel: 1.0, sideLevel: 1.0 }, paramConfig: { midLevel: { label: 'Mid Level', min: 0, max: 2, step: 0.05 }, sideLevel: { label: 'Side Level', min: 0, max: 2, step: 0.05 } } },
  { id: 'offline_wahwah', category: 'Creative & Glitch', label: 'Audio Wah-Wah', icon: '🎸', enabled: false, isOfflineTool: true, params: { mode: 0, wahFreq: 2.0, wahDepth: 0.7, wahCenterFreq: 800, filterResonance: 2.5, mix: 0.7 }, paramConfig: { mode: { label: 'Mode', min: 0, max: 1, step: 1, options: [{label:'Auto-Wah',value:0},{label:'Manual',value:1}] }, wahFreq: { label: 'Freq (Hz)', min: 0.1, max: 10, step: 0.1 }, wahDepth: { label: 'Depth', min: 0, max: 1, step: 0.05 }, wahCenterFreq: { label: 'Center Freq (Hz)', min: 200, max: 5000, step: 10 }, filterResonance: { label: 'Resonance', min: 0.1, max: 10, step: 0.1 }, mix: { label: 'Mix', min: 0, max: 1, step: 0.05 } } },
  { id: 'offline_waveform_gen', category: 'Analysis', label: 'Waveform Generator', icon: '📊', enabled: false, isOfflineTool: true, params: { imageWidth: 1200, imageHeight: 400, waveformStyle: 0 }, paramConfig: { imageWidth: { label: 'Width (px)', min: 100, max: 4000, step: 10 }, imageHeight: { label: 'Height (px)', min: 50, max: 2000, step: 10 }, waveformStyle: { label: 'Style', min: 0, max: 2, step: 1, options: [{label:'Peak-to-Peak',value:0},{label:'RMS Density Power',value:1},{label:'Mids/Sides Contour',value:2}] } } },


  { id: 'offline_vibrato', category: 'Modulation & Phasing', label: 'Audio Vibrato', icon: '〰️', enabled: false, isOfflineTool: true, params: { rate: 5, depth: 0.5 }, paramConfig: { rate: { label: 'Rate (Hz)', min: 0.5, max: 20, step: 0.1 }, depth: { label: 'Depth', min: 0, max: 1, step: 0.01 } } },
  { id: 'offline_vinyl_crackle', category: 'Creative & Glitch', label: 'Vinyl Crackle', icon: '💿', enabled: false, isOfflineTool: true, params: { crackleType: 0, crackleIntensity: 0.3, crackleDensity: 0.4, frequencyRange: 0, analogWarmth: 0.2, wetDryMix: 0.5 }, paramConfig: { crackleType: { label: 'Type', min: 0, max: 4, step: 1, options: [{label:'Light Surface Noise',value:0},{label:'Medium Wear Crackle',value:1},{label:'Heavy Vintage Wear',value:2},{label:'Random Pops & Clicks',value:3},{label:'Classic Vinyl Sound',value:4}] }, crackleIntensity: { label: 'Intensity', min: 0, max: 1, step: 0.01 }, crackleDensity: { label: 'Density', min: 0, max: 1, step: 0.01 }, frequencyRange: { label: 'Frequency Range', min: 0, max: 3, step: 1, options: [{label:'Mid (Classic Vinyl)',value:0},{label:'Low (Bass Crackles)',value:1},{label:'High (Surface Hiss)',value:2},{label:'Wide (Full Spectrum)',value:3}] }, analogWarmth: { label: 'Warmth', min: 0, max: 1, step: 0.01 }, wetDryMix: { label: 'Mix', min: 0, max: 1, step: 0.01 } } },
  { id: 'offline_vocoder', category: 'Character Voices', label: 'Audio Vocoder', icon: '🤖', enabled: false, isOfflineTool: true, params: { carrierType: 0, carrierBaseFrequency: 100, carrierWaveform: 0, frequencyBands: 16, analysisWindow: 50, wetDryMix: 1 }, paramConfig: { carrierType: { label: 'Carrier Type', min: 0, max: 3, step: 1, options: [{label:'Synthesized',value:0},{label:'Noise',value:1},{label:'Pulse',value:2},{label:'Harmonic-rich',value:3}] }, carrierBaseFrequency: { label: 'Carrier Freq (Hz)', min: 20, max: 1000, step: 1 }, carrierWaveform: { label: 'Waveform', min: 0, max: 3, step: 1, options: [{label:'Sawtooth',value:0},{label:'Sine',value:1},{label:'Square',value:2},{label:'Triangle',value:3}] }, frequencyBands: { label: 'Bands', min: 4, max: 32, step: 1 }, analysisWindow: { label: 'Analysis Window (ms)', min: 10, max: 200, step: 1 }, wetDryMix: { label: 'Mix', min: 0, max: 1, step: 0.01 } } },
  { id: 'offline_treble_boost', category: 'EQ & Filtering', label: 'Treble Boost', icon: '✨', enabled: false, isOfflineTool: true, params: { gainDb: 4, centerFreqHz: 8000, widthQ: 1 }, paramConfig: { gainDb: { label: 'Gain (dB)', min: -12, max: 24, step: 0.1 }, centerFreqHz: { label: 'Freq (Hz)', min: 2000, max: 20000, step: 10 }, widthQ: { label: 'Width (Q)', min: 0.1, max: 5, step: 0.1 } } },
  { id: 'offline_tremolo', category: 'Modulation & Phasing', label: 'Audio Tremolo', icon: '🌊', enabled: false, isOfflineTool: true, params: { rateHz: 5, depth: 0.7 }, paramConfig: { rateHz: { label: 'Rate (Hz)', min: 0.5, max: 20, step: 0.1 }, depth: { label: 'Depth', min: 0, max: 1, step: 0.01 } } },
  { id: 'offline_underwater', category: 'Creative & Glitch', label: 'Underwater Effect', icon: '🫧', enabled: false, isOfflineTool: true, params: { waterEnvironment: 0, mufflingEffect: 0.6, bubbleIntensity: 0.3, pressureEffect: 0.4, depth: 10, wetDryMix: 1 }, paramConfig: { waterEnvironment: { label: 'Environment', min: 0, max: 4, step: 1, options: [{label:'Deep Ocean',value:0},{label:'Shallow Water',value:1},{label:'Swimming Pool',value:2},{label:'Ocean Surface',value:3},{label:'Underwater Cave',value:4}] }, mufflingEffect: { label: 'Muffling', min: 0, max: 1, step: 0.01 }, bubbleIntensity: { label: 'Bubbles', min: 0, max: 1, step: 0.01 }, pressureEffect: { label: 'Pressure', min: 0, max: 1, step: 0.01 }, depth: { label: 'Depth (m)', min: 1, max: 100, step: 1 }, wetDryMix: { label: 'Mix', min: 0, max: 1, step: 0.01 } } },


  { id: 'offline_tempo_change', category: 'Offline Pitch & Time', label: 'Audio Tempo Change', icon: '⏱️', enabled: false, isOfflineTool: true, params: { tempoPercent: 0, outputFormat: 0 }, paramConfig: { tempoPercent: { label: 'Tempo Change (%)', min: -75, max: 300, step: 1 }, outputFormat: { label: 'Format', min: 0, max: 6, step: 1, options: [{label:'MP3',value:0},{label:'WAV',value:6}] } } },
  { id: 'offline_time_pitch', category: 'Offline Pitch & Time', label: 'Time Stretch & Pitch', icon: '↔️', enabled: false, isOfflineTool: true, params: { mode: 0, tempoFactor: 1.0, pitchShift: 0 }, paramConfig: { mode: { label: 'Mode', min: 0, max: 1, step: 1, options: [{label:'Time Stretch',value:0},{label:'Pitch Shift',value:1}] }, tempoFactor: { label: 'Tempo Factor', min: 0.25, max: 4.0, step: 0.05 }, pitchShift: { label: 'Pitch Shift (Semitones)', min: -12, max: 12, step: 1 } } },
  { id: 'offline_time_stretch', category: 'Offline Pitch & Time', label: 'Audio Time Stretch', icon: '⏳', enabled: false, isOfflineTool: true, params: { targetDuration: 90 }, paramConfig: { targetDuration: { label: 'Target Duration (s)', min: 0.5, max: 7200, step: 1 } } },
  { id: 'offline_stutter', category: 'Creative & Glitch', label: 'Audio Stutter', icon: '🔪', enabled: false, isOfflineTool: true, params: { stutterType: 0, stutterRateHz: 10, stutterLengthSec: 0.05, randomness: 0, pitchShift: 1, feedbackAmount: 0, wetDryMix: 0.5 }, paramConfig: { stutterType: { label: 'Stutter Type', min: 0, max: 5, step: 1, options: [{label:'Fast Chopping',value:0},{label:'Medium Rhythm',value:1},{label:'Slow Repeats',value:2},{label:'Random Glitches',value:3},{label:'Pitch-shifted',value:4},{label:'Feedback Style',value:5}] }, stutterRateHz: { label: 'Rate (Hz)', min: 0.1, max: 50, step: 0.1 }, stutterLengthSec: { label: 'Length (s)', min: 0.01, max: 1.0, step: 0.01 }, randomness: { label: 'Randomness', min: 0, max: 1, step: 0.01 }, pitchShift: { label: 'Pitch Shift', min: 0.5, max: 3, step: 0.05 }, feedbackAmount: { label: 'Feedback', min: 0, max: 0.9, step: 0.01 }, wetDryMix: { label: 'Mix', min: 0, max: 1, step: 0.01 } } },
  { id: 'offline_telephone', category: 'Creative & Glitch', label: 'Telephone Effect', icon: '☎️', enabled: false, isOfflineTool: true, params: { telephoneType: 0, callQuality: 1, staticNoise: 0, compression: 0.5, bandwidth: 1, wetDryMix: 1 }, paramConfig: { telephoneType: { label: 'Phone Type', min: 0, max: 4, step: 1, options: [{label:'Landline',value:0},{label:'Mobile',value:1},{label:'Vintage',value:2},{label:'Intercom',value:3},{label:'Radio',value:4}] }, callQuality: { label: 'Call Quality', min: 0, max: 1, step: 0.01 }, staticNoise: { label: 'Static Noise', min: 0, max: 1, step: 0.01 }, compression: { label: 'Compression', min: 0, max: 1, step: 0.01 }, bandwidth: { label: 'Bandwidth', min: 0.1, max: 1, step: 0.01 }, wetDryMix: { label: 'Mix', min: 0, max: 1, step: 0.01 } } },

  // Offline Tools
  { id: 'offline_lpc_pitch', category: 'Offline Pitch & Time', label: 'LPC Pitch Shift', icon: '↕️', enabled: false, isOfflineTool: true, params: { pitch: 0 }, paramConfig: { pitch: { label: 'Pitch (Semitones)', min: -24, max: 24, step: 0.1 } } },
  { id: 'offline_homomorphic_vocoder', category: 'Offline Pitch & Time', label: 'Homomorphic Vocoder', icon: '🗣️', enabled: false, isOfflineTool: true, params: { pitch: 0, cutoffQuefrencyMs: 3.0 }, paramConfig: { pitch: { label: 'Pitch (Semitones)', min: -24, max: 24, step: 0.1 }, cutoffQuefrencyMs: { label: 'Vocal Tract Lifter (ms)', min: 1.0, max: 10.0, step: 0.1 } } },
  { id: 'offline_mfcc_analysis', category: 'Audio Analysis', label: 'MFCC Voice Analysis', icon: '📊', enabled: false, isOfflineTool: true, params: { numCoeffs: 13 }, paramConfig: { numCoeffs: { label: 'MFCC Coefficients', min: 1, max: 40, step: 1 } } },
  { id: 'offline_alien_voice', category: 'Offline Pitch & Time', label: 'Alien Voice', icon: '👽', enabled: false, isOfflineTool: true, params: { type: 0 }, paramConfig: { type: { label: 'Type', min: 0, max: 2, step: 1, options: [{label: 'Deep Resonant', value: 0}, {label: 'High-Pitched', value: 1}, {label: 'Fast Chatter', value: 2}] } } },
  { id: 'offline_beat_match', category: 'Offline Pitch & Time', label: 'Beat Matcher', icon: '⏱️', enabled: false, isOfflineTool: true, params: { targetBpm: 120 }, paramConfig: { targetBpm: { label: 'Target BPM', min: 60, max: 200, step: 1 } } },
  { id: 'offline_warp', category: 'Offline Pitch & Time', label: 'Praat Vocal Warp', icon: '🧬', enabled: false, isOfflineTool: true, params: { pitchFactor: 1.0, formantFactor: 1.0 }, paramConfig: { pitchFactor: { label: 'Pitch Factor', min: 0.5, max: 2.0, step: 0.01 }, formantFactor: { label: 'Formant Factor', min: 0.5, max: 2.0, step: 0.01 } } },
  { id: 'offline_chipmunk', category: 'Offline Pitch & Time', label: 'Chipmunk', icon: '🐿️', enabled: false, isOfflineTool: true, params: { shiftAmount: 1.5 }, paramConfig: { shiftAmount: { label: 'Shift Amount', min: 1.0, max: 3.0, step: 0.1 } } },
  { id: 'offline_beat_slicer', category: 'Offline Pitch & Time', label: 'Beat Slicer', icon: '✂️', enabled: false, isOfflineTool: true, params: { slices: 8 }, paramConfig: { slices: { label: 'Slices', min: 2, max: 32, step: 1 } } },
  { id: 'offline_audio_cutter', category: 'Offline Pitch & Time', label: 'Audio Cutter', icon: '🔪', enabled: false, isOfflineTool: true, params: { startMs: 0, endMs: 1000 }, paramConfig: { startMs: { label: 'Start (ms)', min: 0, max: 10000, step: 10 }, endMs: { label: 'End (ms)', min: 10, max: 10000, step: 10 } } },
  { id: 'offline_pitch_up', category: 'Offline Pitch & Time', label: 'Audio Pitch Up', icon: '⬆️', enabled: false, isOfflineTool: true, params: { semitones: 2 }, paramConfig: { semitones: { label: 'Semitones', min: 0.1, max: 12.0, step: 0.1 } } },
  { id: 'offline_pitch_down', category: 'Offline Pitch & Time', label: 'Audio Pitch Down', icon: '⬇️', enabled: false, isOfflineTool: true, params: { semitones: -2, windowSizeMs: 60 }, paramConfig: { semitones: { label: 'Semitones', min: -12.0, max: -0.1, step: 0.1 }, windowSizeMs: { label: 'Window Size (ms)', min: 20, max: 120, step: 1 } } },
  { id: 'offline_pitch_shifter', category: 'Offline Pitch & Time', label: 'Audio Pitch Shifter', icon: '🎚️', enabled: false, isOfflineTool: true, params: { semitones: 0, windowSizeMs: 60 }, paramConfig: { semitones: { label: 'Semitones', min: -12.0, max: 12.0, step: 0.1 }, windowSizeMs: { label: 'Window Size (ms)', min: 20, max: 120, step: 1 } } },
  { id: 'offline_reverse', category: 'Offline Pitch & Time', label: 'Audio Reverse', icon: '⏪', enabled: false, isOfflineTool: true, params: {}, paramConfig: {} },

  { id: 'offline_remove_silence', category: 'Offline Processing', label: 'Remove Silence', icon: '🤫', enabled: false, isOfflineTool: true, params: { thresholdDb: -50, minSilenceDuration: 0.5 }, paramConfig: { thresholdDb: { label: 'Threshold (dB)', min: -100, max: -5, step: 1 }, minSilenceDuration: { label: 'Min Duration (s)', min: 0.1, max: 30.0, step: 0.1 } } },
  { id: 'offline_remove_silence_end', category: 'Offline Processing', label: 'Remove Silence (End)', icon: '🔇', enabled: false, isOfflineTool: true, params: { silenceThresholdDb: -50, minSilenceDuration: 0.5 }, paramConfig: { silenceThresholdDb: { label: 'Threshold (dB)', min: -100, max: -12, step: 1 }, minSilenceDuration: { label: 'Min Duration (s)', min: 0.1, max: 10.0, step: 0.1 } } },
  { id: 'offline_remove_silence_start', category: 'Offline Processing', label: 'Remove Silence (Start)', icon: '✂️', enabled: false, isOfflineTool: true, params: { thresholdDb: -50, minSilenceDuration: 0.5 }, paramConfig: { thresholdDb: { label: 'Threshold (dB)', min: -100, max: -5, step: 1 }, minSilenceDuration: { label: 'Min Duration (s)', min: 0.1, max: 30.0, step: 0.1 } } },
  { id: 'offline_plate_reverb', category: 'Offline Processing', label: 'Plate Reverb', icon: '🍽️', enabled: false, isOfflineTool: true, params: { decayTime: 2.5, highFrequencyDamping: 0.5, diffusion: 0.7, wetDryMix: 0.4 }, paramConfig: { decayTime: { label: 'Decay Time (s)', min: 0.5, max: 10.0, step: 0.1 }, highFrequencyDamping: { label: 'HF Damping', min: 0.1, max: 1.0, step: 0.05 }, diffusion: { label: 'Diffusion', min: 0.1, max: 1.0, step: 0.05 }, wetDryMix: { label: 'Wet/Dry Mix', min: 0.0, max: 1.0, step: 0.05 } } },
  { id: 'offline_reverb', category: 'Offline Processing', label: 'Audio Reverb', icon: '🏛️', enabled: false, isOfflineTool: true, params: { reverbPreset: 1, roomSize: 0.5, damping: 0.5, reverbLevel: 0.3, preDelayMs: 50 }, paramConfig: { reverbPreset: { label: 'Preset', min: 0, max: 4, step: 1, options: [{label:'Custom Settings', value:0}, {label:'Medium Room', value:1}, {label:'Small Room', value:2}, {label:'Large Room', value:3}, {label:'Concert Hall', value:4}] }, roomSize: { label: 'Room Size', min: 0.1, max: 1.0, step: 0.05 }, damping: { label: 'Damping', min: 0.1, max: 1.0, step: 0.05 }, reverbLevel: { label: 'Reverb Level', min: 0.0, max: 1.0, step: 0.05 }, preDelayMs: { label: 'Pre-delay (ms)', min: 0.0, max: 250.0, step: 1 } } },
  { id: 'offline_reverse_reverb', category: 'Offline Processing', label: 'Reverse Reverb', icon: '👻', enabled: false, isOfflineTool: true, params: { buildUpTime: 2.0, decayTime: 3.0, wetDryMix: 0.5 }, paramConfig: { buildUpTime: { label: 'Build Up Time', min: 0.1, max: 5.0, step: 0.1 }, decayTime: { label: 'Decay Time', min: 0.5, max: 10.0, step: 0.1 }, wetDryMix: { label: 'Wet/Dry Mix', min: 0.0, max: 1.0, step: 0.05 } } },
  { id: 'offline_phaser', category: 'Offline Processing', label: 'Phaser', icon: '🌀', enabled: false, isOfflineTool: true, params: { inGain: 0.4, outGain: 0.74, delayMs: 3.0, decay: 0.4, speedHz: 0.5, type: 0 }, paramConfig: { inGain: { label: 'In Gain', min: 0.0, max: 1.0, step: 0.05 }, outGain: { label: 'Out Gain', min: 0.0, max: 2.0, step: 0.05 }, delayMs: { label: 'Delay (ms)', min: 1.0, max: 10.0, step: 0.1 }, decay: { label: 'Decay', min: 0.0, max: 0.95, step: 0.05 }, speedHz: { label: 'Speed (Hz)', min: 0.05, max: 10.0, step: 0.05 }, type: { label: 'Waveform', min: 0, max: 1, step: 1, options: [{label: 'Triangle', value: 0}, {label: 'Sine', value: 1}] } } },
  { id: 'offline_ring_modulator', category: 'Offline Processing', label: 'Ring Modulator', icon: '🛸', enabled: false, isOfflineTool: true, params: { carrierHz: 440, modulationDepth: 1.0, carrierWaveform: 0, wetDryMix: 0.5 }, paramConfig: { carrierHz: { label: 'Carrier Freq (Hz)', min: 20, max: 20000, step: 1 }, modulationDepth: { label: 'Mod Depth', min: 0.0, max: 2.0, step: 0.05 }, carrierWaveform: { label: 'Waveform', min: 0, max: 3, step: 1, options: [{label:'Sine Wave (Smooth)', value:0}, {label:'Square Wave (Harsh)', value:1}, {label:'Sawtooth (Bright)', value:2}, {label:'Triangle (Soft)', value:3}] }, wetDryMix: { label: 'Wet/Dry Mix', min: 0.0, max: 1.0, step: 0.05 } } },

  { id: 'offline_peak_detector', category: 'Offline Analysis', label: 'Peak Detector', icon: '📊', enabled: false, isOfflineTool: true, params: { channelMode: 0 }, paramConfig: { channelMode: { label: 'Channel Mode', min: 0, max: 2, step: 1, options: [{label: 'Global Peak', value: 0}, {label: 'Left Only', value: 1}, {label: 'Right Only', value: 2}] } } },
  { id: 'offline_3d_spectrum', category: 'Offline Analysis', label: '3D Spectrum', icon: '🌌', enabled: false, isOfflineTool: true, params: { theme: 0 }, paramConfig: { theme: { label: 'Theme', min: 0, max: 3, step: 1, options: [{label: 'Neon Cyber', value: 0}, {label: 'Forest Green', value: 1}, {label: 'Classic Amber', value: 2}, {label: 'Ocean Wave', value: 3}] } } },
  { id: 'offline_panner', category: 'Offline Processing', label: 'Constant-Power Panner', icon: '🎧', enabled: false, isOfflineTool: true, params: { panPosition: 0 }, paramConfig: { panPosition: { label: 'Pan (L to R)', min: -1.0, max: 1.0, step: 0.1 } } },
  { id: 'offline_phase_fix', category: 'Offline Processing', label: 'Stereo Phase Fixer', icon: '🔄', enabled: false, isOfflineTool: true, params: { stereoWidth: 1.0, phaseShiftDegrees: 0 }, paramConfig: { stereoWidth: { label: 'Stereo Width', min: 0.0, max: 2.0, step: 0.1 }, phaseShiftDegrees: { label: 'Phase Shift', min: -180, max: 180, step: 1 } } },
  { id: 'offline_peak_norm', category: 'Offline Processing', label: 'Peak Normalizer', icon: '📈', enabled: false, isOfflineTool: true, params: { targetPeakDb: -0.1 }, paramConfig: { targetPeakDb: { label: 'Target Peak (dB)', min: -12.0, max: 0.0, step: 0.1 } } },
  { id: 'offline_notch_filter', category: 'Offline Processing', label: 'Notch Filter', icon: '🕳️', enabled: false, isOfflineTool: true, params: { centerFreq: 60, bandwidth: 10, depthDb: -30 }, paramConfig: { centerFreq: { label: 'Center Freq', min: 20, max: 20000, step: 1 }, bandwidth: { label: 'Bandwidth', min: 1, max: 500, step: 1 }, depthDb: { label: 'Depth (dB)', min: -60, max: -3, step: 1 } } },

  { id: 'offline_notch', category: 'Offline Restoration', label: 'Band Reject (Notch)', icon: '🚫', enabled: false, isOfflineTool: true, params: { cutoff: 1000, width: 200 }, paramConfig: { cutoff: { label: 'Center (Hz)', min: 20, max: 20000, step: 10 }, width: { label: 'Width (Hz)', min: 10, max: 5000, step: 10 } } },
  { id: 'offline_isolate', category: 'Offline Restoration', label: 'Band Pass (Isolate)', icon: '🎯', enabled: false, isOfflineTool: true, params: { cutoff: 1000, width: 500 }, paramConfig: { cutoff: { label: 'Center (Hz)', min: 20, max: 20000, step: 10 }, width: { label: 'Width (Hz)', min: 10, max: 5000, step: 10 } } },
  { id: 'offline_bass_boost', category: 'Offline Restoration', label: 'Bass Boost', icon: '🔊', enabled: false, isOfflineTool: true, params: { gain: 6 }, paramConfig: { gain: { label: 'Gain (dB)', min: 0, max: 24, step: 1 } } },
  { id: 'offline_drc', category: 'Offline Restoration', label: 'Broadcast DRC', icon: '📻', enabled: false, isOfflineTool: true, params: { threshold: -20, ratio: 4 }, paramConfig: { threshold: { label: 'Threshold (dB)', min: -60, max: 0, step: 1 }, ratio: { label: 'Ratio', min: 1, max: 20, step: 0.1 } } },
  { id: 'offline_declipper', category: 'Offline Restoration', label: 'Declipper', icon: '📉', enabled: false, isOfflineTool: true, params: { threshold: 0.95 }, paramConfig: { threshold: { label: 'Threshold', min: 0.5, max: 1.0, step: 0.01 } } },
  { id: 'offline_decrackler', category: 'Offline Restoration', label: 'Decrackler', icon: '🧹', enabled: false, isOfflineTool: true, params: { sensitivity: 50 }, paramConfig: { sensitivity: { label: 'Sensitivity', min: 0, max: 100, step: 1 } } },
  { id: 'offline_declicker', category: 'Offline Restoration', label: 'Declicker', icon: '🖱️', enabled: false, isOfflineTool: true, params: { threshold: 50 }, paramConfig: { threshold: { label: 'Threshold', min: 0, max: 100, step: 1 } } },
  { id: 'offline_denoise', category: 'Offline Restoration', label: 'Denoise', icon: '🤫', enabled: false, isOfflineTool: true, params: { amount: 50 }, paramConfig: { amount: { label: 'Amount', min: 0, max: 100, step: 1 } } },
  { id: 'offline_hum_removal', category: 'Offline Restoration', label: 'Hum Removal', icon: '🔌', enabled: false, isOfflineTool: true, params: { humType: 0, customFrequency: 60, filterWidth: 3, reductionDepthDb: -30, includeHarmonics: 1 }, paramConfig: { humType: { label: 'Hum Type (0=60Hz,1=50Hz,2=Custom)', min: 0, max: 2, step: 1, options: [{label: '60Hz', value: 0}, {label: '50Hz', value: 1}, {label: 'Custom', value: 2}] }, customFrequency: { label: 'Custom Freq (Hz)', min: 20, max: 500, step: 1 }, filterWidth: { label: 'Width (Q-Factor)', min: 1, max: 5, step: 0.1 }, reductionDepthDb: { label: 'Reduction (dB)', min: -60, max: -10, step: 1 }, includeHarmonics: { label: 'Harmonics (0=No, 1=Yes)', min: 0, max: 1, step: 1 } } },
  { id: 'offline_highpass', category: 'Offline Restoration', label: 'High-Pass Filter', icon: '🔪', enabled: false, isOfflineTool: true, params: { cutoffHz: 80, order: 2 }, paramConfig: { cutoffHz: { label: 'Cutoff (Hz)', min: 20, max: 20000, step: 10 }, order: { label: 'Filter Order', min: 1, max: 4, step: 1 } } },
  { id: 'offline_lowpass', category: 'Offline Restoration', label: 'Low-Pass Filter', icon: '🔪', enabled: false, isOfflineTool: true, params: { cutoffHz: 8000, order: 1 }, paramConfig: { cutoffHz: { label: 'Cutoff (Hz)', min: 20, max: 20000, step: 10 }, order: { label: 'Filter Order', min: 1, max: 5, step: 1 } } },
  { id: 'offline_noise_gate', category: 'Offline Restoration', label: 'Noise Gate', icon: '🚪', enabled: false, isOfflineTool: true, params: { thresholdDb: -40, ratio: 4, attackMs: 5, releaseMs: 100, makeupGainDb: 0 }, paramConfig: { thresholdDb: { label: 'Threshold (dB)', min: -80, max: -10, step: 1 }, ratio: { label: 'Ratio', min: 1, max: 20, step: 0.1 }, attackMs: { label: 'Attack (ms)', min: 0.1, max: 50, step: 0.1 }, releaseMs: { label: 'Release (ms)', min: 10, max: 1000, step: 1 }, makeupGainDb: { label: 'Makeup (dB)', min: 0, max: 24, step: 0.1 } } },
  { id: 'offline_multiband_comp', category: 'Offline Restoration', label: 'Multiband Comp', icon: '🎛️', enabled: false, isOfflineTool: true, params: { crossover1Hz: 200, crossover2Hz: 4000, thresholdDb: -18, ratio: 2.5, attackMs: 10, releaseMs: 120, makeupGainDb: 0 }, paramConfig: { crossover1Hz: { label: 'Crossover 1 (Hz)', min: 40, max: 1000, step: 1 }, crossover2Hz: { label: 'Crossover 2 (Hz)', min: 1001, max: 16000, step: 1 }, thresholdDb: { label: 'Threshold (dB)', min: -60, max: 0, step: 1 }, ratio: { label: 'Ratio', min: 1, max: 20, step: 0.1 }, attackMs: { label: 'Attack (ms)', min: 0.1, max: 100, step: 0.1 }, releaseMs: { label: 'Release (ms)', min: 10, max: 1000, step: 1 }, makeupGainDb: { label: 'Makeup (dB)', min: 0, max: 24, step: 0.1 } } },
  { id: 'offline_loudness_norm', category: 'Offline Restoration', label: 'EBU R128 Norm', icon: '🔊', enabled: false, isOfflineTool: true, params: { targetI: -16, targetTP: -1.5, targetLRA: 11 }, paramConfig: { targetI: { label: 'Target LUFS', min: -32, max: -9, step: 0.5 }, targetTP: { label: 'True Peak (dBTP)', min: -5, max: 0, step: 0.1 }, targetLRA: { label: 'Target LRA', min: 5, max: 20, step: 0.5 } } },
  
  { id: 'offline_loudness_report', category: 'Offline Analyzers', label: 'Loudness Report', icon: '📊', enabled: false, isOfflineTool: true, params: { targetLoudness: -16, lraWindowSeconds: 3 }, paramConfig: { targetLoudness: { label: 'Target (LUFS)', min: -24, max: -9, step: 0.5 }, lraWindowSeconds: { label: 'LRA Window (s)', min: 2, max: 5, step: 0.1 } } },
  { id: 'offline_key_detect', category: 'Offline Analyzers', label: 'Key Detect', icon: '🎹', enabled: false, isOfflineTool: true, params: { analysisSeconds: 90, profileType: 0, minFrequencyHz: 27.5 }, paramConfig: { analysisSeconds: { label: 'Analysis Time (s)', min: 10, max: 300, step: 1 }, profileType: { label: 'Profile (0=Krum,1=Temp,2=Schenk)', min: 0, max: 2, step: 1, options: [{label: 'Krumhansl', value: 0}, {label: 'Temperley', value: 1}, {label: 'Schenkerian', value: 2}] }, minFrequencyHz: { label: 'Min Freq (Hz)', min: 20, max: 65.4, step: 0.1 } } },
  { id: 'offline_dr_meter', category: 'Offline Analyzers', label: 'DR Meter', icon: '📏', enabled: false, isOfflineTool: true, params: {}, paramConfig: {} },
  { id: 'offline_dr_report', category: 'Offline Analyzers', label: 'DR Report', icon: '📄', enabled: false, isOfflineTool: true, params: {}, paramConfig: {} },
  { id: 'offline_fingerprint', category: 'Offline Analyzers', label: 'Fingerprint', icon: '🔍', enabled: false, isOfflineTool: true, params: {}, paramConfig: {} },
  { id: 'offline_3d_spectrum', category: 'Offline Analyzers', label: '3D Spectrum', icon: '🌌', enabled: false, isOfflineTool: true, params: {}, paramConfig: {} },
  { id: 'offline_limiter', category: 'Offline Restoration', label: 'Limiter (Look-ahead)', icon: '🧱', enabled: false, isOfflineTool: true, params: { limitDb: -1.0, releaseMs: 50.0 }, paramConfig: { limitDb: { label: 'Ceiling (dB)', min: -12.0, max: 0.0, step: 0.1 }, releaseMs: { label: 'Release (ms)', min: 10.0, max: 1000.0, step: 1.0 } } },

  // DSP Enhanced Custom Effects
  {
    id: 'offline_room_simulator',
    category: 'Offline Processing',
    label: 'Audio Room Simulator',
    icon: '🏠',
    enabled: false,
    isOfflineTool: true,
    params: {
      roomPreset: 4,
      roomSize: 0.5,
      reverbDecay: 1.5,
      hfDamping: 0.5,
      earlyReflections: 0.4
    },
    paramConfig: {
      roomPreset: {
        label: 'Room Preset',
        min: 0, max: 4, step: 1,
        options: [
          { label: 'Closet (1-2m)', value: 0 },
          { label: 'Bedroom (3-4m)', value: 1 },
          { label: 'Living Room (5-6m)', value: 2 },
          { label: 'Concert Hall (10m+)', value: 3 },
          { label: 'Custom Settings', value: 4 }
        ]
      },
      roomSize: { label: 'Room Size', min: 0.1, max: 1.0, step: 0.05 },
      reverbDecay: { label: 'Reverb Decay (s)', min: 0.1, max: 10.0, step: 0.1 },
      hfDamping: { label: 'HF Damping', min: 0.1, max: 1.0, step: 0.05 },
      earlyReflections: { label: 'Early Reflections', min: 0.0, max: 1.0, step: 0.05 }
    }
  },
  {
    id: 'offline_set_pitch',
    category: 'Offline Pitch & Time',
    label: 'Audio Set Pitch',
    icon: '🎵',
    enabled: false,
    isOfflineTool: true,
    params: { semitones: 0.0 },
    paramConfig: {
      semitones: { label: 'Pitch (Semitones)', min: -12.0, max: 12.0, step: 0.1 }
    }
  },
  {
    id: 'offline_set_speed',
    category: 'Offline Pitch & Time',
    label: 'Audio Set Speed',
    icon: '⏩',
    enabled: false,
    isOfflineTool: true,
    params: { speedFactor: 1.0 },
    paramConfig: {
      speedFactor: { label: 'Speed Factor', min: 0.25, max: 4.0, step: 0.05 }
    }
  },
  {
    id: 'offline_speed_changer',
    category: 'Offline Pitch & Time',
    label: 'Audio Speed Changer',
    icon: '⏱️',
    enabled: false,
    isOfflineTool: true,
    params: { speed: 1.0, quality: 0 },
    paramConfig: {
      speed: { label: 'Speed Factor', min: 0.25, max: 4.0, step: 0.05 },
      quality: {
        label: 'Quality',
        min: 0, max: 2, step: 1,
        options: [
          { label: 'High Quality', value: 0 },
          { label: 'Medium Quality', value: 1 },
          { label: 'Low Quality', value: 2 }
        ]
      }
    }
  },
  {
    id: 'offline_set_volume',
    category: 'Offline Processing',
    label: 'Audio Set Volume',
    icon: '🔊',
    enabled: false,
    isOfflineTool: true,
    params: { mode: 0, targetLevel: 100.0 },
    paramConfig: {
      mode: {
        label: 'Gain Mode',
        min: 0, max: 1, step: 1,
        options: [
          { label: 'Percent (%)', value: 0 },
          { label: 'Decibels (dB)', value: 1 }
        ]
      },
      targetLevel: { label: 'Level', min: -80.0, max: 1000.0, step: 1.0 }
    }
  },
  {
    id: 'offline_rms_normalizer',
    category: 'Offline Restoration',
    label: 'Audio RMS Normalizer',
    icon: '⚖️',
    enabled: false,
    isOfflineTool: true,
    params: { targetRmsDb: -20.0, maxGainDb: 18.0, gatingThresholdDb: -50.0 },
    paramConfig: {
      targetRmsDb: { label: 'Target RMS (dBFS)', min: -32.0, max: -10.0, step: 0.5 },
      maxGainDb: { label: 'Max Gain (dB)', min: 0.0, max: 30.0, step: 0.5 },
      gatingThresholdDb: { label: 'Gating Threshold (dB)', min: -80.0, max: -30.0, step: 1.0 }
    }
  },
  {
    id: 'offline_spring_reverb',
    category: 'Space & Echo',
    label: 'Audio Spring Reverb',
    icon: '🪖',
    enabled: false,
    isOfflineTool: true,
    params: { springType: 0, springCount: 2, resonance: 0.5, decayTime: 2.5, wetDryMix: 0.3 },
    paramConfig: {
      springType: {
        label: 'Spring Type',
        min: 0, max: 3, step: 1,
        options: [
          { label: 'Medium Spring', value: 0 },
          { label: 'Light Spring', value: 1 },
          { label: 'Heavy Spring', value: 2 },
          { label: 'Custom Settings', value: 3 }
        ]
      },
      springCount: { label: 'Spring Count', min: 1, max: 4, step: 1 },
      resonance: { label: 'Resonance', min: 0.1, max: 1.0, step: 0.05 },
      decayTime: { label: 'Decay Time (s)', min: 0.3, max: 5.0, step: 0.1 },
      wetDryMix: { label: 'Wet/Dry Mix', min: 0.0, max: 1.0, step: 0.05 }
    }
  },
  {
    id: 'offline_spectral_filter',
    category: 'Offline Processing',
    label: 'Audio Spectral Filter',
    icon: '📊',
    enabled: false,
    isOfflineTool: true,
    params: {
      filterType: 0,
      lowFrequency: 100, lowGain: 0.0,
      midFrequency: 1000, midGain: 0.0,
      highFrequency: 5000, highGain: 0.0,
      filterSharpness: 0.5, resonanceAmount: 0.0, wetDryMix: 1.0
    },
    paramConfig: {
      filterType: {
        label: 'Filter Type',
        min: 0, max: 5, step: 1,
        options: [
          { label: 'Spectral Enhancement', value: 0 },
          { label: 'Notch Filter', value: 1 },
          { label: 'Bandpass Filter', value: 2 },
          { label: 'High Shelf', value: 3 },
          { label: 'Low Shelf', value: 4 },
          { label: 'Parametric EQ', value: 5 }
        ]
      },
      lowFrequency: { label: 'Low Freq (Hz)', min: 20, max: 1000, step: 10 },
      lowGain: { label: 'Low Gain (dB)', min: -20.0, max: 20.0, step: 0.5 },
      midFrequency: { label: 'Mid Freq (Hz)', min: 200, max: 5000, step: 10 },
      midGain: { label: 'Mid Gain (dB)', min: -20.0, max: 20.0, step: 0.5 },
      highFrequency: { label: 'High Freq (Hz)', min: 1000, max: 20000, step: 100 },
      highGain: { label: 'High Gain (dB)', min: -20.0, max: 20.0, step: 0.5 },
      filterSharpness: { label: 'Sharpness', min: 0.0, max: 1.0, step: 0.05 },
      resonanceAmount: { label: 'Resonance', min: 0.0, max: 1.0, step: 0.05 },
      wetDryMix: { label: 'Wet/Dry Mix', min: 0.0, max: 1.0, step: 0.05 }
    }
  },
  {
    id: 'offline_robotize',
    category: 'Character Voices',
    label: 'Audio Robotize',
    icon: '🤖',
    enabled: false,
    isOfflineTool: true,
    params: { bitDepth: 8, pitchFactor: 0.85 },
    paramConfig: {
      bitDepth: { label: 'Bit Depth', min: 2, max: 16, step: 1 },
      pitchFactor: { label: 'Pitch Factor', min: 0.25, max: 2.0, step: 0.05 }
    }
  },

  // Vocal Processor Cheat Sheets
  { id: 'realtime_hum_removal', category: 'Vocal Processing', label: 'Hum Removal', icon: '🔌', enabled: false, params: { baseFreq: 60, width: 3, reductionDepthDb: -30, includeHarmonics: 1 }, paramConfig: { baseFreq: { label: 'Base Freq (Hz)', min: 50, max: 60, step: 10 }, width: { label: 'Width', min: 1, max: 5, step: 0.1 }, reductionDepthDb: { label: 'Reduction (dB)', min: -60, max: -10, step: 1 }, includeHarmonics: { label: 'Harmonics (0=No, 1=Yes)', min: 0, max: 1, step: 1 } } },
  { id: 'realtime_highpass', category: 'Vocal Processing', label: 'Cascaded High-Pass', icon: '🔪', enabled: false, params: { cutoffHz: 80, order: 2 }, paramConfig: { cutoffHz: { label: 'Cutoff (Hz)', min: 20, max: 20000, step: 10 }, order: { label: 'Filter Order', min: 1, max: 4, step: 1 } } },
  { id: 'realtime_limiter', category: 'Vocal Processing', label: 'Peak Limiter', icon: '🧱', enabled: false, params: { threshold: -1, release: 50 }, paramConfig: { threshold: { label: 'Threshold (dB)', min: -12, max: 0, step: 0.1 }, release: { label: 'Release (ms)', min: 10, max: 1000, step: 1 } } },
  { id: 'vocal_eq', category: 'Vocal Processing', label: 'Parametric EQ', icon: '🎚️', enabled: false, params: { band1Freq: 80, band1Gain: 0, band2Freq: 200, band2Gain: 0, band3Freq: 2500, band3Gain: 0, band4Freq: 12000, band4Gain: 0 }, paramConfig: { band1Freq: { label: 'Low Freq (Hz)', min: 20, max: 500, step: 10 }, band1Gain: { label: 'Low Gain (dB)', min: -15, max: 15, step: 1 }, band2Freq: { label: 'L-Mid Freq (Hz)', min: 200, max: 2000, step: 10 }, band2Gain: { label: 'L-Mid Gain', min: -15, max: 15, step: 1 }, band3Freq: { label: 'H-Mid Freq (Hz)', min: 1000, max: 8000, step: 10 }, band3Gain: { label: 'H-Mid Gain', min: -15, max: 15, step: 1 }, band4Freq: { label: 'High Freq (Hz)', min: 4000, max: 20000, step: 10 }, band4Gain: { label: 'High Gain', min: -15, max: 15, step: 1 } } },
  { id: 'vocal_comp', category: 'Vocal Processing', label: 'Vocal Compressor', icon: '🗜️', enabled: false, params: { threshold: -20, ratio: 4, attack: 5, release: 50, makeup: 0 }, paramConfig: { threshold: { label: 'Threshold (dB)', min: -60, max: 0, step: 1 }, ratio: { label: 'Ratio', min: 1, max: 20, step: 0.1 }, attack: { label: 'Attack (ms)', min: 1, max: 100, step: 1 }, release: { label: 'Release (ms)', min: 10, max: 1000, step: 10 }, makeup: { label: 'Makeup (dB)', min: 0, max: 24, step: 1 } } },

  // Boutique Pedals
  { id: 'rotary_speaker', category: 'Modulation', label: 'Rotary Speaker', icon: '🌀', enabled: false, params: { speed: 50 }, paramConfig: { speed: { label: 'Speed', min: 0, max: 100, step: 1 } } },
  { id: 'univibe', category: 'Modulation', label: 'Univibe', icon: '🌊', enabled: false, params: { rate: 50, depth: 50, mode: 0 }, paramConfig: { rate: { label: 'Rate', min: 0, max: 100, step: 1 }, depth: { label: 'Depth', min: 0, max: 100, step: 1 }, mode: { label: 'Mode (0:Chorus,1:Vibrato)', min: 0, max: 1, step: 1 } } },
  { id: 'ring_modulator', category: 'Modulation', label: 'Ring Modulator', icon: '💍', enabled: false, params: { frequency: 400, mix: 50 }, paramConfig: { frequency: { label: 'Frequency (Hz)', min: 10, max: 2000, step: 1 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },

  // Pitch & Vocal Tuning
  { id: 'smart_vibrato', category: 'Pitch & Tuning', label: 'Smart Vibrato', icon: '🎤', enabled: false, params: { rate: 6, depth: 50, likeliness: 50 }, paramConfig: { rate: { label: 'Rate (Hz)', min: 1, max: 14, step: 0.1 }, depth: { label: 'Extent', min: 0, max: 100, step: 1 }, likeliness: { label: 'Likeliness', min: 0, max: 100, step: 1 } } },
  { id: 'stft_pitch_shift', category: 'Pitch & Tuning', label: 'True Formant Pitch', icon: '✨', enabled: false, params: { pitch: 0, formant: 0, quefrency: 1.5, rms: 1 }, paramConfig: { pitch: { label: 'Pitch (Semitones)', min: -24, max: 24, step: 0.1 }, formant: { label: 'Formant Shift', min: -12, max: 12, step: 0.1 }, quefrency: { label: 'Formant Preserve (ms)', min: 0, max: 5, step: 0.1 }, rms: { label: 'Normalize RMS (0=Off, 1=On)', min: 0, max: 1, step: 1 } } },
  { id: 'doppler_pitch', category: 'Pitch & Tuning', label: 'Doppler Pitch', icon: '〰️', enabled: false, params: { pitch: 0, delayLength: 40 }, paramConfig: { pitch: { label: 'Pitch (Semitones)', min: -24, max: 24, step: 0.1 }, delayLength: { label: 'Delay (ms)', min: 10, max: 100, step: 1 } } },
  { id: 'frequency_shifter', category: 'Pitch & Tuning', label: 'Frequency Shifter', icon: '🎛️', enabled: false, params: { frequency: 0 }, paramConfig: { frequency: { label: 'Shift (Hz)', min: -1000, max: 1000, step: 1 } } },
  { id: 'pitch_shifted_delay', category: 'Pitch & Tuning', label: 'Pitch Shifted Delay', icon: '🔄', enabled: false, params: { pitch: 12, delayTime: 0.25, feedback: 0.5, mix: 0.5 }, paramConfig: { pitch: { label: 'Pitch Shift', min: -24, max: 24, step: 1 }, delayTime: { label: 'Delay (s)', min: 0.01, max: 2, step: 0.01 }, feedback: { label: 'Feedback', min: 0, max: 0.95, step: 0.01 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'pitch', category: 'Pitch & Tuning', label: 'Pitch Shift', icon: '↕️', enabled: false, params: { pitch: 0 }, paramConfig: { pitch: { label: 'Pitch (Semitones)', min: -24, max: 24, step: 0.1 } } },
  { id: 'autotune_hard', category: 'Pitch & Tuning', label: 'Hard Tune', icon: '🤖', enabled: false, params: { speed: 10, depth: 50 }, paramConfig: { speed: { label: 'Speed (Hz)', min: 0.1, max: 20, step: 0.1 }, depth: { label: 'Depth (Cents)', min: 0, max: 100, step: 1 } } },
  { id: 'autotune_pro', category: 'Pitch & Tuning', label: 'Auto-Tune Pro', icon: '🎙️', enabled: false, params: { retuneSpeed: 10, humanise: 50, scale: 0, formant: 50 }, paramConfig: { retuneSpeed: { label: 'Retune Speed', min: 0, max: 100, step: 1 }, humanise: { label: 'Humanise', min: 0, max: 100, step: 1 }, scale: { label: 'Scale (0=Chr,1=Maj,2=Min)', min: 0, max: 2, step: 1 }, formant: { label: 'Formant', min: 0, max: 100, step: 1 } } },
  { id: 'octave_down', category: 'Pitch & Tuning', label: 'Octave Down', icon: '⏬', enabled: false, params: { mix: 100 }, paramConfig: { mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'octave_up', category: 'Pitch & Tuning', label: 'Octave Up', icon: '⏫', enabled: false, params: { mix: 100 }, paramConfig: { mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'harmony_third', category: 'Pitch & Tuning', label: '+3rd Harmony', icon: '🎵', enabled: false, params: { mix: 50 }, paramConfig: { mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'harmony_fifth', category: 'Pitch & Tuning', label: '+5th Harmony', icon: '🎵', enabled: false, params: { mix: 50 }, paramConfig: { mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'detune', category: 'Pitch & Tuning', label: 'Detune', icon: '〰️', enabled: false, params: { cents: 10 }, paramConfig: { cents: { label: 'Cents', min: -50, max: 50, step: 1 } } },
  { id: 'formant_shift', category: 'Pitch & Tuning', label: 'Formant', icon: '🗣️', enabled: false, params: { shift: 0 }, paramConfig: { shift: { label: 'Shift', min: -12, max: 12, step: 1 } } },
  { id: 'vibrato_deep', category: 'Pitch & Tuning', label: 'Opera Vibrato', icon: '🎭', enabled: false, params: { depth: 50 }, paramConfig: { depth: { label: 'Depth', min: 0, max: 100, step: 1 } } },

  // Sound Destruction
  { id: 'distortion', category: 'Sound Destruction', label: 'Distortion', icon: '💥', enabled: false, params: { distortion: 50, oversample: 0 }, paramConfig: { distortion: { label: 'Amount', min: 0, max: 100, step: 1 }, oversample: { label: 'Oversample', min: 0, max: 2, step: 1, options: [{label: 'None', value: 0}, {label: '2x', value: 1}, {label: '4x', value: 2}] } } },
  { id: 'bitcrusher', category: 'Sound Destruction', label: 'Bitcrusher', icon: '👾', enabled: false, params: { bits: 4, sampleRate: 0.1 }, paramConfig: { bits: { label: 'Bit Depth', min: 1, max: 16, step: 1 }, sampleRate: { label: 'Reduction', min: 0.01, max: 1, step: 0.01 } } },
  { id: 'chebyshev', category: 'Sound Destruction', label: 'Wave Folder', icon: '〰', enabled: false, params: { order: 50, oversample: 0 }, paramConfig: { order: { label: 'Order', min: 1, max: 100, step: 1 }, oversample: { label: 'Oversample', min: 0, max: 2, step: 1, options: [{label: 'None', value: 0}, {label: '2x', value: 1}, {label: '4x', value: 2}] } } },

  // Modulation & Filters
  { id: 'formant_bank', category: 'Modulation & Filters', label: 'Formant Bank', icon: '🗣️', enabled: false, params: { vowel: 0, mix: 100 }, paramConfig: { vowel: { label: 'Vowel (0=A,1=E,2=I,3=O,4=U)', min: 0, max: 4, step: 0.1 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'auto_wah', category: 'Modulation & Filters', label: 'Auto Wah', icon: '🎺', enabled: false, params: { baseFrequency: 100, octaves: 6, sensitivity: 0, Q: 2, gain: 2, follower: 0.1 }, paramConfig: { baseFrequency: { label: 'Base Freq (Hz)', min: 50, max: 1000, step: 10 }, octaves: { label: 'Octaves', min: 1, max: 8, step: 0.1 }, sensitivity: { label: 'Sensitivity (dB)', min: -40, max: 0, step: 1 }, Q: { label: 'Resonance', min: 0.1, max: 10, step: 0.1 }, gain: { label: 'Gain', min: 0.1, max: 10, step: 0.1 }, follower: { label: 'Follower Time', min: 0.01, max: 0.5, step: 0.01 } } },
  { id: 'phaser', category: 'Modulation & Filters', label: 'Phaser', icon: '🌊', enabled: false, params: { frequency: 0.5, octaves: 3, stages: 10, Q: 10, baseFrequency: 350 }, paramConfig: { frequency: { label: 'Rate (Hz)', min: 0.1, max: 10, step: 0.1 }, octaves: { label: 'Octaves', min: 1, max: 8, step: 0.1 }, stages: { label: 'Stages', min: 2, max: 24, step: 1 }, Q: { label: 'Resonance', min: 0.1, max: 20, step: 0.1 }, baseFrequency: { label: 'Base Freq (Hz)', min: 100, max: 1000, step: 10 } } },
  { id: 'chorus', category: 'Modulation & Filters', label: 'Chorus', icon: '👥', enabled: false, params: { frequency: 1.5, delayTime: 3.5, depth: 70, type: 0, spread: 180 }, paramConfig: { frequency: { label: 'Rate (Hz)', min: 0.1, max: 10, step: 0.1 }, delayTime: { label: 'Delay (ms)', min: 2, max: 20, step: 0.1 }, depth: { label: 'Depth', min: 0, max: 100, step: 1 }, type: { label: 'Waveform', min: 0, max: 3, step: 1, options: [{label: 'Sine', value: 0}, {label: 'Square', value: 1}, {label: 'Triangle', value: 2}, {label: 'Sawtooth', value: 3}] }, spread: { label: 'Spread', min: 0, max: 180, step: 1 } } },
  { id: 'flanger', category: 'Modulation & Filters', label: 'Flanger', icon: '✈', enabled: false, params: { frequency: 0.5, delayTime: 10, depth: 50, feedback: 50 }, paramConfig: { frequency: { label: 'Rate (Hz)', min: 0.1, max: 10, step: 0.1 }, delayTime: { label: 'Delay (ms)', min: 1, max: 20, step: 0.1 }, depth: { label: 'Depth', min: 0, max: 100, step: 1 }, feedback: { label: 'Feedback', min: 0, max: 100, step: 1 } } },

  // Character Voices
  { id: 'chipmunk', category: 'Character Voices', label: 'Chipmunk', icon: '🐿️', enabled: false, params: { intensity: 50 }, paramConfig: { intensity: { label: 'Intensity', min: 0, max: 100, step: 1 } } },
  { id: 'vader', category: 'Character Voices', label: 'Darth Vader', icon: '🤖', enabled: false, params: { intensity: 50 }, paramConfig: { intensity: { label: 'Darkness', min: 0, max: 100, step: 1 } } },
  { id: 'robot', category: 'Character Voices', label: 'Robot', icon: '👾', enabled: false, params: { rate: 50 }, paramConfig: { rate: { label: 'Modulation', min: 0, max: 100, step: 1 } } },
  { id: 'monster', category: 'Character Voices', label: 'Monster', icon: '👹', enabled: false, params: { depth: 50 }, paramConfig: { depth: { label: 'Depth', min: 0, max: 100, step: 1 } } },
  { id: 'alien', category: 'Character Voices', label: 'Alien', icon: '👽', enabled: false, params: { alien_voice_type: 0, pitch_shift: 1.0, resonance_freq: 1500, modulation_rate: 0.1, distortion_amt: 0.0, wet_dry_mix: 1.0 }, paramConfig: { alien_voice_type: { label: 'Voice Type', min: 0, max: 3, step: 1, options: [{label: 'Deep Resonant', value: 0}, {label: 'High-Pitched', value: 1}, {label: 'Fast Chattering', value: 2}, {label: 'Metallic', value: 3}] }, pitch_shift: { label: 'Pitch Shift', min: 0.5, max: 3.0, step: 0.01 }, resonance_freq: { label: 'Resonance (Hz)', min: 200, max: 8000, step: 1 }, modulation_rate: { label: 'Modulation (Hz)', min: 0.1, max: 20.0, step: 0.1 }, distortion_amt: { label: 'Distortion', min: 0.0, max: 1.0, step: 0.01 }, wet_dry_mix: { label: 'Wet/Dry Mix', min: 0.0, max: 1.0, step: 0.01 } } },
  { id: 'demon', category: 'Character Voices', label: 'Demon', icon: '👿', enabled: false, params: { evil: 50 }, paramConfig: { evil: { label: 'Evil Level', min: 0, max: 100, step: 1 } } },
  { id: 'helium', category: 'Character Voices', label: 'Helium', icon: '🎈', enabled: false, params: { amount: 50 }, paramConfig: { amount: { label: 'Amount', min: 0, max: 100, step: 1 } } },
  { id: 'orc', category: 'Character Voices', label: 'Orc', icon: '🧌', enabled: false, params: { depth: 50 }, paramConfig: { depth: { label: 'Grit', min: 0, max: 100, step: 1 } } },
  { id: 'fairy', category: 'Character Voices', label: 'Fairy', icon: '🧚', enabled: false, params: { magic: 100 }, paramConfig: { magic: { label: 'Magic', min: 0, max: 100, step: 1 } } },
  { id: 'cyborg', category: 'Character Voices', label: 'Cyborg', icon: '🦾', enabled: false, params: { metal: 50 }, paramConfig: { metal: { label: 'Metal', min: 0, max: 100, step: 1 } } },
  { id: 'gargoyle', category: 'Character Voices', label: 'Gargoyle', icon: '🗿', enabled: false, params: { stone: 100 }, paramConfig: { stone: { label: 'Stone', min: 0, max: 100, step: 1 } } },
  
  // Space & Echo
  { id: 'smooth_delay', category: 'Space & Echo', label: 'Smooth Delay', icon: '🗣️', enabled: false, params: { delayTime: 0.5, mix: 50 }, paramConfig: { delayTime: { label: 'Time (s)', min: 0.01, max: 2, step: 0.01 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'reverb', category: 'Space & Echo', label: 'Cave Reverb', icon: '🦇', enabled: false, params: { roomSize: 80, dampening: 3000, wet: 50 }, paramConfig: { roomSize: { label: 'Room Size', min: 0, max: 100, step: 1 }, dampening: { label: 'Dampening (Hz)', min: 100, max: 10000, step: 100 }, wet: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'echo', category: 'Space & Echo', label: 'Echo', icon: '🗣️', enabled: false, params: { delayTime: 0.5, feedback: 0.5, wet: 50 }, paramConfig: { delayTime: { label: 'Time (s)', min: 0.01, max: 2, step: 0.01 }, feedback: { label: 'Feedback', min: 0, max: 0.95, step: 0.01 }, wet: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'slapback', category: 'Space & Echo', label: 'Slapback', icon: '🔙', enabled: false, params: { mix: 50 }, paramConfig: { mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'ghost', category: 'Space & Echo', label: 'Ghost', icon: '👻', enabled: false, params: { haunt: 100 }, paramConfig: { haunt: { label: 'Haunt Level', min: 0, max: 100, step: 1 } } },
  { id: 'hall', category: 'Space & Echo', label: 'Concert Hall', icon: '🏛️', enabled: false, params: { decay: 5, preDelay: 0.1, mix: 50 }, paramConfig: { decay: { label: 'Decay (s)', min: 0.1, max: 20, step: 0.1 }, preDelay: { label: 'Pre-Delay (s)', min: 0, max: 0.5, step: 0.01 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'church', category: 'Space & Echo', label: 'Cathedral', icon: '⛪', enabled: false, params: { decay: 8, preDelay: 0.2, mix: 50 }, paramConfig: { decay: { label: 'Decay (s)', min: 0.1, max: 20, step: 0.1 }, preDelay: { label: 'Pre-Delay (s)', min: 0, max: 0.5, step: 0.01 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'spring', category: 'Space & Echo', label: 'Spring Reverb', icon: '🌀', enabled: false, params: { decay: 2, preDelay: 0.01, mix: 50 }, paramConfig: { decay: { label: 'Decay (s)', min: 0.1, max: 20, step: 0.1 }, preDelay: { label: 'Pre-Delay (s)', min: 0, max: 0.5, step: 0.01 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'plate', category: 'Space & Echo', label: 'Plate Reverb', icon: '🥏', enabled: false, params: { decay: 3, preDelay: 0.05, mix: 50 }, paramConfig: { decay: { label: 'Decay (s)', min: 0.1, max: 20, step: 0.1 }, preDelay: { label: 'Pre-Delay (s)', min: 0, max: 0.5, step: 0.01 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'pingpong', category: 'Space & Echo', label: 'Ping Pong', icon: '🏓', enabled: false, params: { delayTime: 0.25, feedback: 0.4, mix: 50 }, paramConfig: { delayTime: { label: 'Time (s)', min: 0.01, max: 2, step: 0.01 }, feedback: { label: 'Feedback', min: 0, max: 0.95, step: 0.01 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'reverse_echo', category: 'Space & Echo', label: 'Reverse', icon: '⏪', enabled: false, params: { mix: 50 }, paramConfig: { mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'stadium', category: 'Space & Echo', label: 'Stadium', icon: '🏟️', enabled: false, params: { size: 100 }, paramConfig: { size: { label: 'Size', min: 0, max: 100, step: 1 } } },

  // Modulation
  { id: 'adaptive_chorus', category: 'Modulation', label: 'Adaptive Chorus', icon: '🌊', enabled: false, params: { sensitivity: 50, baseDepth: 20 }, paramConfig: { sensitivity: { label: 'Env Sensitivity', min: 0, max: 100, step: 1 }, baseDepth: { label: 'Base Depth', min: 0, max: 100, step: 1 } } },
  { id: 'adaptive_tremolo', category: 'Modulation', label: 'Adaptive Tremolo', icon: '🌊', enabled: false, params: { rate: 5, sensitivity: 50, baseDepth: 10 }, paramConfig: { rate: { label: 'Rate (Hz)', min: 0, max: 20, step: 0.1 }, sensitivity: { label: 'Env Sensitivity', min: 0, max: 100, step: 1 }, baseDepth: { label: 'Base Depth', min: 0, max: 100, step: 1 } } },
  { id: 'vibrato', category: 'Modulation', label: 'Vibrato', icon: '〰️', enabled: false, params: { rate: 6, depth: 50 }, paramConfig: { rate: { label: 'Rate (Hz)', min: 1, max: 14, step: 0.1 }, depth: { label: 'Extent (Cents)', min: 0, max: 120, step: 1 } } },
  { id: 'tremolo', category: 'Modulation', label: 'Tremolo', icon: '🌊', enabled: false, params: { depth: 50 }, paramConfig: { depth: { label: 'Amount', min: 0, max: 100, step: 1 } } },
  { id: 'underwater', category: 'Modulation', label: 'Underwater', icon: '🫧', enabled: false, params: { depth: 100 }, paramConfig: { depth: { label: 'Depth', min: 0, max: 100, step: 1 } } },
  { id: 'rotary', category: 'Modulation', label: 'Rotary Speaker', icon: '🌀', enabled: false, params: { speed: 50 }, paramConfig: { speed: { label: 'Speed', min: 0, max: 100, step: 1 } } },
  { id: 'auto_pan', category: 'Modulation', label: 'Auto-Pan', icon: '↔️', enabled: false, params: { rate: 50 }, paramConfig: { rate: { label: 'Rate', min: 0, max: 100, step: 1 } } },
  { id: 'ring_mod', category: 'Modulation', label: 'Ring Mod', icon: '💍', enabled: false, params: { frequency: 440, mix: 50, waveform: 0 }, paramConfig: { frequency: { label: 'Freq (Hz)', min: 20, max: 2000, step: 1 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 }, waveform: { label: 'Wave (0=Sine,1=Square)', min: 0, max: 1, step: 1 } } },
  { id: 'wow_flutter', category: 'Modulation', label: 'Wow/Flutter', icon: '📻', enabled: false, params: { damage: 50 }, paramConfig: { damage: { label: 'Damage', min: 0, max: 100, step: 1 } } },
  { id: 'dimension', category: 'Modulation', label: 'Dimension', icon: '🌌', enabled: false, params: { width: 100 }, paramConfig: { width: { label: 'Width', min: 0, max: 100, step: 1 } } },
  
  // Distortion & Lo-Fi
  { id: 'analog_tape', category: 'Distortion & Lo-Fi', label: 'Analog Tape', icon: '📼', enabled: false, params: { tapeAge: 50, drive: 50 }, paramConfig: { tapeAge: { label: 'Tape Age', min: 0, max: 100, step: 1 }, drive: { label: 'Drive', min: 0, max: 100, step: 1 } } },
  { id: 'radio', category: 'Distortion & Lo-Fi', label: 'Old Radio', icon: '📻', enabled: false, params: { age: 100 }, paramConfig: { age: { label: 'Age', min: 0, max: 100, step: 1 } } },
  { id: 'telephone', category: 'Distortion & Lo-Fi', label: 'Telephone', icon: '☎️', enabled: false, params: { noise: 50 }, paramConfig: { noise: { label: 'Static', min: 0, max: 100, step: 1 } } },
  { id: 'megaphone', category: 'Distortion & Lo-Fi', label: 'Megaphone', icon: '📢', enabled: false, params: { drive: 50 }, paramConfig: { drive: { label: 'Drive', min: 0, max: 100, step: 1 } } },
  { id: 'bitcrusher_lofi', category: 'Distortion & Lo-Fi', label: '8-Bit', icon: '🕹️', enabled: false, params: { crush: 50 }, paramConfig: { crush: { label: 'Crush Level', min: 0, max: 100, step: 1 } } },
  { id: 'tape', category: 'Distortion & Lo-Fi', label: 'Tape Flutter', icon: '📼', enabled: false, params: { wear: 50 }, paramConfig: { wear: { label: 'Wear', min: 0, max: 100, step: 1 } } },
  { id: 'vinyl', category: 'Distortion & Lo-Fi', label: 'Vinyl Crackle', icon: '💿', enabled: false, params: { dust: 50 }, paramConfig: { dust: { label: 'Dust', min: 0, max: 100, step: 1 } } },
  { id: 'overdrive', category: 'Distortion & Lo-Fi', label: 'Overdrive', icon: '🔊', enabled: false, params: { drive: 50 }, paramConfig: { drive: { label: 'Drive', min: 0, max: 100, step: 1 } } },
  { id: 'tube_amp', category: 'Distortion & Lo-Fi', label: 'Tube Amp', icon: '🎛️', enabled: false, params: { warmth: 50 }, paramConfig: { warmth: { label: 'Warmth', min: 0, max: 100, step: 1 } } },
  { id: 'saturation', category: 'Distortion & Lo-Fi', label: 'Saturation', icon: '🌡️', enabled: false, params: { amount: 50 }, paramConfig: { amount: { label: 'Amount', min: 0, max: 100, step: 1 } } },
  { id: 'decimator', category: 'Distortion & Lo-Fi', label: 'Decimator', icon: '✂️', enabled: false, params: { ruin: 100 }, paramConfig: { ruin: { label: 'Ruin', min: 0, max: 100, step: 1 } } },

  // Dynamics & EQ
  { id: 'compressor', category: 'Dynamics & EQ', label: 'Compressor', icon: '🗜️', enabled: false, params: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25 }, paramConfig: { threshold: { label: 'Threshold (dB)', min: -60, max: 0, step: 1 }, ratio: { label: 'Ratio', min: 1, max: 20, step: 0.1 }, attack: { label: 'Attack (s)', min: 0.001, max: 1, step: 0.001 }, release: { label: 'Release (s)', min: 0.01, max: 3, step: 0.01 } } },
  { id: 'limiter', category: 'Dynamics & EQ', label: 'Limiter', icon: '🧱', enabled: false, params: { threshold: 50 }, paramConfig: { threshold: { label: 'Threshold', min: 0, max: 100, step: 1 } } },
  { id: 'gate', category: 'Dynamics & EQ', label: 'Noise Gate', icon: '🚪', enabled: false, params: { threshold: 50 }, paramConfig: { threshold: { label: 'Threshold', min: 0, max: 100, step: 1 } } },
  { id: 'eq_highpass', category: 'Dynamics & EQ', label: 'High Pass', icon: '🔪', enabled: false, params: { cutoff: 500 }, paramConfig: { cutoff: { label: 'Cutoff (Hz)', min: 20, max: 20000, step: 10 } } },
  { id: 'eq_lowpass', category: 'Dynamics & EQ', label: 'Low Pass', icon: '🔇', enabled: false, params: { cutoff: 2000 }, paramConfig: { cutoff: { label: 'Cutoff (Hz)', min: 20, max: 20000, step: 10 } } },
  { id: 'eq_bandpass', category: 'Dynamics & EQ', label: 'Band Pass', icon: '📻', enabled: false, params: { freq: 50 }, paramConfig: { freq: { label: 'Freq', min: 0, max: 100, step: 1 } } },
  { id: 'eq_notch', category: 'Dynamics & EQ', label: 'Notch', icon: '📉', enabled: false, params: { freq: 50 }, paramConfig: { freq: { label: 'Freq', min: 0, max: 100, step: 1 } } },
  { id: 'bass_boost', category: 'Dynamics & EQ', label: 'Bass Boost', icon: '🔊', enabled: false, params: { amount: 50 }, paramConfig: { amount: { label: 'Amount', min: 0, max: 100, step: 1 } } },
  { id: 'treble_boost', category: 'Dynamics & EQ', label: 'Treble Boost', icon: '✨', enabled: false, params: { amount: 50 }, paramConfig: { amount: { label: 'Amount', min: 0, max: 100, step: 1 } } },
  { id: 'vocal_presence', category: 'Dynamics & EQ', label: 'Presence', icon: '🗣️', enabled: false, params: { amount: 50 }, paramConfig: { amount: { label: 'Amount', min: 0, max: 100, step: 1 } } },
  { id: 'deesser', category: 'Dynamics & EQ', label: 'De-Esser', icon: '🤫', enabled: false, params: { amount: 50 }, paramConfig: { amount: { label: 'Amount', min: 0, max: 100, step: 1 } } },
  { id: 'maximizer', category: 'Dynamics & EQ', label: 'Maximizer', icon: '📈', enabled: false, params: { push: 50 }, paramConfig: { push: { label: 'Push', min: 0, max: 100, step: 1 } } },
  
  // Experimental & Sci-Fi
  { id: 'laser', category: 'Experimental', label: 'Laser', icon: '🔫', enabled: false, params: { zap: 50 }, paramConfig: { zap: { label: 'Zap', min: 0, max: 100, step: 1 } } },
  { id: 'drone', category: 'Experimental', label: 'Drone Mode', icon: '🛸', enabled: false, params: { sustain: 100 }, paramConfig: { sustain: { label: 'Sustain', min: 0, max: 100, step: 1 } } },
  { id: 'glitch', category: 'Experimental', label: 'Glitch Core', icon: '👾', enabled: false, params: { bugs: 50 }, paramConfig: { bugs: { label: 'Bugs', min: 0, max: 100, step: 1 } } },
  { id: 'reverse_playback', category: 'Experimental', label: 'Reverse', icon: '⏪', enabled: false, params: { mix: 100 }, paramConfig: { mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'shimmer', category: 'Experimental', label: 'Shimmer', icon: '✨', enabled: false, params: { sparkle: 50 }, paramConfig: { sparkle: { label: 'Sparkle', min: 0, max: 100, step: 1 } } },
  { id: 'comb_filter', category: 'Experimental', label: 'Metallic', icon: '🛢️', enabled: false, params: { metallic: 50 }, paramConfig: { metallic: { label: 'Metallic', min: 0, max: 100, step: 1 } } },
  { id: 'vocoder', category: 'Experimental', label: 'Vocoder', icon: '🎹', enabled: false, params: { synth: 50 }, paramConfig: { synth: { label: 'Synth Mix', min: 0, max: 100, step: 1 } } },
  { id: 'stutter', category: 'Experimental', label: 'Stutter', icon: '⚡', enabled: false, params: { rate: 50 }, paramConfig: { rate: { label: 'Rate', min: 0, max: 100, step: 1 } } },
  { id: 'time_stretch', category: 'Experimental', label: 'Time Stretch', icon: '⏱️', enabled: false, params: { stretch: 50 }, paramConfig: { stretch: { label: 'Stretch', min: 0, max: 100, step: 1 } } },
  { id: 'granular', category: 'Experimental', label: 'Granular', icon: '⏳', enabled: false, params: { grains: 50 }, paramConfig: { grains: { label: 'Grains', min: 0, max: 100, step: 1 } } },
  { id: 'space_station', category: 'Experimental', label: 'Space Station', icon: '🚀', enabled: false, params: { isolation: 100 }, paramConfig: { isolation: { label: 'Isolation', min: 0, max: 100, step: 1 } } },

  // Lo-Fi Environments
  { id: 'vinyl_record', category: 'Environments', label: 'Vinyl Record', icon: '💿', enabled: false, params: { dust: 50 }, paramConfig: { dust: { label: 'Dust & Scratches', min: 0, max: 100, step: 1 } } },
  { id: 'cassette', category: 'Environments', label: 'Cassette Deck', icon: '📼', enabled: false, params: { hiss: 50 }, paramConfig: { hiss: { label: 'Hiss', min: 0, max: 100, step: 1 } } },
  { id: 'rain', category: 'Environments', label: 'Rainy Day', icon: '🌧️', enabled: false, params: { rain: 50 }, paramConfig: { rain: { label: 'Rain Volume', min: 0, max: 100, step: 1 } } },
  { id: 'cafe', category: 'Environments', label: 'Coffee Shop', icon: '☕', enabled: false, params: { chatter: 50 }, paramConfig: { chatter: { label: 'Crowd', min: 0, max: 100, step: 1 } } },
  { id: 'forest', category: 'Environments', label: 'Forest', icon: '🌲', enabled: false, params: { birds: 50 }, paramConfig: { birds: { label: 'Birds', min: 0, max: 100, step: 1 } } },
  { id: 'ocean', category: 'Environments', label: 'Ocean Waves', icon: '🌊', enabled: false, params: { mix: 50 }, paramConfig: { mix: { label: 'Waves', min: 0, max: 100, step: 1 } } },

  // Filter & Sweep
  { id: 'rabenstein_sweeper', category: 'Filters & Sweeps', label: 'Analog Sweeper', icon: '🎛️', enabled: false, params: { rate: 2, depth: 50, cutoff: 1000, resonance: 4 }, paramConfig: { rate: { label: 'LFO Rate (Hz)', min: 0.1, max: 20, step: 0.1 }, depth: { label: 'Sweep Depth (Hz)', min: 0, max: 5000, step: 10 }, cutoff: { label: 'Base Cutoff (Hz)', min: 100, max: 10000, step: 10 }, resonance: { label: 'Resonance (Q)', min: 0.5, max: 20, step: 0.1 } } },
  { id: 'step_filter', category: 'Filters & Sweeps', label: 'Step Filter', icon: '🪜', enabled: false, params: { rate: 50 }, paramConfig: { rate: { label: 'Rate', min: 0, max: 100, step: 1 } } },
  { id: 'sweep_up', category: 'Filters & Sweeps', label: 'Sweep Up', icon: '📈', enabled: false, params: { rate: 50 }, paramConfig: { rate: { label: 'Rate', min: 0, max: 100, step: 1 } } },
  { id: 'sweep_down', category: 'Filters & Sweeps', label: 'Sweep Down', icon: '📉', enabled: false, params: { rate: 50 }, paramConfig: { rate: { label: 'Rate', min: 0, max: 100, step: 1 } } },
  { id: 'vowel_filter', category: 'Filters & Sweeps', label: 'Vowel Filter', icon: '🗣️', enabled: false, params: { vowel: 50 }, paramConfig: { vowel: { label: 'Vowel', min: 0, max: 100, step: 1 } } },
  { id: 'band_pass_sweep', category: 'Filters & Sweeps', label: 'BP Sweep', icon: '📻', enabled: false, params: { rate: 50 }, paramConfig: { rate: { label: 'Rate', min: 0, max: 100, step: 1 } } },
  { id: 'notch_sweep', category: 'Filters & Sweeps', label: 'Notch Sweep', icon: '✖️', enabled: false, params: { rate: 50 }, paramConfig: { rate: { label: 'Rate', min: 0, max: 100, step: 1 } } },
  { id: 'formant_sweep', category: 'Filters & Sweeps', label: 'Formant Sweep', icon: '👄', enabled: false, params: { rate: 50 }, paramConfig: { rate: { label: 'Rate', min: 0, max: 100, step: 1 } } },
  { id: 'lfo_filter', category: 'Filters & Sweeps', label: 'LFO Filter', icon: '〰️', enabled: false, params: { depth: 50 }, paramConfig: { depth: { label: 'Depth', min: 0, max: 100, step: 1 } } },
  { id: 'envelope_filter', category: 'Filters & Sweeps', label: 'Env Filter', icon: '✉️', enabled: false, params: { sensitivity: 50 }, paramConfig: { sensitivity: { label: 'Sensitivity', min: 0, max: 100, step: 1 } } },

  // Sci-Fi & Magic
  { id: 'crystal_cave', category: 'Sci-Fi & Magic', label: 'Crystal Cave', icon: '💎', enabled: false, params: { shimmer: 50 }, paramConfig: { shimmer: { label: 'Shimmer', min: 0, max: 100, step: 1 } } },
  { id: 'time_warp', category: 'Sci-Fi & Magic', label: 'Time Warp', icon: '🌀', enabled: false, params: { warp: 50 }, paramConfig: { warp: { label: 'Warp', min: 0, max: 100, step: 1 } } },
  { id: 'cyber_glitch', category: 'Sci-Fi & Magic', label: 'Cyber Glitch', icon: '🤖', enabled: false, params: { glitch: 50 }, paramConfig: { glitch: { label: 'Glitch', min: 0, max: 100, step: 1 } } },
  { id: 'magic_dust', category: 'Sci-Fi & Magic', label: 'Magic Dust', icon: '✨', enabled: false, params: { dust: 50 }, paramConfig: { dust: { label: 'Dust', min: 0, max: 100, step: 1 } } },
  { id: 'black_hole', category: 'Sci-Fi & Magic', label: 'Black Hole', icon: '🕳️', enabled: false, params: { gravity: 50 }, paramConfig: { gravity: { label: 'Gravity', min: 0, max: 100, step: 1 } } },
  { id: 'hologram', category: 'Sci-Fi & Magic', label: 'Hologram', icon: '👥', enabled: false, params: { fade: 50 }, paramConfig: { fade: { label: 'Fade', min: 0, max: 100, step: 1 } } },
  { id: 'teleport', category: 'Sci-Fi & Magic', label: 'Teleport', icon: '✨', enabled: false, params: { distance: 50 }, paramConfig: { distance: { label: 'Distance', min: 0, max: 100, step: 1 } } },
  { id: 'force_field', category: 'Sci-Fi & Magic', label: 'Force Field', icon: '🛡️', enabled: false, params: { strength: 50 }, paramConfig: { strength: { label: 'Strength', min: 0, max: 100, step: 1 } } },
  { id: 'mind_control', category: 'Sci-Fi & Magic', label: 'Mind Control', icon: '🧠', enabled: false, params: { power: 50 }, paramConfig: { power: { label: 'Power', min: 0, max: 100, step: 1 } } },
  { id: 'potion', category: 'Sci-Fi & Magic', label: 'Magic Potion', icon: '🧪', enabled: false, params: { bubbles: 50 }, paramConfig: { bubbles: { label: 'Bubbles', min: 0, max: 100, step: 1 } } },

  // Pitch & Tuning 2
  { id: 'pitch_wobble', category: 'Pitch & Tuning', label: 'Pitch Wobble', icon: '😵', enabled: false, params: { depth: 50 }, paramConfig: { depth: { label: 'Depth', min: 0, max: 100, step: 1 } } },
  { id: 'pitch_drop', category: 'Pitch & Tuning', label: 'Pitch Drop', icon: '📉', enabled: false, params: { speed: 50 }, paramConfig: { speed: { label: 'Speed', min: 0, max: 100, step: 1 } } },
  { id: 'pitch_rise', category: 'Pitch & Tuning', label: 'Pitch Rise', icon: '📈', enabled: false, params: { speed: 50 }, paramConfig: { speed: { label: 'Speed', min: 0, max: 100, step: 1 } } },
  { id: 'sub_bass', category: 'Pitch & Tuning', label: 'Sub Bass', icon: '🔊', enabled: false, params: { level: 50 }, paramConfig: { level: { label: 'Level', min: 0, max: 100, step: 1 } } },
  { id: 'crystal_highs', category: 'Pitch & Tuning', label: 'Crystal Highs', icon: '💎', enabled: false, params: { level: 50 }, paramConfig: { level: { label: 'Level', min: 0, max: 100, step: 1 } } },
  { id: 'broken_pitch', category: 'Pitch & Tuning', label: 'Broken Pitch', icon: '💔', enabled: false, params: { amount: 50 }, paramConfig: { amount: { label: 'Amount', min: 0, max: 100, step: 1 } } },
  { id: 'drunk_pitch', category: 'Pitch & Tuning', label: 'Drunk Pitch', icon: '🍺', enabled: false, params: { slur: 50 }, paramConfig: { slur: { label: 'Slur', min: 0, max: 100, step: 1 } } },
  { id: 'chorusing_pitch', category: 'Pitch & Tuning', label: 'Chorus Voice', icon: '👥', enabled: false, params: { voices: 50 }, paramConfig: { voices: { label: 'Voices', min: 0, max: 100, step: 1 } } },
  { id: 'glide', category: 'Pitch & Tuning', label: 'Glide', icon: '⛸️', enabled: false, params: { time: 50 }, paramConfig: { time: { label: 'Time', min: 0, max: 100, step: 1 } } },
  { id: 'auto_harmony', category: 'Pitch & Tuning', label: 'Auto Harmony', icon: '🎵', enabled: false, params: { mix: 50 }, paramConfig: { mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },

  // Character Voices 2
  { id: 'whisper', category: 'Character Voices', label: 'Whisper', icon: '🤫', enabled: false, params: { breath: 50 }, paramConfig: { breath: { label: 'Breath', min: 0, max: 100, step: 1 } } },
  { id: 'radio_announcer', category: 'Character Voices', label: 'Announcer', icon: '🎙️', enabled: false, params: { drive: 50 }, paramConfig: { drive: { label: 'Drive', min: 0, max: 100, step: 1 } } },
  { id: 'giant', category: 'Character Voices', label: 'Giant', icon: '🦶', enabled: false, params: { size: 50 }, paramConfig: { size: { label: 'Size', min: 0, max: 100, step: 1 } } },
  { id: 'mouse', category: 'Character Voices', label: 'Mouse', icon: '🐭', enabled: false, params: { squeak: 50 }, paramConfig: { squeak: { label: 'Squeak', min: 0, max: 100, step: 1 } } },
  { id: 'zombie', category: 'Character Voices', label: 'Zombie', icon: '🧟', enabled: false, params: { decay: 50 }, paramConfig: { decay: { label: 'Decay', min: 0, max: 100, step: 1 } } },
  { id: 'hacker', category: 'Character Voices', label: 'Hacker', icon: '💻', enabled: false, params: { data: 50 }, paramConfig: { data: { label: 'Data', min: 0, max: 100, step: 1 } } },
  { id: 'ghost_whisper', category: 'Character Voices', label: 'Ghost Whisper', icon: '👻', enabled: false, params: { haunt: 50 }, paramConfig: { haunt: { label: 'Haunt', min: 0, max: 100, step: 1 } } },
  { id: 'golem', category: 'Character Voices', label: 'Golem', icon: '🪨', enabled: false, params: { heavy: 50 }, paramConfig: { heavy: { label: 'Heavy', min: 0, max: 100, step: 1 } } },
  { id: 'cyborg_villain', category: 'Character Voices', label: 'Cyborg Villain', icon: '🦿', enabled: false, params: { evil: 50 }, paramConfig: { evil: { label: 'Evil', min: 0, max: 100, step: 1 } } },
  { id: 'retro_robot', category: 'Character Voices', label: 'Retro Robot', icon: '🤖', enabled: false, params: { metal: 50 }, paramConfig: { metal: { label: 'Metal', min: 0, max: 100, step: 1 } } },

  // Space & Echo 2
  { id: 'canyon', category: 'Space & Echo', label: 'Canyon', icon: '🏜️', enabled: false, params: { distance: 50 }, paramConfig: { distance: { label: 'Distance', min: 0, max: 100, step: 1 } } },
  { id: 'endless_void', category: 'Space & Echo', label: 'Endless Void', icon: '🌌', enabled: false, params: { depth: 50 }, paramConfig: { depth: { label: 'Depth', min: 0, max: 100, step: 1 } } },
  { id: 'tunnel', category: 'Space & Echo', label: 'Tunnel', icon: '🚇', enabled: false, params: { length: 50 }, paramConfig: { length: { label: 'Length', min: 0, max: 100, step: 1 } } },
  { id: 'bathtub', category: 'Space & Echo', label: 'Bathtub', icon: '🛁', enabled: false, params: { tile: 50 }, paramConfig: { tile: { label: 'Tile', min: 0, max: 100, step: 1 } } },
  { id: 'reverse_room', category: 'Space & Echo', label: 'Reverse Room', icon: '🔄', enabled: false, params: { flip: 50 }, paramConfig: { flip: { label: 'Flip', min: 0, max: 100, step: 1 } } },
  { id: 'multi_tap', category: 'Space & Echo', label: 'Multi Tap', icon: '🚿', enabled: false, params: { taps: 50 }, paramConfig: { taps: { label: 'Taps', min: 0, max: 100, step: 1 } } },
  { id: 'shimmer_verb', category: 'Space & Echo', label: 'Shimmer Verb', icon: '✨', enabled: false, params: { shine: 50 }, paramConfig: { shine: { label: 'Shine', min: 0, max: 100, step: 1 } } },
  { id: 'gated_snare_verb', category: 'Space & Echo', label: 'Gated Verb', icon: '🚪', enabled: false, params: { gate: 50 }, paramConfig: { gate: { label: 'Gate', min: 0, max: 100, step: 1 } } },
  { id: 'lofi_delay', category: 'Space & Echo', label: 'Lo-Fi Delay', icon: '📻', enabled: false, params: { grunge: 50 }, paramConfig: { grunge: { label: 'Grunge', min: 0, max: 100, step: 1 } } },
  { id: 'tape_delay', category: 'Space & Echo', label: 'Tape Delay', icon: '📼', enabled: false, params: { age: 50 }, paramConfig: { age: { label: 'Age', min: 0, max: 100, step: 1 } } },

  // Lo-Fi Environments 2
  { id: 'vhs_tape', category: 'Environments', label: 'VHS Tape', icon: '📼', enabled: false, params: { age: 50 }, paramConfig: { age: { label: 'Age', min: 0, max: 100, step: 1 } } },
  { id: 'subway_station', category: 'Environments', label: 'Subway Station', icon: '🚇', enabled: false, params: { rumble: 50 }, paramConfig: { rumble: { label: 'Rumble', min: 0, max: 100, step: 1 } } },
  { id: 'airplane_cabin', category: 'Environments', label: 'Airplane Cabin', icon: '✈️', enabled: false, params: { hum: 50 }, paramConfig: { hum: { label: 'Hum', min: 0, max: 100, step: 1 } } },
  { id: 'busy_street', category: 'Environments', label: 'Busy Street', icon: '🚗', enabled: false, params: { traffic: 50 }, paramConfig: { traffic: { label: 'Traffic', min: 0, max: 100, step: 1 } } },
  { id: 'underwater_cave', category: 'Environments', label: 'Underwater Cave', icon: '🌊', enabled: false, params: { depth: 50 }, paramConfig: { depth: { label: 'Depth', min: 0, max: 100, step: 1 } } },
  { id: 'jungle_night', category: 'Environments', label: 'Jungle Night', icon: '🦗', enabled: false, params: { bugs: 50 }, paramConfig: { bugs: { label: 'Bugs', min: 0, max: 100, step: 1 } } },
  { id: 'campfire', category: 'Environments', label: 'Campfire', icon: '🔥', enabled: false, params: { crackle: 50 }, paramConfig: { crackle: { label: 'Crackle', min: 0, max: 100, step: 1 } } },
  { id: 'classroom', category: 'Environments', label: 'Classroom', icon: '🏫', enabled: false, params: { murmur: 50 }, paramConfig: { murmur: { label: 'Murmur', min: 0, max: 100, step: 1 } } },
  { id: 'server_room', category: 'Environments', label: 'Server Room', icon: '💻', enabled: false, params: { fans: 50 }, paramConfig: { fans: { label: 'Fans', min: 0, max: 100, step: 1 } } },
  { id: 'spaceship_bridge', category: 'Environments', label: 'Spaceship Bridge', icon: '🚀', enabled: false, params: { hum: 50 }, paramConfig: { hum: { label: 'Hum', min: 0, max: 100, step: 1 } } },
  
  // Pitch-Shifted Delays (Advanced)
  { id: 'arpeggiated_echo', category: 'Pitch-Shifted Delays', label: 'Arpegg. Echo', icon: '🧗', enabled: false, params: { interval: 7, time: 30, feedback: 60, mix: 50 }, paramConfig: { interval: { label: 'Interval', min: -12, max: 12, step: 1 }, time: { label: 'Time', min: 1, max: 100, step: 1 }, feedback: { label: 'Feedback', min: 0, max: 90, step: 1 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'microshift_chorus', category: 'Pitch-Shifted Delays', label: 'Microshift', icon: '👯', enabled: false, params: { detune: 20, mix: 50 }, paramConfig: { detune: { label: 'Detune', min: 0, max: 100, step: 1 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'pitch_reverb', category: 'Pitch-Shifted Delays', label: 'Pitch Reverb', icon: '🌌', enabled: false, params: { interval: 12, size: 80, feedback: 40, mix: 50 }, paramConfig: { interval: { label: 'Interval', min: -24, max: 24, step: 1 }, size: { label: 'Size', min: 0, max: 100, step: 1 }, feedback: { label: 'Feedback', min: 0, max: 90, step: 1 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'swirling_cacophony', category: 'Pitch-Shifted Delays', label: 'Swirling', icon: '🌀', enabled: false, params: { chaos: 60, mix: 50 }, paramConfig: { chaos: { label: 'Chaos', min: 0, max: 100, step: 1 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },

  // Frequency Shifters (Weird FX)
  { id: 'spiraling_echo', category: 'Frequency Shifters', label: 'Spiraling Echo', icon: '🌪️', enabled: false, params: { shift: 20, time: 30, feedback: 70, mix: 50 }, paramConfig: { shift: { label: 'Shift (Hz)', min: -500, max: 500, step: 1 }, time: { label: 'Time', min: 1, max: 100, step: 1 }, feedback: { label: 'Feedback', min: 0, max: 95, step: 1 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'freq_chorus', category: 'Frequency Shifters', label: 'Swirl Chorus', icon: '💫', enabled: false, params: { shiftAmount: 5, mix: 50 }, paramConfig: { shiftAmount: { label: 'Shift Amount', min: 0, max: 50, step: 0.1 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'barber_phaser', category: 'Frequency Shifters', label: 'Barber Phaser', icon: '💈', enabled: false, params: { rate: 10, feedback: 60, mix: 50 }, paramConfig: { rate: { label: 'Shift Rate', min: -50, max: 50, step: 0.1 }, feedback: { label: 'Feedback', min: 0, max: 95, step: 1 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'thru_zero', category: 'Frequency Shifters', label: 'Spectral Invert', icon: '🙃', enabled: false, params: { shift: -500, mix: 100 }, paramConfig: { shift: { label: 'Shift (Hz)', min: -2000, max: 0, step: 10 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  
  // Advanced DSP FX
  { id: 'wide_notch', category: 'Advanced DSP FX', label: 'Wide Notch Comb', icon: '🚫', enabled: false, params: { frequency: 50, width: 50 }, paramConfig: { frequency: { label: 'Notch Hz', min: 20, max: 5000, step: 1 }, width: { label: 'Width', min: 1, max: 100, step: 1 } } },
  { id: 'dual_path_filter', category: 'Advanced DSP FX', label: 'Dual-Path IIR', icon: '🎛️', enabled: false, params: { highpass: 0 }, paramConfig: { highpass: { label: 'Mode (0=LP,1=HP)', min: 0, max: 1, step: 1 } } },
  { id: 'smart_zcr', category: 'Advanced DSP FX', label: 'ZCR Auto-Filter', icon: '📈', enabled: false, params: { cutoff: 200, sensitivity: 50 }, paramConfig: { cutoff: { label: 'Base Cutoff', min: 20, max: 10000, step: 10 }, sensitivity: { label: 'ZCR Sens.', min: 0, max: 100, step: 1 } } },
  { id: 'farrow_delay', category: 'Advanced DSP FX', label: 'Farrow Chorus', icon: '🌊', enabled: false, params: { delay: 5, modRate: 1, modDepth: 2, mix: 50 }, paramConfig: { delay: { label: 'Delay (ms)', min: 1, max: 20, step: 0.1 }, modRate: { label: 'Mod Rate', min: 0.1, max: 10, step: 0.1 }, modDepth: { label: 'Mod Depth (ms)', min: 0, max: 10, step: 0.1 }, mix: { label: 'Mix', min: 0, max: 100, step: 1 } } },
  { id: 'hilbert_wah', category: 'Advanced DSP FX', label: 'Hilbert Auto-Wah', icon: '🎸', enabled: false, params: { cutoff: 200, sens: 2000 }, paramConfig: { cutoff: { label: 'Base Cutoff', min: 50, max: 2000, step: 10 }, sens: { label: 'Sensitivity', min: 0, max: 10000, step: 100 } } },
  { id: 'ssb_modulator', category: 'Advanced DSP FX', label: 'SSB Freq Shifter', icon: '📡', enabled: false, params: { freq: 100, mode: 0 }, paramConfig: { freq: { label: 'Shift (Hz)', min: -1000, max: 1000, step: 1 }, mode: { label: 'Mode (0=USB, 1=LSB)', min: 0, max: 1, step: 1 } } }
];

export const EFFECT_CONFIG: Record<string, { create: () => any[], update: (nodes: any[], p: any) => void }> = {
  // Vocal Processing
  realtime_hum_removal: {
      create: () => [new HumRemovalNode()],
      update: (nodes: any[], p: any) => {
          nodes[0].baseFreq = p.baseFreq;
          nodes[0].width = p.width;
          nodes[0].reductionDepthDb = p.reductionDepthDb;
          nodes[0].includeHarmonics = p.includeHarmonics === 1;
      }
  },
  realtime_highpass: {
      create: () => [new CascadedHighPassNode()],
      update: (nodes: any[], p: any) => {
          nodes[0].cutoffHz = p.cutoffHz;
          nodes[0].order = p.order;
      }
  },
  realtime_limiter: {
      create: () => [new Tone.Limiter()],
      update: (nodes: any[], p: any) => {
          nodes[0].threshold.value = p.threshold;
          nodes[0].smoothing = p.release / 1000;
      }
  },
  vocal_eq: {
      create: () => [new Tone.Filter({ type: 'lowshelf' }), new Tone.Filter({ type: 'peaking', Q: 1 }), new Tone.Filter({ type: 'peaking', Q: 1 }), new Tone.Filter({ type: 'highshelf' })],
      update: (nodes: any[], p: any) => {
          nodes[0].frequency.value = p.band1Freq;
          nodes[0].gain.value = p.band1Gain;
          nodes[1].frequency.value = p.band2Freq;
          nodes[1].gain.value = p.band2Gain;
          nodes[2].frequency.value = p.band3Freq;
          nodes[2].gain.value = p.band3Gain;
          nodes[3].frequency.value = p.band4Freq;
          nodes[3].gain.value = p.band4Gain;
      }
  },
  vocal_comp: {
      create: () => [new Tone.Compressor(), new Tone.Gain()],
      update: (nodes: any[], p: any) => {
          nodes[0].threshold.value = p.threshold;
          nodes[0].ratio.value = p.ratio;
          nodes[0].attack.value = p.attack / 1000;
          nodes[0].release.value = p.release / 1000;
          nodes[1].gain.value = Tone.dbToGain(p.makeup);
      }
  },

  // Boutique Pedals
  rotary_speaker: {
      create: () => [new RotarySpeaker()],
      update: (nodes: any[], p: any) => {
          nodes[0].speed = p.speed;
      }
  },
  univibe: {
      create: () => [new UnivibeNode()],
      update: (nodes: any[], p: any) => {
          nodes[0].rate = p.rate;
          nodes[0].depth = p.depth;
          nodes[0].mode = p.mode;
      }
  },
  ring_modulator: {
      create: () => [new RingModulator()],
      update: (nodes: any[], p: any) => {
          nodes[0].osc.frequency.value = p.frequency;
          nodes[0].output.fade.value = p.mix / 100;
      }
  },

  // Pitch & Tuning
  doppler_pitch: { create: () => [new DopplerPitchShiftNode()], update: (nodes: any[], p: any) => { nodes[0].pitch = p.pitch; nodes[0].delayLength = p.delayLength; } },
  frequency_shifter: { create: () => [new Tone.FrequencyShifter({ frequency: 0 })], update: (nodes: any[], p: any) => { nodes[0].frequency.value = p.frequency; } },
  pitch_shifted_delay: { create: () => [new PitchShiftedDelay()], update: (nodes: any[], p: any) => { nodes[0].pitch = p.pitch; nodes[0].delayTime = p.delayTime; nodes[0].feedback = p.feedback; nodes[0].mix = p.mix; } },
  stft_pitch_shift: { create: () => [new Tone.PitchShift({ pitch: 0 })], update: (nodes: any[], p: any) => { nodes[0].pitch = p.pitch; } }, // Note: Real-time preview uses standard Tone.PitchShift. For full STFT phase vocoder + formant preservation, the offline array processor in stftPitchShift.ts is used during final export.
  pitch: { create: () => [new Tone.PitchShift({ pitch: 0 })], update: (nodes: any[], p: any) => nodes[0].pitch = p.pitch },
  autotune_hard: { create: () => [new Tone.PitchShift({ windowSize: 0.05 })], update: (nodes: any[], p: any) => { /* Tone.js lacks true autotune, simulating harsh digital shift */ nodes[0].pitch = (Math.sin(Tone.now() * p.speed) * (p.depth / 100)); } },
  autotune_pro: { 
    create: () => [new Tone.PitchShift({ windowSize: 0.04 }), new Tone.Vibrato()], 
    update: (nodes: any[], p: any) => { 
        // Simulated autotune pro using pitch shift and vibrato
        const retuneSpeed = p.retuneSpeed / 100;
        const humanise = p.humanise / 100;
        nodes[0].pitch = (Math.sin(Tone.now() * (retuneSpeed * 20)) * (1 - humanise)); 
        nodes[1].depth.value = humanise * 0.1;
        nodes[1].frequency.value = 5;
    } 
  },
  octave_down: { create: () => [new Tone.PitchShift({ pitch: -12 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.mix / 100 },
  octave_up: { create: () => [new Tone.PitchShift({ pitch: 12 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.mix / 100 },
  harmony_third: { create: () => [new Tone.PitchShift({ pitch: 4 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.mix / 100 },
  harmony_fifth: { create: () => [new Tone.PitchShift({ pitch: 7 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.mix / 100 },
  detune: { create: () => [new Tone.Chorus({ frequency: 0.1, delayTime: 0 }).start()], update: (nodes: any[], p: any) => nodes[0].depth = Math.abs(p.cents) / 50 },
  formant_shift: { create: () => [new Tone.PitchShift({ pitch: 0 })], update: (nodes: any[], p: any) => nodes[0].pitch = p.shift }, // standard pitch shift without formant correction as tonejs doesn't have native formant shifter
  vibrato_deep: { create: () => [new Tone.Vibrato()], update: (nodes: any[], p: any) => nodes[0].depth.value = (p.depth / 100) * 2 },

  // Character
  chipmunk: { create: () => [new Tone.PitchShift({ pitch: 12 })], update: (nodes: any[], p: any) => nodes[0].pitch = (p.intensity / 50) * 12 }, 
  vader: { create: () => [new Tone.PitchShift({ pitch: -8 }), new Tone.Chorus({ frequency: 0.1, depth: 0.5 }).start()], update: (nodes: any[], p: any) => { nodes[0].pitch = (p.intensity / 50) * -8; nodes[1].wet.value = (p.intensity / 50) * 0.5; } },
  robot: { create: () => [new AnalyticFrequencyShifter(), new Tone.BitCrusher()], update: (nodes: any[], p: any) => { nodes[0].shift = (p.rate / 50) * 500; nodes[1].bits.value = Math.max(1, 8 - Math.floor((p.rate / 50) * 4)); } },
  monster: { create: () => [new Tone.PitchShift({ pitch: -5 }), new Tone.Distortion(0.2)], update: (nodes: any[], p: any) => { nodes[0].pitch = (p.depth / 50) * -5; nodes[1].distortion = Math.max(0.01, Math.min(0.99, (p.depth / 50) * 0.5)); } },
  alien: { 
    create: () => [
      new Tone.PitchShift({ windowSize: 0.1 }), 
      new Tone.Filter({ type: "peaking", Q: 5, gain: 15 }), 
      new Tone.Tremolo({ depth: 0.8 }).start(), 
      new Tone.Distortion()
    ], 
    update: (nodes: any[], p: any) => { 
      const semitones = 12 * Math.log2(Math.max(0.1, p.pitch_shift || 1.0));
      nodes[0].pitch = semitones;
      nodes[0].wet.value = p.wet_dry_mix !== undefined ? p.wet_dry_mix : 1.0;

      nodes[1].frequency.value = p.resonance_freq || 1500;
      
      nodes[2].frequency.value = p.modulation_rate || 0.1;
      nodes[2].wet.value = p.wet_dry_mix !== undefined ? p.wet_dry_mix : 1.0;

      nodes[3].distortion = p.distortion_amt || 0;
      nodes[3].wet.value = p.wet_dry_mix !== undefined ? p.wet_dry_mix : 1.0;
    } 
  },
  demon: { create: () => [new Tone.PitchShift({ pitch: -10 }), new Tone.BitCrusher(4)], update: (nodes: any[], p: any) => { nodes[0].pitch = (p.evil / 50) * -10; nodes[1].bits.value = Math.max(1, 8 - Math.floor((p.evil / 50) * 4)); } },
  helium: { create: () => [new Tone.PitchShift({ pitch: 8 }), new Tone.Filter({ type: "highpass", frequency: 400 })], update: (nodes: any[], p: any) => { nodes[0].pitch = (p.amount / 50) * 8; nodes[1].frequency.value = (p.amount / 50) * 400; } },
  orc: { create: () => [new Tone.PitchShift({ pitch: -4 }), new Tone.Distortion(0.5)], update: (nodes: any[], p: any) => { nodes[0].pitch = - (p.depth / 100 * 8); nodes[1].distortion = Math.max(0.01, Math.min(0.99, p.depth / 100)); } },
  fairy: { create: () => [new Tone.PitchShift({ pitch: 12 }), new Tone.Chorus({ frequency: 2, delayTime: 3, depth: 1 }).start()], update: (nodes: any[], p: any) => { nodes[0].pitch = 8 + (p.magic / 100 * 16); nodes[1].wet.value = p.magic / 100; } },
  cyborg: { create: () => [new Tone.Phaser(), new Tone.Distortion(0.3)], update: (nodes: any[], p: any) => { nodes[0].frequency.value = p.metal / 100 * 20; nodes[1].distortion = Math.max(0.01, Math.min(0.99, (p.metal / 100) * 0.5)); } },
  gargoyle: { create: () => [new Tone.PitchShift({ pitch: -8 }), new Tone.Freeverb({ roomSize: 0.8, dampening: 1000 })], update: (nodes: any[], p: any) => { nodes[0].pitch = -6 - (p.stone / 100 * 12); nodes[1].wet.value = p.stone / 100; } },

  // Space & Echo
  smooth_delay: { create: () => [new DopplerFreeDelay()], update: (nodes: any[], p: any) => { nodes[0].delayTime = p.delayTime; nodes[0].output.gain.value = p.mix / 100; } },
  reverb: { create: () => { const r = new Tone.Freeverb(); return [r]; }, update: (nodes: any[], p: any) => { nodes[0].roomSize.value = p.roomSize / 100; nodes[0].dampening = p.dampening; nodes[0].wet.value = p.wet / 100; } },
  echo: { create: () => [new Tone.FeedbackDelay()], update: (nodes: any[], p: any) => { nodes[0].delayTime.value = p.delayTime; nodes[0].feedback.value = p.feedback; nodes[0].wet.value = p.wet / 100; } },
  slapback: { create: () => [new Tone.FeedbackDelay({ delayTime: 0.08, feedback: 0.1 })], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.mix / 100; } },
  ghost: { create: () => [new Tone.Freeverb({ roomSize: 0.9, dampening: 2000 }), new Tone.Phaser(), new Tone.PitchShift({ pitch: -2 })], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.haunt / 100; nodes[1].wet.value = p.haunt / 100 * 0.5; nodes[2].pitch = - (p.haunt / 100 * 3); } },
  hall: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => { nodes[0].roomSize.value = p.decay / 20; /* approximated decay to roomSize */  nodes[0].wet.value = p.mix / 100; } },
  church: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => { nodes[0].roomSize.value = p.decay / 20; /* approximated decay to roomSize */  nodes[0].wet.value = p.mix / 100; } },
  spring: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => { nodes[0].roomSize.value = p.decay / 20; /* approximated decay to roomSize */  nodes[0].wet.value = p.mix / 100; } },
  plate: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => { nodes[0].roomSize.value = p.decay / 20; /* approximated decay to roomSize */  nodes[0].wet.value = p.mix / 100; } },
  pingpong: { create: () => [new Tone.PingPongDelay("4n", 0.5)], update: (nodes: any[], p: any) => { nodes[0].delayTime.value = p.delayTime; nodes[0].feedback.value = p.feedback; nodes[0].wet.value = p.mix / 100; } },
  reverse_echo: { create: () => [new Tone.FeedbackDelay({ delayTime: 0.5 })], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.mix / 100; } }, // No true reverse without offline buffer processing, stand in.
  stadium: { create: () => [new Tone.Freeverb({ roomSize: 0.95, dampening: 1000 })], update: (nodes: any[], p: any) => { nodes[0].roomSize.value = 0.8 + (p.size / 100 * 0.2); nodes[0].wet.value = p.size / 100; } },

  // Modulation
  smart_vibrato: { create: () => [new SmartVibrato()], update: (nodes: any[], p: any) => { nodes[0].rate = p.rate; nodes[0].baseDepth = p.depth / 100; nodes[0].likeliness = p.likeliness; } },
  adaptive_chorus: { create: () => [new AdaptiveChorus()], update: (nodes: any[], p: any) => { nodes[0].sensitivity = p.sensitivity / 100; nodes[0].baseDepth = p.baseDepth / 100; } },
  adaptive_tremolo: { create: () => [new AdaptiveTremolo()], update: (nodes: any[], p: any) => { nodes[0].rate = p.rate; nodes[0].sensitivity = p.sensitivity / 100; nodes[0].baseDepth = p.baseDepth / 100; } },
  chorus: { 
      create: () => [new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.7, type: 'sine', spread: 180 }).start()], 
      update: (nodes: any[], params: any) => {
          const typeOptions = ['sine', 'square', 'triangle', 'sawtooth'] as const;
          nodes[0].frequency.value = params.frequency;
          nodes[0].delayTime = params.delayTime;
          nodes[0].depth = params.depth;
          nodes[0].type = typeOptions[params.type] || 'sine';
          nodes[0].spread = params.spread;
      }
  },
  flanger: { 
      create: () => [new Tone.Chorus({ frequency: 0.5, delayTime: 10, depth: 0.5, feedback: 0.5 }).start()], 
      update: (nodes: any[], params: any) => {
          nodes[0].frequency.value = params.frequency;
          nodes[0].delayTime = params.delayTime;
          nodes[0].depth = params.depth;
          nodes[0].feedback.value = params.feedback;
      }
  },
  phaser: { 
      create: () => [new Tone.Phaser()], 
      update: (nodes: any[], params: any) => {
          nodes[0].frequency.value = params.frequency;
          nodes[0].octaves = params.octaves;
          nodes[0].stages = params.stages;
          nodes[0].Q.value = params.Q;
          nodes[0].baseFrequency = params.baseFrequency;
      }
  },
  underwater: { create: () => [new Tone.Filter({ type: "lowpass", frequency: 400 }), new Tone.Chorus({ frequency: 0.5, depth: 1 }).start()], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 600 - (p.depth / 100 * 400); nodes[1].wet.value = p.depth / 100; } },
  vibrato: { create: () => [new Tone.Vibrato()], update: (nodes: any[], p: any) => { nodes[0].frequency.value = p.rate; nodes[0].depth.value = p.depth / 120; nodes[0].wet.value = 1; } },
  tremolo: { create: () => [new Tone.Tremolo().start()], update: (nodes: any[], p: any) => { nodes[0].depth.value = p.depth / 100; nodes[0].wet.value = p.depth / 100; } },
  rotary: { create: () => [new Tone.Tremolo({ frequency: 4 }).start(), new Tone.Vibrato()], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 1 + (p.speed / 100 * 30); nodes[1].frequency.value = 1 + (p.speed / 100 * 30); nodes[0].wet.value = 0.5; nodes[1].wet.value = 0.5; } },
  auto_pan: { create: () => [new Tone.AutoPanner("4n").start()], update: (nodes: any[], p: any) => { nodes[0].frequency.value = (p.rate / 100) * 20; nodes[0].wet.value = 1; } },
  ring_mod: { create: () => [new RingModulator()], update: (nodes: any[], p: any) => { nodes[0].frequency.value = p.frequency; nodes[0].type = p.waveform === 1 ? 'square' : 'sine'; nodes[0].output.fade.value = p.mix / 100; } },
  wow_flutter: { create: () => [new Tone.Vibrato(), new Tone.Vibrato()], update: (nodes: any[], p: any) => { nodes[0].depth.value = (p.damage / 100) * 2.0; nodes[1].depth.value = (p.damage / 100) * 3.0; } },
  dimension: { create: () => [new Tone.Chorus({ frequency: 0.1, delayTime: 2.5, depth: 0.5 }).start()], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.width / 100; } },

  // Distortion & LoFi
  analog_tape: { create: () => [new AnalogTape()], update: (nodes: any[], p: any) => { nodes[0].tapeAge = p.tapeAge; nodes[0].drive = p.drive; } },
  distortion: { 
      create: () => [new Tone.Distortion({ distortion: 0.5, oversample: "none" })], 
      update: (nodes: any[], p: any) => { 
          const oversampleOptions = ['none', '2x', '4x'] as const;
          nodes[0].distortion = Math.max(0.01, Math.min(1.0, (p.distortion / 100))); 
          nodes[0].oversample = oversampleOptions[p.oversample] || 'none';
      } 
  },
  fuzz: { create: () => [new Tone.Distortion(0.8)], update: (nodes: any[], p: any) => { nodes[0].distortion = Math.max(0.01, Math.min(0.99, 0.5 + (p.amount / 100 * 0.4))); } },
  radio: { create: () => [new Tone.Filter({ type: "bandpass", frequency: 1500, Q: 2 }), new Tone.Distortion()], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 500 + p.age * 20; nodes[1].distortion = Math.max(0.01, Math.min(0.99, p.age / 100)); } },
  telephone: { create: () => [new Tone.Filter({ type: "bandpass", frequency: 1000, Q: 3 }), new Tone.Distortion(0.2)], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 1000; nodes[1].distortion = Math.max(0.01, Math.min(0.99, p.noise / 100)); } },
  megaphone: { create: () => [new Tone.Filter({ type: "highpass", frequency: 800 }), new Tone.Distortion()], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 800; nodes[1].distortion = Math.max(0.01, Math.min(0.99, p.drive / 100)); } },
  bitcrusher: { 
      create: () => [new Tone.BitCrusher({ bits: 4 })], 
      update: (nodes: any[], p: any) => { 
          nodes[0].bits.value = p.bits; 
          // Assuming sampleRate reduction is simulated via another node or just unused in this basic setup
      } 
  },
  tape: { create: () => [new Tone.Vibrato(), new Tone.Filter({ type: "lowpass", frequency: 3000 })], update: (nodes: any[], p: any) => { nodes[0].depth.value = (p.wear / 100) * 2.0; nodes[1].frequency.value = 6000 - (p.wear / 100 * 5000); } },
  vinyl: { create: () => [new Tone.Filter({ type: "highpass", frequency: 200 }), new Tone.Distortion(0.1)], update: (nodes: any[], p: any) => { nodes[1].distortion = Math.max(0.01, Math.min(0.99, p.dust / 100)); } },
  overdrive: { create: () => [new Tone.Chebyshev(50)], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.drive / 100; } },
  tube_amp: { create: () => [new Tone.Distortion(0.1), new Tone.Filter({ type: "lowpass", frequency: 4000 })], update: (nodes: any[], p: any) => { nodes[0].distortion = Math.max(0.01, Math.min(0.99, p.warmth / 100)); nodes[1].frequency.value = 2000 + ((100 - p.warmth) / 100 * 6000); } },
  saturation: { create: () => [new Tone.Chebyshev(1)], update: (nodes: any[], p: any) => { nodes[0].order = Math.floor(1 + (p.amount / 100 * 100)); nodes[0].wet.value = p.amount / 100; } },
  decimator: { create: () => [new Tone.BitCrusher(1), new Tone.Distortion(0.8)], update: (nodes: any[], p: any) => { nodes[0].bits.value = 8 - Math.floor((p.ruin / 100) * 7); nodes[1].distortion = Math.max(0.01, Math.min(0.99, p.ruin / 100)); } },

  // Dynamics & EQ
  compressor: { create: () => [new Tone.Compressor()], update: (nodes: any[], p: any) => { nodes[0].threshold.value = p.threshold; nodes[0].ratio.value = p.ratio; nodes[0].attack.value = p.attack; nodes[0].release.value = p.release; } },
  limiter: { create: () => [new Tone.Limiter(-10)], update: (nodes: any[], p: any) => { nodes[0].threshold.value = -20 + ((100 - p.threshold) / 100 * 20); } },
  gate: { create: () => [new Tone.Compressor({ threshold: -40, ratio: 20 })], update: (nodes: any[], p: any) => { nodes[0].threshold.value = -80 + (p.threshold / 100 * 60); } },
  eq_highpass: { create: () => [new Tone.Filter({ type: "highpass" })], update: (nodes: any[], p: any) => { nodes[0].frequency.value = p.cutoff; } },
  eq_lowpass: { create: () => [new Tone.Filter({ type: "lowpass" })], update: (nodes: any[], p: any) => { nodes[0].frequency.value = p.cutoff; } },
  eq_bandpass: { create: () => [new Tone.Filter({ type: "bandpass", Q: 2 })], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 100 + (p.freq / 100 * 4000); } },
  eq_notch: { create: () => [new Tone.Filter({ type: "notch", Q: 4 })], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 100 + (p.freq / 100 * 4000); } },
  bass_boost: { create: () => [new Tone.EQ3(5, 0, 0)], update: (nodes: any[], p: any) => { nodes[0].low.value = (p.amount / 100) * 15; } },
  treble_boost: { create: () => [new Tone.EQ3(0, 0, 5)], update: (nodes: any[], p: any) => { nodes[0].high.value = (p.amount / 100) * 15; } },
  vocal_presence: { create: () => [new Tone.EQ3(0, 5, 2)], update: (nodes: any[], p: any) => { nodes[0].mid.value = (p.amount / 100) * 10; } },
  deesser: { create: () => [new Tone.Compressor({ threshold: -10, attack: 0.01 })], update: (nodes: any[], p: any) => { nodes[0].threshold.value = -10 - (p.amount / 100 * 20); } }, // Simple deesser via fast compressor, typically needs a bandpass sidechain
  maximizer: { create: () => [new Tone.Compressor({ ratio: 10, threshold: -20 }), new Tone.Filter({ type: "highshelf", gain: 3 })], update: (nodes: any[], p: any) => { nodes[0].threshold.value = -10 - (p.push / 100 * 30); nodes[1].gain.value = (p.push / 100) * 6; } },
  
  // Experimental & Sci-Fi
  laser: { create: () => [new Tone.Filter({ type: 'lowpass' }), new Tone.Distortion(0.5)], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 5 + (p.zap / 100 * 50); nodes[1].wet.value = p.zap / 100; } },
  drone: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 }), new Tone.Freeverb({ roomSize: 1 })], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.sustain / 100; } },
  glitch: { create: () => [new Tone.BitCrusher(2)], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.bugs / 100; } },
  reverse_playback: { create: () => [new Tone.FeedbackDelay({ delayTime: 0.1, feedback: 0.5 })], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.mix / 100; } }, // Dummy 
  shimmer: { create: () => [new Tone.PitchShift({ pitch: 12 }), new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.sparkle / 100; nodes[1].wet.value = p.sparkle / 100; } },
  comb_filter: { create: () => [new Tone.FeedbackDelay({ delayTime: 0.01, feedback: 0.8 })], update: (nodes: any[], p: any) => { nodes[0].delayTime.value = 0.001 + ((100 - p.metallic) / 100 * 0.02); } },
  vocoder: { create: () => [new Tone.BitCrusher(4), new Tone.Filter({ type: 'bandpass', frequency: 1000 })], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.synth / 100; nodes[1].frequency.value = 500 + (p.synth / 100 * 2000); } },
  stutter: { create: () => [new Tone.BitCrusher(2)], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.rate / 100; } },
  time_stretch: { create: () => [new Tone.PitchShift({ windowSize: 0.1 })], update: (nodes: any[], p: any) => { nodes[0].pitch = - (p.stretch / 100 * 5); } },
  granular: { create: () => [new Tone.FeedbackDelay({ delayTime: 0.05, feedback: 0.5 })], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.grains / 100; } },
  space_station: { create: () => [new Tone.Filter({ type: "bandpass", frequency: 800, Q: 5 }), new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 400 + (p.isolation / 100 * 800); nodes[1].wet.value = p.isolation / 100; } },

  // Lo-Fi Environments
  vinyl_record: { create: () => [new Tone.Filter({ type: "bandpass", frequency: 2000, Q: 1 }), new Tone.Distortion(0.2)], update: (nodes: any[], p: any) => { nodes[1].distortion = Math.max(0.01, Math.min(0.99, p.dust / 100)); nodes[0].frequency.value = 1000 + (100 - p.dust) / 100 * 3000; } },
  cassette: { create: () => [new Tone.Filter({ type: "lowpass", frequency: 4000 }), new Tone.Vibrato()], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 2000 + ((100 - p.hiss) / 100 * 6000); nodes[1].depth.value = p.hiss / 100 * 2.0;} },
  rain: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 }), new Tone.Filter({ type: "lowpass", frequency: 2000 })], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.rain / 100; nodes[1].frequency.value = 5000 - (p.rain / 100 * 4000); } }, // Needs synth noise for real rain
  cafe: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 }), new Tone.Filter({ type: "highpass", frequency: 300 })], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.chatter / 100 * 0.5; } },
  forest: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 }), new Tone.PingPongDelay({ delayTime: 0.3, feedback: 0.2 })], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.birds / 100 * 0.6; nodes[1].wet.value = p.birds / 100 * 0.3; } },
  ocean: { create: () => [new Tone.Phaser(), new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.mix / 100; nodes[1].wet.value = p.mix / 100; } },
  vhs_tape: { create: () => [new Tone.Vibrato(), new Tone.Filter({ type: "lowpass", frequency: 1500 })], update: (nodes: any[], p: any) => { nodes[0].depth.value = p.age / 100 * 2.0; nodes[1].frequency.value = 4000 - (p.age / 100 * 3000); } },
  subway_station: { create: () => [new Tone.Filter({ type: "lowpass", frequency: 200 }), new Tone.Distortion(0.5)], update: (nodes: any[], p: any) => { nodes[1].wet.value = p.rumble / 100; nodes[0].frequency.value = 500 - (p.rumble / 100 * 400); } },
  airplane_cabin: { create: () => [new Tone.Filter({ type: "bandpass", frequency: 300 }), new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 200 + (p.hum / 100 * 400); nodes[1].wet.value = p.hum / 100 * 0.5; } },
  busy_street: { create: () => [new Tone.Filter({ type: "bandpass", frequency: 1000 }), new Tone.FeedbackDelay({ delayTime: 0.05, feedback: 0.1 })], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 500 + (p.traffic / 100 * 2000); nodes[1].wet.value = p.traffic / 100; } },
  underwater_cave: { create: () => [new Tone.Filter({ type: "lowpass", frequency: 300 }), new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 800 - (p.depth / 100 * 700); nodes[1].wet.value = p.depth / 100; } },
  jungle_night: { create: () => [new Tone.Filter({ type: "highpass", frequency: 4000 }), new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 2000 + (p.bugs / 100 * 4000); nodes[1].wet.value = p.bugs / 100; } },
  campfire: { create: () => [new Tone.Filter({ type: "highpass", frequency: 1000 }), new Tone.Distortion(0.5)], update: (nodes: any[], p: any) => { nodes[1].distortion = Math.max(0.01, Math.min(0.99, p.crackle / 100)); nodes[0].frequency.value = 1000 + (p.crackle / 100 * 1000); } },
  classroom: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 }), new Tone.Filter({ type: "bandpass", frequency: 800 })], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.murmur / 100 * 0.6; } },
  server_room: { create: () => [new Tone.Filter({ type: "bandpass", frequency: 200 }), new Tone.Chorus({ frequency: 0.1, delayTime: 0.1 }).start()], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 100 + (p.fans / 100 * 500); nodes[1].wet.value = p.fans / 100; } },
  spaceship_bridge: { create: () => [new Tone.Filter({ type: "bandpass", frequency: 500 }), new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 200 + (p.hum / 100 * 1000); nodes[1].wet.value = p.hum / 100; } },

  // Filter & Sweep
  formant_bank: { create: () => [new FormantBank()], update: (nodes: any[], p: any) => { nodes[0].vowel = p.vowel; nodes[0].mix = p.mix / 100; } },
  rabenstein_sweeper: {
      create: () => [new RabensteinSweeper()],
      update: (nodes: any[], p: any) => {
          nodes[0].lfoRate = p.rate;
          nodes[0].depth = p.depth;
          nodes[0].baseCutoff = p.cutoff;
          nodes[0].q = p.resonance;
      }
  },
  auto_wah: {
      create: () => [new Tone.AutoWah()],
      update: (nodes: any[], params: any) => {
          nodes[0].baseFrequency = params.baseFrequency;
          nodes[0].octaves = params.octaves;
          nodes[0].sensitivity = params.sensitivity;
          nodes[0].Q.value = params.Q;
          nodes[0].gain.value = params.gain;
          nodes[0].follower = params.follower;
      }
  },
  chebyshev: {
      create: () => [new Tone.Chebyshev({ order: 50 })],
      update: (nodes: any[], params: any) => {
          nodes[0].order = params.order;
      }
  },
  step_filter: { create: () => [new Tone.BitCrusher(4)], update: (nodes: any[], p: any) => { nodes[0].bits.value = 4; } },
  sweep_up: { create: () => [new Tone.Phaser()], update: (nodes: any[], p: any) => nodes[0].frequency.value = p.rate * 2 },
  sweep_down: { create: () => [new Tone.Phaser()], update: (nodes: any[], p: any) => nodes[0].frequency.value = p.rate * 2 },
  vowel_filter: { create: () => [new Tone.Filter({ type: 'bandpass', frequency: 1000 })], update: (nodes: any[], p: any) => nodes[0].frequency.value = 500 + p.vowel * 200 },
  band_pass_sweep: { create: () => [new Tone.Filter({ type: 'bandpass' })], update: (nodes: any[], p: any) => nodes[0].frequency.value = p.rate * 200 },
  notch_sweep: { create: () => [new Tone.Filter({ type: 'notch' })], update: (nodes: any[], p: any) => nodes[0].frequency.value = p.rate * 200 },
  formant_sweep: { create: () => [new Tone.Filter({ type: 'peaking' })], update: (nodes: any[], p: any) => nodes[0].frequency.value = p.rate * 200 },
  lfo_filter: { create: () => [new Tone.Filter()], update: (nodes: any[], p: any) => nodes[0].frequency.value = p.depth * 200 },
  envelope_filter: { create: () => [new Tone.Filter({ type: 'lowpass' }), new Tone.Distortion(0.1)], update: (nodes: any[], p: any) => nodes[0].frequency.value = 500 + p.sensitivity * 200 },

  // Sci-Fi & Magic
  crystal_cave: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 }), new Tone.PitchShift({ pitch: 12 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.shimmer / 100 },
  time_warp: { create: () => [new Tone.FeedbackDelay({ delayTime: 0.1 }), new Tone.Vibrato()], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.warp / 100; nodes[1].wet.value = p.warp / 100; } },
  cyber_glitch: { create: () => [new Tone.BitCrusher(2)], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.glitch/100; } },
  magic_dust: { create: () => [new Tone.PitchShift({ pitch: 24 })], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.dust/100; } },
  black_hole: { create: () => [new Tone.Filter({ type: 'lowpass', frequency: 100 }), new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => nodes[1].wet.value = p.gravity/100 },
  hologram: { create: () => [new Tone.Phaser()], update: (nodes: any[], p: any) => { nodes[0].wet.value = p.fade/100; } },
  teleport: { create: () => [new Tone.FeedbackDelay({ delayTime: 0.05 }), new Tone.PitchShift({ pitch: -5 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.distance/100 },
  force_field: { create: () => [new Tone.Chebyshev(50), new Tone.Filter({ type: 'bandpass' })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.strength/100 },
  mind_control: { create: () => [new Tone.Vibrato(), new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => nodes[1].wet.value = p.power/100 },
  potion: { create: () => [new Tone.PitchShift({ pitch: 5 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.bubbles/100 },

  // Pitch & Tuning 2
  pitch_wobble: { create: () => [new Tone.Vibrato()], update: (nodes: any[], p: any) => nodes[0].depth.value = p.depth / 100 },
  pitch_drop: { create: () => [new Tone.PitchShift({ pitch: -12 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.speed / 100 },
  pitch_rise: { create: () => [new Tone.PitchShift({ pitch: 12 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.speed / 100 },
  sub_bass: { create: () => [new Tone.Filter({ type: 'lowpass', frequency: 150 }), new Tone.Distortion(0.5)], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 100 + (p.level / 100 * 200); nodes[1].distortion = Math.max(0.01, Math.min(0.99, p.level / 100 * 0.5)); } },
  crystal_highs: { create: () => [new Tone.Filter({ type: 'highpass', frequency: 5000 }), new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 3000 + (p.level / 100 * 4000); nodes[1].wet.value = p.level / 100; } },
  broken_pitch: { create: () => [new Tone.BitCrusher(4), new Tone.PitchShift({ pitch: -2 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.amount / 100 },
  drunk_pitch: { create: () => [new Tone.Vibrato()], update: (nodes: any[], p: any) => nodes[0].wet.value = p.slur / 100 },
  chorusing_pitch: { create: () => [new Tone.PitchShift({ pitch: 0 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.voices / 100 },
  glide: { create: () => [new Tone.Vibrato()], update: (nodes: any[], p: any) => nodes[0].wet.value = p.time / 100 },
  auto_harmony: { create: () => [new Tone.PitchShift({ pitch: 7 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.mix / 100 },

  // Character Voices 2
  whisper: { create: () => [new Tone.Filter({ type: 'highpass', frequency: 3000 }), new Tone.Distortion(0.1)], update: (nodes: any[], p: any) => { nodes[0].frequency.value = 2000 + (p.breath / 100 * 4000); nodes[1].distortion = Math.max(0.01, Math.min(0.99, p.breath / 100 * 0.5)); } },
  radio_announcer: { create: () => [new Tone.Filter({ type: 'bandpass', frequency: 2000 }), new Tone.Distortion(0.5)], update: (nodes: any[], p: any) => { nodes[1].distortion = Math.max(0.01, Math.min(0.99, p.drive / 100 * 0.5)); } },
  giant: { create: () => [new Tone.PitchShift({ pitch: -12 }), new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => { nodes[0].pitch = -6 - (p.size / 100 * 12); nodes[1].wet.value = p.size / 100 * 0.5; } },
  mouse: { create: () => [new Tone.PitchShift({ pitch: 14 })], update: (nodes: any[], p: any) => { nodes[0].pitch = 8 + (p.squeak / 100 * 12); } },
  zombie: { create: () => [new Tone.PitchShift({ pitch: -8 }), new Tone.BitCrusher(2)], update: (nodes: any[], p: any) => { nodes[0].pitch = -4 - (p.decay / 100 * 8); nodes[1].bits.value = Math.max(1, 8 - Math.floor((p.decay / 100) * 6)); } },
  hacker: { create: () => [new Tone.BitCrusher(4)], update: (nodes: any[], p: any) => { nodes[0].bits.value = Math.max(1, 8 - Math.floor((p.data / 100) * 7)); nodes[0].wet.value = p.data / 100; } },
  ghost_whisper: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 }), new Tone.Phaser()], update: (nodes: any[], p: any) => nodes[0].wet.value = p.haunt / 100 },
  golem: { create: () => [new Tone.PitchShift({ pitch: -10 }), new Tone.Distortion(0.8)], update: (nodes: any[], p: any) => { nodes[0].pitch = -6 - (p.heavy / 100 * 8); nodes[1].distortion = Math.max(0.01, Math.min(0.99, p.heavy / 100)); nodes[1].wet.value = p.heavy / 100; } },
  cyborg_villain: { create: () => [new AnalyticFrequencyShifter({ shift: 50 }), new Tone.Distortion(0.5)], update: (nodes: any[], p: any) => { nodes[0].shift = p.evil; nodes[1].distortion = Math.max(0.01, Math.min(0.99, p.evil / 100)); } },
  retro_robot: { create: () => [new Tone.BitCrusher(4), new Tone.Filter({ type: 'bandpass', frequency: 1000 })], update: (nodes: any[], p: any) => { nodes[0].bits.value = Math.max(1, 8 - Math.floor((p.metal / 100) * 7)); } },

  // Space & Echo 2
  canyon: { create: () => [new Tone.FeedbackDelay({ delayTime: 0.6, feedback: 0.5 }), new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.distance / 100 },
  endless_void: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 }), new Tone.FeedbackDelay({ delayTime: 1 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.depth / 100 },
  tunnel: { create: () => [new Tone.FeedbackDelay({ delayTime: 0.05, feedback: 0.8 }), new Tone.Filter({ type: 'bandpass', frequency: 1000 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.length / 100 },
  bathtub: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.tile / 100 },
  reverse_room: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.flip / 100 },
  multi_tap: { create: () => [new Tone.FeedbackDelay({ delayTime: 0.2 }), new Tone.FeedbackDelay({ delayTime: 0.4 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.taps / 100 },
  shimmer_verb: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 }), new Tone.PitchShift({ pitch: 12 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.shine / 100 },
  gated_snare_verb: { create: () => [new Tone.Freeverb({ roomSize: 0.85, dampening: 3000 }), new Tone.Compressor({ threshold: -30, ratio: 10 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.gate / 100 },
  lofi_delay: { create: () => [new Tone.FeedbackDelay({ delayTime: 0.3 }), new Tone.BitCrusher(4)], update: (nodes: any[], p: any) => nodes[1].wet.value = p.grunge / 100 },
  tape_delay: { create: () => [new Tone.FeedbackDelay({ delayTime: 0.4 }), new Tone.Filter({ type: 'lowpass', frequency: 2000 })], update: (nodes: any[], p: any) => nodes[0].wet.value = p.age / 100 },

  // Pitch-Shifted Delays
  arpeggiated_echo: {
    create: () => {
      const inNode = new Tone.Gain();
      const outNode = new Tone.Gain();
      const loopGain = new Tone.Gain(0.6);
      const delay = new Tone.Delay(0.3);
      const pitch = new Tone.PitchShift({ pitch: 7, windowSize: 0.05 });
      const wetGain = new Tone.Gain(0.5);
      
      inNode.connect(delay);
      delay.connect(pitch);
      pitch.connect(loopGain);
      loopGain.connect(delay);
      delay.connect(wetGain);
      wetGain.connect(outNode);
      
      (inNode as any)._delay = delay;
      (inNode as any)._pitch = pitch;
      (inNode as any)._loopGain = loopGain;
      (inNode as any)._wetGain = wetGain;
      
      return [inNode, outNode];
    },
    update: (nodes: any[], p: any) => {
      const inNode = nodes[0];
      inNode._pitch.pitch = p.interval;
      inNode._delay.delayTime.value = p.time / 100;
      inNode._loopGain.gain.value = p.feedback / 100;
      inNode._wetGain.gain.value = p.mix / 100;
    }
  },
  microshift_chorus: {
    create: () => {
      const inNode = new Tone.Gain();
      const outNode = new Tone.Gain();
      const pitchL = new Tone.PitchShift({ pitch: -0.2, windowSize: 0.05 });
      const delayL = new Tone.Delay(0.015);
      const panL = new Tone.Panner(-0.8);
      const pitchR = new Tone.PitchShift({ pitch: 0.2, windowSize: 0.05 });
      const delayR = new Tone.Delay(0.025);
      const panR = new Tone.Panner(0.8);
      const wetGain = new Tone.Gain(0.5);

      inNode.connect(pitchL);
      pitchL.connect(delayL);
      delayL.connect(panL);
      panL.connect(wetGain);
      
      inNode.connect(pitchR);
      pitchR.connect(delayR);
      delayR.connect(panR);
      panR.connect(wetGain);
      
      wetGain.connect(outNode);
      
      (inNode as any)._wetGain = wetGain;
      (inNode as any)._pitchL = pitchL;
      (inNode as any)._pitchR = pitchR;
      
      return [inNode, outNode];
    },
    update: (nodes: any[], p: any) => {
      const inNode = nodes[0];
      inNode._wetGain.gain.value = p.mix / 100;
      inNode._pitchL.pitch = - (p.detune / 100);
      inNode._pitchR.pitch = (p.detune / 100);
    }
  },
  pitch_reverb: {
    create: () => {
      const inNode = new Tone.Gain();
      const outNode = new Tone.Gain();
      const freeverb = new Tone.Freeverb({ roomSize: 0.8, dampening: 2000 });
      const pitch = new Tone.PitchShift({ pitch: 12, windowSize: 0.05 });
      const loopGain = new Tone.Gain(0.4);
      const wetGain = new Tone.Gain(0.5);
      
      inNode.connect(freeverb);
      freeverb.connect(pitch);
      pitch.connect(loopGain);
      loopGain.connect(freeverb);
      
      freeverb.connect(wetGain);
      wetGain.connect(outNode);
      
      (inNode as any)._verb = freeverb;
      (inNode as any)._pitch = pitch;
      (inNode as any)._loopGain = loopGain;
      (inNode as any)._wetGain = wetGain;
      
      return [inNode, outNode];
    },
    update: (nodes: any[], p: any) => {
      const inNode = nodes[0];
      inNode._pitch.pitch = p.interval;
      inNode._loopGain.gain.value = p.feedback / 100;
      inNode._wetGain.gain.value = p.mix / 100;
      inNode._verb.roomSize.value = p.size / 100;
    }
  },
  swirling_cacophony: {
    create: () => {
      const inNode = new Tone.Gain();
      const outNode = new Tone.Gain();
      
      const delay = new Tone.Delay(0.2);
      const pitch = new Tone.PitchShift({ pitch: -5, windowSize: 0.05 });
      const freqShift = new AnalyticFrequencyShifter({ shift: 50 });
      const loopGain = new Tone.Gain(0.7);
      const panner = new Tone.AutoPanner("4n").start();
      const wetGain = new Tone.Gain(0.5);
      
      inNode.connect(delay);
      delay.connect(pitch);
      pitch.connect(freqShift);
      freqShift.connect(loopGain);
      loopGain.connect(delay);
      
      delay.connect(panner);
      panner.connect(wetGain);
      wetGain.connect(outNode);
      
      (inNode as any)._freqShift = freqShift;
      (inNode as any)._loopGain = loopGain;
      (inNode as any)._wetGain = wetGain;
      (inNode as any)._panner = panner;
      
      return [inNode, outNode];
    },
    update: (nodes: any[], p: any) => {
      const inNode = nodes[0];
      inNode._freqShift.shift = (p.chaos / 100) * 100;
      inNode._loopGain.gain.value = Math.min(0.9, 0.4 + (p.chaos / 100) * 0.5);
      inNode._panner.frequency.value = (p.chaos / 100) * 5;
      inNode._wetGain.gain.value = p.mix / 100;
    }
  },

  // Frequency Shifters (Weird FX)
  spiraling_echo: {
    create: () => {
      const inNode = new Tone.Gain();
      const outNode = new Tone.Gain();
      const loopGain = new Tone.Gain(0.7);
      const delay = new Tone.Delay(0.3);
      const freqShift = new AnalyticFrequencyShifter({ shift: 20 });
      const wetGain = new Tone.Gain(0.5);
      
      inNode.connect(delay);
      delay.connect(freqShift);
      freqShift.connect(loopGain);
      loopGain.connect(delay);
      delay.connect(wetGain);
      wetGain.connect(outNode);
      
      (inNode as any)._delay = delay;
      (inNode as any)._freqShift = freqShift;
      (inNode as any)._loopGain = loopGain;
      (inNode as any)._wetGain = wetGain;
      
      return [inNode, outNode];
    },
    update: (nodes: any[], p: any) => {
      const inNode = nodes[0];
      inNode._freqShift.shift = p.shift;
      inNode._delay.delayTime.value = p.time / 100;
      inNode._loopGain.gain.value = p.feedback / 100;
      inNode._wetGain.gain.value = p.mix / 100;
    }
  },
  freq_chorus: {
    create: () => {
      const inNode = new Tone.Gain();
      const outNode = new Tone.Gain();
      const shiftUp = new AnalyticFrequencyShifter({ shift: 5 });
      const panL = new Tone.Panner(-1);
      const shiftDown = new AnalyticFrequencyShifter({ shift: -5 });
      const panR = new Tone.Panner(1);
      const wetGain = new Tone.Gain(0.5);
      
      inNode.connect(shiftUp);
      shiftUp.connect(panL);
      panL.connect(wetGain);
      
      inNode.connect(shiftDown);
      shiftDown.connect(panR);
      panR.connect(wetGain);
      
      wetGain.connect(outNode);
      
      (inNode as any)._shiftUp = shiftUp;
      (inNode as any)._shiftDown = shiftDown;
      (inNode as any)._wetGain = wetGain;
      return [inNode, outNode];
    },
    update: (nodes: any[], p: any) => {
      const inNode = nodes[0];
      inNode._shiftUp.shift = p.shiftAmount;
      inNode._shiftDown.shift = -p.shiftAmount;
      inNode._wetGain.gain.value = p.mix / 100;
    }
  },
  barber_phaser: {
    create: () => {
      const inNode = new Tone.Gain();
      const outNode = new Tone.Gain();
      const freqShift = new AnalyticFrequencyShifter({ shift: 10 });
      const delay = new Tone.Delay(0.01); // Prevent zero-delay feedback loop
      const loopGain = new Tone.Gain(0.6);
      const wetGain = new Tone.Gain(0.5);
      
      inNode.connect(freqShift);
      freqShift.connect(delay);
      delay.connect(loopGain);
      loopGain.connect(freqShift); // Feedback loop around shifter
      
      freqShift.connect(wetGain);
      wetGain.connect(outNode);
      
      (inNode as any)._freqShift = freqShift;
      (inNode as any)._loopGain = loopGain;
      (inNode as any)._wetGain = wetGain;
      
      return [inNode, outNode];
    },
    update: (nodes: any[], p: any) => {
      const inNode = nodes[0];
      inNode._freqShift.shift = p.rate;
      inNode._loopGain.gain.value = p.feedback / 100;
      inNode._wetGain.gain.value = p.mix / 100;
    }
  },
  thru_zero: {
    create: () => {
      const shifter = new AnalyticFrequencyShifter({ shift: -500 });
      return [shifter];
    },
    update: (nodes: any[], p: any) => {
      nodes[0].shift = p.shift;
      nodes[0].output.gain.value = p.mix / 100;
    }
  },
  
  // Advanced DSP FX
  wide_notch: {
    create: () => [new EnhancedWideNotchComb()],
    update: (nodes: any[], p: any) => {
      nodes[0].frequency = p.frequency;
      nodes[0].c = p.width / 100 * 0.1; // C range roughly 0 to 0.1
    }
  },
  dual_path_filter: {
    create: () => [new DualPathFilter()],
    update: (nodes: any[], p: any) => {
      nodes[0].type = p.highpass === 1 ? 'highpass' : 'lowpass';
    }
  },
  smart_zcr: {
    create: () => [new SmartZCRFilter()],
    update: (nodes: any[], p: any) => {
      nodes[0].baseCutoff = p.cutoff;
      nodes[0].sensitivity = p.sensitivity;
    }
  },
  farrow_delay: {
    create: () => [new FarrowFractionalDelay()],
    update: (nodes: any[], p: any) => {
      nodes[0].delayTime = p.delay / 1000;
      nodes[0].modulationRate = p.modRate;
      nodes[0].modulationDepth = p.modDepth / 1000;
      nodes[0].mix = p.mix / 100;
    }
  },
  hilbert_wah: {
    create: () => [new HilbertEnvelopeWah()],
    update: (nodes: any[], p: any) => {
      nodes[0].baseCutoff = p.cutoff;
      nodes[0].sensitivity = p.sens;
    }
  },
  ssb_modulator: {
    create: () => [new PhasingSSBModulator()],
    update: (nodes: any[], p: any) => {
      let f = p.freq;
      let m = p.mode === 0 ? "USB" : "LSB";
      if (f < 0) {
          f = Math.abs(f);
          m = m === "USB" ? "LSB" : "USB";
      }
      nodes[0].frequency = f;
      nodes[0].mode = m;
    }
  }
};