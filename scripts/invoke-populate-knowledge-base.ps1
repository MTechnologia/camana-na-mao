# Invoca populate-knowledge-base manualmente
# Uso 1 (service_role - recomendado): .\scripts\invoke-populate-knowledge-base.ps1 -UseServiceRole
# Uso 2 (JWT de usuário admin): .\scripts\invoke-populate-knowledge-base.ps1 -AccessToken "eyJ..."

param(
  [Parameter(ParameterSetName="ServiceRole")]
  [switch]$UseServiceRole,
  [Parameter(ParameterSetName="UserToken")]
  [string]$AccessToken
)

$SupabaseUrl = "https://vjzkzsczlbtmrzewffdx.supabase.co"

# Se -UseServiceRole: carrega SUPABASE_SERVICE_ROLE_KEY do .env
if ($UseServiceRole) {
  $envPath = Join-Path $PSScriptRoot "..\.env"
  if (-not (Test-Path $envPath)) {
    Write-Host "Erro: .env nao encontrado em $envPath" -ForegroundColor Red
    exit 1
  }
  $lines = Get-Content $envPath
  $AccessToken = $null
  foreach ($line in $lines) {
    if ($line -match '^\s*SUPABASE_SERVICE_ROLE_KEY\s*=') {
      $AccessToken = ($line -split '=', 2)[1].Trim().Trim('"').Trim("'")
      break
    }
  }
  if ($AccessToken) {
    Write-Host "Usando SUPABASE_SERVICE_ROLE_KEY do .env" -ForegroundColor Cyan
  }
  if (-not $AccessToken) {
    Write-Host "Erro: SUPABASE_SERVICE_ROLE_KEY nao encontrado no .env" -ForegroundColor Red
    exit 1
  }
} elseif (-not $AccessToken) {
  Write-Host "Especifique -UseServiceRole ou -AccessToken" -ForegroundColor Red
  exit 1
}

$Uri = "$SupabaseUrl/functions/v1/populate-knowledge-base"
$Headers = @{
  "Authorization" = "Bearer $AccessToken"
  "Content-Type"  = "application/json"
}

Write-Host "Chamando $Uri ..." -ForegroundColor Cyan
try {
  $result = Invoke-RestMethod -Uri $Uri -Method POST -Headers $Headers -Body "{}"
  Write-Host "Sucesso:" -ForegroundColor Green
  $result | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $responseBody = $reader.ReadToEnd()
    Write-Host $responseBody -ForegroundColor Yellow
  }
  exit 1
}
