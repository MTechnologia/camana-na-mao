import { useMemo } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useVereadores } from '@/hooks/useVereadores';

export const useGabineteVereador = () => {
  const {
    loading: roleLoading,
    councilMemberId,
    isVereador,
    isAssessor,
    canViewGabinete,
    canRespondReferrals,
    canViewOpenManifests,
  } = useUserRole();
  const { data: vereadores = [], isLoading: vereadoresLoading } = useVereadores();

  const vereador = useMemo(
    () => vereadores.find((item) => item.id === councilMemberId),
    [vereadores, councilMemberId],
  );

  return {
    loading: roleLoading || vereadoresLoading,
    councilMemberId,
    vereador,
    isVereador,
    isAssessor,
    canViewGabinete,
    canRespondReferrals,
    canViewOpenManifests,
  };
};
