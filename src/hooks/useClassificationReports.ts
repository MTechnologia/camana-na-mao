import { useEffect, useState } from "react";
import {
  fetchClassificationReports,
  type ClassificationReportItem,
  type ClassificationReportKind,
} from "@/lib/classificationReports";

export function useClassificationReports(
  kind: ClassificationReportKind | null,
  totalCount: number,
) {
  const [items, setItems] = useState<ClassificationReportItem[]>([]);
  const [total, setTotal] = useState(totalCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kind) {
      setItems([]);
      setTotal(0);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void fetchClassificationReports(kind, totalCount)
      .then((result) => {
        if (!cancelled) {
          setItems(result.items);
          setTotal(result.total);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Erro ao carregar relatos";
          setError(msg);
          setItems([]);
          setTotal(totalCount);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [kind, totalCount]);

  return { items, total, isLoading, error };
}
