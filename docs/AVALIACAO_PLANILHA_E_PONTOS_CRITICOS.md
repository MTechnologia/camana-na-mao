# Avaliação: Planilha (Plano de Teste Executado) e Pontos Críticos

Referência para refinamento do chatbot com base na **planilha de avaliação** e no **relatório M-TECH** (Pontos Críticos a Endereçar).

## Planilha

- **Fonte:** planilha de avaliação (ex.: `planilha_final_*.xlsx`).
- **Aba:** utilizar **apenas** a aba **"plano de teste executado"**.
- **Colunas:** A (pergunta/entrada), C (resposta do sistema), F (avaliação/feedback).
- **Critério:** considerar para correções **tudo em que a coluna F não é "Resposta OK"** (inclui "Resposta OK." como OK).

### Extração

Script para listar itens com falha (F ≠ Resposta OK):

```bash
node scripts/extract-planilha-plano-executado.mjs "C:\Users\Felipe\Downloads\planilha_final_....xlsx"
```

Saída: JSON com `linha`, `col_A`, `col_C`, `col_F` para cada item a endereçar.

## Relatório .docx – Pontos Críticos a Endereçar

Do relatório técnico M-TECH (ex.: `mtech_cmsp_relatorio_modelo_assinado_*.docx`), a seção **"Pontos Críticos a Endereçar"** orienta os ajustes:

1. **Tratamento de perguntas ambíguas** (NF01, NF02, NF03) – evitar respostas genéricas; pedir esclarecimento quando fizer sentido.
2. **Compreensão de linguagem informal** (NF16–NF19) – typos e gírias; normalização na detecção de intent.
3. **Respostas fora de contexto** (F05, F09) – perguntas funcionais recebendo resposta de outro domínio.
4. **Redirecionamentos sem conteúdo** (F10) – ex.: “vá à biblioteca” sem listar leis; priorizar entrega de conteúdo + link.

## Ajustes implementados no ai-orchestrator

- **Override para perguntas informativas sobre vereador/Câmara:** perfil da vereadora, frequência nas sessões, quais vereadores faltaram, quanto a câmara gasta, como falar com vereador, onde estão os gastos dos vereadores → intent `general` (RAG), sem pedir CEP.
- **Fora de escopo:** multa (de trânsito), “resolver/resolve minha multa” → intent `general`, resposta educada sem coleta de relato.
- **Normalização de typos na detecção de intent:** `projetu` → projetos, `di lei` → de lei, `onde ta` → onde está, `leiiii` → lei, entre outros (planilha + robustez linguística).

Arquivos principais: `supabase/functions/ai-orchestrator/lib.ts` (funções de detecção e normalização), `supabase/functions/ai-orchestrator/index.ts` (overrides de intent).
