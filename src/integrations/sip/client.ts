/**
 * Cliente para a API SIP (ConsultaSIP.asmx).
 * https://app-sipws-prd.azurewebsites.net/Servico/ConsultaSIP.asmx
 *
 * Implementação pendente: obter WSDL e especificação dos métodos
 * para definir tipos e chamadas (SOAP ou REST/JSON se disponível).
 */

const SIP_WS_BASE = "https://app-sipws-prd.azurewebsites.net/Servico/ConsultaSIP.asmx";

export function getSipBaseUrl(): string {
  return SIP_WS_BASE;
}

// TODO: quando houver WSDL/documentação, adicionar tipos e funções de consulta
// export async function consultar...(params: ...): Promise<...> { ... }
