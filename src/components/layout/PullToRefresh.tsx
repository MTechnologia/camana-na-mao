import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

// Distância (px) necessária para disparar o refresh ao soltar.
const THRESHOLD = 70;
// Distância máxima do indicador (com resistência aplicada).
const MAX_PULL = 120;
// Fator de resistência do arraste (sensação de "elástico").
const DAMPING = 0.5;

/**
 * Pull-to-refresh global (mobile): ao puxar a tela para baixo a partir do topo,
 * mostra um indicador e, ao soltar além do limite, recarrega o aplicativo.
 *
 * - Ativo apenas em dispositivos de toque.
 * - Só inicia quando a página está no topo (window.scrollY === 0).
 * - Ignorado quando há um modal/drawer aberto (scroll travado pelo Radix).
 * - "Recarregar" = location.reload(), aproveitando o cache fresco (index.html
 *   no-cache + service worker NetworkFirst) para trazer a versão/dados atuais.
 */
export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Espelhos em ref para a lógica dentro dos listeners (evita re-registrar a
  // cada movimento e problemas de closure).
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const pulling = useRef(false);
  const releasing = useRef(false);

  useEffect(() => {
    const isTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    if (!isTouch) return;

    const setPullValue = (v: number) => {
      pullRef.current = v;
      setPull(v);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (
        window.scrollY > 0 ||
        pullRef.current > 0 ||
        e.touches.length !== 1 ||
        // Modal/drawer aberto (react-remove-scroll trava o body): não interferir.
        document.body.hasAttribute("data-scroll-locked")
      ) {
        return;
      }
      startY.current = e.touches[0].clientY;
      pulling.current = true;
      releasing.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      // Movimento para cima ou página já rolou: cancela o gesto.
      if (delta <= 0 || window.scrollY > 0) {
        pulling.current = false;
        setPullValue(0);
        return;
      }
      const dist = Math.min(MAX_PULL, delta * DAMPING);
      setPullValue(dist);
      // Suprime o overscroll/refresh nativo do navegador durante o gesto.
      if (dist > 5 && e.cancelable) e.preventDefault();
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      releasing.current = true;
      startY.current = null;
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        // Pequeno atraso para o spinner aparecer antes de recarregar.
        window.setTimeout(() => window.location.reload(), 150);
      } else {
        setPullValue(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const visible = pull > 0 || refreshing;
  const offset = refreshing ? THRESHOLD : pull;
  const reached = pull >= THRESHOLD;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center"
      style={{
        transform: `translateY(${offset}px)`,
        opacity: visible ? 1 : 0,
        // Acompanha o dedo durante o arraste; anima de volta ao soltar.
        transition: pulling.current
          ? "none"
          : "transform 0.2s ease, opacity 0.2s ease",
      }}
    >
      <div className="mt-2 rounded-full border border-border bg-background p-2 shadow-md">
        <RefreshCw
          className={`h-5 w-5 text-primary ${refreshing ? "animate-spin" : ""}`}
          style={
            refreshing
              ? undefined
              : { transform: `rotate(${Math.min(1, pull / THRESHOLD) * 270}deg)` }
          }
        />
        <span className="sr-only">
          {reached ? "Solte para atualizar" : "Puxe para atualizar"}
        </span>
      </div>
    </div>
  );
}
