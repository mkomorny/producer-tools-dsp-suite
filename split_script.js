const fs = require('fs');
const path = require('path');

const srcFile = path.join(__dirname, 'src/lib/effects.ts');
const outDir = path.join(__dirname, 'src/lib/effects');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const content = fs.readFileSync(srcFile, 'utf8');

// The file has some imports and classes at the top, and then an array of DEFAULT_EFFECTS, and EFFECT_CONFIG, and then the actual functions.
// Let's find all function definitions: `export function applyX(`
const functionRegex = /export\s+function\s+(apply[A-Za-z0-9_]+)\s*\(/g;

let matches = [];
let match;
while ((match = functionRegex.exec(content)) !== null) {
  matches.push({
    name: match[1],
    startIndex: match.index,
  });
}

// Add a dummy match at the end
matches.push({ name: 'END', startIndex: content.length });

let importsAndConfig = content.substring(0, matches[0].startIndex);
let indexExports = [];

for (let i = 0; i < matches.length - 1; i++) {
  const current = matches[i];
  const next = matches[i + 1];
  
  let funcContent = content.substring(current.startIndex, next.startIndex);
  
  // We need to add the necessary imports to each file.
  // The functions use types like AudioBuffer, BaseAudioContext, Tone, RealFFT, etc.
  // Many use the specific options interfaces that are defined in the importsAndConfig part,
  // but those interfaces are not exported! Oh wait, they might be exported. Let's check.
  
  const funcFile = path.join(outDir, `${current.name}.ts`);
  
  // We will just leave all the functions in one file but group them? 
  // Wait, if the interfaces are not exported, they can't be imported by the split files.
  // It's safer to split the functions and extract their interfaces, OR keep the interfaces in types.ts.
}

console.log("Found " + (matches.length - 1) + " functions.");
