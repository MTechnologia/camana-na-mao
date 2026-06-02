import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAiDraft,
  fetchAiConfigBundle,
  publishAiVersion,
  reactivateAiVersion,
  saveRollbackPolicy,
  updatePromptTemplate,
  type AiConfigBundle,
} from "@/lib/aiConfigApi";
import type {
  AiRollbackPolicy,
  ConfigEnvironment,
  PromptTemplateDefinition,
} from "@/types/systemConfig";

const queryKey = (environment: ConfigEnvironment) => ["ai-config", environment] as const;

export function useAiConfig(environment: ConfigEnvironment) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKey(environment),
    queryFn: () => fetchAiConfigBundle(environment),
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey(environment) });

  const publishMutation = useMutation({
    mutationFn: publishAiVersion,
    onSuccess: invalidate,
  });

  const reactivateMutation = useMutation({
    mutationFn: reactivateAiVersion,
    onSuccess: invalidate,
  });

  const createDraftMutation = useMutation({
    mutationFn: () => createAiDraft(environment),
    onSuccess: invalidate,
  });

  const savePolicyMutation = useMutation({
    mutationFn: (policy: AiRollbackPolicy) => saveRollbackPolicy(environment, policy),
    onSuccess: invalidate,
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({
      slug,
      patch,
    }: {
      slug: string;
      patch: Pick<PromptTemplateDefinition, "name" | "description" | "body" | "variables">;
    }) => updatePromptTemplate(slug, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
    },
  });

  return {
    bundle: query.data as AiConfigBundle | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    publishVersion: publishMutation.mutateAsync,
    isPublishing: publishMutation.isPending,
    reactivateVersion: reactivateMutation.mutateAsync,
    isReactivating: reactivateMutation.isPending,
    createDraft: createDraftMutation.mutateAsync,
    isCreatingDraft: createDraftMutation.isPending,
    savePolicy: savePolicyMutation.mutateAsync,
    isSavingPolicy: savePolicyMutation.isPending,
    updateTemplate: updateTemplateMutation.mutateAsync,
    isUpdatingTemplate: updateTemplateMutation.isPending,
  };
}
