# Fix Grid imports to use Box instead
$files = Get-ChildItem -Path "src/pages" -Filter "*.tsx" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Remove Grid from imports
    $content = $content -replace ',\s*Grid,', ','
    $content = $content -replace 'Grid,\s*', ''
    $content = $content -replace ',\s*Grid\s*}', ' }'
    
    # Replace Grid with Box
    $content = $content -replace '<Grid\s+container', '<Box sx={{ display: "flex", flexWrap: "wrap" }}'
    $content = $content -replace '<Grid\s+xs=\{(\d+)\}\s+md=\{(\d+)\}>', '<Box sx={{ width: { xs: "100%", md: "calc(100% * $2 / 12)" }, p: 1 }}>'
    $content = $content -replace '<Grid\s+xs=\{(\d+)\}\s+sm=\{(\d+)\}\s+md=\{(\d+)\}>', '<Box sx={{ width: { xs: "100%", sm: "calc(100% * $2 / 12)", md: "calc(100% * $3 / 12)" }, p: 1 }}>'
    $content = $content -replace '</Grid>', '</Box>'
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "Grid converted to Box in all files!"

