import { useEffect, useMemo, useState } from "react";
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
  const { user, session } = useAuth();
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
  const [audienciaLoading, setAudienciaLoading] = useState(true);

  const audienciaId = useMemo(() => (id ? String(id) : ""), [id]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!audienciaId) return;
      setAudienciaLoading(true);
      const { data, error } = await supabase
        .from("audiencias")
        .select("id, titulo, slug, ap_code")
        .eq("id", audienciaId)
        .maybeSingle();
      if (!cancelled) {
        if (error || !data) {
          setAudienciaTitle(null);
          setAudienciaSlug(null);
          setAudienciaApCode(null);
        } else {
          setAudienciaTitle(data.titulo);
          setAudienciaSlug(data.slug ?? null);
          setAudienciaApCode(data.ap_code ?? null);
        }
        setAudienciaLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [audienciaId]);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

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
          <p className="text-sm text-muted-foreground">Escolha como deseja participar:</p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate(`/audiencias/${id}/participar?tipo=videoconferencia`)}
              className="w-full bg-primary hover:bg-primary/90 h-auto py-4"
            >
              <User className="h-5 w-5 mr-2 shrink-0" />
              Inscrição para manifestar-se durante a videoconferência
            </Button>
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
    if (!nome.trim()) { toast.error("Preencha o nome completo."); return; }
    if (!email.trim() || !email.includes("@")) { toast.error("Preencha um e-mail válido."); return; }
    const phoneDigits = telefone.replace(/\D/g, "");
    if (phoneDigits.length < 10) { toast.error("Preencha o telefone/WhatsApp com DDD e número."); return; }
    if (!consent) { toast.error("É necessário concordar em compartilhar seus dados pessoais."); return; }
    setIsLoading(true);
    try {
      const useNinja = audienciaSlug && audienciaApCode && session?.access_token;
      if (useNinja) {
        const supabaseUrl = import.meta.env.CAMARA_URL ?? import.meta.env.VITE_SUPABASE_URL;
        const res = await fetch(`${supabaseUrl}/functions/v1/api-router/audiencias/inscricao`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            nome: nome.trim(),
            email: email.trim(),
            telefone: telefone.trim(),
            apCode: audienciaApCode,
            slug: audienciaSlug,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!data.ok) {
          const errors = Array.isArray(data.errors) ? data.errors : [data.errors ?? "Erro ao enviar inscrição."];
          errors.forEach((msg: string) => toast.error(msg));
          return;
        }
      }
      const { error } = await supabase.from("audiencia_participacoes").insert({
        audiencia_id: audienciaId,
        tipo: "videoconferencia",
        user_id: user?.id ?? null,
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        entidade: entidade.trim() || null,
        funcao: funcao.trim() || null,
        consent: true,
      });
      if (error) throw error;
      toast.success(useNinja ? "Inscrição realizada na Câmara! Você receberá o link e instruções por e-mail." : "Inscrição registrada! Você receberá o link e instruções por e-mail.");
      setStep(3);
    } catch (e: unknown) {
      console.error(e);
      toast.error("Não foi possível enviar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitEscrito = async () => {
    if (!nome.trim()) { toast.error("Preencha o nome completo."); return; }
    if (!email.trim() || !email.includes("@")) { toast.error("Preencha um e-mail válido."); return; }
    const phoneDigits = telefone.replace(/\D/g, "");
    if (phoneDigits.length < 10) { toast.error("Preencha o telefone/WhatsApp com DDD e número."); return; }
    if (!bairro) { toast.error("Selecione o bairro (subprefeitura)."); return; }
    if (!sugestao.trim()) { toast.error("Deixe sua sugestão para a audiência."); return; }
    if (!consent) { toast.error("É necessário concordar em compartilhar seus dados pessoais."); return; }
    setIsLoading(true);
    try {
      const { error } = await supabase.from("audiencia_participacoes").insert({
        audiencia_id: audienciaId,
        tipo: "escrito",
        user_id: user?.id ?? null,
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        bairro,
        sugestao: sugestao.trim(),
        consent: true,
      });
      if (error) throw error;
      toast.success("Proposta enviada com sucesso!");
      setStep(3);
    } catch (e: any) {
      console.error(e);
      toast.error("Não foi possível enviar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-green-500/10 rounded-full">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {tipo === "escrito" ? "Proposta enviada!" : "Inscrição realizada!"}
            </h2>
            <p className="text-muted-foreground">
              {tipo === "escrito"
                ? "Sua manifestação por escrito foi registrada."
                : "Você receberá um e-mail com o link e as instruções para participar da audiência."}
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
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="Quero participar" backTo={backToDetail} />
        <div className="pt-[60px] p-6 space-y-6">
          <p className="text-sm text-muted-foreground">Para:</p>
          <h2 className="text-lg font-semibold text-foreground">{audienciaTitle}</h2>

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
                    <Label htmlFor="email-v">E-mail *</Label>
                    <Input id="email-v" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
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
              <Label htmlFor="email-e">E-mail *</Label>
              <Input id="email-e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
                  Nos termos da Lei Geral de Proteção de Dados (lei 13.709, de 2018), para registro de sua mensagem é necessário que o titular consinta que a Câmara Municipal de São Paulo colha seu nome, e-mail e telefone.
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
