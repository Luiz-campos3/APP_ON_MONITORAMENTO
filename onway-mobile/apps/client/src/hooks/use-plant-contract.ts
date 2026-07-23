import { useCallback, useEffect, useRef, useState } from 'react';

import { toContract, type Contract } from '@/domain/contract';
import { ApiError, apiErrorMessage, mobileApi } from '@/services/mobile-api';

export function usePlantContract(plantId?: string) {
  const [data, setData] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!plantId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await mobileApi.getPlantContract(plantId);
      if (version === requestVersion.current) setData(toContract(response));
    } catch (loadError) {
      if (version === requestVersion.current) {
        setData(null);
        // 404 = usina sem contrato vinculado; não é erro para o usuário.
        setError(loadError instanceof ApiError && loadError.httpStatus === 404 ? null : apiErrorMessage(loadError));
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [plantId]);

  useEffect(() => {
    load().catch(() => undefined);
    return () => {
      requestVersion.current += 1;
    };
  }, [load]);

  return { data, loading, error, reload: load };
}
