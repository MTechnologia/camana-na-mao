import { useState } from "react";
import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import GlobalSearch from "@/components/institucional/GlobalSearch";
import { GraduationCap, Clock, Users, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: "iniciante" | "intermediario" | "avancado";
  participants: number;
  available: boolean;
}

const mockCourses: Course[] = [
  {
    id: "1",
    title: "Introdução à Participação Cidadã",
    description:
      "Aprenda como participar ativamente das decisões municipais e fazer sua voz ser ouvida.",
    duration: "4 semanas",
    level: "iniciante",
    participants: 245,
    available: true,
  },
  {
    id: "2",
    title: "Processo Legislativo Municipal",
    description:
      "Entenda em detalhes como funciona o processo de criação e aprovação de leis na cidade.",
    duration: "6 semanas",
    level: "intermediario",
    participants: 178,
    available: true,
  },
  {
    id: "3",
    title: "Controle Social e Transparência",
    description:
      "Descubra como fiscalizar o uso de recursos públicos e exigir transparência governamental.",
    duration: "5 semanas",
    level: "intermediario",
    participants: 156,
    available: true,
  },
  {
    id: "4",
    title: "Elaboração de Projetos de Lei Popular",
    description:
      "Curso avançado sobre como elaborar e apresentar projetos de lei por iniciativa popular.",
    duration: "8 semanas",
    level: "avancado",
    participants: 89,
    available: false,
  },
];

const levelLabels = {
  iniciante: { label: "Iniciante", color: "bg-green-500/10 text-green-600" },
  intermediario: { label: "Intermediário", color: "bg-blue-500/10 text-blue-600" },
  avancado: { label: "Avançado", color: "bg-purple-500/10 text-purple-600" },
};

const EscolaParlamento = () => {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <>
      <InstitutionalLayout
        title="Escola do Parlamento"
        category="Educação"
        onSearch={() => setShowSearch(true)}
      >
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Escola do Parlamento
            </h1>
            <p className="text-muted-foreground">
              Cursos gratuitos para fortalecer a participação cidadã e a
              democracia participativa
            </p>
          </div>

          <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Educação para a Cidadania
                </h3>
                <p className="text-sm text-muted-foreground">
                  A Escola do Parlamento oferece capacitação gratuita para que
                  você compreenda melhor o funcionamento do poder legislativo e
                  possa participar ativamente da política municipal.
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Cursos Disponíveis
            </h2>

            {mockCourses.map((course) => {
              const levelInfo = levelLabels[course.level];
              return (
                <Card
                  key={course.id}
                  className={`p-5 ${!course.available ? "opacity-60" : "hover:shadow-md"} transition-shadow`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground flex-1">
                        {course.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`shrink-0 ${levelInfo.color}`}
                      >
                        {levelInfo.label}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {course.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{course.duration}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>{course.participants} participantes</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4" />
                        <span>100% online</span>
                      </div>
                    </div>

                    <Button
                      disabled={!course.available}
                      className="w-full"
                      variant={course.available ? "default" : "outline"}
                    >
                      {course.available
                        ? "Inscrever-se gratuitamente"
                        : "Em breve"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-5 bg-muted/50">
            <h3 className="font-semibold text-foreground mb-3">
              Como funcionam os cursos?
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✅ 100% gratuitos e online</li>
              <li>✅ Certificado de conclusão</li>
              <li>✅ Material didático incluso</li>
              <li>✅ Fóruns de discussão</li>
              <li>✅ Suporte de tutores especializados</li>
              <li>✅ Flexibilidade de horários</li>
            </ul>
          </Card>

          <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p>
              <strong>Informações:</strong> Para mais informações sobre os
              cursos, entre em contato pelo e-mail
              escola@camara.sp.gov.br
            </p>
            <p>
              <strong>Certificação:</strong> Reconhecido pela Câmara Municipal
              de São Paulo
            </p>
          </div>
        </div>
      </InstitutionalLayout>

      <GlobalSearch open={showSearch} onOpenChange={setShowSearch} />
    </>
  );
};

export default EscolaParlamento;
