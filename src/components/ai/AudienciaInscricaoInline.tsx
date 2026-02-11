"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Bell } from "lucide-react";

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
  slug: string | null;
  ap_code: string | null;
}

export function AudienciaInscricaoInline() {
  const { user, session } = useAuth();
  const [audiencias, setAudiencias] = useState<AudienciaOption[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [audienciaId, setAudienciaId] = useState<string>("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [consent, setConsent] = useState(false);
  const [receivePush, setReceivePush] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("audiencias")
        .select("id, titulo, data, slug, ap_code")
        .eq("inscricoes_abertas", true)
        .gte("data", today)
        .order("data", { ascending: true })
        .limit(20);
      if (!cancelled) {
        if (error) {
          console.error(error);
          setAudiencias([]);
        } else {
          const list = (data as AudienciaOption[]) ?? [];
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

  const selectedAudiencia = audiencias.find((a) => a.id === audienciaId);

  const handleSubmit = async () => {
    if (!nome.trim()) { toast.error("Preencha o nome completo."); return; }
    if (!email.trim() || !email.includes("@")) { toast.error("Preencha um e-mail válido."); return; }
    const phoneDigits = telefone.replace(/\D/g, "");
    if (phoneDigits.length < 10) { toast.error("Preencha o telefone/WhatsApp com DDD e número."); return; }
    if (!consent) { toast.error("É necessário concordar em compartilhar seus dados pessoais."); return; }
    if (!audienciaId) { toast.error("Escolha uma audiência."); return; }

    setIsSubmitting(true);
    try {
      const slug = selectedAudiencia?.slug ?? null;
      const apCode = selectedAudiencia?.ap_code ?? null;
      const useNinja = slug && apCode && session?.access_token;
      let enviadoCamara = false;

      if (useNinja) {
        const supabaseUrl = import.meta.env.CAMARA_URL ?? import.meta.env.VITE_SUPABASE_URL;
        const res = await fetch(`${supabaseUrl}/functions/v1/api-router/audiencias/inscricao`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session!.access_token}`,
          },
          body: JSON.stringify({
            nome: nome.trim(),
            email: email.trim(),
            telefone: telefone.trim(),
            apCode,
            slug,
          }),
        });
        const data = await res.json().catch(() => ({}));
        enviadoCamara = res.ok && data?.ok === true;
        if (!enviadoCamara) {
          const errors = Array.isArray(data?.errors) ? data.errors : data?.errors ? [String(data.errors)] : [];
          if (errors.length) errors.forEach((msg: string) => toast.error(msg));
          else toast.info("Inscrição registrada no app. Complete no site da Câmara para receber o e-mail.");
        }
      }

      const { error } = await supabase.from("audiencia_participacoes").insert({
        audiencia_id: audienciaId,
        tipo: "videoconferencia",
        user_id: user?.id ?? null,
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        entidade: null,
        funcao: null,
        consent: true,
      });
      if (error) throw error;

      toast.success(
        enviadoCamara
          ? "Inscrição realizada! Você receberá o link por e-mail."
          : "Inscrição registrada no app!"
      );
      setSuccess(true);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mt-3 p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 space-y-2">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="font-medium">Inscrição realizada!</span>
        </div>
        <p className="text-sm text-green-600 dark:text-green-400">
          Sua inscrição foi registrada. Para receber o e-mail com link da Câmara, complete no site oficial se a audiência tiver formulário disponível.
        </p>
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

  return (
    <div className="mt-3 w-full max-w-[320px] rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <p className="text-xs font-medium text-foreground">Inscrever-se aqui</p>
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
      <div className="space-y-2">
        <Label className="text-xs">Nome completo *</Label>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu nome"
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
        ) : (
          "Inscrever-se"
        )}
      </Button>
    </div>
  );
}
