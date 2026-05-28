# Script para acessar logs do sistema Câmara na Mão
# Uso: .\scripts\get-logs.ps1 [tipo] [opções]

param(
    [Parameter(Position=0)]
    [ValidateSet("supabase", "cloudrun", "vllm", "automacao", "audit", "all")]
    [string]$Tipo = "all",
    
    [Parameter()]
    [int]$Limit = 50,
    
    [Parameter()]
    [switch]$Follow,
    
    [Parameter()]
    [switch]$Errors,
    
    [Parameter()]
    [string]$Grep = ""
)

$ErrorActionPreference = "Continue"

function Show-Help {
    Write-Host @"
Uso: .\scripts\get-logs.ps1 [tipo] [opções]

Tipos:
  supabase  - Logs do Supabase Edge Functions (ai-orchestrator)
  cloudrun  - Logs do GCP Cloud Run (frontend)
  vllm      - Logs do vLLM (VM GCP)
  automacao       - Logs do automacao (Cloud Run)
  audit     - Logs de auditoria (SQL)
  all       - Todos os logs (padrão)

Opções:
  -Limit <número>  - Limitar número de linhas (padrão: 50)
  -Follow          - Seguir logs em tempo real
  -Errors          - Mostrar apenas erros
  -Grep <texto>    - Filtrar por texto

Exemplos:
  .\scripts\get-logs.ps1 supabase -Limit 100
  .\scripts\get-logs.ps1 cloudrun -Follow
  .\scripts\get-logs.ps1 vllm -Errors
  .\scripts\get-logs.ps1 supabase -Grep "Fatal error"
"@
}

function Get-SupabaseLogs {
    param([int]$Limit, [switch]$Follow, [switch]$Errors, [string]$Grep)
    
    Write-Host "`n📋 Logs do Supabase Edge Functions (ai-orchestrator)`n" -ForegroundColor Cyan
    
    $cmd = "supabase functions logs ai-orchestrator"
    
    if ($Limit) {
        $cmd += " --limit $Limit"
    }
    
    if ($Follow) {
        $cmd += " --follow"
    }
    
    if ($Errors) {
        $cmd += " --level error"
    }
    
    if ($Grep) {
        $cmd += " --grep `"$Grep`""
    }
    
    Write-Host "Executando: $cmd`n" -ForegroundColor Gray
    Invoke-Expression $cmd
}

function Get-CloudRunLogs {
    param([int]$Limit, [switch]$Follow, [switch]$Errors, [string]$Grep)
    
    Write-Host "`n📋 Logs do GCP Cloud Run (camana-na-mao)`n" -ForegroundColor Cyan
    
    $cmd = "gcloud run services logs read camana-na-mao --region southamerica-east1"
    
    if ($Limit) {
        $cmd += " --limit $Limit"
    }
    
    if ($Follow) {
        $cmd += " --follow"
    }
    
    if ($Errors) {
        $cmd += " --level error"
    }
    
    if ($Grep) {
        $cmd += " --grep `"$Grep`""
    }
    
    Write-Host "Executando: $cmd`n" -ForegroundColor Gray
    Invoke-Expression $cmd
}

function Get-VLLMLogs {
    param([int]$Limit, [switch]$Follow, [switch]$Errors, [string]$Grep)
    
    Write-Host "`n📋 Logs do vLLM (VM llm-chat-gpu)`n" -ForegroundColor Cyan
    
    $zone = "us-central1-b"
    $container = "vllm-chat"
    
    $dockerCmd = "docker logs $container"
    
    if ($Limit) {
        $dockerCmd += " --tail $Limit"
    }
    
    if ($Follow) {
        $dockerCmd += " --follow"
    }
    
    if ($Errors) {
        $dockerCmd += " 2>&1 | grep -i error"
    }
    
    if ($Grep) {
        $dockerCmd += " | grep `"$Grep`""
    }
    
    $cmd = "gcloud compute ssh llm-chat-gpu --zone $zone --command `"$dockerCmd`""
    
    Write-Host "Executando: $cmd`n" -ForegroundColor Gray
    Invoke-Expression $cmd
}

function Get-automacaoLogs {
    param([int]$Limit, [switch]$Follow, [switch]$Errors, [string]$Grep)
    
    Write-Host "`n📋 Logs do automacao (Cloud Run)`n" -ForegroundColor Cyan
    
    $cmd = "gcloud run services logs read automacao --region southamerica-east1"
    
    if ($Limit) {
        $cmd += " --limit $Limit"
    }
    
    if ($Follow) {
        $cmd += " --follow"
    }
    
    if ($Errors) {
        $cmd += " --level error"
    }
    
    if ($Grep) {
        $cmd += " --grep `"$Grep`""
    }
    
    Write-Host "Executando: $cmd`n" -ForegroundColor Gray
    Invoke-Expression $cmd
}

function Get-AuditLogs {
    param([int]$Limit)
    
    Write-Host "`n📋 Logs de Auditoria (SQL)`n" -ForegroundColor Cyan
    
    $query = @"
SELECT 
  id,
  user_id,
  action,
  entity_type,
  entity_id,
  created_at,
  metadata
FROM audit_logs
ORDER BY created_at DESC
LIMIT $Limit;
"@
    
    Write-Host "Query SQL:" -ForegroundColor Gray
    Write-Host $query -ForegroundColor DarkGray
    Write-Host "`nExecute esta query no Supabase Dashboard → SQL Editor`n" -ForegroundColor Yellow
}

# Main
if ($Tipo -eq "help" -or $Tipo -eq "-h" -or $Tipo -eq "--help") {
    Show-Help
    exit 0
}

Write-Host "`n🔍 Acessando logs do sistema Câmara na Mão`n" -ForegroundColor Green

switch ($Tipo) {
    "supabase" {
        Get-SupabaseLogs -Limit $Limit -Follow:$Follow -Errors:$Errors -Grep $Grep
    }
    "cloudrun" {
        Get-CloudRunLogs -Limit $Limit -Follow:$Follow -Errors:$Errors -Grep $Grep
    }
    "vllm" {
        Get-VLLMLogs -Limit $Limit -Follow:$Follow -Errors:$Errors -Grep $Grep
    }
    "automacao" {
        Get-automacaoLogs -Limit $Limit -Follow:$Follow -Errors:$Errors -Grep $Grep
    }
    "audit" {
        Get-AuditLogs -Limit $Limit
    }
    "all" {
        Write-Host "Mostrando logs de todos os componentes:`n" -ForegroundColor Yellow
        Get-SupabaseLogs -Limit $Limit -Errors:$Errors -Grep $Grep
        Write-Host "`n" + ("=" * 80) + "`n"
        Get-CloudRunLogs -Limit $Limit -Errors:$Errors -Grep $Grep
        Write-Host "`n" + ("=" * 80) + "`n"
        Get-automacaoLogs -Limit $Limit -Errors:$Errors -Grep $Grep
    }
}

Write-Host "`n✅ Concluído`n" -ForegroundColor Green
