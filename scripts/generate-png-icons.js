
import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

const generateIcon = (size, filename) => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#3b82f6'; // Blue-500
    ctx.beginPath();
    // Rounded rect
    const radius = size * 0.15;
    ctx.roundRect(0, 0, size, size, radius);
    ctx.fill();

    // Car Body
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(size * 0.25, size * 0.4, size * 0.5, size * 0.3, size * 0.05);
    ctx.fill();

    // Window
    ctx.fillStyle = '#e0e7ff'; // Indigo-100
    ctx.beginPath();
    ctx.roundRect(size * 0.3, size * 0.45, size * 0.4, size * 0.15, size * 0.02);
    ctx.fill();

    // Wheels
    ctx.fillStyle = '#1e293b'; // Slate-800
    ctx.beginPath();
    ctx.arc(size * 0.35, size * 0.75, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(size * 0.65, size * 0.75, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Text "XI"
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.15}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('XI', size * 0.5, size * 0.85);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(publicDir, filename), buffer);
    console.log(`Generated ${filename}`);
};

// Ensure public dir exists
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

generateIcon(192, 'pwa-192x192.png');
generateIcon(512, 'pwa-512x512.png');
