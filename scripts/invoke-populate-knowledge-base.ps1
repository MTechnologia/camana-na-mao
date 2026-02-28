# Invoca populate-knowledge-base manualmente
# Uso: .\scripts\invoke-populate-knowledge-base.ps1 "SEU_ACCESS_TOKEN"
# O token deve ser de um usuário admin (obtido ao fazer login no app).
# O token deve ser do mesmo projeto que a função (vjzkzsczlbtrzewfdx).

param(
  [Parameter(Mandatory=$true)]
  [string]$AccessToken
)

# Projeto camara-na-mao - URL deve corresponder ao issuer do token
$SupabaseUrl = "https://vjzkzsczlbtrzewfdx.supabase.co"

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
