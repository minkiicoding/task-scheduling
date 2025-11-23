import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useLeaves = () => {
  const queryClient = useQueryClient();

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaves')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const saveLeave = useMutation({
    mutationFn: async (leave: any) => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      
      // Check for conflicts with assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .gte('date', leave.startDate)
        .lte('date', leave.endDate)
        .contains('employee_ids', [leave.employeeId])
        .neq('status', 'cancelled');
      
      if (assignmentsError) throw assignmentsError;

      // Check if there are any time conflicts
      if (assignments && assignments.length > 0) {
        // If it's a partial day leave, check time overlap
        if (leave.startTime && leave.endTime) {
          const hasConflict = assignments.some(assignment => {
            const leaveStart = leave.startTime;
            const leaveEnd = leave.endTime;
            const assignStart = assignment.start_time;
            const assignEnd = assignment.end_time;
            
            // Check if times overlap
            return (leaveStart < assignEnd && leaveEnd > assignStart);
          });

          if (hasConflict) {
            throw new Error('ไม่สามารถขอลาได้ เนื่องจากมีการมอบหมายงานในช่วงเวลาที่ต้องการลา');
          }
        } else {
          // Full day leave - any assignment on these dates is a conflict
          throw new Error('ไม่สามารถขอลาได้ เนื่องจากมีการมอบหมายงานในวันที่ต้องการลา');
        }
      }
      
      // Calculate consecutive days (including weekends)
      let consecutiveDays = 0;
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        consecutiveDays++;
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Get current user's profile to check if they are a Partner
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;
      
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('position')
        .eq('id', currentUserId)
        .single();

      const isCurrentUserPartner = currentUserProfile?.position === 'Partner';
      
      // Partner approval is required if:
      // - 3+ consecutive days AND
      // - Current user creating the leave is NOT a Partner
      const partnerApprovalRequired = consecutiveDays >= 3 && !isCurrentUserPartner;

      if (leave.id) {
        const updateData: any = {
          employee_id: leave.employeeId,
          start_date: leave.startDate,
          end_date: leave.endDate,
          leave_type: leave.leaveType,
          reason: leave.reason,
          partner_approval_required: partnerApprovalRequired,
          start_time: leave.startTime || null,
          end_time: leave.endTime || null
        };

        const { data, error } = await supabase
          .from('leaves')
          .update(updateData)
          .eq('id', leave.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Partner auto-approves their own leave
        const status = isCurrentUserPartner ? 'approved' : 'pending';
        const approvedBy = isCurrentUserPartner ? currentUserId : null;
        
        const { data, error } = await supabase
          .from('leaves')
          .insert({
            employee_id: leave.employeeId,
            start_date: leave.startDate,
            end_date: leave.endDate,
            leave_type: leave.leaveType,
            reason: leave.reason,
            status: status,
            approved_by: approvedBy,
            partner_approval_required: partnerApprovalRequired,
            start_time: leave.startTime || null,
            end_time: leave.endTime || null
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: async (data, leave) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast.success('Leave request saved successfully');

      // Send email notification
      try {
        const isUpdate = !!leave.id;

        // Get employee details
        const { data: employeeProfile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', leave.employeeId)
          .single();

        if (!employeeProfile) return;

        // Get approvers (Supervisor and above)
        const { data: approvers } = await supabase
          .from('profiles')
          .select('email')
          .in('position', ['Supervisor', 'Assistant Manager', 'Manager', 'Senior Manager', 'Partner']);

        const recipientEmails = approvers?.map(p => p.email).filter(Boolean) as string[] || [];

        // Get current user name
        const { data: { user } } = await supabase.auth.getUser();
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user?.id)
          .single();

        if (recipientEmails.length > 0) {
          await supabase.functions.invoke('send-leave-notification', {
            body: {
              recipientEmails,
              notificationType: 'created',
              actionBy: currentProfile?.name || employeeProfile.name,
              employeeName: employeeProfile.name,
              details: {
                startDate: leave.startDate,
                endDate: leave.endDate,
                startTime: leave.startTime,
                endTime: leave.endTime,
                leaveType: leave.leaveType,
                reason: leave.reason,
                status: data?.status || 'pending'
              }
            }
          });
        }
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    },
    onError: (error) => {
      console.error('Error saving leave:', error);
      toast.error('Failed to save leave request');
    }
  });

  const deleteLeave = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leaves')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast.success('Leave request deleted');
    },
    onError: (error) => {
      console.error('Error deleting leave:', error);
      toast.error('Failed to delete leave request');
    }
  });

  const approveLeave = useMutation({
    mutationFn: async ({ id, approvedBy }: { id: string; approvedBy: string }) => {
      // Get the leave details first
      const { data: leaveData, error: leaveError } = await supabase
        .from('leaves')
        .select('*')
        .eq('id', id)
        .single();
      
      if (leaveError) throw leaveError;
      if (!leaveData) throw new Error('Leave not found');

      // Check for conflicts with assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .gte('date', leaveData.start_date)
        .lte('date', leaveData.end_date)
        .contains('employee_ids', [leaveData.employee_id])
        .neq('status', 'cancelled');
      
      if (assignmentsError) throw assignmentsError;

      // Check if there are any time conflicts
      if (assignments && assignments.length > 0) {
        // If it's a partial day leave, check time overlap
        if (leaveData.start_time && leaveData.end_time) {
          const hasConflict = assignments.some(assignment => {
            const leaveStart = leaveData.start_time;
            const leaveEnd = leaveData.end_time;
            const assignStart = assignment.start_time;
            const assignEnd = assignment.end_time;
            
            // Check if times overlap
            return (leaveStart < assignEnd && leaveEnd > assignStart);
          });

          if (hasConflict) {
            throw new Error('ไม่สามารถอนุมัติการลาได้ เนื่องจากมีการมอบหมายงานในช่วงเวลาที่ทับซ้อนกัน');
          }
        } else {
          // Full day leave - any assignment on these dates is a conflict
          throw new Error('ไม่สามารถอนุมัติการลาได้ เนื่องจากมีการมอบหมายงานในวันที่ลา');
        }
      }

      const { data, error } = await supabase
        .from('leaves')
        .update({
          status: 'approved',
          approved_by: approvedBy
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, { approvedBy }) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast.success('Leave request approved');

      // Send email notification
      try {
        // Get employee details
        const { data: employeeProfile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', data.employee_id)
          .single();

        if (!employeeProfile?.email) return;

        // Get approver name
        const { data: approverProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', approvedBy)
          .single();

        await supabase.functions.invoke('send-leave-notification', {
          body: {
            recipientEmails: [employeeProfile.email],
            notificationType: 'approved',
            actionBy: approverProfile?.name || 'ผู้อนุมัติ',
            employeeName: employeeProfile.name,
            details: {
              startDate: data.start_date,
              endDate: data.end_date,
              startTime: data.start_time,
              endTime: data.end_time,
              leaveType: data.leave_type,
              reason: data.reason,
              status: 'approved'
            }
          }
        });
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    },
    onError: (error) => {
      console.error('Error approving leave:', error);
      toast.error('Failed to approve leave request');
    }
  });

  const partnerApproveLeave = useMutation({
    mutationFn: async ({ id, approvedBy }: { id: string; approvedBy: string }) => {
      // Get the leave details first
      const { data: leaveData, error: leaveError } = await supabase
        .from('leaves')
        .select('*')
        .eq('id', id)
        .single();
      
      if (leaveError) throw leaveError;
      if (!leaveData) throw new Error('Leave not found');

      // Check for conflicts with assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .gte('date', leaveData.start_date)
        .lte('date', leaveData.end_date)
        .contains('employee_ids', [leaveData.employee_id])
        .neq('status', 'cancelled');
      
      if (assignmentsError) throw assignmentsError;

      // Check if there are any time conflicts
      if (assignments && assignments.length > 0) {
        // If it's a partial day leave, check time overlap
        if (leaveData.start_time && leaveData.end_time) {
          const hasConflict = assignments.some(assignment => {
            const leaveStart = leaveData.start_time;
            const leaveEnd = leaveData.end_time;
            const assignStart = assignment.start_time;
            const assignEnd = assignment.end_time;
            
            // Check if times overlap
            return (leaveStart < assignEnd && leaveEnd > assignStart);
          });

          if (hasConflict) {
            throw new Error('ไม่สามารถอนุมัติการลาได้ เนื่องจากมีการมอบหมายงานในช่วงเวลาที่ทับซ้อนกัน');
          }
        } else {
          // Full day leave - any assignment on these dates is a conflict
          throw new Error('ไม่สามารถอนุมัติการลาได้ เนื่องจากมีการมอบหมายงานในวันที่ลา');
        }
      }

      const { data, error } = await supabase
        .from('leaves')
        .update({
          status: 'approved',
          partner_approved_by: approvedBy
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, { approvedBy }) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast.success('Leave approved by Partner');

      // Send email notification
      try {
        // Get employee details
        const { data: employeeProfile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', data.employee_id)
          .single();

        if (!employeeProfile?.email) return;

        // Get approver name
        const { data: approverProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', approvedBy)
          .single();

        await supabase.functions.invoke('send-leave-notification', {
          body: {
            recipientEmails: [employeeProfile.email],
            notificationType: 'partner_approved',
            actionBy: approverProfile?.name || 'Partner',
            employeeName: employeeProfile.name,
            details: {
              startDate: data.start_date,
              endDate: data.end_date,
              startTime: data.start_time,
              endTime: data.end_time,
              leaveType: data.leave_type,
              reason: data.reason,
              status: 'approved'
            }
          }
        });
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    },
    onError: (error) => {
      console.error('Error approving leave:', error);
      toast.error('Failed to approve leave');
    }
  });

  const cancelLeave = useMutation({
    mutationFn: async ({ id, cancelledBy }: { id: string; cancelledBy: string }) => {
      // Get leave details first
      const { data: leaveData, error: leaveError } = await supabase
        .from('leaves')
        .select('*')
        .eq('id', id)
        .single();
      
      if (leaveError) throw leaveError;

      const { error } = await supabase
        .from('leaves')
        .update({
          status: 'cancelled',
          cancelled_by: cancelledBy,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        console.error('Cancel leave error details:', error);
        throw error;
      }

      return leaveData;
    },
    onSuccess: async (leaveData, { cancelledBy }) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast.success('Leave cancelled successfully');

      // Send email notification
      try {
        // Get employee details
        const { data: employeeProfile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', leaveData.employee_id)
          .single();

        if (!employeeProfile?.email) return;

        // Get canceller name
        const { data: cancellerProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', cancelledBy)
          .single();

        await supabase.functions.invoke('send-leave-notification', {
          body: {
            recipientEmails: [employeeProfile.email],
            notificationType: 'cancelled',
            actionBy: cancellerProfile?.name || 'ผู้จัดการ',
            employeeName: employeeProfile.name,
            details: {
              startDate: leaveData.start_date,
              endDate: leaveData.end_date,
              startTime: leaveData.start_time,
              endTime: leaveData.end_time,
              leaveType: leaveData.leave_type,
              reason: leaveData.reason,
              status: 'cancelled'
            }
          }
        });
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    },
    onError: (error: any) => {
      console.error('Error cancelling leave:', error);
      toast.error(`Failed to cancel leave: ${error.message || 'Unknown error'}`);
    }
  });

  return {
    leaves,
    isLoading,
    saveLeave: saveLeave.mutate,
    deleteLeave: deleteLeave.mutate,
    approveLeave: approveLeave.mutate,
    partnerApproveLeave: partnerApproveLeave.mutate,
    cancelLeave: cancelLeave.mutate
  };
};