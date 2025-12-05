# Remove unused imports to pass build
$replacements = @{
    'src/pages/ApiDocs/ApiDocs.tsx' = @('TextField,\s*', '')
    'src/pages/CheckoutCustomization/CheckoutCustomization.tsx' = @(',\s*Select,\s*MenuItem,\s*FormControl,\s*InputLabel', '')
    'src/pages/CheckoutPublico/CheckoutPublicoHubla.tsx' = @('RadioGroup,\s*', ''); @('Radio,\s*', ''); @('Divider,\s*', ''); @('InputLabel,\s*', ''); @('KeyboardArrowDown,\s*', '')
    'src/pages/Dashboard/components/RecentTransactions.tsx' = @('import React from ''react'';\n', '')
    'src/pages/Dashboard/components/StatCard.tsx' = @('import React from ''react'';\n', '')
    'src/pages/Finances/FinancesOld.tsx' = @(',\s*Container', '')
    'src/pages/Indique/Indique.tsx' = @(',\s*Paper', ''); @(',\s*Divider', '')
    'src/pages/Support/Support.tsx' = @(',\s*Card,\s*CardContent', ''); @(',\s*Divider', '')
    'src/pages/Login/Login.tsx' = @(',\s*AccountBalance as AccountBalanceIcon', '')
}

foreach ($file in $replacements.Keys) {
    $content = Get-Content $file -Raw
    $patterns = $replacements[$file]
    
    # Handle multiple replacements for same file
    for ($i = 0; $i -lt $patterns.Length; $i += 2) {
        $content = $content -replace $patterns[$i], $patterns[$i+1]
    }
    
    Set-Content -Path $file -Value $content -NoNewline
}

Write-Host "Unused imports removed!"

