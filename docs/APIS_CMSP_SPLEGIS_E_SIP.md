# APIs oficiais – SPLEGIS e SIP

Documentação das APIs recebidas para integração no sistema Câmara na Mão.

---

## 1. SPLEGIS Web Service (ws2.asmx)

- **URL base:** https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx  
- **WSDL:** https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx?WSDL  

### Audiências Públicas

Operações disponíveis (com variantes JSON):

| Operação | Descrição |
|----------|-----------|
| `AudienciasPublicas` / `AudienciasPublicasJSON` | Relatório de audiências em um período (DataInicial, DataFinal) |
| `AudienciasPublicasV2` / `AudienciasPublicasV2JSON` | Versão atualizada do relatório |
| `AudienciaPublicaPorChaveV2` / `AudienciaPublicaPorChaveV2JSON` | Uma audiência por chave/ID |

### Integração no projeto

- **Migration:** `supabase/migrations/20260206120000_audiencias_splegis_chave.sql` – coluna `splegis_chave` na tabela `audiencias`.
- **Edge Function:** `supabase/functions/fetch-audiencias` – sincroniza audiências chamando `AudienciasPublicasV2JSON`, faz upsert por `splegis_chave` e opção `?replace=1` para limpar e reimportar sem duplicar.
- **Uso:**  
  - Deploy: `supabase functions deploy fetch-audiencias`  
  - Chamar com cron ou manualmente: `POST /functions/v1/fetch-audiencias?dataInicial=2025-01-01&dataFinal=2025-12-31` (e opcionalmente `&replace=1`).

Detalhes em: `supabase/functions/fetch-audiencias/README.md`.

---

## 2. SIP – ConsultaSIP.asmx

- **URL base:** https://app-sipws-prd.azurewebsites.net/Servico/ConsultaSIP.asmx  
- **WSDL:** https://app-sipws-prd.azurewebsites.net/Servico/ConsultaSIP.asmx?WSDL  

Serviço SOAP em .asmx. Ainda não há documentação interna dos métodos/parâmetros.

### Próximos passos

1. Acessar o WSDL e listar operações.
2. Definir quais consultas o app precisa (ex.: processos, andamentos, etc.).
3. Implementar cliente (ex.: `src/integrations/sip/client.ts`) ou Edge Function que chame o serviço e normalize os dados para o banco/UI.

Placeholder do módulo: `src/integrations/sip/README.md`.
