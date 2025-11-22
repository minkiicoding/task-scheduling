import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePositionRoleMappings = () => {
  const queryClient = useQueryClient();

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['positionRoleMappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('position_role_mappings')
        .select('*')
        .order('position');
      
      if (error) throw error;
      return data;
    }
  });

  const updateMapping = useMutation({
    mutationFn: async ({ position, role }: { position: string; role: string }) => {
      const { error } = await supabase
        .from('position_role_mappings')
        .update({ role })
        .eq('position', position);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positionRoleMappings'] });
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      toast.success('อัปเดตสิทธิ์เรียบร้อยแล้ว');
    },
    onError: (error: any) => {
      toast.error('ไม่สามารถอัปเดตสิทธิ์ได้: ' + error.message);
    }
  });

  return {
    mappings,
    isLoading,
    updateMapping: updateMapping.mutate
  };
};
