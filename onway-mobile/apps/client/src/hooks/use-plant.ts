import { useCallback, useEffect, useRef, useState } from 'react';

import { toPlant, type Plant } from '@/domain/client';
import { apiErrorMessage, mobileApi } from '@/services/mobile-api';

export function usePlant(plantId?: string) {
  const [data, setData] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!plantId) {
      setData(null);
      setLoading(false);
      setError('Identificador da usina não informado.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await mobileApi.getPlant(plantId);
      if (version === requestVersion.current) setData(toPlant(response));
    } catch (loadError) {
      if (version === requestVersion.current) {
        setData(null);
        setError(apiErrorMessage(loadError));
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
