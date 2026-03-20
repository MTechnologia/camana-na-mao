import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PencilLine } from "lucide-react";
import {
  SERVICE_CORRECTION_FIELDS,
  type ServiceCorrectionFieldKey,
  type ServiceLike,
  getCorrectionCurrentValue,
} from "@/lib/serviceCorrectionFields";

type Props = {
  service: ServiceLike;
  realServiceId: string | null;
  userId: string | null;
  onRequestLogin: () => void;
};

export function ServiceCorrectionSuggestSection({
  service,
  realServiceId,
  userId,
  onRequestLogin,
}: Props) {
  const [open, setOpen] = useState(false);
  const [fieldKey, setFieldKey] = useState<ServiceCorrectionFieldKey>("address");
  const [suggested, setSuggested] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const current = getCorrectionCurrentValue(service, fieldKey);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setSuggested("");
      setFieldKey("address");
    }
  };

  const submit = async () => {
    if (!userId) {
      onRequestLogin();
      return;
    }
    if (!realServiceId) {
      toast.error("Este equipamento ainda não está no cadastro oficial. Tente pela busca ou avalie o serviço primeiro.");
      return;
    }
    const trimmed = suggested.trim();
    if (trimmed.length < 3) {
      toast.error("Descreva a correção sugerida (mínimo 3 caracteres).");
      return;
    }
    if (trimmed.length > 4000) {
      toast.error("Texto muito longo. Resuma em até 4000 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("service_corrections").insert({
        user_id: userId,
        service_id: realServiceId,
        field_name: fieldKey,
        current_value: current.length > 2000 ? `${current.slice(0, 2000)}…` : current || null,
        suggested_value: trimmed,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Sugestão enviada. Obrigado por ajudar a manter o cadastro atualizado!");
      setOpen(false);
      setSuggested("");
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar a sugestão.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full" size="lg" type="button">
          <PencilLine className="w-4 h-4 mr-2" />
          Sugerir correção de informação
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto sm:max-w-lg sm:mx-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Correção de cadastro</SheetTitle>
          <SheetDescription>
            Informe qual dado está incorreto ou desatualizado. A equipe da Câmara analisará sua sugestão.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4 px-1">
          {!realServiceId && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Para enviar sugestão, o equipamento precisa constar no cadastro. Use um resultado da busca com ID
              oficial ou avalie o serviço para vinculá-lo.
            </p>
          )}
          <div className="space-y-2">
            <Label>Campo a corrigir</Label>
            <Select
              value={fieldKey}
              onValueChange={(v) => setFieldKey(v as ServiceCorrectionFieldKey)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_CORRECTION_FIELDS.map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor exibido hoje (referência)</Label>
            <p className="text-sm text-muted-foreground rounded-md border border-border bg-muted/40 p-3 whitespace-pre-wrap break-words">
              {current || "—"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="suggested-value">Sua sugestão (como deveria estar)</Label>
            <Textarea
              id="suggested-value"
              placeholder="Ex.: O telefone correto é (11) 3000-0000; a unidade mudou de endereço em 2025…"
              value={suggested}
              onChange={(e) => setSuggested(e.target.value)}
              rows={5}
              maxLength={4000}
            />
            <p className="text-xs text-muted-foreground">{suggested.length}/4000</p>
          </div>
        </div>
        <SheetFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={submitting}>
            {submitting ? "Enviando…" : "Enviar sugestão"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
