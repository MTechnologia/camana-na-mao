# Script para instalar drivers NVIDIA e NVIDIA Container Toolkit na VM L4
# Uso: .\scripts\instalar-drivers-nvidia-l4.ps1

param(
    [Parameter()]
    [string]$Zone = "us-central1-a",
    
    [Parameter()]
    [string]$VMName = "llm-chat-gpu-l4"
)

$ErrorActionPreference = "Continue"

Write-Host "`n🚀 Instalando drivers NVIDIA e NVIDIA Container Toolkit na VM L4`n" -ForegroundColor Green

Write-Host "📋 Configuração:" -ForegroundColor Cyan
Write-Host "  VM: $VMName" -ForegroundColor Gray
Write-Host "  Zona: $Zone" -ForegroundColor Gray
Write-Host ""

# Passo 1: Verificar se a VM está rodando
Write-Host "1️⃣ Verificando status da VM..." -ForegroundColor Yellow
$statusCmd = "gcloud compute instances describe $VMName --zone=$Zone --format='get(status)'"
$status = Invoke-Expression $statusCmd

if ($status -ne "RUNNING") {
    Write-Host "⚠️ VM não está rodando. Iniciando..." -ForegroundColor Yellow
    gcloud compute instances start $VMName --zone=$Zone
    Start-Sleep -Seconds 30
}

Write-Host "✅ VM está rodando`n" -ForegroundColor Green

# Passo 2: Instalar drivers NVIDIA
Write-Host "2️⃣ Instalando drivers NVIDIA..." -ForegroundColor Yellow
Write-Host "   ⏳ Isso pode levar 5-10 minutos`n" -ForegroundColor Gray

$installDriversCmd = 'sudo apt-get update && sudo apt-get install -y ubuntu-drivers-common && sudo ubuntu-drivers autoinstall && sudo apt-get install -y nvidia-driver-535'

$driversResult = gcloud compute ssh $VMName --zone=$Zone --tunnel-through-iap --command=$installDriversCmd 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Alguns avisos podem aparecer, mas a instalação deve continuar..." -ForegroundColor Yellow
}

Write-Host "✅ Drivers NVIDIA instalados`n" -ForegroundColor Green

# Passo 3: Instalar NVIDIA Container Toolkit
Write-Host "3️⃣ Instalando NVIDIA Container Toolkit..." -ForegroundColor Yellow

$installNvidiaToolkitCmd = 'distribution=$(. /etc/os-release;echo $ID$VERSION_ID) && curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg && curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | sed ''s#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g'' | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list && sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit && sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker'

$toolkitResult = gcloud compute ssh $VMName --zone=$Zone --tunnel-through-iap --command=$installNvidiaToolkitCmd 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar NVIDIA Container Toolkit. Verifique os logs acima." -ForegroundColor Red
    exit 1
}

Write-Host "✅ NVIDIA Container Toolkit instalado`n" -ForegroundColor Green

# Passo 4: Reiniciar VM para ativar drivers
Write-Host "4️⃣ Reiniciando VM para ativar drivers NVIDIA..." -ForegroundColor Yellow
Write-Host "   ⏳ Aguarde 2-3 minutos após o reinício`n" -ForegroundColor Gray

gcloud compute instances reset $VMName --zone=$Zone

Write-Host "✅ VM reiniciada. Aguardando 60 segundos..." -ForegroundColor Green
Start-Sleep -Seconds 60

# Passo 5: Verificar GPU
Write-Host "5️⃣ Verificando GPU..." -ForegroundColor Yellow

$checkGpuCmd = 'nvidia-smi'
$gpuResult = gcloud compute ssh $VMName --zone=$Zone --tunnel-through-iap --command=$checkGpuCmd 2>&1

if ($LASTEXITCODE -ne 0 -or $gpuResult -notmatch "L4") {
    Write-Host "⚠️ GPU não detectada ou drivers não carregados. Aguarde mais alguns minutos e tente novamente:" -ForegroundColor Yellow
    Write-Host "   gcloud compute ssh $VMName --zone=$Zone --tunnel-through-iap --command='nvidia-smi'" -ForegroundColor Gray
} else {
    Write-Host "✅ GPU L4 detectada com sucesso!`n" -ForegroundColor Green
    Write-Host $gpuResult -ForegroundColor Gray
}

# Passo 6: Verificar Docker com GPU
Write-Host "`n6️⃣ Verificando Docker com suporte a GPU..." -ForegroundColor Yellow

$checkDockerGpuCmd = 'docker run --rm --gpus all nvidia/cuda:12.0.0-base-ubuntu22.04 nvidia-smi'
$dockerGpuResult = gcloud compute ssh $VMName --zone=$Zone --tunnel-through-iap --command=$checkDockerGpuCmd 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker com suporte a GPU funcionando!`n" -ForegroundColor Green
} else {
    Write-Host "⚠️ Docker com GPU pode precisar de mais configuração. Verifique os logs acima." -ForegroundColor Yellow
}

Write-Host "`n📋 Próximos passos:`n" -ForegroundColor Cyan
Write-Host "1. Verificar GPU:" -ForegroundColor White
Write-Host "   gcloud compute ssh $VMName --zone=$Zone --tunnel-through-iap --command='nvidia-smi'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Configurar Llama 3.1 8B:" -ForegroundColor White
Write-Host "   .\scripts\configurar-llama-3.1.ps1 -HFToken 'seu_token' -Zone '$Zone' -VMName '$VMName'" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Instalação concluída!`n" -ForegroundColor Green
