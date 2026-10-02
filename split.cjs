const fs = require('fs');
const path = require('path');

const srcFile = path.join(__dirname, 'src/lib/effects.ts');
const outDir = path.join(__dirname, 'src/lib/effects');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const content = fs.readFileSync(srcFile, 'utf8');

// Find where offline functions start
const marker = '// ==========================================';
const splitIndex = content.indexOf('// OFFLINE KNOWLEDGE DSP FUNCTIONS');

if (splitIndex === -1) {
    console.error("Marker not found!");
    process.exit(1);
}

// Find the start of the comment block above it
const markerStart = content.lastIndexOf('// ==========================================', splitIndex);
const coreContent = content.substring(0, markerStart).trim();
const dspContent = content.substring(markerStart);

fs.writeFileSync(path.join(__dirname, 'src/lib/effects-core.ts'), coreContent);

// Parse functions (both apply*, async functions, etc.)
const funcRegex = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g;

let funcStarts = [];
let match;
while ((match = funcRegex.exec(dspContent)) !== null) {
  funcStarts.push({ name: match[1], index: match.index });
}

function findFunctionEnd(text, startIndex) {
  let braceCount = 0;
  let started = false;
  for (let i = startIndex; i < text.length; i++) {
    if (text[i] === '{') {
      braceCount++;
      started = true;
    } else if (text[i] === '}') {
      braceCount--;
    }
    if (started && braceCount === 0) {
      return i + 1;
    }
  }
  return text.length;
}

// Calculate exact start and end for each function's chunk
let chunks = [];
for (let i = 0; i < funcStarts.length; i++) {
  const current = funcStarts[i];
  const chunkStart = i === 0 ? 0 : chunks[i - 1].end;
  const funcEndIndex = findFunctionEnd(dspContent, current.index);
  
  chunks.push({
    name: current.name,
    start: chunkStart,
    end: funcEndIndex
  });
}

// Ensure the last chunk goes to the end of the file
if (chunks.length > 0) {
  chunks[chunks.length - 1].end = dspContent.length;
}

let indexExports = [];

for (const chunk of chunks) {
  let chunkText = dspContent.substring(chunk.start, chunk.end).trim();
  
  // Write to file
  const fileName = chunk.name + '.ts';
  const fileContent = `// Imported dependencies\nimport * as Tone from 'tone';\nimport { RealFFT } from '../fft';\n\n${chunkText}\n`;
  
  fs.writeFileSync(path.join(outDir, fileName), fileContent);
  indexExports.push(`export * from './${chunk.name}';`);
}

fs.writeFileSync(path.join(outDir, 'index.ts'), indexExports.join('\n') + '\n');

// Finally, update effects.ts to be a barrel file
const newEffectsContent = `export * from './effects-core';\nexport * from './effects/index';\n`;
fs.writeFileSync(srcFile, newEffectsContent);

console.log(`Successfully split into ${chunks.length} files with exact brace matching and async support.`);
