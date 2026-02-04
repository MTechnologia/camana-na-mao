# n8n Cloud vs Self-hosted no GCP

**Data:** 2026-01-28  
**Objetivo:** Comparar n8n Cloud vs self-hosted no GCP para o projeto Câmara na Mão

---

## 🎯 Resposta Rápida

**Você NÃO precisa usar n8n Cloud!** É totalmente possível (e recomendado) usar **n8n self-hosted no GCP**.

### Por quê self-hosted?

1. ✅ **LGPD**: Dados ficam no Brasil (`southamerica-east1`)
2. ✅ **Custo**: Mais barato para alto volume
3. ✅ **Controle**: Total controle sobre infraestrutura
4. ✅ **Integração**: Acesso direto às VMs de LLM (sem latência externa)
5. ✅ **Privacidade**: Dados não saem da sua infraestrutura

---

## 📊 Comparativo Detalhado

### n8n Cloud vs Self-hosted no GCP

| Aspecto | n8n Cloud | Self-hosted no GCP | Vencedor |
|---------|-----------|-------------------|----------|
| **Conformidade LGPD** | ⚠️ Dados podem sair do Brasil | ✅ **100% no Brasil** | **Self-hosted** |
| **Custo (baixo volume)** | $20-50/mês | ~$30-50/mês (VM) | Empate |
| **Custo (alto volume)** | $200-500/mês | ~$30-50/mês (fixo) | **Self-hosted** |
| **Setup inicial** | ✅ 5 minutos | ⚠️ 30-60 minutos | **Cloud** |
| **Manutenção** | ✅ Zero | ⚠️ Você gerencia | **Cloud** |
| **Controle** | ❌ Limitado | ✅ **Total** | **Self-hosted** |
| **Latência** | ⚠️ Externa | ✅ **Local (baixa)** | **Self-hosted** |
| **Integração com vLLM** | ⚠️ Via internet pública | ✅ **VPC interna** | **Self-hosted** |
| **Escalabilidade** | ✅ Automática | ⚠️ Manual | **Cloud** |
| **Backup** | ✅ Automático | ⚠️ Você configura | **Cloud** |
| **Uptime SLA** | ✅ 99.9% | ⚠️ Depende de você | **Cloud** |
| **Customização** | ❌ Limitada | ✅ **Ilimitada** | **Self-hosted** |

---

## 💰 Análise de Custos

### n8n Cloud (Pricing 2026)

| Plano | Execuções/mês | Preço/mês | Limitações |
|-------|---------------|-----------|------------|
| **Starter** | 1.000 | $20 | 1 workflow ativo |
| **Pro** | 10.000 | $50 | 5 workflows ativos |
| **Enterprise** | 100.000+ | $200+ | Ilimitado |

**Estimativa para Câmara na Mão:**
- ~1.000 relatos/dia = ~30.000/mês
- **Custo**: ~$200-300/mês (Enterprise)

### Self-hosted no GCP

**Opção 1: VM Pequena (Recomendado para início)**

```bash
# VM e2-standard-2 (2 vCPU, 8GB RAM)
ZONE="southamerica-east1-b"
gcloud compute instances create n8n-worker \
  --zone=$ZONE \
  --machine-type=e2-standard-2 \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-balanced \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud
```

**Custo**: ~$30-40/mês (não preemptible) ou ~$10-15/mês (preemptible)

**Opção 2: Cloud Run (Serverless)**

```bash
# Deploy n8n no Cloud Run
gcloud run deploy n8n \
  --image=n8nio/n8n \
  --region=southamerica-east1 \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=1 \
  --max-instances=10
```

**Custo**: ~$40-60/mês (com mínimo de 1 instância sempre rodando)

**Opção 3: GKE (Kubernetes)**

**Custo**: ~$70-100/mês (cluster mínimo)

---

## 🏗️ Arquitetura Recomendada

### Opção A: Self-hosted em VM (Recomendado)

```
┌─────────────────────────────────────────────────┐
│           GCP - southamerica-east1             │
│                                                 │
│  ┌──────────────┐    ┌──────────────┐         │
│  │ llm-chat-gpu │    │ n8n-worker   │         │
│  │ (vLLM)       │◄───┤ (VM)         │         │
│  │              │    │              │         │
│  └──────────────┘    └──────┬───────┘         │
│                             │                  │
│                             ▼                  │
│                    ┌──────────────┐           │
│                    │ Supabase     │           │
│                    │ (Edge Func)  │           │
│                    └──────────────┘           │
└─────────────────────────────────────────────────┘
```

**Vantagens:**
- ✅ Tudo na mesma região (LGPD)
- ✅ Latência baixa (VPC interna)
- ✅ Custo fixo previsível
- ✅ Controle total

### Opção B: Cloud Run (Serverless)

```
┌─────────────────────────────────────────────────┐
│           GCP - southamerica-east1             │
│                                                 │
│  ┌──────────────┐    ┌──────────────┐         │
│  │ llm-chat-gpu │    │ Cloud Run    │         │
│  │ (vLLM)       │◄───┤ (n8n)        │         │
│  └──────────────┘    └──────────────┘         │
└─────────────────────────────────────────────────┘
```

**Vantagens:**
- ✅ Escala automaticamente
- ✅ Paga apenas pelo uso
- ✅ Zero manutenção de infraestrutura

**Desvantagens:**
- ⚠️ Custo pode ser maior em alto volume
- ⚠️ Cold start pode adicionar latência

---

## 📋 Guia de Deploy: n8n Self-hosted no GCP

### Passo 1: Criar VM

```bash
# Definir variáveis
ZONE="southamerica-east1-b"  # ou -a ou -c
PROJECT_ID="arcane-atom-480020-f6"

# Criar VM
gcloud compute instances create n8n-worker \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --machine-type=e2-standard-2 \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-balanced \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=n8n-worker

# Obter IP externo
EXTERNAL_IP=$(gcloud compute instances describe n8n-worker \
  --zone=$ZONE \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

echo "VM criada com IP: $EXTERNAL_IP"
```

### Passo 2: Configurar Firewall

```bash
# Abrir porta 5678 (n8n padrão)
gcloud compute firewall-rules create allow-n8n-5678 \
  --allow tcp:5678 \
  --source-ranges 0.0.0.0/0 \
  --target-tags n8n-worker \
  --description "Allow n8n on port 5678"
```

### Passo 3: Instalar Docker

```bash
# Conectar na VM
gcloud compute ssh n8n-worker --zone=$ZONE

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalação
docker --version
```

### Passo 4: Deploy n8n com Docker

```bash
# Criar diretório para dados
mkdir -p ~/n8n-data

# Executar n8n
docker run -d \
  --name n8n \
  --restart unless-stopped \
  -p 5678:5678 \
  -v ~/n8n-data:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=SUA_SENHA_FORTE_AQUI \
  -e N8N_HOST=$EXTERNAL_IP \
  -e N8N_PORT=5678 \
  -e N8N_PROTOCOL=http \
  -e WEBHOOK_URL=http://$EXTERNAL_IP:5678/ \
  n8nio/n8n

# Verificar logs
docker logs -f n8n
```

### Passo 5: Configurar Nginx (HTTPS - Opcional mas Recomendado)

```bash
# Instalar Nginx
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Configurar Nginx como reverse proxy
sudo nano /etc/nginx/sites-available/n8n
```

**Conteúdo do arquivo `/etc/nginx/sites-available/n8n`:**

```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;  # ou use IP diretamente

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Configurar HTTPS (Let's Encrypt)
sudo certbot --nginx -d seu-dominio.com.br
```

### Passo 6: Configurar no Supabase

1. Acesse n8n: `http://$EXTERNAL_IP:5678` (ou seu domínio)
2. Crie workflow com webhook (seguir `docs/GUIA_CONFIGURACAO_N8N_PASSO_A_PASSO.md`)
3. Atualize `AI_CHAT_BASE_URL` no Supabase para apontar para a VM local:

```bash
# No Supabase, configurar:
AI_CHAT_BASE_URL=http://10.158.0.X:8000/v1  # IP interno da VM llm-chat-gpu
```

**Vantagem**: Comunicação via VPC interna (mais rápido e seguro)

---

## 🔒 Segurança e LGPD

### Self-hosted no GCP

✅ **Conformidade LGPD:**
- Dados ficam em `southamerica-east1` (Brasil)
- Comunicação entre VMs via VPC interna (não exposta)
- Controle total sobre backups e retenção

✅ **Segurança:**
- Firewall do GCP
- Acesso SSH apenas via IAP
- n8n com autenticação básica
- HTTPS via Let's Encrypt

### n8n Cloud

⚠️ **Conformidade LGPD:**
- Dados podem ser processados fora do Brasil
- Depende dos termos de serviço do n8n Cloud
- Menos controle sobre localização exata

---

## 📈 Escalabilidade no GCP

### ✅ SIM, n8n no GCP É Escalável!

O GCP oferece **múltiplas opções de escalabilidade**, desde manual até totalmente automática.

---

### Opção 1: VM Simples (Escala Manual) ⚠️

**Como funciona:**
- Você cria VMs adicionais manualmente quando necessário
- Configura Load Balancer para distribuir carga

**Vantagens:**
- ✅ Controle total
- ✅ Custo previsível
- ✅ Simples de entender

**Desvantagens:**
- ❌ Requer intervenção manual
- ❌ Não escala automaticamente

**Quando usar:**
- Volume previsível e estável
- Orçamento fixo
- Controle total necessário

**Exemplo:**
```bash
# Criar múltiplas VMs
gcloud compute instances create n8n-worker-1 \
  --zone=southamerica-east1-a \
  --machine-type=e2-standard-2

gcloud compute instances create n8n-worker-2 \
  --zone=southamerica-east1-b \
  --machine-type=e2-standard-2

# Configurar Load Balancer
gcloud compute backend-services create n8n-backend \
  --load-balancing-scheme=EXTERNAL \
  --protocol=HTTP

# Adicionar VMs ao backend
gcloud compute backend-services add-backend n8n-backend \
  --instance-group=n8n-worker-1 \
  --zone=southamerica-east1-a
```

---

### Opção 2: Cloud Run (Escala Automática) ✅ **RECOMENDADO**

**Como funciona:**
- Escala automaticamente de 0 a N instâncias
- Paga apenas pelo uso (com mínimo configurável)
- Gerenciado pelo GCP

**Vantagens:**
- ✅ **Escala automática** (0 a 1000+ instâncias)
- ✅ **Zero manutenção** de infraestrutura
- ✅ Paga apenas pelo uso
- ✅ Alta disponibilidade automática

**Desvantagens:**
- ⚠️ Cold start pode adicionar latência (resolvido com min-instances)
- ⚠️ Custo pode ser maior em alto volume constante

**Quando usar:**
- Volume variável (picos e vales)
- Quer escalabilidade automática
- Prefere gerenciamento zero

**Exemplo:**
```bash
# Deploy n8n no Cloud Run
gcloud run deploy n8n \
  --image=n8nio/n8n \
  --region=southamerica-east1 \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=1 \
  --max-instances=10 \
  --port=5678 \
  --set-env-vars="N8N_BASIC_AUTH_ACTIVE=true,N8N_BASIC_AUTH_USER=admin,N8N_BASIC_AUTH_PASSWORD=senha"
```

**Escalabilidade:**
- **Mínimo**: 1 instância sempre rodando (evita cold start)
- **Máximo**: 10 instâncias (ajustável)
- **Escala automática**: Baseado em requisições/concorrência

---

### Opção 3: GKE (Kubernetes) ✅ **MÁXIMA ESCALABILIDADE**

**Como funciona:**
- Cluster Kubernetes gerenciado
- Auto-scaling baseado em métricas (CPU, memória, requisições)
- Horizontal Pod Autoscaler (HPA)

**Vantagens:**
- ✅ **Escala automática avançada** (baseada em métricas)
- ✅ Alta disponibilidade
- ✅ Rolling updates sem downtime
- ✅ Máxima flexibilidade

**Desvantagens:**
- ⚠️ Mais complexo de configurar
- ⚠️ Custo maior (cluster mínimo)

**Quando usar:**
- Volume muito alto e variável
- Precisa de máxima disponibilidade
- Já tem experiência com Kubernetes

**Exemplo:**
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: n8n
spec:
  replicas: 2
  selector:
    matchLabels:
      app: n8n
  template:
    metadata:
      labels:
        app: n8n
    spec:
      containers:
      - name: n8n
        image: n8nio/n8n:latest
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
---
# hpa.yaml - Auto-scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: n8n-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: n8n
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

**Escalabilidade:**
- **Mínimo**: 2 pods (alta disponibilidade)
- **Máximo**: 20 pods (ajustável)
- **Escala automática**: Baseado em CPU (70%) e memória (80%)

---

### Opção 4: Managed Instance Groups (MIG) ✅

**Como funciona:**
- Grupo de VMs idênticas
- Auto-scaling baseado em métricas
- Load balancer automático

**Vantagens:**
- ✅ Escala automática de VMs
- ✅ Mais controle que Cloud Run
- ✅ Custo previsível (VMs)

**Desvantagens:**
- ⚠️ Mais complexo que Cloud Run
- ⚠️ Escala mais lenta (criação de VMs)

**Quando usar:**
- Volume alto e constante
- Precisa de controle sobre infraestrutura
- Orçamento fixo

**Exemplo:**
```bash
# Criar template de instância
gcloud compute instance-templates create n8n-template \
  --machine-type=e2-standard-2 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB

# Criar Managed Instance Group
gcloud compute instance-groups managed create n8n-group \
  --base-instance-name=n8n \
  --template=n8n-template \
  --size=2 \
  --zone=southamerica-east1-a

# Configurar auto-scaling
gcloud compute instance-groups managed set-autoscaling n8n-group \
  --max-num-replicas=10 \
  --min-num-replicas=2 \
  --target-cpu-utilization=0.7 \
  --zone=southamerica-east1-a
```

---

## 📊 Comparativo de Escalabilidade

| Opção | Escala Automática | Velocidade de Escala | Complexidade | Custo |
|-------|------------------|---------------------|--------------|-------|
| **VM Simples** | ❌ Manual | Lenta (minutos) | ⭐ Baixa | $30-50/mês |
| **Cloud Run** | ✅ Sim | **Rápida (segundos)** | ⭐⭐ Média | $40-100/mês |
| **GKE** | ✅ Sim | Rápida (minutos) | ⭐⭐⭐ Alta | $70-200/mês |
| **MIG** | ✅ Sim | Média (minutos) | ⭐⭐ Média | $60-150/mês |
| **n8n Cloud** | ✅ Sim | Rápida (segundos) | ⭐ Zero | $200-500/mês |

---

## 🎯 Recomendação por Cenário

### Cenário 1: Volume Baixo/Estável (< 1.000 execuções/dia)
**Recomendação**: **VM Simples**
- Custo baixo
- Volume previsível
- Não precisa de auto-scaling

### Cenário 2: Volume Variável (1.000-10.000 execuções/dia)
**Recomendação**: **Cloud Run** ✅
- Escala automaticamente
- Paga apenas pelo uso
- Zero manutenção

### Cenário 3: Volume Muito Alto (> 10.000 execuções/dia)
**Recomendação**: **GKE ou MIG**
- Máxima escalabilidade
- Controle total
- Custo otimizado para alto volume

---

## 💡 Conclusão

**SIM, n8n no GCP É TOTALMENTE ESCALÁVEL!**

Na verdade, o GCP oferece **mais opções de escalabilidade** que o n8n Cloud:
- ✅ Escala manual (VM simples)
- ✅ Escala automática (Cloud Run, GKE, MIG)
- ✅ Escala baseada em métricas (CPU, memória, requisições)
- ✅ Escala de 0 a 1000+ instâncias

**A diferença principal:**
- **n8n Cloud**: Escala automática gerenciada (você não controla)
- **GCP Self-hosted**: Você escolhe como escalar (manual ou automático)

### n8n Cloud: Escala Automática

- ✅ Escala automaticamente
- ✅ Sem intervenção manual
- ⚠️ Custo aumenta proporcionalmente
- ⚠️ Você não controla como escala

---

## 🎯 Recomendação Final

### Para Câmara na Mão: **Self-hosted no GCP**

**Razões:**

1. ✅ **LGPD**: Dados ficam no Brasil
2. ✅ **Custo**: Mais barato para alto volume (~$30/mês vs $200+/mês)
3. ✅ **Integração**: Acesso direto às VMs de LLM (latência baixa)
4. ✅ **Controle**: Total controle sobre infraestrutura
5. ✅ **Privacidade**: Dados não saem da sua infraestrutura

### Quando Usar n8n Cloud?

- ✅ Projetos pequenos (< 1.000 execuções/mês)
- ✅ Sem requisitos de LGPD
- ✅ Sem tempo para gerenciar infraestrutura
- ✅ Necessidade de escalabilidade automática

---

## 📋 Checklist de Deploy

- [ ] VM criada em `southamerica-east1` (LGPD)
- [ ] Docker instalado
- [ ] n8n rodando em container
- [ ] Firewall configurado (porta 5678)
- [ ] Nginx configurado (HTTPS - opcional)
- [ ] Workflow criado no n8n
- [ ] Webhook URL configurada no Supabase
- [ ] Teste de integração realizado
- [ ] Backup configurado (snapshots GCP)

---

## 🔧 Manutenção

### Backup Automático

```bash
# Criar snapshot diário da VM
gcloud compute disks snapshot n8n-worker \
  --snapshot-names=n8n-worker-$(date +%Y%m%d) \
  --zone=southamerica-east1-b

# Ou usar Cloud Scheduler para automatizar
```

### Atualização do n8n

```bash
# Parar container
docker stop n8n

# Atualizar imagem
docker pull n8nio/n8n:latest

# Reiniciar
docker start n8n
```

### Monitoramento

```bash
# Ver logs
docker logs -f n8n

# Ver uso de recursos
docker stats n8n

# Verificar saúde
curl http://localhost:5678/healthz
```

---

## 💡 Dicas de Otimização

1. **Usar preemptible VMs**: Economia de 80% (ideal para desenvolvimento/testes)
2. **Configurar auto-restart**: `--restart unless-stopped` no Docker
3. **Backup automático**: Snapshots diários via Cloud Scheduler
4. **Monitoramento**: Cloud Monitoring para alertas
5. **HTTPS**: Sempre usar Let's Encrypt para produção

---

## 📚 Referências

- [n8n Self-hosted Documentation](https://docs.n8n.io/hosting/installation/docker/)
- [GCP Compute Engine Pricing](https://cloud.google.com/compute/pricing)
- [LGPD - Lei Geral de Proteção de Dados](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

---

**Última atualização:** 2026-01-28
