import { useCallback, useEffect, useRef, useState } from 'react';

import { toInvoice, type Invoice } from '@/domain/contract';
import { apiErrorMessage, mobileApi } from '@/services/mobile-api';

export function useInvoice(invoiceId?: string) {
  const [data, setData] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!invoiceId) {
      setData(null);
      setLoading(false);
      setError('Fatura não informada.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await mobileApi.getInvoice(invoiceId);
      if (version === requestVersion.current) setData(toInvoice(response));
    } catch (loadError) {
      if (version === requestVersion.current) {
        setData(null);
        setError(apiErrorMessage(loadError));
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    load().catch(() => undefined);
    return () => {
      requestVersion.current += 1;
    };
  }, [load]);

  return { data, loading, error, reload: load };
}
