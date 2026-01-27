import { useState, useEffect } from 'react';
import { Area } from '../types';

export function useAreas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAreas() {
      try {
        const response = await fetch('/api/areas');
        if (!response.ok) {
          throw new Error('Failed to fetch areas');
        }
        const data: Area[] = await response.json();
        setAreas(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAreas();
  }, []);

  return { areas, isLoading, error };
}
