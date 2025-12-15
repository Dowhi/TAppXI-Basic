# Script para iniciar el servidor proxy de vuelos
# Ejecuta este script para iniciar el servidor que obtiene datos reales de AENA

Write-Host "✈️ Iniciando servidor proxy de vuelos..." -ForegroundColor Cyan
Write-Host ""

# Verificar que Node.js esté instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js no está instalado o no está en el PATH" -ForegroundColor Red
    exit 1
}

# Verificar que Puppeteer esté instalado
try {
    $puppeteer = npm list puppeteer 2>&1
    if ($puppeteer -match "puppeteer@") {
        Write-Host "✅ Puppeteer encontrado" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Puppeteer no encontrado. Instalando..." -ForegroundColor Yellow
        npm install puppeteer
    }
} catch {
    Write-Host "⚠️ No se pudo verificar Puppeteer" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Iniciando servidor en puerto 3002..." -ForegroundColor Cyan
Write-Host "📡 Endpoint: http://localhost:3002/airport/SVQ" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️ IMPORTANTE:" -ForegroundColor Yellow
Write-Host "  - El servidor intentará obtener datos reales de AENA" -ForegroundColor Yellow
Write-Host "  - Si no extrae datos, revisa los logs abajo para ver qué está pasando" -ForegroundColor Yellow
Write-Host "  - AENA puede tener protecciones anti-bot que bloqueen el scraping" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Gray
Write-Host ""

# Iniciar el servidor
node scripts/flight-proxy-server-simple.js















