import { useState, useEffect } from 'react';
import { CityGeo } from '../types';

export function useCitiesGeo() {
  const [citiesGeo, setCitiesGeo] = useState<CityGeo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCitiesGeo() {
      try {
        const response = await fetch('/api/cities-geo');
        if (!response.ok) {
          throw new Error('Failed to fetch cities geo data');
        }
        const data: CityGeo[] = await response.json();
        // Filter out entries with invalid coordinates
        const validCities = data.filter(city => city.lat !== 0 && city.lng !== 0);
        setCitiesGeo(validCities);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCitiesGeo();
  }, []);

  return { citiesGeo, isLoading, error };
}
