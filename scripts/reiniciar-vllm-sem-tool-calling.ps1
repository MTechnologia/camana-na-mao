# Script para reiniciar vLLM sem tool calling
# Isso resolve o erro NotImplementedError durante streaming

$VM_NAME = "llm-chat-gpu-l4"
$ZONE = "us-central1-a"
$HF_TOKEN = "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"

Write-Host "Parando container vLLM atual..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap --command="docker stop vllm-chat 2>/dev/null; docker rm vllm-chat 2>/dev/null"

Write-Host "Iniciando novo container vLLM sem tool calling..." -ForegroundColor Yellow

$dockerCmd = @"
HF_TOKEN='$HF_TOKEN'
docker run -d \
  --name vllm-chat \
  --gpus all \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  --restart unless-stopped \
  --shm-size=16g \
  -e HF_TOKEN="\$HF_TOKEN" \
  vllm/vllm-openai:latest \
  meta-llama/Meta-Llama-3.1-8B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --max-model-len 24576 \
  --gpu-memory-utilization 0.9
"@

gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap --command=$dockerCmd

Write-Host "Aguardando container iniciar..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

Write-Host "Verificando status..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap --command="docker ps | grep vllm && docker logs vllm-chat --tail 10"

Write-Host "`n✅ Container reiniciado sem tool calling!" -ForegroundColor Green
Write-Host "⚠️  IMPORTANTE: As flags --enable-auto-tool-choice e --tool-call-parser foram removidas" -ForegroundColor Yellow
