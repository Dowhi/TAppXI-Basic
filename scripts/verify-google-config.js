// Script para verificar la configuración de Google APIs
// Uso: node scripts/verify-google-config.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env');

console.log('🔍 Verificando configuración de Google APIs...\n');

// Verificar si existe el archivo .env
if (!fs.existsSync(envPath)) {
    console.error('❌ ERROR: No se encontró el archivo .env');
    console.log('\n📝 Solución:');
    console.log('1. Crea un archivo .env en la raíz del proyecto');
    console.log('2. Añade estas líneas:');
    console.log('   VITE_GOOGLE_CLIENT_ID=tu_client_id_aqui');
    console.log('   VITE_GOOGLE_API_KEY=tu_api_key_aqui');
    console.log('\n📖 Consulta SOLUCION_BACKUP_GOOGLE.md para instrucciones detalladas.\n');
    process.exit(1);
}

console.log('✅ Archivo .env encontrado');

// Leer el archivo .env
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

// Buscar las variables necesarias
let hasClientId = false;
let hasApiKey = false;
let clientId = '';
let apiKey = '';

envLines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('VITE_GOOGLE_CLIENT_ID=')) {
        hasClientId = true;
        clientId = trimmedLine.split('=')[1] || '';
        if (!clientId || clientId.trim() === '') {
            console.error(`❌ ERROR en línea ${index + 1}: VITE_GOOGLE_CLIENT_ID está vacío`);
        } else if (clientId.includes('tu_client_id') || clientId.includes('aqui')) {
            console.error(`❌ ERROR en línea ${index + 1}: VITE_GOOGLE_CLIENT_ID contiene valores de ejemplo`);
            console.log('   Por favor, reemplaza con tu Client ID real de Google Cloud Console');
        } else {
            console.log(`✅ VITE_GOOGLE_CLIENT_ID encontrado: ${clientId.substring(0, 30)}...`);
        }
    }
    if (trimmedLine.startsWith('VITE_GOOGLE_API_KEY=')) {
        hasApiKey = true;
        apiKey = trimmedLine.split('=')[1] || '';
        if (!apiKey || apiKey.trim() === '') {
            console.error(`❌ ERROR en línea ${index + 1}: VITE_GOOGLE_API_KEY está vacío`);
        } else if (apiKey.includes('tu_api_key') || apiKey.includes('aqui')) {
            console.error(`❌ ERROR en línea ${index + 1}: VITE_GOOGLE_API_KEY contiene valores de ejemplo`);
            console.log('   Por favor, reemplaza con tu API Key real de Google Cloud Console');
        } else {
            console.log(`✅ VITE_GOOGLE_API_KEY encontrado: ${apiKey.substring(0, 20)}...`);
        }
    }
});

console.log('');

// Verificar que ambas variables estén presentes
if (!hasClientId) {
    console.error('❌ ERROR: VITE_GOOGLE_CLIENT_ID no encontrado en .env');
    console.log('   Añade esta línea a tu archivo .env:');
    console.log('   VITE_GOOGLE_CLIENT_ID=tu_client_id_aqui');
}

if (!hasApiKey) {
    console.error('❌ ERROR: VITE_GOOGLE_API_KEY no encontrado en .env');
    console.log('   Añade esta línea a tu archivo .env:');
    console.log('   VITE_GOOGLE_API_KEY=tu_api_key_aqui');
}

if (!hasClientId || !hasApiKey) {
    console.log('\n📖 Consulta SOLUCION_BACKUP_GOOGLE.md para instrucciones detalladas.\n');
    process.exit(1);
}

// Validar formato básico
let hasErrors = false;

// Client ID debe terminar en .apps.googleusercontent.com
if (hasClientId && clientId && !clientId.includes('.apps.googleusercontent.com')) {
    console.warn('⚠️  ADVERTENCIA: VITE_GOOGLE_CLIENT_ID no parece tener el formato correcto');
    console.log('   Debería terminar en: .apps.googleusercontent.com');
    console.log('   Verifica que sea un OAuth 2.0 Client ID de Google Cloud Console');
    hasErrors = true;
}

// API Key debe empezar con AIza
if (hasApiKey && apiKey && !apiKey.startsWith('AIza')) {
    console.warn('⚠️  ADVERTENCIA: VITE_GOOGLE_API_KEY no parece tener el formato correcto');
    console.log('   Debería empezar con: AIza');
    console.log('   Verifica que sea una API Key válida de Google Cloud Console');
    hasErrors = true;
}

console.log('\n✅ Configuración básica verificada');

if (hasErrors) {
    console.log('\n⚠️  Hay algunas advertencias. Verifica que las credenciales sean correctas.');
    console.log('📖 Consulta SOLUCION_BACKUP_GOOGLE.md para más ayuda.\n');
} else {
    console.log('\n✅ Todo parece estar configurado correctamente.');
    console.log('\n📝 Próximos pasos:');
    console.log('1. Asegúrate de haber habilitado Google Drive API y Google Sheets API en Google Cloud Console');
    console.log('2. Verifica que tu origen está autorizado en Google Cloud Console');
    console.log('3. Reinicia el servidor de desarrollo (npm run dev)');
    console.log('4. Prueba hacer un backup en la aplicación\n');
    console.log('📖 Consulta SOLUCION_BACKUP_GOOGLE.md para instrucciones detalladas.\n');
}






