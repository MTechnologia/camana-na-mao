# Script para configurar Llama 3.1 8B no vLLM
# Uso: .\scripts\configurar-llama-3.1.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$HFToken,
    
    [Parameter()]
    [string]$Zone = "us-central1-b",
    
    [Parameter()]
    [string]$VMName = "llm-chat-gpu",
    
    [Parameter()]
    [string]$Model = "meta-llama/Meta-Llama-3.1-8B-Instruct"
)

$ErrorActionPreference = "Continue"

Write-Host "`n🚀 Configurando Llama 3.1 8B no vLLM`n" -ForegroundColor Green

# Validar token
if (-not $HFToken.StartsWith("hf_")) {
    Write-Host "❌ Token inválido. Deve começar com 'hf_'" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Configuração:" -ForegroundColor Cyan
Write-Host "  VM: $VMName" -ForegroundColor Gray
Write-Host "  Zona: $Zone" -ForegroundColor Gray
Write-Host "  Modelo: $Model" -ForegroundColor Gray
Write-Host "  Token: $($HFToken.Substring(0, 10))..." -ForegroundColor Gray
Write-Host ""

# Passo 1: Conectar na VM
Write-Host "1️⃣ Conectando na VM..." -ForegroundColor Yellow
$sshCmd = "gcloud compute ssh $VMName --zone=$Zone --command='echo Connected'"
$result = Invoke-Expression $sshCmd 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao conectar na VM. Verifique se a VM existe e está rodando." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Conectado na VM`n" -ForegroundColor Green

# Passo 2: Parar e remover container atual
Write-Host "2️⃣ Parando container atual..." -ForegroundColor Yellow
$stopCmd = "gcloud compute ssh $VMName --zone=$Zone --command='docker stop vllm-chat 2>/dev/null || true'"
Invoke-Expression $stopCmd | Out-Null

$removeCmd = "gcloud compute ssh $VMName --zone=$Zone --command='docker rm vllm-chat 2>/dev/null || true'"
Invoke-Expression $removeCmd | Out-Null

Write-Host "✅ Container antigo removido`n" -ForegroundColor Green

# Passo 3: Criar novo container
Write-Host "3️⃣ Criando novo container com Llama 3.1 8B..." -ForegroundColor Yellow
Write-Host "   ⏳ Isso pode levar 5-10 minutos na primeira vez (download do modelo)`n" -ForegroundColor Gray

# Construir comando Docker como string única
# Usar aspas simples para o token dentro do comando SSH
# Adicionar flag --quantization awq para quantização automática
$dockerCmd = "docker run -d --name vllm-chat --gpus all -p 8000:8000 -v ~/.cache/huggingface:/root/.cache/huggingface --restart unless-stopped --shm-size=8g -e HF_TOKEN='$HFToken' vllm/vllm-openai:latest $Model --host 0.0.0.0 --port 8000 --tensor-parallel-size 1 --quantization awq --max-model-len 131072 --gpu-memory-utilization 0.9 --enable-auto-tool-choice --tool-call-parser openai"

# Passar comando via SSH (escapar aspas duplas no comando)
$createCmd = "gcloud compute ssh $VMName --zone=$Zone --command='$dockerCmd'"
$containerId = Invoke-Expression $createCmd 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao criar container. Verifique os logs acima." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Container criado: $containerId`n" -ForegroundColor Green

# Passo 4: Obter IP externo
Write-Host "4️⃣ Obtendo IP externo da VM..." -ForegroundColor Yellow
$ipCmd = "gcloud compute instances describe $VMName --zone=$Zone --format='get(networkInterfaces[0].accessConfigs[0].natIP)'"
$externalIP = Invoke-Expression $ipCmd

if (-not $externalIP) {
    Write-Host "⚠️ Não foi possível obter o IP externo. Verifique manualmente." -ForegroundColor Yellow
} else {
    Write-Host "✅ IP externo: $externalIP`n" -ForegroundColor Green
}

# Passo 5: Instruções finais
Write-Host "`n📋 Próximos passos:`n" -ForegroundColor Cyan
Write-Host "1. Aguarde 5-10 minutos para o modelo carregar" -ForegroundColor White
Write-Host "2. Verifique os logs:" -ForegroundColor White
Write-Host "   gcloud compute ssh $VMName --zone=$Zone --command='docker logs -f vllm-chat'" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Teste a API localmente:" -ForegroundColor White
Write-Host "   gcloud compute ssh $VMName --zone=$Zone --command='curl http://localhost:8000/v1/models'" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Atualize os secrets no Supabase:" -ForegroundColor White
Write-Host "   - AI_CHAT_BASE_URL: http://$externalIP:8000/v1" -ForegroundColor Gray
Write-Host "   - AI_CHAT_MODEL: $Model" -ForegroundColor Gray
Write-Host "   - AI_API_KEY: dummy (manter)" -ForegroundColor Gray
Write-Host ""

# Passo 6: Verificar status
Write-Host "5. Verificar status do container:" -ForegroundColor White
Write-Host "   gcloud compute ssh $VMName --zone=$Zone --command='docker ps | grep vllm'" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Configuração iniciada!`n" -ForegroundColor Green
Write-Host "📖 Para mais detalhes, consulte: docs/CONFIGURAR_LLAMA_3.1_8B_COM_TOKEN.md`n" -ForegroundColor Cyan
