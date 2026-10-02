import { PianoRollNote } from '../components/PianoRoll';

export const exportRawMidi = (notes: PianoRollNote[], bpm: number = 120) => {
    const ppq = 96;
    const encodeVLQ = (num: number): number[] => {
        let v = num & 0x7F;
        let out = [v];
        while (num >>= 7) {
            v = (num & 0x7F) | 0x80;
            out.unshift(v);
        }
        return out;
    };

    const events: { tick: number; type: 'on' | 'off'; note: number }[] = [];
    notes.forEach(noteObj => {
        const ticks = Math.round(noteObj.startTime * (bpm / 60) * ppq);
        const offTick = ticks + Math.round(noteObj.duration * (bpm / 60) * ppq);
        events.push({ tick: ticks, type: 'on', note: noteObj.note });
        events.push({ tick: offTick, type: 'off', note: noteObj.note });
    });

    events.sort((a, b) => a.tick - b.tick);

    const header = [0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x00, ppq];
    
    let trackData: number[] = [];
    let lastTick = 0;
    events.forEach(event => {
        const delta = encodeVLQ(event.tick - lastTick);
        trackData.push(...delta);
        lastTick = event.tick;
        trackData.push(event.type === 'on' ? 0x90 : 0x80, event.note, 0x64);
    });
    trackData.push(0x00, 0xFF, 0x2F, 0x00);

    const len = trackData.length;
    const trackHeader = [0x4D, 0x54, 0x72, 0x6B, (len >>> 24) & 0xFF, (len >>> 16) & 0xFF, (len >>> 8) & 0xFF, len & 0xFF];
    
    return new Blob([new Uint8Array([...header, ...trackHeader, ...trackData])], { type: 'audio/midi' });
};
