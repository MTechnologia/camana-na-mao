import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import ContentArticle from "@/components/institucional/ContentArticle";

const ConhecaCamara = () => {
  return (
    <InstitutionalLayout
      title="Conheça a Câmara"
      category="Institucional"
    >
        <ContentArticle
          title="História da Câmara Municipal de São Paulo"
          author="Assessoria de Comunicação"
          date="Atualizado em 10/12/2024"
          readTime="8 min de leitura"
        >
          <p>
            A Câmara Municipal de São Paulo é uma das mais antigas instituições
            democráticas do Brasil, com uma história que remonta ao período
            colonial.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
            Origens e Fundação
          </h2>

          <p>
            Fundada em 1560, a Câmara Municipal nasceu junto com a própria
            cidade de São Paulo. No período colonial, as câmaras municipais
            exerciam importantes funções administrativas, judiciais e
            legislativas.
          </p>

          <p>
            Ao longo dos séculos, a Câmara Municipal acompanhou todas as
            transformações políticas do Brasil: Império, República, ditaduras e
            redemocratização.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
            Estrutura Atual
          </h2>

          <p>
            Hoje, a Câmara Municipal de São Paulo é composta por 55 vereadores
            eleitos democraticamente para mandatos de quatro anos. A Casa é
            responsável por:
          </p>

          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Elaborar e aprovar leis municipais</li>
            <li>Fiscalizar o Poder Executivo</li>
            <li>Aprovar o orçamento municipal</li>
            <li>Realizar audiências públicas</li>
            <li>Representar os interesses da população</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
            Sede e Patrimônio
          </h2>

          <p>
            O edifício principal da Câmara Municipal está localizado no Viaduto
            Jacareí, 100, no bairro da Bela Vista, região central de São Paulo.
            O prédio é um importante marco arquitetônico da cidade.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
            Missão e Valores
          </h2>

          <p>
            A Câmara Municipal tem como missão representar a vontade popular,
            elaborar leis que melhorem a vida dos cidadãos e fiscalizar a
            aplicação dos recursos públicos com transparência e eficiência.
          </p>

          <div className="mt-8 p-6 bg-primary/5 border-l-4 border-primary rounded-r-lg">
            <p className="text-foreground font-medium italic">
              "A Câmara Municipal é a casa do povo, onde as decisões que
              impactam o dia a dia de todos os paulistanos são tomadas de forma
              democrática e participativa."
            </p>
          </div>

          <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p><strong>Fonte:</strong> Portal da Câmara Municipal de São Paulo</p>
            <p><strong>Documentação:</strong> Arquivo Histórico da Câmara Municipal</p>
            <p><strong>Última atualização:</strong> 10/12/2024</p>
          </div>
        </ContentArticle>
      </InstitutionalLayout>
  );
};

export default ConhecaCamara;
