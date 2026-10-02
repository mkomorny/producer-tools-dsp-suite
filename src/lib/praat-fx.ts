import createPraatWasm from 'praat-wasm';

export async function applyPraatVocalWarp(
  arrayBuffer: ArrayBuffer,
  pitchShiftSemitones: number,
  formantRatio: number,
  timeStretchRatio: number
): Promise<ArrayBuffer> {
  const praat = await createPraatWasm();
  
  // Load the audio from ArrayBuffer
  const snd = await praat.readAudio(arrayBuffer);
  
  const pitchRatio = Math.pow(2, pitchShiftSemitones / 12);
  
  // Praat's "Change gender" allows formant, pitch, and duration modification.
  // Signature: Change gender: pitchFloor, pitchCeiling, formantRatio, pitchRatio, pitchRangeRatio, durationFactor
  const modifiedSnd: any = await praat.call(
    snd as any, 
    'Change gender', 
    75, 
    600, 
    formantRatio, 
    pitchRatio, 
    1.0, 
    timeStretchRatio
  );
  
  // We need to write the file back. We can write to a virtual file, then read it.
  const tempWavName = 'temp_output.wav';
  await modifiedSnd.saveAsWav(tempWavName);
  
  // Read back the virtual file as Uint8Array
  const outData = praat.FS.readFile(tempWavName);
  
  // Cleanup
  praat.FS.unlink(tempWavName);
  (snd as any).remove();
  modifiedSnd.remove();
  
  return outData.buffer;
}

