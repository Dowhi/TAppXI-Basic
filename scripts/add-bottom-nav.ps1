# Script to add BottomNavBar to all screen files
# This script adds the import and component to each screen file

$screensDir = "c:\Users\DOWHI\Downloads\tappxi-web-replica\screens"
$screens = @(
    "AddEditRaceScreen.tsx",
    "AjustesScreen.tsx",
    "AnalisisAvanzadoScreen.tsx",
    "BreakConfigurationScreen.tsx",
    "CalendarScreen.tsx",
    "CloseTurnScreen.tsx",
    "EditTurnScreen.tsx",
    "HistoricoScreen.tsx",
    "HomeScreen.tsx",
    "ReportsScreen.tsx",
    "ResumenDiarioScreen.tsx",
    "ResumenGastosMensualScreen.tsx",
    "ResumenMensualDetalladoScreen.tsx",
    "ResumenMensualIngresosScreen.tsx",
    "ResumenMensualScreen.tsx",
    "ResumenScreen.tsx",
    "StatisticsScreen.tsx"
)

foreach ($screen in $screens) {
    $filePath = Join-Path $screensDir $screen
    
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        
        # Check if BottomNavBar is already imported
        if ($content -notmatch "import BottomNavBar") {
            Write-Host "Processing $screen..."
            
            # Add import after other imports (look for last import statement)
            $content = $content -replace "(import.*from.*;\r?\n)((?!import))", "`$1import BottomNavBar from '../components/BottomNavBar';`r`n`$2"
            
            # Add component before closing div and export
            # Look for pattern: </div>\n);\n};\n\nexport default
            $content = $content -replace "(\s+</div>\r?\n\s+\);\r?\n};\r?\n\r?\nexport default)", "`r`n`r`n            <BottomNavBar navigateTo={navigateTo} />`$1"
            
            Set-Content -Path $filePath -Value $content -NoNewline
            Write-Host "✓ Updated $screen"
        } else {
            Write-Host "○ $screen already has BottomNavBar"
        }
    }
}

Write-Host "`nDone! Updated screens with BottomNavBar component."
