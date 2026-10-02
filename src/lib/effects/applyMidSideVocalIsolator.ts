// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface MidSideVocalIsolatorOptions {
    midLevel: number;
    sideLevel: number;
}

export async function applyMidSideVocalIsolator(buffer: AudioBuffer, options: MidSideVocalIsolatorOptions, ctx: BaseAudioContext): Promise<AudioBuffer> {
    if (buffer.numberOfChannels !== 2) {
        throw new Error("Mid/Side processing requires a stereo source file.");
    }
    const outBuffer = ctx.createBuffer(2, buffer.length, buffer.sampleRate);
    const inL = buffer.getChannelData(0);
    const inR = buffer.getChannelData(1);
    const outL = outBuffer.getChannelData(0);
    const outR = outBuffer.getChannelData(1);
    
    const mL = options.midLevel;
    const sL = options.sideLevel;
    
    for (let i = 0; i < buffer.length; i++) {
        const mid = (inL[i] + inR[i]) * 0.5 * mL;
        const side = (inL[i] - inR[i]) * 0.5 * sL;
        
        outL[i] = mid + side;
        outR[i] = mid - side;
    }
    return outBuffer;
}
