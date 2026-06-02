import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import ContentArticle from "@/components/institucional/ContentArticle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const CamaraExplica = () => {
  return (
    <InstitutionalLayout title="Câmara Explica" category="Educação Legislativa">
      <ContentArticle title="Como funciona a Câmara Municipal?" readTime="10 min de leitura">
        <p className="text-muted-foreground">
          Entenda de forma simples e clara como funciona o Poder Legislativo municipal e como você
          pode participar.
        </p>

        <Accordion type="single" collapsible className="mt-6">
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-left">O que faz a Câmara Municipal?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-3">
              <p>
                A Câmara Municipal é o Poder Legislativo da cidade. Ela é responsável por criar,
                debater e aprovar leis que afetam diretamente a vida dos cidadãos.
              </p>
              <p>
                Além disso, a Câmara fiscaliza as ações do Prefeito e da Prefeitura, garantindo que
                os recursos públicos sejam usados de forma correta e transparente.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger className="text-left">Como uma lei é criada?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-3">
              <p>O processo de criação de uma lei municipal segue estas etapas:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>
                  <strong>Projeto de Lei:</strong> Um vereador ou o Prefeito propõe uma nova lei
                </li>
                <li>
                  <strong>Comissões:</strong> O projeto é analisado por comissões especializadas
                </li>
                <li>
                  <strong>Emendas:</strong> Outros vereadores podem sugerir mudanças
                </li>
                <li>
                  <strong>Votação:</strong> O projeto é votado em plenário
                </li>
                <li>
                  <strong>Sanção:</strong> Se aprovado, segue para o Prefeito sancionar
                </li>
                <li>
                  <strong>Publicação:</strong> A lei entra em vigor após publicação oficial
                </li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger className="text-left">Quem pode propor uma lei?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-3">
              <p>Podem apresentar projetos de lei:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Vereadores (individualmente ou em grupo)</li>
                <li>O Prefeito</li>
                <li>Cidadãos (através de iniciativa popular com assinaturas)</li>
                <li>Comissões da própria Câmara</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger className="text-left">O que são Comissões?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-3">
              <p>
                As Comissões são grupos de vereadores especializados em diferentes temas (educação,
                saúde, transporte, etc.).
              </p>
              <p>
                Elas analisam projetos de lei relacionados à sua área, realizam audiências públicas
                e produzem pareceres técnicos antes da votação em plenário.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5">
            <AccordionTrigger className="text-left">Como posso participar?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-3">
              <p>Você pode participar de várias formas:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Assistindo às sessões plenárias (presencial ou online)</li>
                <li>Participando de audiências públicas</li>
                <li>Propondo projetos por iniciativa popular</li>
                <li>Entrando em contato com seu vereador</li>
                <li>Acompanhando as votações pelo portal da transparência</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-6">
            <AccordionTrigger className="text-left">O que é uma Sessão Plenária?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-3">
              <p>
                A Sessão Plenária é a reunião de todos os vereadores no plenário principal da
                Câmara. É nela que os projetos de lei são debatidos e votados.
              </p>
              <p>
                As sessões são públicas e transmitidas ao vivo, garantindo total transparência nas
                decisões legislativas.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-8 p-4 bg-primary/5 rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">💡 Ficou com dúvidas?</h3>
          <p className="text-sm text-muted-foreground">
            Entre em contato com a Ouvidoria da Câmara Municipal pelo telefone (11) 3396-4000 ou
            pelo e-mail ouvidoria@camara.sp.gov.br
          </p>
        </div>

        <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p>
            <strong>Fonte:</strong> Assessoria de Educação Legislativa
          </p>
          <p>
            <strong>Conteúdo:</strong> Linguagem simplificada para facilitar a compreensão
          </p>
        </div>
      </ContentArticle>
    </InstitutionalLayout>
  );
};

export default CamaraExplica;
