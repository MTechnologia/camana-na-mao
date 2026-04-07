import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, PencilLine, X } from "lucide-react";
import {
  SERVICE_CORRECTION_TYPES,
  SERVICE_CORRECTION_REVIEW_SLA_HOURS,
  toLegacyCorrectionTypeForDb,
  type ServiceCorrectionTypeValue,
  type ServiceLike,
  getServiceContextSummary,
} from "@/lib/serviceCorrectionFields";
import { cn } from "@/lib/utils";

const MAX_DESCRIPTION = 4000;
const MAX_PHOTO_MB = 5;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  const [correctionType, setCorrectionType] = useState<ServiceCorrectionTypeValue>("localizacao_incorreta");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const contextSummary = getServiceContextSummary(service);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const resetForm = () => {
    setCorrectionType("localizacao_incorreta");
    setDescription("");
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) resetForm();
  };

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MIME.has(file.type)) {
      toast.error("Use uma imagem JPG, PNG ou WebP.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      toast.error(`A foto deve ter no máximo ${MAX_PHOTO_MB} MB.`);
      e.target.value = "";
      return;
    }
    setPhotoFile(file);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadEvidence = async (uid: string): Promise<string | null> => {
    if (!photoFile) return null;
    const ext = photoFile.name.split(".").pop()?.toLowerCase();
    const safeExt = ext && ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const path = `${uid}/${crypto.randomUUID()}.${safeExt}`;

    const { error } = await supabase.storage.from("service-corrections").upload(path, photoFile, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("service-corrections").getPublicUrl(path);
    return publicUrl;
  };

  const submit = async () => {
    if (!userId) {
      onRequestLogin();
      return;
    }
    if (!realServiceId) {
      toast.error(
        "Este equipamento ainda não está no cadastro oficial. Tente pela busca ou avalie o serviço primeiro.",
      );
      return;
    }
    const trimmed = description.trim();
    if (trimmed.length < 8) {
      toast.error("Descreva a correção com pelo menos 8 caracteres.");
      return;
    }
    if (trimmed.length > MAX_DESCRIPTION) {
      toast.error(`Texto muito longo. Máximo ${MAX_DESCRIPTION} caracteres.`);
      return;
    }

    setSubmitting(true);
    try {
      let evidenceUrl: string | null = null;
      if (photoFile) {
        evidenceUrl = await uploadEvidence(userId);
      }

      const baseRow = {
        user_id: userId,
        service_id: realServiceId,
        field_name: null as string | null,
        current_value: contextSummary.length > 2000 ? `${contextSummary.slice(0, 2000)}…` : contextSummary,
        suggested_value: trimmed,
        correction_type: correctionType,
        evidence_photo_url: evidenceUrl,
        status: "pending" as const,
      };

      let { error } = await supabase.from("service_corrections").insert(baseRow);
      const isCorrectionTypeCheck =
        error?.code === "23514" &&
        String(error.message ?? "").includes("service_corrections_correction_type_check");
      if (isCorrectionTypeCheck) {
        const { error: retryError } = await supabase.from("service_corrections").insert({
          ...baseRow,
          correction_type: toLegacyCorrectionTypeForDb(correctionType),
        });
        error = retryError;
      }
      if (error) throw error;
      toast.success(
        `Sugestão enviada. Nossa equipe tende a validar em até ${SERVICE_CORRECTION_REVIEW_SLA_HOURS} horas. Obrigado por ajudar!`,
      );
      setOpen(false);
      resetForm();
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
        <Button
          variant="outline"
          className="w-full"
          size="lg"
          type="button"
          aria-label="Abrir formulário para sugerir correção de informação do equipamento"
        >
          <PencilLine className="w-4 h-4 mr-2 shrink-0" aria-hidden />
          Sugerir correção de informação
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto sm:max-w-lg sm:mx-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Correção de cadastro</SheetTitle>
          <SheetDescription>
            Indique o tipo de informação incorreta, descreva o que deveria constar e, se quiser, anexe uma foto como
            evidência. Um administrador analisa em até {SERVICE_CORRECTION_REVIEW_SLA_HOURS} horas e você é notificado.
            O cadastro oficial só muda após aprovação e atualização pela equipe — o envio não altera o registro sozinho.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 py-4 px-1">
          {!realServiceId && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Para enviar sugestão, o equipamento precisa constar no cadastro. Use um resultado da busca com ID
              oficial ou avalie o serviço para vinculá-lo.
            </p>
          )}

          <div className="space-y-2">
            <Label className="text-base">Tipo da correção</Label>
            <RadioGroup
              value={correctionType}
              onValueChange={(v) => setCorrectionType(v as ServiceCorrectionTypeValue)}
              className="grid gap-3"
            >
              {SERVICE_CORRECTION_TYPES.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                    correctionType === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <RadioGroupItem value={opt.value} id={`corr-${opt.value}`} className="mt-0.5" />
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-sm font-medium leading-tight">{opt.label}</span>
                    <p className="text-xs text-muted-foreground">{opt.hint}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="corr-description">Descrição</Label>
            <Textarea
              id="corr-description"
              placeholder="Explique o que está errado e como deveria aparecer no app (ex.: horário real, endereço correto, telefone da unidade…)."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              maxLength={MAX_DESCRIPTION}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/{MAX_DESCRIPTION} · mínimo 8 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label>Evidência (opcional)</Label>
            <p className="text-xs text-muted-foreground">Foto da fachada, placa, horário na porta etc. JPG, PNG ou WebP, até {MAX_PHOTO_MB} MB.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={onPickPhoto}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Camera className="w-4 h-4 mr-2" />
                {photoFile ? "Trocar foto" : "Anexar foto"}
              </Button>
              {photoFile && (
                <Button type="button" variant="ghost" size="sm" onClick={clearPhoto}>
                  <X className="w-4 h-4 mr-1" />
                  Remover
                </Button>
              )}
            </div>
            {photoPreview && (
              <div className="relative rounded-md border overflow-hidden max-h-48 w-full bg-muted/30">
                <img src={photoPreview} alt="Pré-visualização da evidência" className="w-full h-full object-contain max-h-48" />
              </div>
            )}
          </div>

          <div className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Contexto do cadastro hoje: </span>
            {contextSummary}
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
