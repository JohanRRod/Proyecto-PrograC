# Arranca el backend en local cargando las variables desde el .env de la raíz del repo.
# Uso (desde la raíz del repo):
#   powershell -ExecutionPolicy Bypass -File infra\dev-backend.ps1
# Con los endpoints /api/dev/** habilitados:
#   powershell -ExecutionPolicy Bypass -File infra\dev-backend.ps1 -Dev

param([switch]$Dev)

$raiz = Split-Path -Parent $PSScriptRoot
$archivoEnv = Join-Path $raiz '.env'

if (-not (Test-Path $archivoEnv)) {
    Write-Host "No existe $archivoEnv. Copia .env.example a .env y completa los valores." -ForegroundColor Red
    exit 1
}

foreach ($linea in Get-Content $archivoEnv) {
    $l = $linea.Trim()
    if ($l -eq '' -or $l.StartsWith('#')) { continue }
    $i = $l.IndexOf('=')
    if ($i -lt 1) { continue }
    # Se corta en el PRIMER '=' porque la URL JDBC lleva '=' en sus parámetros.
    $nombre = $l.Substring(0, $i).Trim()
    $valor = $l.Substring($i + 1).Trim().Trim('"')
    Set-Item -Path "Env:$nombre" -Value $valor
}

$faltan = @('DB_URL', 'DB_USER', 'DB_PASSWORD', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ADMIN_KEY') |
    Where-Object { -not (Get-Item -Path "Env:$_" -ErrorAction SilentlyContinue).Value }
if ($faltan) {
    Write-Host "Faltan variables en .env: $($faltan -join ', ')" -ForegroundColor Red
    exit 1
}

$pom = Join-Path $raiz 'backend\api\pom.xml'
if ($Dev) {
    mvn -f $pom spring-boot:run "-Dspring-boot.run.profiles=dev"
} else {
    mvn -f $pom spring-boot:run
}
