import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useUserRoles = () => {
  const queryClient = useQueryClient();

  const { data: userRoles = [], isLoading } = useQuery({
    queryKey: ['userRoles'],
    queryFn: async () => {
      console.log('Fetching user roles...');
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role, profiles(name, employee_code)');
      
      console.log('User roles query result:', { data, error });
      
      if (error) {
        console.error('Error fetching user roles:', error);
        throw error;
      }
      
      console.log('User roles data:', data);
      return data || [];
    }
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      toast.success('Role updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update role: ' + error.message);
    }
  });

  return {
    userRoles,
    isLoading,
    updateRole: updateRole.mutate
  };
};
