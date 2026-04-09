import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeSptransOlhoVivo } from "@/lib/sptransOlhoVivo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Página só para validar a Edge Function `sptrans-olhovivo` após deploy.
 * Ajuste `path` e parâmetros conforme a documentação SPTrans (ex.: Posicao + codigoLinha).
 */
export default function SptransOlhoVivoTestPage() {
  const [path, setPath] = useState("Posicao");
  const [codigoLinha, setCodigoLinha] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const params: { path: string; codigoLinha?: string } = { path: path.trim() };
      if (codigoLinha.trim()) params.codigoLinha = codigoLinha.trim();

      const { data, error: fnError } = await invokeSptransOlhoVivo(supabase, params);
      if (fnError) {
        setError(fnError.message);
        return;
      }
      setResult(typeof data === "string" ? data : JSON.stringify(data, null, 2));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Teste Olho Vivo (proxy)</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Chama a Edge Function <code className="text-xs bg-muted px-1 rounded">sptrans-olhovivo</code> com
          sessão ativa. Parâmetros reais dependem da{" "}
          <a
            href="https://www.sptrans.com.br/desenvolvedores/api-do-olho-vivo-guia-de-referencia/documentacao-api/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            documentação SPTrans
          </a>
          .
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="path">path</Label>
          <Input
            id="path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="ex.: Posicao ou Linha/Buscar"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="codigoLinha">codigoLinha (opcional)</Label>
          <Input
            id="codigoLinha"
            value={codigoLinha}
            onChange={(e) => setCodigoLinha(e.target.value)}
            placeholder="ex.: código numérico da linha"
          />
        </div>
        <Button type="button" onClick={run} disabled={loading || !path.trim()}>
          {loading ? "A chamar…" : "Chamar API"}
        </Button>
      </div>

      {error && (
        <pre className="text-sm bg-destructive/10 text-destructive p-4 rounded-md overflow-auto whitespace-pre-wrap">
          {error}
        </pre>
      )}
      {result && (
        <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-[480px] whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}
