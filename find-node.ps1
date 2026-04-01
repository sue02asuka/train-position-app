$drives = @("C:\")
foreach ($drive in $drives) {
    $results = Get-ChildItem -Path $drive -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue -Depth 6 | Select-Object -First 5
    foreach ($r in $results) {
        Write-Host $r.FullName
    }
}
