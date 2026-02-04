# Informações da VM llm-chat-gpu

**Data:** 2026-01-28  
**Status:** ✅ Rodando

---

## 📋 Informações da VM

- **Nome**: `llm-chat-gpu`
- **Zona**: `us-central1-b`
- **IP Externo**: `136.116.72.218`
- **IP Interno**: `10.128.0.2`
- **Status**: RUNNING

---

## 🔌 Conectar na VM

```bash
gcloud compute ssh llm-chat-gpu --zone=us-central1-b
```

---

## 🐳 Verificar Container vLLM

```bash
# Ver containers rodando
docker ps

# Ver logs do vLLM
docker logs -f vllm-chat

# Ver status do container
docker stats vllm-chat
```

---

## 📝 Comandos Úteis

### Verificar Status da VM

```bash
gcloud compute instances describe llm-chat-gpu --zone=us-central1-b --format="get(status)"
```

### Obter IP Externo

```bash
gcloud compute instances describe llm-chat-gpu --zone=us-central1-b --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

### Iniciar VM (se estiver parada)

```bash
gcloud compute instances start llm-chat-gpu --zone=us-central1-b
```

### Parar VM

```bash
gcloud compute instances stop llm-chat-gpu --zone=us-central1-b
```

---

## 🔧 Configuração Atual

- **Modelo**: Qwen2.5-3B-Instruct (será migrado para Llama 3.1 8B)
- **Porta**: 8000
- **URL API**: `http://136.116.72.218:8000/v1`

---

**Última atualização:** 2026-01-28
