param(
    [ValidateSet('Api','Frontend')][Parameter(Mandatory=$true)][string]$Component,
    [ValidateSet('LocalLab','Shared')][string]$DataTarget='LocalLab'
)
$ErrorActionPreference='Stop'
$backendRoot=Split-Path $PSScriptRoot -Parent
$repoRoot=Split-Path $backendRoot -Parent
Write-Output ('NexusOMS demo target: '+$DataTarget)
if($Component -eq 'Api'){
    $env:ASPNETCORE_ENVIRONMENT='Development'
    $env:Frontend__Origin='http://localhost:5175'
    if($DataTarget -eq 'LocalLab'){
        $env:ConnectionStrings__Postgres='Host=127.0.0.1;Port=25439;Database=nexus_lab;Username=postgres;Password=nexus-lab-only'
    }else{
        Remove-Item Env:ConnectionStrings__Postgres -ErrorAction SilentlyContinue
    }
    Set-Location -LiteralPath $backendRoot
    dotnet run --project src/NexusOMS.Api/NexusOMS.Api.csproj --no-launch-profile -- --urls http://localhost:5156
}else{
    $env:VITE_DATA_MODE='supabase'
    $env:VITE_API_BASE_URL='http://localhost:5156'
    Set-Location -LiteralPath (Join-Path $repoRoot 'frontend')
    npm run dev -- --host localhost --port 5175 --strictPort
}
