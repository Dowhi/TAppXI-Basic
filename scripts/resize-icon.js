import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

const resizeImage = async (sourcePath, size, outputFilename) => {
    const image = await loadImage(sourcePath);
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Draw the image scaled to fit the canvas
    ctx.drawImage(image, 0, 0, size, size);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(publicDir, outputFilename), buffer);
    console.log(`✅ Generated ${outputFilename} (${size}x${size})`);
};

const main = async () => {
    const sourcePath = path.join(publicDir, 'app-icon-source.png');

    if (!fs.existsSync(sourcePath)) {
        console.error('❌ Source image not found:', sourcePath);
        process.exit(1);
    }

    await resizeImage(sourcePath, 192, 'pwa-192x192.png');
    await resizeImage(sourcePath, 512, 'pwa-512x512.png');
    await resizeImage(sourcePath, 180, 'apple-touch-icon.png');

    console.log('🎉 All icons generated successfully!');
};

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
