import { useState, useEffect } from "react";

function getMapboxToken(): string {
  const env = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  if (env && typeof env === "string" && env.startsWith("pk.")) return env;
  return typeof localStorage !== "undefined" ? localStorage.getItem("mapbox_token") || "" : "";
}

/** Retorna o token do Mapbox (env ou localStorage) para uso em Matrix API, rotas, etc. */
export function useMapboxToken(): string {
  const [token, setToken] = useState(getMapboxToken);

  useEffect(() => {
    const onStorage = () => setToken(getMapboxToken());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return token;
}

export { getMapboxToken };
