import { useLocation } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollText, FileText, Users, ShieldCheck } from "lucide-react";
import { DocumentViewer } from "@/components/docs/DocumentViewer";

const termsOfUseContent = `
# Termos de Uso - Câmara na Mão

**Última atualização:** ${new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })}

---

## 1. Aceitação dos Termos

Ao criar uma conta ou utilizar a plataforma **Câmara na Mão**, disponibilizada pela **Câmara Municipal de São Paulo**, você declara ter lido, compreendido e concordado com estes Termos de Uso. Caso não concorde, não utilize a plataforma.

O uso da plataforma também está sujeito à nossa **Política de Privacidade**, que descreve como tratamos seus dados pessoais em conformidade com a LGPD.

---

## 2. Objeto

A Câmara na Mão é uma plataforma pública e gratuita que permite ao munícipe:

- Registrar relatos urbanos e de transporte;
- Avaliar serviços públicos;
- Acompanhar e participar de audiências públicas;
- Obter informações sobre a Câmara Municipal e seus serviços;
- Interagir com um assistente virtual de apoio.

---

## 3. Cadastro e Conta

### 3.1 Elegibilidade
A plataforma é destinada a **maiores de 18 anos**. Menores de idade devem ter autorização e supervisão de responsável legal.

### 3.2 Informações cadastrais
Você se compromete a fornecer informações **verdadeiras, exatas e atualizadas** no cadastro e a mantê-las atualizadas.

### 3.3 Segurança da conta
Você é responsável por manter a confidencialidade de suas credenciais e por todas as atividades realizadas em sua conta. Comunique imediatamente qualquer uso não autorizado.

---

## 4. Uso Permitido

Você concorda em utilizar a plataforma apenas para finalidades **lícitas** e de acordo com estes Termos, registrando relatos e manifestações de **boa-fé** e com informações verídicas.

---

## 5. Condutas Proibidas

É vedado ao usuário:

- Fornecer informações falsas, enganosas ou registrar relatos fraudulentos;
- Publicar conteúdo ilícito, ofensivo, discriminatório, difamatório ou que viole direitos de terceiros;
- Enviar imagens com conteúdo sexual, violento, ou que exponham dados pessoais sensíveis de terceiros sem autorização;
- Utilizar a plataforma para spam, propaganda eleitoral irregular ou fins comerciais;
- Tentar acessar áreas restritas, burlar mecanismos de segurança ou sobrecarregar a infraestrutura;
- Utilizar robôs, scrapers ou meios automatizados não autorizados.

---

## 6. Conteúdo do Usuário

### 6.1 Responsabilidade
Você é o único responsável pelo conteúdo que envia (textos, imagens e avaliações) e declara possuir os direitos necessários sobre esse conteúdo.

### 6.2 Licença de uso
Ao enviar conteúdo, você concede à Câmara Municipal de São Paulo uma licença não exclusiva e gratuita para utilizá-lo no âmbito das finalidades públicas da plataforma (processamento de relatos, encaminhamentos, estatísticas agregadas e melhoria de serviços).

### 6.3 Moderação
O conteúdo enviado pode passar por **moderação automática e/ou humana**. Conteúdos que violem estes Termos podem ser bloqueados, ocultados ou removidos, e a conta poderá ser suspensa.

---

## 7. Relatos e Encaminhamentos

Os relatos registrados são **manifestações cidadãs** e podem ser processados, triados e encaminhados internamente pelas equipes competentes da Câmara Municipal. O registro de um relato **não garante** prazo de resposta, atendimento ou solução específica, que dependem da análise e das competências dos órgãos responsáveis.

---

## 8. Propriedade Intelectual

A plataforma, suas marcas, layout, textos, código e demais elementos são protegidos por direitos de propriedade intelectual da Câmara Municipal de São Paulo ou de seus licenciadores. É vedada a reprodução ou uso não autorizado.

---

## 9. Privacidade e Proteção de Dados

O tratamento de dados pessoais é regido pela nossa **Política de Privacidade**, em conformidade com a **Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)**. Recomendamos a leitura atenta desse documento.

---

## 10. Disponibilidade e Alterações do Serviço

A plataforma é oferecida "no estado em que se encontra". Podemos, a qualquer tempo, alterar, suspender ou descontinuar funcionalidades, bem como realizar manutenções, buscando minimizar impactos ao usuário.

---

## 11. Limitação de Responsabilidade

Na máxima extensão permitida pela legislação, a Câmara Municipal de São Paulo não se responsabiliza por:

- Indisponibilidades temporárias, falhas técnicas ou interrupções do serviço;
- Conteúdo enviado por usuários;
- Danos decorrentes do uso indevido da plataforma pelo próprio usuário ou por terceiros.

---

## 12. Suspensão e Encerramento

Podemos suspender ou encerrar contas que violem estes Termos. Você também pode solicitar a exclusão da sua conta a qualquer momento pelo seu perfil, observadas as hipóteses legais de retenção de dados.

---

## 13. Alterações nestes Termos

Estes Termos podem ser atualizados periodicamente. Alterações significativas serão comunicadas pela plataforma e/ou por e-mail. O uso continuado após a atualização representa concordância com a nova versão.

---

## 14. Legislação Aplicável e Foro

Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da Comarca de São Paulo - SP para dirimir eventuais controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.

---

## 15. Contato

Para dúvidas sobre estes Termos de Uso:

📧 **E-mail**: camaranamao@saopaulo.sp.leg.br
📞 **Telefone**: (11) 3396-4000
📍 **Endereço**: Viaduto Jacareí, 100 - Bela Vista, São Paulo - SP

---

**Última atualização:** ${new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })}
`;

export default function TermsOfUsePage() {
  const location = useLocation();
  // Volta para a origem informada (ex.: /register passa state.from); senão, home.
  const backTo = (location.state as { from?: string } | null)?.from || "/";

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Termos de Uso" backTo={backTo} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ScrollText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Condições de Uso</h2>
                <p className="text-sm text-muted-foreground">
                  Regras para uso da plataforma Câmara na Mão
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>Manifestações de boa-fé</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>Respeito a terceiros</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                <span>Conformidade LGPD</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <DocumentViewer content={termsOfUseContent} />
      </div>
    </div>
  );
}
