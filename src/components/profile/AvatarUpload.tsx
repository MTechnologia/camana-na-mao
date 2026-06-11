import { useState, useCallback } from "react";
import { Camera, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import Cropper from "react-easy-crop";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { moderateUploadedImage, IMAGE_MODERATION_BLOCKED_MESSAGE } from "@/lib/moderateImage";
import { readFile, validateImageFile, createCroppedImage } from "@/lib/imageUtils";

interface AvatarUploadProps {
  userId: string;
  userName?: string;
  currentAvatarUrl?: string | null;
  onAvatarUpdated: (url: string) => void;
}

const AvatarUpload = ({
  userId,
  userName,
  currentAvatarUrl,
  onAvatarUpdated,
}: AvatarUploadProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const onCropComplete = useCallback(
    (
      _croppedArea: unknown,
      croppedAreaPixels: { x: number; y: number; width: number; height: number },
    ) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setIsOpen(true);
    } catch (error) {
      toast.error("Erro ao carregar imagem");
    }
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setUploading(true);
    try {
      // Criar imagem cortada
      const croppedBlob = await createCroppedImage(imageSrc, croppedAreaPixels);

      // Deletar avatar antigo se existir
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([`${userId}/${oldPath}`]);
        }
      }

      // Upload da nova imagem
      const fileName = `avatar-${Date.now()}.jpg`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Moderação de conteúdo: se reprovada, o servidor já removeu o objeto.
      const moderation = await moderateUploadedImage("avatars", filePath);
      if (moderation.blocked) throw new Error(IMAGE_MODERATION_BLOCKED_MESSAGE);

      // Obter URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Atualizar perfil
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      toast.success("Foto de perfil atualizada!");
      onAvatarUpdated(publicUrl);
      handleClose();
    } catch (error: unknown) {
      console.error("Error uploading avatar:", error);
      toast.error(
        (error instanceof Error ? error.message : String(error)) || "Erro ao fazer upload da foto",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  return (
    <>
      <label htmlFor="avatar-upload" className="relative cursor-pointer group">
        {/* Avatar Container */}
        <div className="w-24 h-24 rounded-full overflow-hidden bg-muted ring-4 ring-background shadow-xl transition-transform group-hover:scale-105">
          {currentAvatarUrl ? (
            <img src={currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-3xl font-bold">
              {userName ? getInitials(userName) : userId.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Camera Badge */}
        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg ring-2 ring-background transition-all group-hover:scale-110 group-hover:bg-primary/90">
          <Camera size={16} />
        </div>

        {/* Hidden Input */}
        <input
          id="avatar-upload"
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
      </label>

      {/* Hint Text */}
      <p className="text-xs text-muted-foreground mt-2 text-center">Toque para alterar foto</p>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Foto de Perfil</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {imageSrc && (
              <>
                <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Zoom</label>
                  <Slider
                    value={[zoom]}
                    min={1}
                    max={3}
                    step={0.1}
                    onValueChange={(value) => setZoom(value[0])}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleClose}
                    disabled={uploading}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button className="flex-1 bg-primary" onClick={handleUpload} disabled={uploading}>
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Salvar Foto
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AvatarUpload;
