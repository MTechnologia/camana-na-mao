import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type LightboxState = { photos: string[]; index: number; open: boolean };

/**
 * Visualizador de imagens in-app (lightbox). Abre a imagem dentro do app, sem
 * navegar para a URL pública do Storage — assim a barra de endereço não expõe a
 * URL nem o domínio/projeto do Supabase. Suporta múltiplas imagens com navegação.
 *
 * Uso:
 *   const { openLightbox, lightbox } = useImageLightbox();
 *   <button onClick={() => openLightbox(photos, i)}>...thumb...</button>
 *   {lightbox}
 */
export function useImageLightbox() {
  const [state, setState] = useState<LightboxState>({ photos: [], index: 0, open: false });

  const openLightbox = useCallback((photos: string[], index = 0) => {
    if (!Array.isArray(photos) || photos.length === 0) return;
    const safe = Math.max(0, Math.min(index, photos.length - 1));
    setState({ photos, index: safe, open: true });
  }, []);

  const setOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  const go = useCallback((delta: number) => {
    setState((prev) => {
      if (prev.photos.length === 0) return prev;
      const next = (prev.index + delta + prev.photos.length) % prev.photos.length;
      return { ...prev, index: next };
    });
  }, []);

  const current = state.photos[state.index];

  const lightbox = (
    <Dialog open={state.open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl border-0 bg-background/95 p-3 sm:p-4">
        <DialogTitle className="sr-only">Visualizar imagem</DialogTitle>
        <div className="relative flex items-center justify-center">
          {current ? (
            <img
              src={current}
              alt="Imagem do relato"
              className="max-h-[80vh] w-auto max-w-full rounded-md object-contain"
            />
          ) : null}
          {state.photos.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Imagem anterior"
                onClick={() => go(-1)}
                className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Próxima imagem"
                onClick={() => go(1)}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
                {state.index + 1} / {state.photos.length}
              </span>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );

  return { openLightbox, lightbox };
}
