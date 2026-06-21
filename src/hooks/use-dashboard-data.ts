import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-provider";
import { fetchActivity, fetchBriefs, fetchProfile } from "@/lib/supabase/dashboard";

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: Boolean(user?.id),
  });
}

export function useBriefs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["briefs", user?.id],
    queryFn: () => fetchBriefs(user!.id),
    enabled: Boolean(user?.id),
  });
}

export function useActivity() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["activity", user?.id],
    queryFn: () => fetchActivity(user!.id),
    enabled: Boolean(user?.id),
  });
}
