import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useClients = () => {
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data.map(client => ({
        id: client.id,
        name: client.name,
        colorClass: client.color_class,
        clientCode: client.client_code
      }));
    }
  });

  const addClient = useMutation({
    mutationFn: async (client: { name: string; color_class: string; client_code?: string }) => {
      const { error } = await supabase
        .from('clients')
        .insert(client);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add client: ' + error.message);
    }
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; color_class: string; client_code?: string } }) => {
      const { error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update client: ' + error.message);
    }
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete client: ' + error.message);
    }
  });

  return {
    clients,
    isLoading,
    addClient: addClient.mutate,
    updateClient: updateClient.mutate,
    deleteClient: deleteClient.mutate
  };
};
