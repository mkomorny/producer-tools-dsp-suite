export class RealFFT {
  size: number;
  cosTable: Float64Array;
  sinTable: Float64Array;
  reverseTable: Uint32Array;

  constructor(size: number) {
    this.size = size;
    this.cosTable = new Float64Array(size / 2);
    this.sinTable = new Float64Array(size / 2);
    this.reverseTable = new Uint32Array(size);

    for (let i = 0; i < size / 2; i++) {
      this.cosTable[i] = Math.cos(-2 * Math.PI * i / size);
      this.sinTable[i] = Math.sin(-2 * Math.PI * i / size);
    }

    let limit = 1;
    let bit = size >> 1;
    while (limit < size) {
      for (let i = 0; i < limit; i++) {
        this.reverseTable[i + limit] = this.reverseTable[i] + bit;
      }
      limit = limit << 1;
      bit = bit >> 1;
    }
  }

  forward(realInput: Float64Array | Float32Array) {
    const size = this.size;
    const real = new Float64Array(size);
    const imag = new Float64Array(size);

    for (let i = 0; i < size; i++) {
      real[i] = realInput[this.reverseTable[i]];
    }

    let halfSize = 1;
    while (halfSize < size) {
      const step = size / (halfSize * 2);
      for (let i = 0; i < size; i += halfSize * 2) {
        for (let j = i, k = 0; j < i + halfSize; j++, k += step) {
          const tReal = real[j + halfSize] * this.cosTable[k] - imag[j + halfSize] * this.sinTable[k];
          const tImag = real[j + halfSize] * this.sinTable[k] + imag[j + halfSize] * this.cosTable[k];
          real[j + halfSize] = real[j] - tReal;
          imag[j + halfSize] = imag[j] - tImag;
          real[j] += tReal;
          imag[j] += tImag;
        }
      }
      halfSize *= 2;
    }

    return {
      real: real.slice(0, size / 2 + 1),
      imag: imag.slice(0, size / 2 + 1)
    };
  }

  inverse(realPart: Float64Array, imagPart: Float64Array) {
    const size = this.size;
    const real = new Float64Array(size);
    const imag = new Float64Array(size);

    for (let i = 0; i < size / 2 + 1; i++) {
      real[i] = realPart[i];
      imag[i] = imagPart[i];
    }
    for (let i = 1; i < size / 2; i++) {
      real[size - i] = real[i];
      imag[size - i] = -imag[i];
    }

    const outReal = new Float64Array(size);
    const outImag = new Float64Array(size);

    for (let i = 0; i < size; i++) {
      outReal[i] = real[this.reverseTable[i]];
      outImag[i] = imag[this.reverseTable[i]];
    }

    let halfSize = 1;
    while (halfSize < size) {
      const step = size / (halfSize * 2);
      for (let i = 0; i < size; i += halfSize * 2) {
        for (let j = i, k = 0; j < i + halfSize; j++, k += step) {
          const cos = this.cosTable[k];
          const sin = -this.sinTable[k]; 
          const tReal = outReal[j + halfSize] * cos - outImag[j + halfSize] * sin;
          const tImag = outReal[j + halfSize] * sin + outImag[j + halfSize] * cos;
          outReal[j + halfSize] = outReal[j] - tReal;
          outImag[j + halfSize] = outImag[j] - tImag;
          outReal[j] += tReal;
          outImag[j] += tImag;
        }
      }
      halfSize *= 2;
    }

    for (let i = 0; i < size; i++) {
      outReal[i] /= size;
    }

    return outReal;
  }
}
