import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalLayout from "@/components/institucional/InstitutionalLayout";
import { GraduationCap, Clock, Users, BookOpen, CheckCircle2, ExternalLink, Loader2, Search, Filter, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all");
  const [enrollmentFilter, setEnrollmentFilter] = useState<EnrollmentFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("recent");
  
  // Buscar TODOS os itens da API WordPress (não apenas categoria 'curso')
  const { data: wpAllItems, isLoading: loadingWP, error: wpError } = useEscolaParlamento();
  
  // Debug: verificar se o hook está funcionando
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

  // Helper: Verificar se é um curso (baseado em slug, título e conteúdo)
  const isCourse = (item: EscolaParlamentoItem): boolean => {
    const lowerSlug = item.slug.toLowerCase();
    const lowerTitle = item.title.toLowerCase();
    const lowerContent = item.content.toLowerCase();
    
    // Padrões que indicam curso
    const coursePatterns = [
      'curso', 'cursos', 'capacitação', 'capacitacao', 'formação', 'formacao',
      'treinamento', 'aprendizado', 'ensino', 'educação', 'educacao',
      'módulo', 'modulo', 'aula', 'aulas'
    ];
    
    // Verificar slug
    if (coursePatterns.some(pattern => lowerSlug.includes(pattern))) {
      return true;
    }
    
    // Verificar título
    if (coursePatterns.some(pattern => lowerTitle.includes(pattern))) {
      return true;
    }
    
    // Verificar conteúdo (apenas se mencionar "curso" ou "capacitação" de forma clara)
    if (lowerContent.includes('curso') || lowerContent.includes('capacitação') || lowerContent.includes('capacitacao')) {
      // Verificar se não é apenas uma menção genérica
      if (lowerContent.includes('curso de') || lowerContent.includes('curso sobre') || 
          lowerContent.includes('curso para') || lowerContent.includes('curso em')) {
        return true;
      }
    }
    
    return false;
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
      // Filtrar apenas itens que são realmente cursos
      const wpCourses: CombinedCourse[] = (wpAllItems || [])
        .filter(item => {
          // Apenas publicados
          if (item.status !== 'publish') return false;
          // Verificar se é um curso usando função helper
          return isCourse(item);
        })
        .map(item => {
          return {
            id: `wp-${item.wp_id}`,
            title: item.title,
            description: item.excerpt || "Curso da Escola do Parlamento",
            duration: extractDuration(item.content),
            level: determineLevel(item.content, item.title),
            participants_count: 0, // Será atualizado se houver inscrições no banco
            available: true,
            is_enrolled: enrollments.includes(`wp-${item.wp_id}`),
            wpItem: item,
            isFromWordPress: true,
          };
        });

      setAllCourses(wpCourses);
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

      // Atualizar lista de inscrições e recarregar
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
      
      // Atualizar estado do curso
      setAllCourses(prev => prev.map(c => 
        c.id === courseId 
          ? { ...c, is_enrolled: true, participants_count: (c.participants_count || 0) + 1 }
          : c
      ));
    } catch (error: any) {
      console.error("Error enrolling in course:", error);
      toast.error("Erro ao realizar inscrição. Tente novamente.");
    } finally {
      setEnrolling(null);
    }
  };

  // Filtrar e ordenar cursos
  const filteredAndSortedCourses = useMemo(() => {
    let filtered = [...allCourses];

    // Filtro de busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query)
      );
    }

    // Filtro por nível
    if (levelFilter !== "all") {
      filtered = filtered.filter(course => course.level === levelFilter);
    }

    // Filtro por disponibilidade
    if (availabilityFilter === "available") {
      filtered = filtered.filter(course => course.available);
    } else if (availabilityFilter === "coming_soon") {
      filtered = filtered.filter(course => !course.available);
    }

    // Filtro por inscrição
    if (enrollmentFilter === "enrolled") {
      filtered = filtered.filter(course => course.is_enrolled);
    } else if (enrollmentFilter === "not_enrolled") {
      filtered = filtered.filter(course => !course.is_enrolled);
    }

    // Ordenação
    switch (sortOption) {
      case "participants":
        filtered.sort((a, b) => (b.participants_count || 0) - (a.participants_count || 0));
        break;
      case "alphabetical":
        filtered.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
        break;
      case "recent":
      default:
        // Manter ordem original (mais recentes primeiro)
        break;
    }

    return filtered;
  }, [allCourses, searchQuery, levelFilter, availabilityFilter, enrollmentFilter, sortOption]);

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (levelFilter !== "all") count++;
    if (availabilityFilter !== "all") count++;
    if (enrollmentFilter !== "all") count++;
    return count;
  }, [searchQuery, levelFilter, availabilityFilter, enrollmentFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setLevelFilter("all");
    setAvailabilityFilter("all");
    setEnrollmentFilter("all");
    setSortOption("recent");
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

        {/* Filtros */}
        <Card className="p-4">
          <div className="space-y-4">
            {/* Busca */}
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

            {/* Filtros em linha */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as LevelFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="iniciante">Iniciante</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={availabilityFilter} onValueChange={(value) => setAvailabilityFilter(value as AvailabilityFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Disponibilidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="available">Disponíveis</SelectItem>
                  <SelectItem value="coming_soon">Em breve</SelectItem>
                </SelectContent>
              </Select>

              {user && (
                <Select value={enrollmentFilter} onValueChange={(value) => setEnrollmentFilter(value as EnrollmentFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Inscrição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="enrolled">Meus cursos</SelectItem>
                    <SelectItem value="not_enrolled">Não inscrito</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="participants">Mais participantes</SelectItem>
                  <SelectItem value="alphabetical">A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contador e limpar filtros */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {filteredAndSortedCourses.length} curso(s) encontrado(s)
                  {activeFiltersCount > 0 && ` • ${activeFiltersCount} filtro(s) ativo(s)`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Cursos Disponíveis
            </h2>
            {!activeFiltersCount && (
              <span className="text-sm text-muted-foreground">
                {allCourses.length} curso(s) disponível(is)
              </span>
            )}
          </div>

            {(loading || loadingWP) ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p>Carregando cursos...</p>
              </div>
            ) : wpError ? (
              <div className="text-center py-8">
                <p className="text-destructive mb-2">Erro ao carregar cursos da Escola do Parlamento</p>
                <p className="text-sm text-muted-foreground">Carregando apenas cursos disponíveis para inscrição...</p>
              </div>
            ) : filteredAndSortedCourses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {activeFiltersCount > 0 ? (
                  <>
                    <p className="mb-2">Nenhum curso encontrado com os filtros aplicados.</p>
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  </>
                ) : (
                  "Nenhum curso disponível no momento."
                )}
              </div>
            ) : (
              filteredAndSortedCourses.map((course) => {
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
