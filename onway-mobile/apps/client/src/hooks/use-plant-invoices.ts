import { useCallback, useEffect, useRef, useState } from 'react';

import { toInvoiceSummary, type InvoiceSummary } from '@/domain/contract';
import { ApiError, apiErrorMessage, mobileApi } from '@/services/mobile-api';

export function usePlantInvoices(plantId?: string) {
  const [data, setData] = useState<InvoiceSummary | null>(null);
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
      const response = await mobileApi.getPlantInvoices(plantId);
      if (version === requestVersion.current) setData(toInvoiceSummary(response));
    } catch (loadError) {
      if (version === requestVersion.current) {
        setData(null);
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
