// Script para generar iconos PWA básicos
// Uso: node scripts/generate-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear iconos SVG simples que se pueden convertir después
const createSVGIcon = (size) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#3b82f6"/>
  <rect x="${size * 0.25}" y="${size * 0.4}" width="${size * 0.5}" height="${size * 0.3}" fill="#ffffff" rx="${size * 0.05}"/>
  <rect x="${size * 0.3}" y="${size * 0.45}" width="${size * 0.4}" height="${size * 0.15}" fill="#e0e7ff" rx="${size * 0.02}"/>
  <circle cx="${size * 0.35}" cy="${size * 0.75}" r="${size * 0.08}" fill="#1e293b"/>
  <circle cx="${size * 0.65}" cy="${size * 0.75}" r="${size * 0.08}" fill="#1e293b"/>
  <text x="${size * 0.5}" y="${size * 0.85}" font-family="Arial, sans-serif" font-size="${size * 0.15}" font-weight="bold" fill="#ffffff" text-anchor="middle">XI</text>
</svg>`;
};

const publicDir = path.join(__dirname, '..', 'public');

// Crear directorio public si no existe
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generar iconos SVG (el usuario puede convertirlos a PNG después)
fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), createSVGIcon(192));
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), createSVGIcon(512));
fs.writeFileSync(path.join(publicDir, 'icon-180.svg'), createSVGIcon(180));

console.log('✅ Iconos SVG generados en public/');
console.log('📝 Nota: Para convertir a PNG, usa:');
console.log('   - public/generate-icons.html (en el navegador)');
console.log('   - O cualquier herramienta online de SVG a PNG');

