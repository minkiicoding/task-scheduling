import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { requiresPartnerApproval } from '@/utils/assignmentUtils';

export const useAssignments = () => {
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Transform snake_case to camelCase for frontend
      return data.map(item => ({
        ...item,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    }
  });

  const saveAssignment = useMutation({
    mutationFn: async ({ id, isHolidayFn, dates, ...assignment }: any) => {
      const isUpdate = !!id;
      // If dates array is provided, create multiple assignments
      if (dates && Array.isArray(dates) && dates.length > 1) {
        // Check for conflicts for all dates
        for (const date of dates) {
          // Check assignment conflicts
          const { data: existingAssignments, error: fetchError } = await supabase
            .from('assignments')
            .select('*')
            .eq('date', date)
            .neq('status', 'cancelled');
          
          if (fetchError) throw fetchError;

          if (existingAssignments) {
            for (const employeeId of assignment.employee_ids) {
              const conflictingAssignment = existingAssignments.find(existing => {
                if (!existing.employee_ids.includes(employeeId)) return false;
                
                const newStart = assignment.start_time;
                const newEnd = assignment.end_time;
                const existingStart = existing.start_time;
                const existingEnd = existing.end_time;
                
                return (newStart < existingEnd && newEnd > existingStart);
              });

              if (conflictingAssignment) {
                throw new Error(`พนักงานมีตารางงานอื่นในวันที่ ${date} ในช่วงเวลาเดียวกันแล้ว กรุณาเลือกช่วงเวลาอื่น`);
              }
            }
          }

          // Check leave conflicts
          const { data: leaves, error: leavesError } = await supabase
            .from('leaves')
            .select('*')
            .lte('start_date', date)
            .gte('end_date', date)
            .in('status', ['approved', 'pending'])
            .neq('status', 'cancelled');
          
          if (leavesError) throw leavesError;

          if (leaves && leaves.length > 0) {
            for (const employeeId of assignment.employee_ids) {
              const conflictingLeave = leaves.find(leave => {
                if (leave.employee_id !== employeeId) return false;
                
                // If leave has specific times, check time overlap
                if (leave.start_time && leave.end_time) {
                  const assignStart = assignment.start_time;
                  const assignEnd = assignment.end_time;
                  const leaveStart = leave.start_time;
                  const leaveEnd = leave.end_time;
                  
                  return (assignStart < leaveEnd && assignEnd > leaveStart);
                }
                
                // Full day leave - always conflicts
                return true;
              });

              if (conflictingLeave) {
                throw new Error(`พนักงานมีการลาในวันที่ ${date} กรุณาเลือกพนักงานหรือช่วงเวลาอื่น`);
              }
            }
          }
        }

        // Create assignments for all dates
        const assignmentsToCreate = dates.map(date => {
          const partnerApprovalRequired = requiresPartnerApproval(
            date,
            assignment.start_time,
            assignment.end_time,
            isHolidayFn
          );

          return {
            ...assignment,
            date,
            partner_approval_required: partnerApprovalRequired,
            status: partnerApprovalRequired ? 'pending' : 'approved'
          };
        });

        const { error } = await supabase
          .from('assignments')
          .insert(assignmentsToCreate);
        
        if (error) throw error;
        return;
      }

      // Original single-day logic
      // Check for time conflicts with existing assignments
      const { data: existingAssignments, error: fetchError } = await supabase
        .from('assignments')
        .select('*')
        .eq('date', assignment.date)
        .neq('status', 'cancelled');
      
      if (fetchError) throw fetchError;

      // Check if any assigned employee has a conflict
      if (existingAssignments) {
        for (const employeeId of assignment.employee_ids) {
          const conflictingAssignment = existingAssignments.find(existing => {
            // Skip if it's the same assignment being updated
            if (id && existing.id === id) return false;
            
            // Check if this employee is assigned to the existing assignment
            if (!existing.employee_ids.includes(employeeId)) return false;
            
            // Parse times for comparison
            const newStart = assignment.start_time;
            const newEnd = assignment.end_time;
            const existingStart = existing.start_time;
            const existingEnd = existing.end_time;
            
            // Check if times overlap
            return (newStart < existingEnd && newEnd > existingStart);
          });

          if (conflictingAssignment) {
            throw new Error(`พนักงานมีตารางงานอื่นในช่วงเวลาเดียวกันแล้ว กรุณาเลือกช่วงเวลาอื่น`);
          }
        }
      }

      // Check for conflicts with leaves
      const { data: leaves, error: leavesError } = await supabase
        .from('leaves')
        .select('*')
        .lte('start_date', assignment.date)
        .gte('end_date', assignment.date)
        .in('status', ['approved', 'pending'])
        .neq('status', 'cancelled');
      
      if (leavesError) throw leavesError;

      if (leaves && leaves.length > 0) {
        for (const employeeId of assignment.employee_ids) {
          const conflictingLeave = leaves.find(leave => {
            if (leave.employee_id !== employeeId) return false;
            
            // If leave has specific times, check time overlap
            if (leave.start_time && leave.end_time) {
              const assignStart = assignment.start_time;
              const assignEnd = assignment.end_time;
              const leaveStart = leave.start_time;
              const leaveEnd = leave.end_time;
              
              return (assignStart < leaveEnd && assignEnd > leaveStart);
            }
            
            // Full day leave - always conflicts
            return true;
          });

          if (conflictingLeave) {
            throw new Error(`พนักงานมีการลาในวันที่ ${assignment.date} กรุณาเลือกพนักงานหรือช่วงเวลาอื่น`);
          }
        }
      }

      // Determine if partner approval is required
      const partnerApprovalRequired = requiresPartnerApproval(
        assignment.date,
        assignment.start_time,
        assignment.end_time,
        isHolidayFn
      );

      const assignmentData = {
        ...assignment,
        partner_approval_required: partnerApprovalRequired,
        // Auto-approve if no special approval required, otherwise pending
        status: partnerApprovalRequired ? 'pending' : 'approved'
      };

      if (id) {
        // Update existing
        const { error } = await supabase
          .from('assignments')
          .update(assignmentData)
          .eq('id', id);
        
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('assignments')
          .insert(assignmentData);
        
        if (error) throw error;
      }
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assignment saved successfully');

      // Send email notification
      try {
        const { id, isHolidayFn, dates, ...assignment } = variables;
        const isUpdate = !!id;

        // Get employee details
        const { data: profiles } = await supabase
          .from('profiles')
          .select('name, email')
          .in('id', assignment.employee_ids);

        if (!profiles) return;

        const recipientEmails = profiles.map(p => p.email).filter(Boolean) as string[];
        const employeeNames = profiles.map(p => p.name);

        // Get client name if exists
        let clientName = '';
        if (assignment.client_id) {
          const { data: client } = await supabase
            .from('clients')
            .select('name')
            .eq('id', assignment.client_id)
            .single();
          clientName = client?.name || '';
        }

        // Get current user name
        const { data: { user } } = await supabase.auth.getUser();
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user?.id)
          .single();

        if (recipientEmails.length > 0) {
          await supabase.functions.invoke('send-assignment-notification', {
            body: {
              recipientEmails,
              notificationType: isUpdate ? 'updated' : 'created',
              actionBy: currentProfile?.name || 'ผู้จัดการ',
              details: {
                date: assignment.date,
                startTime: assignment.start_time,
                endTime: assignment.end_time,
                clientName,
                activityName: assignment.activity_name,
                jobType: assignment.job_type,
                employeeNames,
                status: assignment.status
              }
            }
          });
        }
      } catch (error) {
        console.error('Failed to send email notification:', error);
        // Don't block the main flow if email fails
      }
    },
    onError: (error) => {
      toast.error('Failed to save assignment: ' + error.message);
    }
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assignment deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete assignment: ' + error.message);
    }
  });

  const approveAssignment = useMutation({
    mutationFn: async ({ id, approvedBy }: { id: string; approvedBy: string }) => {
      const { error } = await supabase
        .from('assignments')
        .update({ status: 'approved', approved_by: approvedBy })
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: async (id, { approvedBy }) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assignment approved successfully');

      // Send email notification
      try {
        const { data: assignment } = await supabase
          .from('assignments')
          .select('*, clients(name)')
          .eq('id', id)
          .single();

        if (!assignment) return;

        const { data: profiles } = await supabase
          .from('profiles')
          .select('name, email')
          .in('id', assignment.employee_ids);

        if (!profiles) return;

        const recipientEmails = profiles.map(p => p.email).filter(Boolean) as string[];
        const employeeNames = profiles.map(p => p.name);

        const { data: approverProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', approvedBy)
          .single();

        if (recipientEmails.length > 0) {
          await supabase.functions.invoke('send-assignment-notification', {
            body: {
              recipientEmails,
              notificationType: 'approved',
              actionBy: approverProfile?.name || 'ผู้จัดการ',
              details: {
                date: assignment.date,
                startTime: assignment.start_time,
                endTime: assignment.end_time,
                clientName: assignment.clients?.name,
                activityName: assignment.activity_name,
                jobType: assignment.job_type,
                employeeNames,
                status: 'approved'
              }
            }
          });
        }
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    },
    onError: (error) => {
      toast.error('Failed to approve assignment: ' + error.message);
    }
  });

  const partnerApproveAssignment = useMutation({
    mutationFn: async ({ id, approvedBy }: { id: string; approvedBy: string }) => {
      const { error } = await supabase
        .from('assignments')
        .update({ 
          status: 'approved', 
          partner_approved_by: approvedBy 
        })
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: async (id, { approvedBy }) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assignment approved by Partner');

      // Send email notification
      try {
        const { data: assignment } = await supabase
          .from('assignments')
          .select('*, clients(name)')
          .eq('id', id)
          .single();

        if (!assignment) return;

        const { data: profiles } = await supabase
          .from('profiles')
          .select('name, email')
          .in('id', assignment.employee_ids);

        if (!profiles) return;

        const recipientEmails = profiles.map(p => p.email).filter(Boolean) as string[];
        const employeeNames = profiles.map(p => p.name);

        const { data: approverProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', approvedBy)
          .single();

        if (recipientEmails.length > 0) {
          await supabase.functions.invoke('send-assignment-notification', {
            body: {
              recipientEmails,
              notificationType: 'partner_approved',
              actionBy: approverProfile?.name || 'Partner',
              details: {
                date: assignment.date,
                startTime: assignment.start_time,
                endTime: assignment.end_time,
                clientName: assignment.clients?.name,
                activityName: assignment.activity_name,
                jobType: assignment.job_type,
                employeeNames,
                status: 'approved'
              }
            }
          });
        }
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    },
    onError: (error) => {
      toast.error('Failed to approve assignment: ' + error.message);
    }
  });

  const cancelAssignment = useMutation({
    mutationFn: async ({ id, cancelledBy }: { id: string; cancelledBy: string }) => {
      const { error } = await supabase
        .from('assignments')
        .update({ 
          status: 'pending',
          cancelled_by: cancelledBy,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: async (id, { cancelledBy }) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assignment cancelled successfully');

      // Send email notification
      try {
        const { data: assignment } = await supabase
          .from('assignments')
          .select('*, clients(name)')
          .eq('id', id)
          .single();

        if (!assignment) return;

        const { data: profiles } = await supabase
          .from('profiles')
          .select('name, email')
          .in('id', assignment.employee_ids);

        if (!profiles) return;

        const recipientEmails = profiles.map(p => p.email).filter(Boolean) as string[];
        const employeeNames = profiles.map(p => p.name);

        const { data: cancellerProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', cancelledBy)
          .single();

        if (recipientEmails.length > 0) {
          await supabase.functions.invoke('send-assignment-notification', {
            body: {
              recipientEmails,
              notificationType: 'cancelled',
              actionBy: cancellerProfile?.name || 'ผู้จัดการ',
              details: {
                date: assignment.date,
                startTime: assignment.start_time,
                endTime: assignment.end_time,
                clientName: assignment.clients?.name,
                activityName: assignment.activity_name,
                jobType: assignment.job_type,
                employeeNames,
                status: 'cancelled'
              }
            }
          });
        }
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    },
    onError: (error) => {
      toast.error('Failed to cancel assignment: ' + error.message);
    }
  });

  return {
    assignments,
    isLoading,
    saveAssignment: saveAssignment.mutate,
    deleteAssignment: deleteAssignment.mutate,
    approveAssignment: approveAssignment.mutate,
    partnerApproveAssignment: partnerApproveAssignment.mutate,
    cancelAssignment: cancelAssignment.mutate
  };
};
