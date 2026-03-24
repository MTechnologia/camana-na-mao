import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { User, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/ui/page-header";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { submitInscricaoToCmsp } from "@/lib/audienciaInscricaoApi";

const BAIRROS_SP = [
  "Água Rasa", "Aricanduva", "Artur Alvim", "Barra Funda", "Belém", "Bela Vista",
  "Bom Retiro", "Brás", "Butantã", "Cambuci", "Cangaíba", "Carrão", "Consolação",
  "Cursino", "Ermelino Matarazzo", "Guaianases", "Ipiranga", "Itaim Bibi",
  "Itaim Paulista", "Itaquera", "Jaguara", "Jaguaré", "Lapa", "Liberdade",
  "Mooca", "Morumbi", "Pari", "Penha", "Perdizes", "Pinheiros", "Ponte Rasa",
  "República", "Sacomã", "Santa Cecília", "São Mateus", "Sé", "Tatuapé",
  "Vila Formosa", "Vila Leopoldina", "Vila Matilde", "Vila Prudente",
].sort((a, b) => a.localeCompare(b, "pt-BR"));

function formatPhoneBr(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const ParticipacaoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tipo = searchParams.get("tipo") as "videoconferencia" | "escrito" | null;
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [entidade, setEntidade] = useState("");
  const [funcao, setFuncao] = useState("");
  const [bairro, setBairro] = useState("");
  const [sugestao, setSugestao] = useState("");
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audienciaTitle, setAudienciaTitle] = useState<string | null>(null);
  const [audienciaSlug, setAudienciaSlug] = useState<string | null>(null);
  const [audienciaApCode, setAudienciaApCode] = useState<string | null>(null);
  const [audienciaLinkTransmissao, setAudienciaLinkTransmissao] = useState<string | null>(null);
  const [audienciaData, setAudienciaData] = useState<string | null>(null);
  const [audienciaHora, setAudienciaHora] = useState<string | null>(null);
  const [audienciaComissao, setAudienciaComissao] = useState<string | null>(null);
  const [audienciaMaisInformacoes, setAudienciaMaisInformacoes] = useState<string | null>(null);
  const [audienciaLoading, setAudienciaLoading] = useState(true);
  const [confirmProtocolo, setConfirmProtocolo] = useState<number | null>(null);
  const [inscritoVideoconferencia, setInscritoVideoconferencia] = useState(false);
  const [participacaoIdVideoconferencia, setParticipacaoIdVideoconferencia] = useState<string | null>(null);
  const [cancelandoInscricao, setCancelandoInscricao] = useState(false);
  const prefillEmailForUserIdRef = useRef<string | null>(null);

  const audienciaId = useMemo(() => (id ? String(id) : ""), [id]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!audienciaId) return;
      setAudienciaLoading(true);
      const { data, error } = await supabase
        .from("audiencias")
        .select("id, titulo, slug, ap_code, link_transmissao, data, hora, comissao, mais_informacoes")
        .eq("id", audienciaId)
        .maybeSingle();
      if (!cancelled) {
        if (error || !data) {
          setAudienciaTitle(null);
          setAudienciaSlug(null);
          setAudienciaApCode(null);
          setAudienciaLinkTransmissao(null);
          setAudienciaData(null);
          setAudienciaHora(null);
          setAudienciaComissao(null);
          setAudienciaMaisInformacoes(null);
        } else {
          setAudienciaTitle(data.titulo);
          setAudienciaSlug(data.slug ?? null);
          setAudienciaApCode(data.ap_code ?? null);
          setAudienciaLinkTransmissao((data as { link_transmissao?: string | null }).link_transmissao ?? null);
          setAudienciaData((data as { data?: string }).data ?? null);
          setAudienciaHora((data as { hora?: string | null }).hora ?? null);
          setAudienciaComissao((data as { comissao?: string | null }).comissao ?? null);
          setAudienciaMaisInformacoes((data as { mais_informacoes?: string | null }).mais_informacoes ?? null);
        }
        setAudienciaLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [audienciaId]);

  useEffect(() => {
    if (!user?.id) {
      prefillEmailForUserIdRef.current = null;
      return;
    }
    if (!user.email) return;
    if (prefillEmailForUserIdRef.current === user.id) return;
    prefillEmailForUserIdRef.current = user.id;
    setEmail(user.email);
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!user?.id || !audienciaId) return;
    const check = async () => {
      const { data } = await supabase
        .from("audiencia_participacoes")
        .select("id")
        .eq("user_id", user.id)
        .eq("audiencia_id", audienciaId)
        .eq("tipo", "videoconferencia")
        .maybeSingle();
      setInscritoVideoconferencia(!!data);
      setParticipacaoIdVideoconferencia(data?.id ?? null);
    };
    check();
  }, [user?.id, audienciaId]);

  if (audienciaLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Quero participar" backTo={`/audiencias/${id}`} />
        <div className="pt-[60px] p-6 text-center">
          <p className="text-muted-foreground">Carregando audiência...</p>
        </div>
      </div>
    );
  }

  if (!audienciaTitle) {
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

  const backToDetail = `/audiencias/${id}`;

  // Escolha do tipo (sem ?tipo= na URL)
  if (!tipo || (tipo !== "videoconferencia" && tipo !== "escrito")) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="Quero participar" backTo={`/audiencias/${id}`} />
        <div className="pt-[60px] p-6 space-y-6">
          <p className="text-sm text-muted-foreground">Para:</p>
          <h2 className="text-lg font-semibold text-foreground">{audienciaTitle}</h2>
          <p className="text-sm text-muted-foreground rounded-lg border border-primary/20 bg-primary/5 p-3">
            Inscreva-se aqui no app. Não é necessário cadastro no site oficial da Câmara.
          </p>
          <p className="text-sm text-muted-foreground">Escolha como deseja participar:</p>
          <div className="flex flex-col gap-3">
            {inscritoVideoconferencia ? (
              <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>Já inscrito nesta audiência</span>
              </div>
            ) : (
              <Button
                onClick={() => navigate(`/audiencias/${id}/participar?tipo=videoconferencia`)}
                className="w-full bg-primary hover:bg-primary/90 h-auto py-4"
              >
                <User className="h-5 w-5 mr-2 shrink-0" />
                Inscrição para manifestar-se durante a videoconferência
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate(`/audiencias/${id}/participar?tipo=escrito`)}
              className="w-full border-primary text-primary hover:bg-primary/10 h-auto py-4"
            >
              <FileText className="h-5 w-5 mr-2 shrink-0" />
              Enviar manifestação por escrito para a audiência
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const submitVideoconferencia = async () => {
    if (!user?.id) {
      toast.error("Faça login para se inscrever em audiências.");
      return;
    }
    if (!nome.trim()) { toast.error("Preencha o nome completo."); return; }
    if (!email.trim() || !email.includes("@")) { toast.error("Preencha um e-mail válido."); return; }
    const phoneDigits = telefone.replace(/\D/g, "");
    if (phoneDigits.length < 10) { toast.error("Preencha o telefone/WhatsApp com DDD e número."); return; }
    if (!consent) { toast.error("É necessário concordar em compartilhar seus dados pessoais."); return; }
    setIsLoading(true);
    try {
      const { data: rpcData, error } = await supabase.rpc("insert_audiencia_participacao", {
        p_audiencia_id: audienciaId,
        p_tipo: "videoconferencia",
        p_user_id: user!.id,
        p_nome: nome.trim(),
        p_email: email.trim(),
        p_telefone: telefone.trim(),
        p_entidade: entidade.trim() || null,
        p_funcao: funcao.trim() || null,
        p_bairro: null,
        p_sugestao: null,
        p_consent: true,
      });
      if (error) throw error;
      const protocolo = Array.isArray(rpcData) && rpcData[0]?.protocolo != null ? rpcData[0].protocolo : null;
      setConfirmProtocolo(protocolo);
      const podeEnviarCmsp = !!(user && audienciaSlug && audienciaApCode);
      console.info("[ParticipacaoPage] Pós-inscrição videoconferência:", {
        podeEnviarCmsp,
        temUser: !!user,
        audienciaSlug: audienciaSlug ?? null,
        audienciaApCode: audienciaApCode ?? null,
      });
      if (podeEnviarCmsp) {
        const cmspResult = await submitInscricaoToCmsp({
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone.trim(),
          apCode: audienciaApCode,
          slug: audienciaSlug,
        });
        if (!cmspResult.ok) {
          console.warn("[ParticipacaoPage] Inscrição CMSP (videoconferência):", cmspResult.error);
        }
      }
      toast.success("Inscrição realizada com sucesso!");
      setStep(3);
    } catch (e: unknown) {
      console.error(e);
      const msg = (e as { message?: string })?.message ?? "";
      if (msg.includes("já está inscrito")) toast.error("Você já está inscrito nesta audiência.");
      else if (msg.includes("Autenticação obrigatória")) toast.error("Faça login para se inscrever.");
      else if (msg.includes("Inscrições não estão abertas")) toast.error("Inscrições não estão abertas para esta audiência.");
      else toast.error("Não foi possível enviar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitEscrito = async () => {
    if (!user?.id) {
      toast.error("Faça login para se inscrever em audiências.");
      return;
    }
    if (!nome.trim()) { toast.error("Preencha o nome completo."); return; }
    if (!email.trim() || !email.includes("@")) { toast.error("Preencha um e-mail válido."); return; }
    const phoneDigits = telefone.replace(/\D/g, "");
    if (phoneDigits.length < 10) { toast.error("Preencha o telefone/WhatsApp com DDD e número."); return; }
    if (!bairro) { toast.error("Selecione o bairro (subprefeitura)."); return; }
    if (!sugestao.trim()) { toast.error("Deixe sua sugestão para a audiência."); return; }
    if (!consent) { toast.error("É necessário concordar em compartilhar seus dados pessoais."); return; }
    setIsLoading(true);
    try {
      const { data: rpcData, error } = await supabase.rpc("insert_audiencia_participacao", {
        p_audiencia_id: audienciaId,
        p_tipo: "escrito",
        p_user_id: user!.id,
        p_nome: nome.trim(),
        p_email: email.trim(),
        p_telefone: telefone.trim(),
        p_entidade: null,
        p_funcao: null,
        p_bairro: bairro,
        p_sugestao: sugestao.trim(),
        p_consent: true,
      });
      if (error) throw error;
      const protocolo = Array.isArray(rpcData) && rpcData[0]?.protocolo != null ? rpcData[0].protocolo : null;
      setConfirmProtocolo(protocolo);
      const podeEnviarCmspEscrito = !!(user && audienciaSlug && audienciaApCode);
      console.info("[ParticipacaoPage] Pós-inscrição escrito:", {
        podeEnviarCmsp: podeEnviarCmspEscrito,
        temUser: !!user,
        audienciaSlug: audienciaSlug ?? null,
        audienciaApCode: audienciaApCode ?? null,
      });
      if (podeEnviarCmspEscrito) {
        const cmspResult = await submitInscricaoToCmsp({
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone.trim(),
          apCode: audienciaApCode,
          slug: audienciaSlug,
        });
        if (!cmspResult.ok) {
          console.warn("[ParticipacaoPage] Inscrição CMSP (escrito):", cmspResult.error);
        }
      }
      toast.success("Proposta enviada com sucesso!");
      setStep(3);
    } catch (e: unknown) {
      console.error(e);
      const msg = (e as { message?: string })?.message ?? "";
      if (msg.includes("já está inscrito")) toast.error("Você já está inscrito nesta audiência.");
      else if (msg.includes("Autenticação obrigatória")) toast.error("Faça login para se inscrever.");
      else if (msg.includes("Inscrições não estão abertas")) toast.error("Inscrições não estão abertas para esta audiência.");
      else toast.error("Não foi possível enviar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Formata data e hora para exibição (ex.: 2026-02-26 10:30:00)
  const confirmDataHora =
    audienciaData && audienciaHora
      ? `${audienciaData} ${audienciaHora.slice(0, 8)}`
      : audienciaData
        ? audienciaData
        : null;
  const confirmContactEmail = audienciaMaisInformacoes?.match(/[\w.+%-]+@[\w.-]+\.[a-zA-Z]{2,}/)?.[0] ?? null;

  if (step === 3) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title={tipo === "escrito" ? "Manifestação enviada" : "Inscrição realizada"} backTo={backToDetail} />
        <div className="pt-[60px] p-6 max-w-lg mx-auto space-y-6">
          <div className="rounded-lg bg-green-600 text-white text-center py-4 px-4">
            <p className="font-bold text-lg uppercase tracking-wide">
              {tipo === "escrito" ? "Proposta enviada com sucesso!" : "Inscrição realizada com sucesso!"}
            </p>
          </div>
          <div className="space-y-3 text-foreground">
            <p className="font-semibold">Registramos sua {tipo === "escrito" ? "manifestação por escrito." : "inscrição."}</p>
            {tipo === "videoconferencia" && audienciaComissao && (
              <p className="text-sm text-muted-foreground">
                Obrigado por se inscrever para participar de Audiência Pública a ser realizada pela {audienciaComissao}.
              </p>
            )}
            {confirmProtocolo != null && (
              <p className="text-sm">
                O seu número de protocolo é <strong>{confirmProtocolo}</strong>.
              </p>
            )}
            {tipo === "videoconferencia" && (
              <p className="text-sm text-muted-foreground">
                Lembramos que em virtude da natureza do evento, da quantidade de inscritos e da limitação de tempo de transmissão, a inscrição não garante necessariamente o direito à fala na audiência pública.
              </p>
            )}
            {tipo === "videoconferencia" && audienciaLinkTransmissao?.trim() && (
              <div className="space-y-2">
                <p className="text-sm">
                  Alguns minutos antes do horário agendado, acesse o link abaixo para participar da audiência pública por videoconferência e fazer sua fala.
                </p>
                <Button
                  className="w-full bg-primary text-primary-foreground"
                  onClick={() => window.open(audienciaLinkTransmissao!, "_blank", "noopener,noreferrer")}
                >
                  Acessar videoconferência
                </Button>
              </div>
            )}
            {confirmContactEmail && (
              <p className="text-sm text-muted-foreground">
                Para maiores informações, entre em contato com a Secretaria da Comissão responsável:{" "}
                <a href={`mailto:${confirmContactEmail}`} className="text-primary underline">{confirmContactEmail}</a>
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1 text-sm">
            <p className="font-medium text-foreground">Audiência Pública:</p>
            <p className="text-foreground">
              {audienciaApCode ?? "—"} {confirmDataHora ? `| ${confirmDataHora}` : ""}
            </p>
            <p className="text-muted-foreground">
              {nome} ({email} | {telefone.replace(/\D/g, "")})
            </p>
          </div>
          <Button onClick={() => navigate("/audiencias")} className="w-full">
            Ver outras audiências
          </Button>
        </div>
      </div>
    );
  }

  // ——— Formulário VIDEOCONFERÊNCIA (formulário único, conforme CMSP) ———
  if (tipo === "videoconferencia") {
    if (inscritoVideoconferencia) {
      const handleCancelarInscricao = async () => {
        if (!participacaoIdVideoconferencia || !user?.id) return;
        setCancelandoInscricao(true);
        try {
          const { error } = await supabase
            .from("audiencia_participacoes")
            .delete()
            .eq("id", participacaoIdVideoconferencia)
            .eq("user_id", user.id);
          if (error) throw error;
          setInscritoVideoconferencia(false);
          setParticipacaoIdVideoconferencia(null);
          toast.success("Inscrição cancelada.");
        } catch (e) {
          console.error(e);
          toast.error("Não foi possível cancelar a inscrição.");
        } finally {
          setCancelandoInscricao(false);
        }
      };
      return (
        <div className="min-h-screen bg-background pb-20">
          <PageHeader title="Quero participar" backTo={backToDetail} />
          <div className="pt-[60px] p-6 space-y-6 flex flex-col items-center">
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>Já inscrito nesta audiência</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">Você já realizou a inscrição para manifestar-se durante a videoconferência.</p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <Button variant="outline" onClick={() => navigate(backToDetail)} className="w-full border-border text-foreground hover:bg-muted/50">Voltar aos detalhes da audiência</Button>
              <Button
                variant="outline"
                onClick={handleCancelarInscricao}
                disabled={cancelandoInscricao}
                className="w-full border-destructive text-destructive hover:bg-destructive/10"
              >
                {cancelandoInscricao ? "Cancelando..." : "Cancelar inscrição"}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="Quero participar" backTo={backToDetail} />
        <div className="pt-[60px] p-6 space-y-6">
          <p className="text-sm text-muted-foreground">Para:</p>
          <h2 className="text-lg font-semibold text-foreground">{audienciaTitle}</h2>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
            Sua inscrição vale apenas aqui no app. Não é necessário se cadastrar no site oficial da Câmara para participar.
          </div>
          {!audienciaLinkTransmissao?.trim() && (
            <div className="rounded-lg border border-muted bg-muted/30 p-3 text-sm text-muted-foreground">
              O link da videoconferência será exibido na tela de confirmação quando estiver disponível.
            </div>
          )}

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-primary text-primary-foreground p-4 flex items-center gap-3">
              <User className="h-5 w-5 shrink-0" />
              <h3 className="font-bold uppercase tracking-wide text-sm">
                Inscreva-se para manifestar-se durante a videoconferência
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground">Campos marcados com * são requeridos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome-v">Nome Completo *</Label>
                  <Input id="nome-v" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" />
                </div>
                <div className="space-y-2 sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-v">E-mail para contato nesta inscrição *</Label>
                    <Input
                      id="email-v"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      autoComplete="email"
                    />
                    <p className="text-xs text-muted-foreground">
                      Pode ser diferente do e-mail do cadastro no app.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone-v">Telefone/WhatsApp *</Label>
                    <Input
                      id="telefone-v"
                      type="tel"
                      value={telefone}
                      onChange={(e) => setTelefone(formatPhoneBr(e.target.value))}
                      placeholder="(11) 99999-9999"
                      maxLength={16}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entidade">Entidade</Label>
                  <Input id="entidade" value={entidade} onChange={(e) => setEntidade(e.target.value)} placeholder="Opcional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="funcao">Função</Label>
                  <Input id="funcao" value={funcao} onChange={(e) => setFuncao(e.target.value)} placeholder="Opcional" />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox id="consent-v" checked={consent} onCheckedChange={(v) => setConsent(!!v)} />
                <div className="space-y-1">
                  <Label htmlFor="consent-v" className="text-sm cursor-pointer">Concordo em compartilhar meus dados pessoais *</Label>
                  <p className="text-xs text-muted-foreground">
                    Nos termos da Lei Geral de Proteção de Dados (lei 13.709, de 2018), para registro de sua mensagem é necessário que o titular consinta que a Câmara Municipal de São Paulo colha seu nome, e-mail e telefone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => navigate(backToDetail)} className="flex-1">Voltar</Button>
                <Button onClick={submitVideoconferencia} disabled={isLoading} className="flex-1 bg-primary">
                  {isLoading ? "Enviando..." : "INSCREVA-SE!"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ——— Formulário MANIFESTAÇÃO ESCRITA ———
  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Manifestação por escrito" backTo={backToDetail} />
      <div className="pt-[60px] p-6 space-y-6">
        <div className="bg-primary text-primary-foreground rounded-t-lg p-4 flex items-center gap-3">
          <FileText className="h-6 w-6 shrink-0" />
          <h2 className="font-bold text-lg uppercase tracking-wide">
            Envie a sua manifestação por escrito para a audiência
          </h2>
        </div>
        <div className="border border-t-0 rounded-b-lg border-border p-4 space-y-4">
          <p className="text-sm text-foreground rounded-lg border border-primary/20 bg-primary/5 p-3">
            Sua manifestação vale aqui no app. Não é necessário se cadastrar no site oficial da Câmara.
          </p>
          <p className="text-xs text-muted-foreground">Campos marcados com * são requeridos</p>
          <p className="text-sm text-muted-foreground">
            Participe com suas propostas. Para ampliar o debate, a Câmara Municipal está realizando uma Audiência Pública, em formato virtual, para receber sugestões da população. É possível participar com o envio de propostas através do preenchimento deste formulário.
          </p>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome-e">Nome Completo *</Label>
              <Input id="nome-e" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-e">E-mail para contato nesta inscrição *</Label>
              <Input
                id="email-e"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
              />
              <p className="text-xs text-muted-foreground">
                Pode ser diferente do e-mail do cadastro no app.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone-e">Telefone/WhatsApp *</Label>
              <Input
                id="telefone-e"
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(formatPhoneBr(e.target.value))}
                placeholder="(11) 99999-9999"
                maxLength={16}
              />
            </div>
            <div className="space-y-2">
              <Label>Bairro (Subprefeitura) *</Label>
              <Select value={bairro} onValueChange={setBairro}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {BAIRROS_SP.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sugestao">Deixe sua sugestão para a Audiência Pública *</Label>
              <Textarea
                id="sugestao"
                value={sugestao}
                onChange={(e) => setSugestao(e.target.value)}
                placeholder="Digite sua proposta ou sugestão..."
                rows={5}
                className="resize-y"
              />
            </div>
            <div className="flex items-start gap-3">
              <Checkbox id="consent-e" checked={consent} onCheckedChange={(v) => setConsent(!!v)} />
              <div className="space-y-1">
                <Label htmlFor="consent-e" className="text-sm cursor-pointer">Concordo em compartilhar meus dados pessoais *</Label>
                <p className="text-xs text-muted-foreground">
                  Nos termos da Lei Geral de Proteção de Dados (lei 13.709, de 2018), para registro da sua inscrição neste aplicativo é necessário que você concorde em compartilhar nome, e-mail e telefone.
                </p>
              </div>
            </div>
          </div>
          <Button onClick={submitEscrito} disabled={isLoading} className="w-full mt-4">
            {isLoading ? "Enviando..." : "ENVIAR PROPOSTA"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ParticipacaoPage;
