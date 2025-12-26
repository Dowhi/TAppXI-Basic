import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const sourceImage = path.join(publicDir, 'app-icon-source.png');

async function generateIcons() {
    try {
        console.log('🔄 Loading source image:', sourceImage);
        const image = await loadImage(sourceImage);
        const { width, height } = image;
        console.log(`📏 Source dimensions: ${width}x${height}`);

        // Center crop calculation
        let sWidth, sHeight, sx, sy;
        if (width > height) {
            sHeight = height;
            sWidth = height;
            sx = (width - height) / 2;
            sy = 0;
        } else {
            sWidth = width;
            sHeight = width;
            sx = 0;
            sy = (height - width) / 2;
        }

        const sizes = [
            { name: 'pwa-192x192.png', size: 192 },
            { name: 'pwa-512x512.png', size: 512 },
            { name: 'apple-touch-icon.png', size: 180 },
            { name: 'favicon.ico', size: 64 }, // Saving PNG content to .ico is widely supported
            { name: 'icon-192.png', size: 192 }, // Fallbacks
            { name: 'icon-512.png', size: 512 }
        ];

        for (const { name, size } of sizes) {
            const canvas = createCanvas(size, size);
            const ctx = canvas.getContext('2d');

            // Draw white background (optional, but good for transparency safety)
            // ctx.fillStyle = '#ffffff';
            // ctx.fillRect(0, 0, size, size);

            // Draw cropped image
            ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, size, size);

            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(path.join(publicDir, name), buffer);
            console.log(`✅ Generated ${name} (${size}x${size})`);
        }

        console.log('🎉 All icons updated successfully!');

    } catch (err) {
        console.error('❌ Error generating icons:', err);
        process.exit(1);
    }
}

generateIcons();
