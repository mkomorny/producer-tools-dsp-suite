// Imported dependencies
import * as Tone from 'tone';
import { RealFFT } from '../fft';

export interface MultiBandCompressorOptions {
  crossover1Hz: number;
  crossover2Hz: number;
  thresholdDb: number;
  ratio: number;
  attackMs: number;
  releaseMs: number;
  makeupGainDb: number;
  outputFormat?: 'MP3' | 'AAC' | 'M4A' | 'OGG' | 'Opus' | 'FLAC' | 'WAV';
}

function createLR4Filter(fc: number, sampleRate: number, type: 'lp' | 'hp') {
    const wc = 2 * Math.PI * fc;
    const kappa = Math.tan(wc / (2 * sampleRate));
    const delta = kappa * kappa + 2 * kappa + 1;
    
    let b0, b1, b2;
    if (type === 'lp') {
        b0 = (kappa * kappa) / delta;
        b1 = (2 * kappa * kappa) / delta;
        b2 = (kappa * kappa) / delta;
    } else {
        b0 = 1 / delta;
        b1 = -2 / delta;
        b2 = 1 / delta;
    }
    
    const a1 = (2 * (kappa * kappa - 1)) / delta;
    const a2 = (kappa * kappa - 2 * kappa + 1) / delta;
    
    return {
        b0, b1, b2, a1, a2,
        s1: 0, s2: 0,
        process: function(x: number) {
            const y = this.b0 * x + this.s1;
            this.s1 = this.b1 * x - this.a1 * y + this.s2;
            this.s2 = this.b2 * x - this.a2 * y;
            return y;
        }
    };
}

export function applyMultiBandCompressor(buffer: AudioBuffer, options: MultiBandCompressorOptions, audioCtx: BaseAudioContext): AudioBuffer {
    let cross1 = Math.max(40, Math.min(1000, options.crossover1Hz));
    let cross2 = Math.max(1001, Math.min(16000, options.crossover2Hz));
    if (cross1 >= cross2) {
        const t = cross1;
        cross1 = cross2;
        cross2 = t;
    }
    
    const thresholdDb = Math.max(-60.0, Math.min(0.0, options.thresholdDb));
    const ratio = Math.max(1.0, Math.min(20.0, options.ratio));
    const attackMs = Math.max(0.1, Math.min(100.0, options.attackMs));
    const releaseMs = Math.max(10.0, Math.min(1000.0, options.releaseMs));
    const makeupGainDb = Math.max(0.0, Math.min(24.0, options.makeupGainDb));
    
    const sampleRate = buffer.sampleRate;
    const alpha_att = Math.exp(-1.0 / ((attackMs / 1000) * sampleRate));
    const alpha_rel = Math.exp(-1.0 / ((releaseMs / 1000) * sampleRate));
    
    const g_makeup = Math.pow(10, makeupGainDb / 20);
    
    const newBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
    
    for (let c = 0; c < buffer.numberOfChannels; c++) {
        const inData = buffer.getChannelData(c);
        const outData = newBuffer.getChannelData(c);
        
        const lp1_1 = createLR4Filter(cross1, sampleRate, 'lp');
        const lp1_2 = createLR4Filter(cross1, sampleRate, 'lp');
        const hp1_1 = createLR4Filter(cross1, sampleRate, 'hp');
        const hp1_2 = createLR4Filter(cross1, sampleRate, 'hp');
        
        const lp2_1 = createLR4Filter(cross2, sampleRate, 'lp');
        const lp2_2 = createLR4Filter(cross2, sampleRate, 'lp');
        const hp2_1 = createLR4Filter(cross2, sampleRate, 'hp');
        const hp2_2 = createLR4Filter(cross2, sampleRate, 'hp');
        
        let g_env_low = 0;
        let g_env_mid = 0;
        let g_env_high = 0;
        
        let v_rms_low = 0;
        let v_rms_mid = 0;
        let v_rms_high = 0;
        const alpha_rms = Math.exp(-1.0 / (0.01 * sampleRate));
        
        for (let n = 0; n < inData.length; n++) {
            const x = inData[n];
            
            const x_low = lp1_2.process(lp1_1.process(x));
            const x_highpass1 = hp1_2.process(hp1_1.process(x));
            
            const x_mid = lp2_2.process(lp2_1.process(x_highpass1));
            const x_high = hp2_2.process(hp2_1.process(x_highpass1));
            
            v_rms_low = (1 - alpha_rms) * (x_low * x_low) + alpha_rms * v_rms_low;
            v_rms_mid = (1 - alpha_rms) * (x_mid * x_mid) + alpha_rms * v_rms_mid;
            v_rms_high = (1 - alpha_rms) * (x_high * x_high) + alpha_rms * v_rms_high;
            
            const db_low = 10 * Math.log10(Math.max(1e-7, v_rms_low));
            const db_mid = 10 * Math.log10(Math.max(1e-7, v_rms_mid));
            const db_high = 10 * Math.log10(Math.max(1e-7, v_rms_high));
            
            const gt_low = db_low > thresholdDb ? (thresholdDb - db_low) * (1 - 1/ratio) : 0;
            const gt_mid = db_mid > thresholdDb ? (thresholdDb - db_mid) * (1 - 1/ratio) : 0;
            const gt_high = db_high > thresholdDb ? (thresholdDb - db_high) * (1 - 1/ratio) : 0;
            
            g_env_low = (gt_low < g_env_low ? alpha_att : alpha_rel) * g_env_low + (1 - (gt_low < g_env_low ? alpha_att : alpha_rel)) * gt_low;
            g_env_mid = (gt_mid < g_env_mid ? alpha_att : alpha_rel) * g_env_mid + (1 - (gt_mid < g_env_mid ? alpha_att : alpha_rel)) * gt_mid;
            g_env_high = (gt_high < g_env_high ? alpha_att : alpha_rel) * g_env_high + (1 - (gt_high < g_env_high ? alpha_att : alpha_rel)) * gt_high;
            
            const y_low = x_low * Math.pow(10, g_env_low / 20);
            const y_mid = x_mid * Math.pow(10, g_env_mid / 20);
            const y_high = x_high * Math.pow(10, g_env_high / 20);
            
            outData[n] = (y_low + y_mid + y_high) * g_makeup;
        }
    }
    return newBuffer;
}
