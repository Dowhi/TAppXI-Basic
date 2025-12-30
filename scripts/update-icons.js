import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Using the latest uploaded image
const SOURCE_IMAGE = 'C:/Users/DOWHI/.gemini/antigravity/brain/861ed052-7b28-46ff-97aa-e8208d06ca7b/uploaded_image_1767122367010.jpg';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const TARGETS = [
    { name: 'icon-192.png', size: 192 },
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon.ico', size: 64 }, // Saving as PNG, browsers handle it fine
];

async function generateIcons() {
    try {
        if (!fs.existsSync(SOURCE_IMAGE)) {
            console.error(`❌ Source image not found at: ${SOURCE_IMAGE}`);
            process.exit(1);
        }

        console.log(`Loading source image from: ${SOURCE_IMAGE}`);
        const image = await loadImage(SOURCE_IMAGE);

        for (const target of TARGETS) {
            const canvas = createCanvas(target.size, target.size);
            const ctx = canvas.getContext('2d');

            // Draw resized image
            ctx.drawImage(image, 0, 0, target.size, target.size);

            const buffer = canvas.toBuffer('image/png');
            const targetPath = path.join(PUBLIC_DIR, target.name);

            fs.writeFileSync(targetPath, buffer);
            console.log(`✅ Generated ${target.name} (${target.size}x${target.size})`);
        }

        console.log('🎉 All icons updated successfully!');
    } catch (error) {
        console.error('❌ Error generating icons:', error);
        process.exit(1);
    }
}

generateIcons();
