import { useCallback, useEffect, useRef, useState } from 'react';

import { toGenerationHistory, type HistoryPeriod, type WeeklyGeneration } from '@/domain/client';
import { apiErrorMessage, mobileApi } from '@/services/mobile-api';

type PlantHistoryRange = {
  start: string;
  end: string;
  period: HistoryPeriod;
};

export function usePlantHistory(plantId?: string, range?: PlantHistoryRange) {
  const [data, setData] = useState<WeeklyGeneration | null>(null);
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
      const response = await mobileApi.getPlantHistory(plantId, range?.start, range?.end);
      if (version === requestVersion.current) {
        setData(toGenerationHistory(response, range?.period ?? 'week', range?.start));
      }
    } catch (loadError) {
      if (version === requestVersion.current) {
        setData(null);
        setError(apiErrorMessage(loadError));
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [plantId, range?.end, range?.period, range?.start]);

  useEffect(() => {
    load().catch(() => undefined);
    return () => {
      requestVersion.current += 1;
    };
  }, [load]);

  return { data, loading, error, reload: load };
}
