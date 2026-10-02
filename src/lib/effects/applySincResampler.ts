// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface OfflineSincResamplerOptions {
    targetSampleRate: number; // 0=44.1, 1=48, 2=96
    windowSize: number;
}

export async function applySincResampler(buffer: AudioBuffer, options: OfflineSincResamplerOptions, ctx: BaseAudioContext): Promise<AudioBuffer> {
    const rateMap = [44100, 48000, 96000];
    const f_out = rateMap[options.targetSampleRate || 0] || 44100;
    const f_in = buffer.sampleRate;
    const R = f_out / f_in;
    const K = options.windowSize || 32;
    
    const outLength = Math.floor(buffer.length * R);
    const outBuffer = ctx.createBuffer(buffer.numberOfChannels, outLength, f_out);
    
    const sinc = (t: number) => {
        if (t === 0) return 1;
        return Math.sin(Math.PI * t) / (Math.PI * t);
    };
    
    const hanning = (n: number, K: number) => {
        return 0.5 * (1 + Math.cos(Math.PI * n / K));
    };

    for (let c = 0; c < buffer.numberOfChannels; c++) {
        const inData = buffer.getChannelData(c);
        const outData = outBuffer.getChannelData(c);
        
        for (let m = 0; m < outLength; m++) {
            const p_source = m / R;
            const p_floor = Math.floor(p_source);
            const p_frac = p_source - p_floor;
            
            let sum = 0;
            for (let n = -K; n <= K; n++) {
                const idx = p_floor - n;
                if (idx >= 0 && idx < buffer.length) {
                    const h = sinc(p_frac + n) * hanning(n, K);
                    sum += inData[idx] * h;
                }
            }
            outData[m] = sum;
        }
    }
    return outBuffer;
}
