const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

(async () => {
  try {
    // png-to-ico is ESM-only, import it dynamically
    const pngToIcoModule = await import('png-to-ico');
    const pngToIco = pngToIcoModule.default || pngToIcoModule;

    const srcPath = path.join(__dirname, 'logo_for_Producer_Tools_app_202606152238.jpeg');
    const tmpPng = path.join(__dirname, 'build', 'tmp.png');
    const outIco = path.join(__dirname, 'build', 'icon.ico');

    // Ensure build directory exists
    await fs.promises.mkdir(path.join(__dirname, 'build'), { recursive: true });

    // Resize to 256x256 and output PNG
    await sharp(srcPath)
      .resize(256, 256, { fit: 'contain' })
      .png()
      .toFile(tmpPng);

    // Convert PNG to ICO
    const icoBuffer = await pngToIco([tmpPng]);
    await fs.promises.writeFile(outIco, icoBuffer);

    // Clean up temporary PNG
    await fs.promises.unlink(tmpPng);
    console.log('Icon generated at', outIco);
  } catch (err) {
    console.error('Error generating icon:', err);
    process.exit(1);
  }
})();
