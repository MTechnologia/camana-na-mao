import { useLocation } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  Shield,
  FileText,
  Lock,
  Eye,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { DocumentViewer } from "@/components/docs/DocumentViewer";

const privacyPolicyContent = `
# Política de Privacidade - Câmara na Mão

**Última atualização:** ${new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })}

---

## 1. Introdução

A Câmara Municipal de São Paulo, através da plataforma **Câmara na Mão**, está comprometida com a proteção da privacidade e dos dados pessoais dos cidadãos, em conformidade com a **Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)**.

Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos suas informações pessoais quando você utiliza nossa plataforma.

---

## 2. Responsável pelo Tratamento

**Câmara Municipal de São Paulo**  
Viaduto Jacareí, 100 - Bela Vista  
São Paulo - SP, 01319-900  
📧 camaranamao@saopaulo.sp.leg.br  
🌐 www.saopaulo.sp.leg.br

---

## 3. Dados Coletados

### 3.1 Dados Cadastrais (Obrigatórios)
- Nome completo
- Email
- Telefone
- Senha (criptografada)

### 3.2 Dados Demográficos (Opcionais)
- Data de nascimento
- Gênero
- Raça/etnia
- Faixa de renda

### 3.3 Dados de Localização
- Endereço (CEP, rua, bairro, cidade)
- Coordenadas geográficas (quando autorizado)

### 3.4 Dados de Uso
- Relatos urbanos e de transporte
- Avaliações de serviços públicos
- Participações em audiências
- Interações com o assistente virtual
- Histórico de navegação

### 3.5 Dados de Interesse
- Categorias de interesse selecionadas
- Preferências de notificação

---

## 4. Base Legal e Finalidade

### 4.1 Consentimento
Utilizamos seus dados pessoais com base no seu **consentimento livre, informado e inequívoco** para:

- Criar e gerenciar sua conta
- Processar seus relatos e manifestações
- Enviar notificações sobre seus relatos
- Personalizar sua experiência na plataforma
- Coletar dados demográficos (opcional)

### 4.2 Interesse Público
Utilizamos seus dados com base no **interesse público** para:

- Registrar e processar manifestações cidadãs
- Encaminhar demandas para vereadores e comissões
- Gerar estatísticas e análises agregadas
- Melhorar serviços públicos

### 4.3 Cumprimento de Obrigações Legais
Utilizamos seus dados para:

- Cumprir obrigações legais da Câmara Municipal
- Manter registros conforme legislação aplicável

---

## 5. Como Utilizamos Seus Dados

### 5.1 Funcionalidades da Plataforma
- Processar e responder seus relatos
- Conectar suas demandas aos vereadores apropriados
- Facilitar sua participação em audiências públicas
- Recomendar serviços públicos próximos
- Personalizar conteúdo e notificações

### 5.2 Melhorias e Análises
- Analisar padrões e tendências (dados agregados e anonimizados)
- Melhorar a qualidade dos serviços
- Desenvolver novas funcionalidades

### 5.3 Comunicações
- Enviar confirmações de relatos
- Notificar sobre atualizações de seus relatos
- Informar sobre audiências e eventos relevantes
- Enviar newsletter (apenas com consentimento)

---

## 6. Compartilhamento de Dados

### 6.1 Compartilhamento Interno
Seus dados podem ser compartilhados internamente com:
- Gestores da Câmara Municipal para processamento de relatos
- Vereadores e assessores (apenas relatos encaminhados)
- Equipe técnica para manutenção do sistema

### 6.2 Compartilhamento Externo
Seus dados **NÃO são vendidos** ou compartilhados com terceiros para fins comerciais.

Podemos compartilhar dados agregados e anonimizados para:
- Pesquisas acadêmicas
- Relatórios públicos
- Parcerias institucionais

### 6.3 Requisições Legais
Podemos divulgar seus dados se exigido por lei, ordem judicial ou autoridade competente.

---

## 7. Segurança dos Dados

Implementamos medidas técnicas e organizacionais para proteger seus dados:

- **Criptografia**: Dados sensíveis criptografados em trânsito e em repouso
- **Autenticação**: Sistema de autenticação seguro com tokens JWT
- **Controle de Acesso**: Row Level Security (RLS) no banco de dados
- **Monitoramento**: Logs de acesso e auditoria de operações
- **Backup**: Cópias de segurança regulares

---

## 8. Retenção de Dados

| Tipo de Dado | Período de Retenção | Ação Após Período |
|--------------|---------------------|-------------------|
| Dados cadastrais | Enquanto a conta estiver ativa | Exclusão ou anonimização |
| Relatos e manifestações | 5 anos | Anonimização |
| Dados de localização precisa | 24 horas | Agregação/Anonimização |
| Dados demográficos | 90 dias após último uso | Anonimização |
| Logs de acesso | 90 dias | Exclusão |

---

## 9. Seus Direitos (LGPD)

Você tem os seguintes direitos sobre seus dados pessoais:

### 9.1 Acesso
Você pode solicitar acesso a todos os seus dados pessoais armazenados.

### 9.2 Correção
Você pode corrigir ou atualizar seus dados a qualquer momento através do perfil.

### 9.3 Exclusão
Você pode solicitar a exclusão de sua conta e dados pessoais, exceto quando houver obrigação legal de retenção.

### 9.4 Portabilidade
Você pode solicitar a exportação de seus dados em formato legível e interoperável.

### 9.5 Revogação de Consentimento
Você pode revogar seu consentimento a qualquer momento através das configurações de privacidade.

### 9.6 Oposição
Você pode se opor ao tratamento de seus dados para finalidades específicas.

### 9.7 Revisão de Decisões Automatizadas
Você pode solicitar revisão de decisões tomadas exclusivamente por processamento automatizado.

---

## 10. Consentimento

### 10.1 Consentimento Granular
Você pode gerenciar seus consentimentos de forma granular:
- Consentimento para coleta de dados cadastrais
- Consentimento para uso de localização
- Consentimento para dados demográficos
- Consentimento para newsletter
- Consentimento para compartilhamento com vereadores

### 10.2 Revogação
Você pode revogar qualquer consentimento a qualquer momento. A revogação não afeta tratamentos já realizados com base no consentimento anterior.

---

## 11. Cookies e Tecnologias Similares

Utilizamos cookies e tecnologias similares para:
- Manter sua sessão ativa
- Melhorar a experiência de uso
- Analisar padrões de uso (dados agregados)

Você pode gerenciar cookies através das configurações do navegador.

---

## 12. Menores de Idade

A plataforma é destinada a maiores de 18 anos. Menores de idade devem ter autorização de responsável legal para utilizar a plataforma.

---

## 13. Alterações nesta Política

Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre alterações significativas através de:
- Notificação na plataforma
- Email (se cadastrado)
- Atualização da data de "Última atualização"

---

## 14. Como Exercer Seus Direitos

Para exercer seus direitos ou esclarecer dúvidas sobre esta política:

📧 **Email**: camaranamao@saopaulo.sp.leg.br  
📞 **Telefone**: (11) 3396-4000  
📍 **Endereço**: Viaduto Jacareí, 100 - Bela Vista, São Paulo - SP

Você também pode:
- Acessar suas configurações de privacidade no perfil
- Exportar seus dados através do perfil
- Solicitar exclusão de conta através do perfil

---

## 15. Encarregado de Proteção de Dados (DPO)

Para questões relacionadas à proteção de dados, entre em contato com o Encarregado de Proteção de Dados da Câmara Municipal de São Paulo.

---

## 16. Legislação Aplicável

Esta Política de Privacidade está em conformidade com:
- **Lei Geral de Proteção de Dados (LGPD)** - Lei nº 13.709/2018
- **Marco Civil da Internet** - Lei nº 12.965/2014
- **Código de Defesa do Consumidor** - Lei nº 8.078/1990

---

## 17. Consentimento

Ao utilizar a plataforma Câmara na Mão, você declara ter lido, compreendido e concordado com esta Política de Privacidade.

**Última atualização:** ${new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })}
`;

export default function PrivacyPolicyPage() {
  const location = useLocation();
  // Volta para a origem quando ela é informada (ex.: /perfil/consentimentos,
  // /perfil/direitos ou /register passam state.from); senão, home. Evita o
  // destino fixo "/" que tirava o usuário do fluxo de onde veio.
  const backTo = (location.state as { from?: string } | null)?.from || "/";

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Política de Privacidade" backTo={backTo} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Proteção de Dados</h2>
                <p className="text-sm text-muted-foreground">
                  Sua privacidade é importante para nós
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span>Dados criptografados</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span>Conformidade LGPD</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                <span>Consentimento granular</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <DocumentViewer content={privacyPolicyContent} />
      </div>
    </div>
  );
}
