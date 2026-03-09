import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import { GraduationCap, Clock, Users, BookOpen, CheckCircle2, ExternalLink, Loader2, Search, Filter, X, Calendar, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEscolaParlamento, type EscolaParlamentoItem } from "@/hooks/useEscolaParlamento";

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

interface CombinedCourse extends Course {
  wpItem?: EscolaParlamentoItem;
  isFromWordPress?: boolean;
  courseStatus?: "ead" | "upcoming" | "open_registration" | "in_progress" | "completed";
  courseYear?: number;
}

const levelLabels = {
  iniciante: { label: "Iniciante", color: "bg-green-500/10 text-green-600" },
  intermediario: { label: "Intermediário", color: "bg-blue-500/10 text-blue-600" },
  avancado: { label: "Avançado", color: "bg-purple-500/10 text-purple-600" },
};

type LevelFilter = "all" | "iniciante" | "intermediario" | "avancado";
type AvailabilityFilter = "all" | "available" | "coming_soon";
type EnrollmentFilter = "all" | "enrolled" | "not_enrolled";
type SortOption = "recent" | "participants" | "alphabetical";

const EscolaParlamento = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allCourses, setAllCourses] = useState<CombinedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["ead", "upcoming", "open_registration", "in_progress"]));
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  
  // Buscar TODOS os itens da API WordPress
  const { data: wpAllItems, isLoading: loadingWP, error: wpError } = useEscolaParlamento();
  
  useEffect(() => {
    if (wpAllItems) {
      console.log('[EscolaParlamento] wpAllItems loaded:', wpAllItems.length);
    }
    if (wpError) {
      console.error('[EscolaParlamento] wpError:', wpError);
    }
  }, [wpAllItems, wpError]);

  useEffect(() => {
    loadCourses();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadCourses runs when user/wpAllItems change
  }, [user, wpAllItems]);

  // Helper: Extrair duração do conteúdo HTML
  const extractDuration = (content: string): string => {
    const durationMatch = content.match(/(\d+)\s*(semanas?|dias?|meses?|horas?)/i);
    if (durationMatch) {
      return `${durationMatch[1]} ${durationMatch[2]}`;
    }
    return "A definir";
  };

  // Helper: Determinar nível do conteúdo
  const determineLevel = (content: string, title: string): "iniciante" | "intermediario" | "avancado" => {
    const lowerContent = (content + " " + title).toLowerCase();
    if (lowerContent.includes("avançado") || lowerContent.includes("avancado") || lowerContent.includes("expert")) {
      return "avancado";
    }
    if (lowerContent.includes("intermediário") || lowerContent.includes("intermediario") || lowerContent.includes("médio")) {
      return "intermediario";
    }
    return "iniciante";
  };

  // Helper: Verificar se é um curso
  const isCourse = (item: EscolaParlamentoItem): boolean => {
    const lowerSlug = item.slug.toLowerCase();
    const lowerTitle = item.title.toLowerCase();
    const lowerContent = item.content.toLowerCase();
    
    const coursePatterns = [
      'curso', 'cursos', 'capacitação', 'capacitacao', 'formação', 'formacao',
      'treinamento', 'aprendizado', 'ensino', 'educação', 'educacao',
      'módulo', 'modulo', 'aula', 'aulas'
    ];
    
    if (coursePatterns.some(pattern => lowerSlug.includes(pattern) || lowerTitle.includes(pattern))) {
      return true;
    }
    
    if (lowerContent.includes('curso') || lowerContent.includes('capacitação') || lowerContent.includes('capacitacao')) {
      if (lowerContent.includes('curso de') || lowerContent.includes('curso sobre') || 
          lowerContent.includes('curso para') || lowerContent.includes('curso em')) {
        return true;
      }
    }
    
    return false;
  };

  // Helper: Determinar status do curso
  const determineCourseStatus = (item: EscolaParlamentoItem): { status: CombinedCourse["courseStatus"], year?: number } => {
    const lowerContent = (item.content + " " + item.title).toLowerCase();
    const lowerTitle = item.title.toLowerCase();
    const date = new Date(item.date);
    const now = new Date();
    const year = date.getFullYear();
    
    // EAD - Ensino a Distância
    if (lowerContent.includes('ead') || 
        lowerContent.includes('ensino a distância') || 
        lowerContent.includes('ensino a distancia') ||
        lowerContent.includes('online') ||
        lowerContent.includes('remoto') ||
        lowerTitle.includes('ead')) {
      return { status: "ead", year };
    }
    
    // Inscrições abertas
    if (lowerContent.includes('inscrições abertas') || 
        lowerContent.includes('inscrições abertas') ||
        lowerContent.includes('inscrições até') ||
        lowerContent.includes('inscreva-se') ||
        lowerContent.includes('inscrições encerradas') === false) {
      // Verificar se ainda não passou muito tempo desde a publicação
      const daysSincePublish = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePublish < 90) { // Considerar "inscrições abertas" se foi publicado nos últimos 90 dias
        return { status: "open_registration", year };
      }
    }
    
    // Próximos cursos - data futura ou muito recente
    const daysSincePublish = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (date > now || daysSincePublish < 30) {
      if (lowerContent.includes('em breve') || lowerContent.includes('próximo') || lowerContent.includes('proximo')) {
        return { status: "upcoming", year };
      }
    }
    
    // Em andamento - publicado recentemente mas não muito antigo
    if (daysSincePublish >= 30 && daysSincePublish < 180) {
      if (lowerContent.includes('em andamento') || 
          lowerContent.includes('acontecendo') ||
          lowerContent.includes('ocorrendo')) {
        return { status: "in_progress", year };
      }
    }
    
    // Realizados - cursos antigos ou que mencionam "realizado"
    if (daysSincePublish >= 180 || 
        lowerContent.includes('realizado') || 
        lowerContent.includes('concluído') ||
        lowerContent.includes('concluido') ||
        year < now.getFullYear()) {
      return { status: "completed", year };
    }
    
    // Default: considerar como realizado se for do ano passado ou anterior
    if (year < now.getFullYear()) {
      return { status: "completed", year };
    }
    
    // Se não conseguir determinar, usar data como critério
    if (date < now) {
      return { status: "completed", year };
    }
    
    return { status: "upcoming", year };
  };

  // Se usuário estiver logado, buscar inscrições
  const [enrollments, setEnrollments] = useState<string[]>([]);
  
  useEffect(() => {
    const loadEnrollments = async () => {
      if (!user) {
        setEnrollments([]);
        return;
      }
      
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('parlamento_course_enrollments')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('status', 'inscrito');

      if (!enrollmentsError && enrollmentsData) {
        setEnrollments(enrollmentsData.map(e => e.course_id));
      }
    };
    
    loadEnrollments();
  }, [user]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      
      // Mapear cursos da API WordPress
      const wpCourses: CombinedCourse[] = (wpAllItems || [])
        .filter(item => {
          if (item.status !== 'publish') return false;
          return isCourse(item);
        })
        .map(item => {
          const { status, year } = determineCourseStatus(item);
          return {
            id: `wp-${item.wp_id}`,
            title: item.title,
            description: item.excerpt || "Curso da Escola do Parlamento",
            duration: extractDuration(item.content),
            level: determineLevel(item.content, item.title),
            participants_count: 0,
            available: true,
            is_enrolled: enrollments.includes(`wp-${item.wp_id}`),
            wpItem: item,
            isFromWordPress: true,
            courseStatus: status,
            courseYear: year,
          };
        });

      setAllCourses(wpCourses);
    } catch (error: unknown) {
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
        const errorMsg = (error instanceof Error ? error.message : String(error)).toLowerCase();
        if (errorMsg.includes('duplicate') || errorMsg.includes('unique') || errorMsg.includes('already')) {
          toast.success("Você já está inscrito neste curso!");
        } else {
          throw error;
        }
      } else {
        toast.success("Inscrição realizada com sucesso!");
      }

      if (user) {
        const { data: enrollmentsData } = await supabase
          .from('parlamento_course_enrollments')
          .select('course_id')
          .eq('user_id', user.id)
          .eq('status', 'inscrito');
        
        if (enrollmentsData) {
          setEnrollments(enrollmentsData.map(e => e.course_id));
        }
      }
      
      setAllCourses(prev => prev.map(c => 
        c.id === courseId 
          ? { ...c, is_enrolled: true, participants_count: (c.participants_count || 0) + 1 }
          : c
      ));
    } catch (error: unknown) {
      console.error("Error enrolling in course:", error);
      toast.error("Erro ao realizar inscrição. Tente novamente.");
    } finally {
      setEnrolling(null);
    }
  };

  // Filtrar cursos por busca e nível
  const filteredCourses = useMemo(() => {
    let filtered = [...allCourses];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query)
      );
    }

    if (levelFilter !== "all") {
      filtered = filtered.filter(course => course.level === levelFilter);
    }

    return filtered;
  }, [allCourses, searchQuery, levelFilter]);

  // Agrupar cursos por categoria
  const coursesByCategory = useMemo(() => {
    const ead = filteredCourses.filter(c => c.courseStatus === "ead");
    const upcoming = filteredCourses.filter(c => c.courseStatus === "upcoming");
    const openRegistration = filteredCourses.filter(c => c.courseStatus === "open_registration");
    const inProgress = filteredCourses.filter(c => c.courseStatus === "in_progress");
    const completed = filteredCourses.filter(c => c.courseStatus === "completed");
    
    // Agrupar realizados por ano
    const completedByYear = completed.reduce((acc, course) => {
      const year = course.courseYear || new Date().getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(course);
      return acc;
    }, {} as Record<number, CombinedCourse[]>);
    
    // Ordenar anos em ordem decrescente
    const sortedYears = Object.keys(completedByYear)
      .map(Number)
      .sort((a, b) => b - a);
    
    return {
      ead,
      upcoming,
      openRegistration,
      inProgress,
      completed,
      completedByYear,
      sortedYears,
    };
  }, [filteredCourses]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const renderCourseCard = (course: CombinedCourse) => {
    const levelInfo = levelLabels[course.level];
    const canEnroll = !course.isFromWordPress && course.available;
    
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
            <div className="flex items-center gap-2">
              {course.isFromWordPress && (
                <Badge variant="outline" className="text-xs">
                  WordPress
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`shrink-0 ${levelInfo.color}`}
              >
                {levelInfo.label}
              </Badge>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {course.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{course.duration}</span>
            </div>
            {course.participants_count > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{course.participants_count} participantes</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span>100% online</span>
            </div>
          </div>

          <div className="flex gap-2">
            {canEnroll ? (
              <Button
                disabled={enrolling === course.id}
                onClick={() => handleEnroll(course.id)}
                className="flex-1"
                variant="default"
              >
                {enrolling === course.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Inscrevendo...
                  </>
                ) : course.is_enrolled ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Inscrito
                  </>
                ) : (
                  "Inscrever-se gratuitamente"
                )}
              </Button>
            ) : course.isFromWordPress && course.wpItem ? (
              <Button
                onClick={() => window.open(course.wpItem!.link, '_blank')}
                className="flex-1"
                variant="default"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver no site oficial
              </Button>
            ) : (
              <Button
                disabled
                className="flex-1"
                variant="outline"
              >
                Em breve
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const renderSection = (
    title: string,
    courses: CombinedCourse[],
    sectionKey: string,
    icon?: React.ReactNode
  ) => {
    if (courses.length === 0) return null;
    
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <div className="space-y-4">
        <Collapsible open={isExpanded} onOpenChange={() => toggleSection(sectionKey)}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
              <div className="flex items-center gap-3">
                {icon}
                <h2 className="text-xl font-semibold text-foreground">
                  {title}
                </h2>
                <Badge variant="secondary" className="ml-2">
                  {courses.length}
                </Badge>
              </div>
              <ChevronRight 
                className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-4 pt-4">
              {courses.map(course => renderCourseCard(course))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  const totalLoading = loading || loadingWP;

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

        {/* Filtros */}
        <Card className="p-4">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar cursos por título ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-3">
              <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as LevelFilter)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="iniciante">Iniciante</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || levelFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setLevelFilter("all");
                  }}
                  className="h-10"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>
        </Card>

        {totalLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p>Carregando cursos...</p>
          </div>
        ) : wpError ? (
          <div className="text-center py-8">
            <p className="text-destructive mb-2">Erro ao carregar cursos da Escola do Parlamento</p>
            <p className="text-sm text-muted-foreground">Tente novamente mais tarde.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* EAD */}
            {renderSection(
              "EAD - Ensino a Distância",
              coursesByCategory.ead,
              "ead",
              <BookOpen className="h-5 w-5 text-primary" />
            )}

            {/* Próximos Cursos */}
            {renderSection(
              "Próximos Cursos",
              coursesByCategory.upcoming,
              "upcoming",
              <Calendar className="h-5 w-5 text-blue-500" />
            )}

            {/* Inscrições Abertas */}
            {renderSection(
              "Inscrições Abertas",
              coursesByCategory.openRegistration,
              "open_registration",
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}

            {/* Em Andamento */}
            {renderSection(
              "Em Andamento",
              coursesByCategory.inProgress,
              "in_progress",
              <Clock className="h-5 w-5 text-orange-500" />
            )}

            {/* Cursos Realizados */}
            {coursesByCategory.sortedYears.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Cursos Realizados
                </h2>
                {coursesByCategory.sortedYears.map(year => {
                  const yearCourses = coursesByCategory.completedByYear[year] || [];
                  if (yearCourses.length === 0) return null;
                  
                  const sectionKey = `completed-${year}`;
                  const isExpanded = expandedSections.has(sectionKey);
                  
                  return (
                    <Collapsible
                      key={year}
                      open={isExpanded}
                      onOpenChange={() => toggleSection(sectionKey)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-lg font-semibold text-foreground">
                              Cursos Realizados em {year}
                            </h3>
                            <Badge variant="secondary" className="ml-2">
                              {yearCourses.length}
                            </Badge>
                          </div>
                          <ChevronRight 
                            className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-4 pt-4">
                          {yearCourses.map(course => renderCourseCard(course))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}

            {filteredCourses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-2">Nenhum curso encontrado com os filtros aplicados.</p>
                <Button variant="outline" size="sm" onClick={() => {
                  setSearchQuery("");
                  setLevelFilter("all");
                }}>
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        )}

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
