import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useHolidays = () => {
  const queryClient = useQueryClient();

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('date');
      
      if (error) throw error;
      return data || [];
    }
  });

  const addHoliday = useMutation({
    mutationFn: async (holiday: { date: string; name: string }) => {
      const { error } = await supabase
        .from('holidays')
        .insert(holiday);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday added successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to add holiday: ' + error.message);
    }
  });

  const updateHoliday = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; date: string } }) => {
      const { error } = await supabase
        .from('holidays')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update holiday: ' + error.message);
    }
  });

  const deleteHoliday = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete holiday: ' + error.message);
    }
  });

  const isHoliday = (date: string): boolean => {
    return holidays.some(h => h.date === date);
  };

  return {
    holidays,
    isLoading,
    addHoliday: addHoliday.mutate,
    updateHoliday: updateHoliday.mutate,
    deleteHoliday: deleteHoliday.mutate,
    isHoliday
  };
};
