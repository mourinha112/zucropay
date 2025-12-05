# Fix MUI v7 Grid issues by removing 'item' prop
$files = Get-ChildItem -Path "src/pages" -Filter "*tsx" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    # Remove 'item' prop from Grid components
    $content = $content -replace '(\<Grid\s+)item(\s+)', '$1$2'
    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "Grid 'item' prop removed from all files!"

