# Integração API SIP (ConsultaSIP.asmx)

- **Base:** https://app-sipws-prd.azurewebsites.net/Servico/ConsultaSIP.asmx

Serviço SOAP/.asmx. Para integrar:

1. Obter WSDL em `ConsultaSIP.asmx?WSDL` e documentação dos métodos.
2. Implementar cliente em `client.ts` (ou chamadas em Edge Function) conforme operações necessárias.
3. Tratar autenticação se exigida (header ou parâmetros).

Quando houver especificação dos métodos e parâmetros, este módulo será implementado.
