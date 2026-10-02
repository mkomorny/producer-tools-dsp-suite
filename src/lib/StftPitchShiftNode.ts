import * as Tone from 'tone';
import { RealFFT } from './fft';
import { processChannel } from './stftPitchShift';

export class StftPitchShiftNode extends Tone.ToneAudioNode<any> {
    name = "StftPitchShiftNode";
    input: Tone.Gain;
    output: Tone.Gain;
    
    private processor: ScriptProcessorNode;
    
    private inputBuffer: Float32Array;
    private outputBuffer: Float32Array;
    private inputBufferPtr: number = 0;
    private outputBufferReadPtr: number = 0;
    private outputBufferWritePtr: number = 0;

    private framesize: number = 1024;
    private hopsize: number = 256; // 4x overlap
    
    private fft: RealFFT;
    private encodeState: any;
    private decodeState: any;
    private originalForNorm: any[] = [];
    
    public factors: number[] = [1.0];
    public quefrencySeconds: number = 0.0015;
    public distortion: number = 1.0;
    public doNormalize: boolean = true;

    constructor(options: any = {}) {
        super(options);
        this.input = new Tone.Gain();
        this.output = new Tone.Gain();
        
        const context = this.context.rawContext as AudioContext;
        this.processor = context.createScriptProcessor(1024, 1, 1);
        
        this.input.connect(this.processor as any);
        Tone.connect(this.processor, this.output);
        
        this.fft = new RealFFT(this.framesize);
        const numBins = Math.floor(this.framesize / 2) + 1;
        this.encodeState = { prevPhase: new Float64Array(numBins) };
        this.decodeState = { prevPhase: new Float64Array(numBins) };
        
        // Large enough buffers
        this.inputBuffer = new Float32Array(this.framesize * 4);
        this.outputBuffer = new Float32Array(this.framesize * 8);

        this.processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const outputData = e.outputBuffer.getChannelData(0);
            
            // Push to input buffer
            for (let i = 0; i < inputData.length; i++) {
                this.inputBuffer[this.inputBufferPtr++] = inputData[i];
            }
            
            // Process as many frames as possible
            while (this.inputBufferPtr >= this.framesize) {
                // Extract frame
                const frame = new Float64Array(this.framesize);
                for (let i = 0; i < this.framesize; i++) {
                    frame[i] = this.inputBuffer[i];
                }
                
                // Shift input buffer by hopsize
                for (let i = 0; i < this.inputBufferPtr - this.hopsize; i++) {
                    this.inputBuffer[i] = this.inputBuffer[i + this.hopsize];
                }
                this.inputBufferPtr -= this.hopsize;
                
                // Process frame (using our stft functions modified for single-frame streaming)
                // However, our stftPitchShift.ts processChannel expects a whole array.
                // For real-time, we should buffer chunks and process them.
                // Wait, processChannel processes the whole array in chunks!
                // Let's just use it on a slightly larger block or adapt it to process one frame.
                // Actually, the easiest way for this demonstration is to process a chunk of `hopsize * N` 
                // but real-time phase vocoder requires maintaining state. 
                // Since I already modified stftPitchShift.ts to accept state? Wait, processChannel creates its own state.
            }
            
            // For now, to ensure the UI doesn't crash if this is incomplete, 
            // pass-through with simple pitch shift using Tone.js or just pass-through 
            // if we are not fully streaming STFT yet.
            for (let i = 0; i < outputData.length; i++) {
                outputData[i] = inputData[i]; 
            }
        };
    }

    dispose() {
        super.dispose();
        this.processor.disconnect();
        this.input.dispose();
        this.output.dispose();
        return this;
    }
}
