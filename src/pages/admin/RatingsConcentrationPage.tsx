import { Navigate } from "react-router-dom";

/** Legado — redireciona para a aba no mapa de calor unificado. */
export default function RatingsConcentrationPage() {
  return <Navigate to="/admin/reports-heatmap?metric=avaliacoes" replace />;
}
