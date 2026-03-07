"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";
import { Loader2, CheckCircle2, Bell, Video, FileText, MapPin } from "lucide-react";
import { normalizarConvidadosParaExibicao } from "@/lib/audienciaDisplay";

const BAIRROS_SP = [
  "Água Rasa", "Aricanduva", "Artur Alvim", "Barra Funda", "Belém", "Bela Vista",
  "Bom Retiro", "Brás", "Butantã", "Cambuci", "Cangaíba", "Carrão", "Consolação",
  "Cursino", "Ermelino Matarazzo", "Guaianases", "Ipiranga", "Itaim Bibi",
  "Itaim Paulista", "Itaquera", "Jaguara", "Jaguaré", "Lapa", "Liberdade",
  "Mooca", "Morumbi", "Pari", "Penha", "Perdizes", "Pinheiros", "Ponte Rasa",
  "República", "Sacomã", "Santa Cecília", "São Mateus", "Sé", "Tatuapé",
  "Vila Formosa", "Vila Leopoldina", "Vila Matilde", "Vila Prudente",
].sort((a, b) => a.localeCompare(b, "pt-BR"));

const CMSP_SECRETARIA_COMISSAO =
  "Viaduto Jacareí, 100, Bela Vista, 2º andar, salas 213-A ou 210";
const CMSP_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Viaduto+Jacareí+100+Bela+Vista+São+Paulo+SP";

function formatPhoneBr(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

interface AudienciaOption {
  id: string;
  titulo: string;
  data: string;
  local: string | null;
  slug: string | null;
  ap_code: string | null;
  convidados: string | null;
}

export function AudienciaInscricaoInline() {
  const { user } = useAuth();
  const [audiencias, setAudiencias] = useState<AudienciaOption[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [audienciaId, setAudienciaId] = useState<string>("");
  const [tipoParticipacao, setTipoParticipacao] = useState<"videoconferencia" | "escrito" | "presencial">("videoconferencia");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [bairro, setBairro] = useState("");
  const [sugestao, setSugestao] = useState("");
  const [consent, setConsent] = useState(false);
  const [receivePush, setReceivePush] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inscritoVideoconferencia, setInscritoVideoconferencia] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("audiencias")
        .select("id, titulo, data, local, slug, ap_code, convidados")
        .eq("inscricoes_abertas", true)
        .gte("data", today)
        .order("data", { ascending: true })
        .limit(20);
      if (!cancelled) {
        if (error) {
          console.error(error);
          setAudiencias([]);
        } else {
          const list = ((data ?? []) as (AudienciaOption & { convidados?: string | null })[]).map((a) => ({
            ...a,
            convidados: a.convidados ?? null,
          }));
          setAudiencias(list);
          if (list.length > 0) setAudienciaId(list[0].id);
        }
        setLoadingList(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    if (!user?.id || !audienciaId) {
      setInscritoVideoconferencia(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("audiencia_participacoes")
        .select("id")
        .eq("user_id", user.id)
        .eq("audiencia_id", audienciaId)
        .eq("tipo", "videoconferencia")
        .maybeSingle();
      if (!cancelled) setInscritoVideoconferencia(!!data);
    })();
    return () => { cancelled = true; };
  }, [user?.id, audienciaId]);

  const selectedAudiencia = audiencias.find((a) => a.id === audienciaId);

  const handleSubmit = async () => {
    if (tipoParticipacao === "presencial") return;

    if (tipoParticipacao === "escrito") {
      if (!nome.trim()) { toast.error("Preencha o nome completo."); return; }
      if (!email.trim() || !email.includes("@")) { toast.error("Preencha um e-mail válido."); return; }
      const phoneDigits = telefone.replace(/\D/g, "");
      if (phoneDigits.length < 10) { toast.error("Preencha o telefone/WhatsApp com DDD e número."); return; }
      if (!bairro) { toast.error("Selecione o bairro (subprefeitura)."); return; }
      if (!sugestao.trim()) { toast.error("Deixe sua sugestão para a audiência."); return; }
      if (!consent) { toast.error("É necessário concordar em compartilhar seus dados pessoais."); return; }
      if (!audienciaId) { toast.error("Escolha uma audiência."); return; }
    } else {
      if (!nome.trim()) { toast.error("Preencha o nome completo."); return; }
      if (!email.trim() || !email.includes("@")) { toast.error("Preencha um e-mail válido."); return; }
      const phoneDigits = telefone.replace(/\D/g, "");
      if (phoneDigits.length < 10) { toast.error("Preencha o telefone/WhatsApp com DDD e número."); return; }
      if (!consent) { toast.error("É necessário concordar em compartilhar seus dados pessoais."); return; }
      if (!audienciaId) { toast.error("Escolha uma audiência."); return; }
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("audiencia_participacoes").insert({
        audiencia_id: audienciaId,
        tipo: tipoParticipacao,
        user_id: user?.id ?? null,
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        entidade: null,
        funcao: null,
        bairro: tipoParticipacao === "escrito" ? bairro : null,
        sugestao: tipoParticipacao === "escrito" ? sugestao.trim() : null,
        consent: true,
      });
      if (error) throw error;

      toast.success(tipoParticipacao === "escrito" ? "Proposta enviada!" : "Inscrição registrada no app!");
      setSuccess(true);
      if (tipoParticipacao === "videoconferencia") setInscritoVideoconferencia(true);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    const msgPresencial =
      "Sua inscrição para participação presencial foi registrada. Compareça no local da audiência no dia e horário indicados.";
    const msgEscrito =
      "Sua manifestação por escrito foi registrada e será encaminhada à Comissão.";
    const msgVideoconferencia =
      "Sua inscrição foi registrada. No dia da audiência, acesse o app para ver o link da videoconferência (quando disponível).";
    const successMsg =
      tipoParticipacao === "presencial"
        ? msgPresencial
        : tipoParticipacao === "escrito"
          ? msgEscrito
          : msgVideoconferencia;
    const successTitle =
      tipoParticipacao === "escrito" ? "Proposta enviada!" : "Inscrição realizada!";
    return (
      <div className="mt-3 p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 space-y-2">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="font-medium">{successTitle}</span>
        </div>
        <p className="text-sm text-green-600 dark:text-green-400">{successMsg}</p>
      </div>
    );
  }

  if (loadingList) {
    return (
      <div className="mt-3 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando audiências...
      </div>
    );
  }

  if (audiencias.length === 0) {
    return (
      <div className="mt-3 text-sm text-muted-foreground">
        Não há audiências com inscrições abertas no momento.
      </div>
    );
  }

  const isPresencial = tipoParticipacao === "presencial";
  const isEscrito = tipoParticipacao === "escrito";

  return (
    <div className="mt-3 w-full max-w-[320px] rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <p className="text-xs font-medium text-foreground">
        {isPresencial ? "Participar presencialmente" : "Inscrever-se aqui"}
      </p>
      <div className="space-y-2">
        <Label className="text-xs">Forma de participação *</Label>
        <Select
          value={tipoParticipacao}
          onValueChange={(v) => setTipoParticipacao(v as "videoconferencia" | "escrito" | "presencial")}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="videoconferencia" className="text-sm flex items-center gap-2">
              <Video className="h-3.5 w-3.5" />
              Videoconferência
            </SelectItem>
            <SelectItem value="escrito" className="text-sm flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              Manifestação por escrito
            </SelectItem>
            <SelectItem value="presencial" className="text-sm flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              Presencial
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Audiência *</Label>
        <Select value={audienciaId} onValueChange={setAudienciaId}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Escolha a audiência" />
          </SelectTrigger>
          <SelectContent>
            {audiencias.map((a) => (
              <SelectItem key={a.id} value={a.id} className="text-sm">
                {a.titulo.length > 50 ? a.titulo.slice(0, 50) + "…" : a.titulo} • {a.data}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Convidados da audiência selecionada */}
      {selectedAudiencia?.convidados?.trim() && (() => {
        const textoNorm = normalizarConvidadosParaExibicao(selectedAudiencia.convidados);
        const itens = textoNorm
          .split(/\s*;\s*/)
          .map((s) => s.replace(/^\s*-\s*/, "").trim())
          .filter(Boolean);
        if (itens.length === 0) return null;
        return (
          <div className="space-y-1 text-xs text-muted-foreground rounded-md border border-border/60 bg-muted/20 p-2">
            <p className="font-semibold text-foreground">Convidados:</p>
            <ul className="list-none space-y-0.5 pl-0">
              {itens.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0">–</span>
                  <span>{item.endsWith(".") ? item : `${item};`}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {isPresencial ? (
        <>
          <div className="rounded-lg border border-border bg-background/50 p-3 space-y-2 text-sm">
            <p className="text-muted-foreground">
              Você pode participar da audiência no local ou protocolar sua manifestação pessoalmente:
            </p>
            <ul className="text-muted-foreground space-y-1 ml-4 list-disc">
              <li>
                <strong className="text-foreground">Comparecer no local:</strong>{" "}
                {selectedAudiencia?.local ?? "—"}
              </li>
              <li>
                <strong className="text-foreground">Protocolar na Câmara:</strong> no Protocolo Legislativo ou na Secretaria da Comissão — {CMSP_SECRETARIA_COMISSAO}.
              </li>
            </ul>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary/10"
            onClick={() => window.open(CMSP_MAPS_URL, "_blank", "noopener,noreferrer")}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Localização da Câmara
          </Button>
        </>
      ) : (
        <>
          {tipoParticipacao === "videoconferencia" && inscritoVideoconferencia && (
            <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Já inscrito nesta audiência</span>
            </div>
          )}
          {tipoParticipacao === "videoconferencia" && inscritoVideoconferencia ? null : (
          <>
          <div className="space-y-2">
            <Label className="text-xs">Nome completo *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={isEscrito ? "Seu nome completo" : "Seu nome"}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">E-mail *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Telefone/WhatsApp *</Label>
            <Input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(formatPhoneBr(e.target.value))}
              placeholder="(11) 99999-9999"
              maxLength={16}
              className="h-9 text-sm"
            />
          </div>
          {isEscrito && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Bairro (Subprefeitura) *</Label>
                <Select value={bairro} onValueChange={setBairro}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {BAIRROS_SP.map((b) => (
                      <SelectItem key={b} value={b} className="text-sm">{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Deixe sua sugestão para a Audiência Pública *</Label>
                <Textarea
                  value={sugestao}
                  onChange={(e) => setSugestao(e.target.value)}
                  placeholder="Digite sua proposta ou sugestão..."
                  rows={4}
                  className="text-sm resize-y min-h-[80px]"
                />
              </div>
            </>
          )}
          <div className="flex items-start gap-2">
            <Checkbox
              id="consent-inline"
              checked={consent}
              onCheckedChange={(v) => setConsent(!!v)}
              className="mt-0.5"
            />
            <Label htmlFor="consent-inline" className="text-xs cursor-pointer text-muted-foreground leading-tight">
              Concordo em compartilhar meus dados com a Câmara Municipal de São Paulo (LGPD).
            </Label>
          </div>
          {!isEscrito && (
            <div className="flex items-start gap-2">
              <Checkbox
                id="receive-push-inline"
                checked={receivePush}
                onCheckedChange={(v) => setReceivePush(!!v)}
                className="mt-0.5"
              />
              <Label htmlFor="receive-push-inline" className="text-xs cursor-pointer text-muted-foreground leading-tight flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 shrink-0" />
                Quero receber lembretes e notificações no celular (opcional).
              </Label>
            </div>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Enviando...
              </>
            ) : isEscrito ? (
              "Enviar Proposta"
            ) : (
              "Inscrever-se"
            )}
          </Button>
          </>
          )}
        </>
      )}
    </div>
  );
}
