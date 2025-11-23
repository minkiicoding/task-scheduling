import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserRole = (userId: string | undefined) => {
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['userRole', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data?.map(r => r.role) || [];
    },
    enabled: !!userId
  });

  // Get the highest priority role
  const getHighestRole = () => {
    if (roles.includes('super_admin')) return 'super_admin';
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('editor')) return 'editor';
    if (roles.includes('viewer')) return 'viewer';
    return null;
  };

  const role = getHighestRole();
  const canEdit = roles.some(r => ['super_admin', 'admin', 'editor'].includes(r));
  const canApprove = roles.some(r => ['super_admin', 'admin', 'editor'].includes(r));
  const isPartner = roles.some(r => ['super_admin', 'admin'].includes(r));

  return {
    role,
    roles,
    canEdit,
    canApprove,
    isPartner,
    isLoading
  };
};
