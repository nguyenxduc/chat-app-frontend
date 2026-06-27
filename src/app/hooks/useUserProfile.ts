import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../context/AuthContext';
import { getUserServiceConfig, getUser } from '../lib/userApi';
import { userProfileQueryKey } from '../lib/queryKeys';
import { isValidUserId } from '../lib/userId';

export function useUserProfile(userId: string | null | undefined) {
  const { accessToken } = useAuth();
  const userSvcBase = getUserServiceConfig();
  const userSvc = userSvcBase && accessToken ? { baseUrl: userSvcBase.baseUrl, accessToken } : null;

  return useQuery({
    queryKey: userProfileQueryKey(userId ?? ''),
    queryFn: () => getUser(userSvc!, userId!),
    enabled: Boolean(userSvc && userId && isValidUserId(userId)),
    staleTime: 5 * 60 * 1000,
  });
}
