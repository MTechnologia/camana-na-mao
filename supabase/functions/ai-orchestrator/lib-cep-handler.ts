type LookupCepResult = {
  valid: boolean;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};

type ToolResult = { success: boolean; message: string; data?: unknown };

type HandleValidateCepDeps = {
  lookupCEP: (cep: string) => Promise<LookupCepResult>;
  isCitySaoPaulo: (city: string | undefined | null) => boolean;
  messageOutsideSaoPaulo: (city: string | undefined) => string;
};

export async function handleValidateCep(
  args: Record<string, unknown>,
  deps: HandleValidateCepDeps,
): Promise<ToolResult> {
  const cepStr = String(args.cep ?? "");
  const result = await deps.lookupCEP(cepStr);

  if (!result.valid) {
    return {
      success: false,
      message: "CEP não encontrado. Pode verificar o número? Se não souber o CEP, me diz o nome da rua e bairro.",
    };
  }

  if (!deps.isCitySaoPaulo(result.city)) {
    return {
      success: false,
      message: deps.messageOutsideSaoPaulo(result.city || undefined),
    };
  }

  const cleanCep = cepStr.replace(/\D/g, "");
  const addressData = {
    cep: cleanCep,
    street: result.street,
    neighborhood: result.neighborhood,
    city: result.city,
    state: result.state,
  };
  const progressMarker = `[COLLECTION_PROGRESS:urban_report:${JSON.stringify(addressData)}]`;

  return {
    success: true,
    message: `${progressMarker}[FIELD_REQUEST:street_number]✅ **CEP válido!**\n\n📍 **Endereço encontrado:**\n- Rua: ${result.street}\n- Bairro: ${result.neighborhood}\n- Cidade: ${result.city}/${result.state}\n\nQual o **número** ou **ponto de referência** próximo?`,
    data: addressData,
  };
}
