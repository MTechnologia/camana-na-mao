import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Calendar, MapPin, Users, Clock, Building2, User, Loader2, FileText, Bell, CheckCircle2, CircleOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/ui/page-header";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  tituloCardAudiencia,
  descricaoParaDetalhe,
  parseConvidadosItens,
  extrairEmailDeMaisInformacoes,
  observacaoParaDetalheAudiencia,
} from "@/lib/audienciaDisplay";

/** URLs oficiais do portal da Câmara (não vêm na API). */
const CMSP_AUDITORIOS_ONLINE_URL = "https://www.saopaulo.sp.leg.br/transparencia/auditorios-online/";
const CMSP_YOUTUBE_URL = "https://www.youtube.com/user/camarasaopaulo";
const SPLEGIS_CONSULTA_DETALHADO =
  "https://splegisconsulta.saopaulo.sp.leg.br/Pesquisa/DetailsDetalhado";

/**
 * Gera URL do Relatório Detalhado no SPLegis Consulta para uma referência tipo "PL 1461/2025".
 * COD_MTRA_LEGL=1 para PL. Retorna null se não for possível extrair número e ano.
 */
function urlDetalhadoProjeto(referencia: string | null | undefined): string | null {
  if (!referencia?.trim()) return null;
  const m = referencia.trim().match(/\b(\d+)\/(\d{4})\s*$/);
  if (!m) return null;
  const numero = m[1];
  const ano = m[2];
  return `${SPLEGIS_CONSULTA_DETALHADO}?COD_MTRA_LEGL=1&ANO_PCSS_CMSP=${ano}&COD_PCSS_CMSP=${numero}`;
}

interface ProjetoVinculado {
  referencia: string;
  autores: string | null;
  ementa?: string | null;
}

/** Normaliza projetos: no banco pode vir como array ou como string JSON (ex.: export). */
function projetosAsArray(projetos: ProjetoVinculado[] | string | null | undefined): ProjetoVinculado[] {
  if (projetos == null) return [];
  if (Array.isArray(projetos)) return projetos;
  if (typeof projetos === "string") {
    try {
      const parsed = JSON.parse(projetos) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

interface Audiencia {
  id: string;
  titulo: string;
  descricao: string | null;
  data: string;
  hora: string | null;
  local: string;
  tema: string;
  status: string;
  comissao: string | null;
  observacao: string | null;
  convidados: string | null;
  mais_informacoes: string | null;
  vagas_disponiveis: number | null;
  inscricoes_abertas: boolean | null;
  /** false = não oferecer inscrição para falar por videoconferência (ex.: audiência somente presencial na CMSP). */
  permite_inscricao_videoconferencia?: boolean | null;
  link_transmissao: string | null;
  projeto_referencia: string | null;
  projeto_autores: string | null;
  /** Lista de PLs; pode vir como array (JSONB) ou string JSON do banco. */
  projetos: ProjetoVinculado[] | string | null;
}

/** Endereço oficial para protocolo/secretaria da Comissão (site CMSP). */
const CMSP_SECRETARIA_COMISSAO =
  "Viaduto Jacareí, 100, Bela Vista, 2º andar, salas 213-A ou 210";

/** URL do Google Maps para o endereço da Câmara (clicável no botão presencial). */
const CMSP_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Viaduto+Jacareí+100+Bela+Vista+São+Paulo+SP";

const AudienciaDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const presencialRef = useRef<HTMLDivElement>(null);
  const [audiencia, setAudiencia] = useState<Audiencia | null>(null);
  const [loading, setLoading] = useState(true);
  const [lembreteInscrito, setLembreteInscrito] = useState(false);
  const [lembreteLoading, setLembreteLoading] = useState(false);
  const [inscritoVideoconferencia, setInscritoVideoconferencia] = useState(false);

  useEffect(() => {
    const fetchAudiencia = async () => {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('audiencias')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (!error && data) {
        setAudiencia(data);
      }
      setLoading(false);
    };

    fetchAudiencia();
  }, [id]);

  useEffect(() => {
    if (!user?.id || !id) return;
    const check = async () => {
      const { data } = await supabase
        .from('audiencia_inscricoes')
        .select('id')
        .eq('user_id', user.id)
        .eq('audiencia_id', id)
        .maybeSingle();
      setLembreteInscrito(!!data);
    };
    check();
  }, [user?.id, id]);

  useEffect(() => {
    if (!user?.id || !id) return;
    const check = async () => {
      const { data } = await supabase
        .from('audiencia_participacoes')
        .select('id')
        .eq('user_id', user.id)
        .eq('audiencia_id', id)
        .eq('tipo', 'videoconferencia')
        .maybeSingle();
      setInscritoVideoconferencia(!!data);
    };
    check();
  }, [user?.id, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Carregando..." backTo="/audiencias" />
        <div className="pt-[60px] p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!audiencia) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Audiência não encontrada" backTo="/audiencias" />
        <div className="pt-[60px] p-6 text-center">
          <p className="text-muted-foreground mb-4">A audiência solicitada não foi encontrada.</p>
          <Button onClick={() => navigate("/audiencias")}>Voltar para audiências</Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const iso = typeof dateStr === "string" ? dateStr.slice(0, 10) : "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        const [y, m, d] = iso.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
      }
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) return dateStr;
      return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (timeStr == null || typeof timeStr !== "string") return "";
    const trimmed = timeStr.trim();
    if (!trimmed) return "";
    const parts = trimmed.split(":").map((s) => parseInt(s, 10));
    const h = Number.isNaN(parts[0]) ? 0 : Math.min(23, Math.max(0, parts[0]));
    const m = Number.isNaN(parts[1]) ? 0 : Math.min(59, Math.max(0, parts[1]));
    return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
  };

  const handleReceberLembretes = async () => {
    if (!user?.id || !id) {
      toast.error("Faça login para receber lembretes.");
      navigate("/login", { state: { from: `/audiencias/${id}` } });
      return;
    }
    setLembreteLoading(true);
    const { error } = await supabase
      .from("audiencia_inscricoes")
      .insert({ user_id: user.id, audiencia_id: id, status: "confirmada" });
    setLembreteLoading(false);
    if (error) {
      if (error.code === "23505") {
        setLembreteInscrito(true);
        toast.info("Você já está inscrito para lembretes desta audiência.");
      } else {
        toast.error("Não foi possível inscrever. Tente novamente.");
      }
      return;
    }
    setLembreteInscrito(true);
    toast.success("Inscrito! Você receberá lembretes desta audiência no celular e e-mail.");
  };

  const tituloExibicao = tituloCardAudiencia(audiencia.comissao ?? null, audiencia.titulo, audiencia.descricao, audiencia.tema);
  const hoje = new Date().toISOString().slice(0, 10);
  const permiteInscricaoVideo = audiencia.permite_inscricao_videoconferencia !== false;
  const observacaoExibida = observacaoParaDetalheAudiencia(audiencia.observacao, permiteInscricaoVideo);
  const isAudienciaFutura = audiencia.data >= hoje;
  const isAudienciaFinalizada =
    !isAudienciaFutura ||
    audiencia.inscricoes_abertas === false ||
    /realizada|encerrada|encerrado/i.test(audiencia.status ?? "");

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title={tituloExibicao} backTo="/audiencias" />
      
      <div className="pt-[60px] p-6 space-y-6">
        {/* Apenas título no topo (sem bloco cinza ao lado) */}
        <h1 className="text-2xl font-bold text-foreground leading-tight">{tituloExibicao}</h1>

        {/* Documentos e materiais de referência: projetos de lei, transmissão, contato (sempre visível) */}
        {(() => {
          const projetosList = projetosAsArray(audiencia.projetos);
          const hasProjetos = projetosList.length > 0;
          const hasFallback = audiencia.projeto_referencia?.trim() || audiencia.projeto_autores?.trim();
          const hasTransmissao = audiencia.link_transmissao?.trim();
          const hasContato = audiencia.mais_informacoes?.trim() && isAudienciaFutura;
          const temDocumentos = hasProjetos || hasFallback || hasTransmissao || hasContato;
          return (
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Documentos e materiais de referência
              </h4>
              <div className="text-sm space-y-4">
                {!temDocumentos && (
                  <p className="text-muted-foreground">Não há documentos ou materiais vinculados a esta audiência no momento.</p>
                )}
                {(hasProjetos || hasFallback) && (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Projetos de lei vinculados</p>
                    {hasProjetos ? (
                      <ul className="space-y-2 list-none">
                        {projetosList.map((p, i) => {
                          const detalheUrl = urlDetalhadoProjeto(p.referencia);
                          return (
                            <li key={`${p.referencia}-${i}`} className="border-b border-border/60 pb-3 last:border-0 last:pb-0 space-y-1">
                              <p className="font-medium text-foreground">
                                {detalheUrl ? (
                                  <a
                                    href={detalheUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline underline-offset-2"
                                  >
                                    {p.referencia}
                                  </a>
                                ) : (
                                  p.referencia
                                )}
                              </p>
                              {p.autores?.trim() && (
                                <p className="text-muted-foreground text-xs">{p.autores.trim()}</p>
                              )}
                              {p.ementa?.trim() && (
                                <p className="text-muted-foreground text-xs whitespace-pre-line leading-relaxed">
                                  {p.ementa.trim().replace(/\r\n/g, "\n")}
                                </p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <>
                        {audiencia.projeto_referencia?.trim() && (() => {
                          const ref = audiencia.projeto_referencia!.trim();
                          const detalheUrl = urlDetalhadoProjeto(ref);
                          return (
                            <p className="font-medium text-foreground">
                              {detalheUrl ? (
                                <a
                                  href={detalheUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary underline underline-offset-2"
                                >
                                  {ref}
                                </a>
                              ) : (
                                ref
                              )}
                            </p>
                          );
                        })()}
                        {audiencia.projeto_autores?.trim() && (
                          <p className="text-muted-foreground">{audiencia.projeto_autores.trim()}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
                {hasTransmissao && (
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Transmissão ao vivo</p>
                    <a
                      href={CMSP_YOUTUBE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 text-sm"
                    >
                      Acessar link da videoconferência
                    </a>
                  </div>
                )}
                {hasContato && (() => {
                  const email = extrairEmailDeMaisInformacoes(audiencia.mais_informacoes!);
                  return (
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Contato para mais informações</p>
                      {email ? (
                        <a
                          href={`mailto:${email}`}
                          className="text-primary underline underline-offset-2 text-sm"
                        >
                          {email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {audiencia.mais_informacoes!.replace(/^Mais\s+informa[cç][oõ]es\s*:\s*/i, "").trim()}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })()}

        {/* Descrição: tema quando rico; senão descricao. Convidados vêm só da coluna convidados (removidos da descrição/tema). */}
        {(() => {
          const projetosList = projetosAsArray(audiencia.projetos);
          const temaNormalizado = (audiencia.tema || "").trim().replace(/\r\n/g, "\n");
          const temaRico = temaNormalizado && temaNormalizado.toLowerCase() !== "geral";
          const descTrim = audiencia.descricao?.trim();
          const descricaoRepetida =
            projetosList.length > 0 &&
            descTrim &&
            projetosList.some(
              (p) => p.ementa?.trim() && descTrim === p.ementa.trim().replace(/\r\n/g, "\n")
            );
          const texto = temaRico
            ? descricaoParaDetalhe(audiencia.tema)
            : descricaoRepetida
              ? ""
              : descTrim
                ? descricaoParaDetalhe(audiencia.descricao)
                : `Audiência pública sobre ${(audiencia.tema || "geral").trim()}. Participe e contribua com sua opinião.`;
          if (!texto) return null;
          return (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Explicação simplificada do que será discutido
              </p>
              <div className="text-base text-muted-foreground whitespace-pre-line leading-relaxed">
                {texto}
              </div>
            </div>
          );
        })()}

        {/* Convidados: nome em uma linha, cargo na seguinte ( – cargo) */}
        {audiencia.convidados?.trim() && (() => {
          const itens = parseConvidadosItens(audiencia.convidados);
          if (itens.length === 0) return null;
          return (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Foram convidados para a Audiência Pública:</p>
              <ul className="list-none space-y-1.5 pl-0">
                {itens.map((item, i) => (
                  <li key={i} className="space-y-0.5">
                    <span className="block">- {item.nome}</span>
                    {item.cargo ? <span className="block text-muted-foreground">– {item.cargo}{i < itens.length - 1 ? ";" : ""}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* Observação (Mais informações está em Documentos e materiais de referência) */}
        {observacaoExibida?.trim() && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="whitespace-pre-line">
              <strong className="text-foreground">Observação:</strong> {observacaoExibida.trim()}
            </p>
          </div>
        )}

        <Separator />

        {/* Informações principais */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Data</p>
              <p className="text-sm text-muted-foreground capitalize">
                {formatDate(audiencia.data)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Horário</p>
              <p className="text-sm text-muted-foreground">{audiencia.hora ? formatTime(audiencia.hora) : "Horário a definir"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Local</p>
              <p className="text-sm text-muted-foreground">{audiencia.local}</p>
            </div>
          </div>

          {audiencia.vagas_disponiveis && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Vagas Disponíveis</p>
                <p className="text-sm text-muted-foreground">
                  {audiencia.vagas_disponiveis} vagas
                </p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Como participar */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Como participar
          </h4>
          {permiteInscricaoVideo ? (
            <>
              <p className="text-sm text-muted-foreground">
                As audiências públicas são abertas a todos os cidadãos. Ao se inscrever você receberá:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Link de acesso à audiência</li>
                <li>• Materiais de apoio</li>
                <li>• Lembrete do evento</li>
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Esta audiência é com <strong className="text-foreground">participação somente presencial</strong> para
              discursar no local. Não há inscrição por videoconferência. Você pode enviar manifestação por escrito pelo
              botão abaixo e acompanhar a transmissão ao vivo pelos canais oficiais da Câmara quando indicado.
            </p>
          )}
        </div>

        {/* Localização da Câmara: comparecer no local ou protocolar na secretaria (padrão site oficial) */}
        <div id="participar-presencial" ref={presencialRef} className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Localização da Câmara
          </h4>
          <p className="text-sm text-muted-foreground">
            Você pode participar da audiência no local ou protocolar sua manifestação pessoalmente:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 ml-4">
            <li>
              <strong className="text-foreground">Comparecer no local:</strong>{" "}
              {audiencia.local}
            </li>
            <li>
              <strong className="text-foreground">Protocolar na Câmara:</strong> no Protocolo Legislativo ou na Secretaria da Comissão — {CMSP_SECRETARIA_COMISSAO}.
            </li>
          </ul>
        </div>

        {/* Acompanhar ao vivo (audiência futura): Auditórios Online + YouTube, como no site oficial */}
        {isAudienciaFutura && (
          <div className="text-sm text-muted-foreground">
            <p>
              Para acompanhar ao vivo a Audiência Pública, basta acessar a{" "}
              <a
                href={CMSP_AUDITORIOS_ONLINE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Seção Auditórios Online
              </a>{" "}
              do portal da Câmara Municipal de São Paulo ou o{" "}
              <a
                href={CMSP_YOUTUBE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                canal de YouTube da Câmara
              </a>
              .
            </p>
          </div>
        )}

        {/* Audiências encerradas: aviso de que os eventos estão no YouTube, como no site oficial */}
        {!isAudienciaFutura && (
          <div className="text-sm text-muted-foreground">
            <p>
              Todos os eventos realizados pela Câmara Municipal de São Paulo estão disponíveis no{" "}
              <a
                href={CMSP_YOUTUBE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                canal de YouTube da Câmara
              </a>
              .
            </p>
          </div>
        )}

        {/* Observações legais */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Fonte:</strong> Portal da Câmara Municipal de São Paulo
          </p>
          <p>
            <strong>Atualizado:</strong> Hoje às 10:30 (verificação a cada 15 minutos)
          </p>
          <p>
            <strong>Privacidade:</strong> Seus dados são protegidos conforme LGPD
          </p>
        </div>

        {/* Actions — layout minimalista: status em cinza, botões outline */}
        <div className="flex flex-col gap-3 pt-4">
          {/* Receber lembretes: só exibe quando a audiência não está finalizada (inscrições abertas) */}
          {!isAudienciaFinalizada && (
            lembreteInscrito ? (
              <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>Você receberá lembretes desta audiência no celular e e-mail.</span>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-border text-foreground hover:bg-muted/50"
                onClick={handleReceberLembretes}
                disabled={lembreteLoading}
              >
                {lembreteLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                {user ? "Receber lembretes desta audiência" : "Receber lembretes (faça login)"}
              </Button>
            )
          )}

          {isAudienciaFinalizada ? (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
              <CircleOff className="h-5 w-5 shrink-0" />
              <span>Inscrições encerradas</span>
            </div>
          ) : (
            <>
              {permiteInscricaoVideo ? (
                inscritoVideoconferencia ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span>Já inscrito nesta audiência</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => navigate(`/audiencias/${id}/participar?tipo=videoconferencia`)}
                    className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <User className="h-4 w-4 shrink-0" />
                    Inscrição para manifestar-se durante a videoconferência
                  </Button>
                )
              ) : null}
              <Button
                variant="outline"
                onClick={() => navigate(`/audiencias/${id}/participar?tipo=escrito`)}
                className="w-full gap-2 border-primary text-primary hover:bg-primary/10"
              >
                <FileText className="h-4 w-4 shrink-0" />
                Enviar manifestação por escrito para a audiência
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 border-primary text-primary hover:bg-primary/10"
                onClick={() => window.open(CMSP_MAPS_URL, "_blank", "noopener,noreferrer")}
              >
                <MapPin className="h-4 w-4 shrink-0" />
                Localização da Câmara
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => navigate("/audiencias")} className="w-full border-border text-foreground hover:bg-muted/50">
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AudienciaDetailPage;
