import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/api";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.auth.user(),
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 30000, // 30 seconds - recheck auth status periodically
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
  };
}
