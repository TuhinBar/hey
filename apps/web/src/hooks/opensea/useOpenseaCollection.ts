import { OPENSEA_KEY } from '@hey/data/constants';
import type { OpenSeaCollection } from '@hey/types/opensea-nft';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import urlcat from 'urlcat';

interface UseOpenseaCollectionProps {
  slug: string;
  enabled?: boolean;
}

const useOpenseaCollection = ({
  slug,
  enabled
}: UseOpenseaCollectionProps): {
  data: OpenSeaCollection;
  loading: boolean;
  error: unknown;
} => {
  const loadCollectionDetails = async () => {
    const response = await axios.get(
      urlcat('https://api.opensea.io/api/v1/collection/:slug', { slug }),
      { headers: { 'X-API-KEY': OPENSEA_KEY } }
    );

    return response.data?.collection;
  };

  const { data, isLoading, error } = useQuery(
    ['openseaCollectionDetails', slug],
    () => loadCollectionDetails().then((res) => res),
    { enabled }
  );

  return { data, loading: isLoading, error };
};

export default useOpenseaCollection;
