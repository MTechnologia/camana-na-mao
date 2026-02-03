import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import { GraduationCap, Clock, Users, BookOpen, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: "iniciante" | "intermediario" | "avancado";
  participants_count: number;
  available: boolean;
  is_enrolled?: boolean;
}

const levelLabels = {
  iniciante: { label: "Iniciante", color: "bg-green-500/10 text-green-600" },
  intermediario: { label: "Intermediário", color: "bg-blue-500/10 text-blue-600" },
  avancado: { label: "Avançado", color: "bg-purple-500/10 text-purple-600" },
};

const EscolaParlamento = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, [user]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      
      // Buscar cursos disponíveis
      const { data: coursesData, error: coursesError } = await supabase
        .from('parlamento_courses')
        .select('*')
        .order('created_at', { ascending: true });

      if (coursesError) throw coursesError;

      // Se usuário estiver logado, verificar inscrições
      let enrollments: string[] = [];
      if (user) {
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from('parlamento_course_enrollments')
          .select('course_id')
          .eq('user_id', user.id)
          .eq('status', 'inscrito');

        if (!enrollmentsError && enrollmentsData) {
          enrollments = enrollmentsData.map(e => e.course_id);
        }
      }

      // Mapear cursos e adicionar flag de inscrição
      const coursesWithEnrollment = (coursesData || []).map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        duration: course.duration,
        level: course.level as "iniciante" | "intermediario" | "avancado",
        participants_count: course.participants_count || 0,
        available: course.available,
        is_enrolled: enrollments.includes(course.id),
      }));

      setCourses(coursesWithEnrollment);
    } catch (error: any) {
      console.error("Error loading courses:", error);
      toast.error("Erro ao carregar cursos");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) {
      toast.error("Você precisa estar logado para se inscrever");
      navigate("/login");
      return;
    }

    setEnrolling(courseId);
    try {
      const { error } = await supabase
        .from('parlamento_course_enrollments')
        .insert({
          course_id: courseId,
          user_id: user.id,
          status: 'inscrito',
        });

      if (error) {
        // Verificar se já está inscrito
        const errorMsg = (error as any)?.message?.toLowerCase() || '';
        if (errorMsg.includes('duplicate') || errorMsg.includes('unique') || errorMsg.includes('already')) {
          toast.success("Você já está inscrito neste curso!");
        } else {
          throw error;
        }
      } else {
        toast.success("Inscrição realizada com sucesso!");
      }

      // Recarregar cursos para atualizar contador e status
      await loadCourses();
    } catch (error: any) {
      console.error("Error enrolling in course:", error);
      toast.error("Erro ao realizar inscrição. Tente novamente.");
    } finally {
      setEnrolling(null);
    }
  };
  return (
    <InstitutionalLayout
      title="Escola do Parlamento"
      category="Educação"
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

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando cursos...
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum curso disponível no momento.
              </div>
            ) : (
              courses.map((course) => {
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
                          <span>{course.participants_count} participantes</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-4 w-4" />
                          <span>100% online</span>
                        </div>
                      </div>

                      <Button
                        disabled={!course.available || enrolling === course.id}
                        onClick={() => course.available && handleEnroll(course.id)}
                        className="w-full"
                        variant={course.available ? "default" : "outline"}
                      >
                        {enrolling === course.id ? (
                          "Inscrevendo..."
                        ) : course.is_enrolled ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Inscrito
                          </>
                        ) : course.available ? (
                          "Inscrever-se gratuitamente"
                        ) : (
                          "Em breve"
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
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
  );
};

export default EscolaParlamento;
