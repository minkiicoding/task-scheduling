import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginScreen } from '@/components/LoginScreen';
import { CalendarHeader } from '@/components/CalendarHeader';
import { WeekView } from '@/components/WeekView';
import { MonthView } from '@/components/MonthView';
import { AssignmentDialog } from '@/components/AssignmentDialog';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { LeaveDialog } from '@/components/LeaveDialog';
import { DateActionDialog } from '@/components/DateActionDialog';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Plus, Calendar } from 'lucide-react';
import { ViewMode, Assignment, Leave, LEAVE_TYPES } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useClients } from '@/hooks/useClients';
import { useAssignments } from '@/hooks/useAssignments';
import { useLeaves } from '@/hooks/useLeaves';
import { useUserRole } from '@/hooks/useUserRole';
import { useHolidays } from '@/hooks/useHolidays';

const EmployeePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const { profiles, isLoading: profilesLoading } = useProfiles();
  const { clients, isLoading: clientsLoading } = useClients();
  const { assignments, isLoading: assignmentsLoading, saveAssignment, deleteAssignment, approveAssignment, partnerApproveAssignment, cancelAssignment } = useAssignments();
  const { leaves, isLoading: leavesLoading, saveLeave, deleteLeave, approveLeave, partnerApproveLeave, cancelLeave } = useLeaves();
  const { canEdit, canApprove, isPartner, role, isLoading: roleLoading } = useUserRole(user?.id);
  const { isHoliday } = useHolidays();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [filteredEmployeeId, setFilteredEmployeeId] = useState('all');
  const [filteredClientId, setFilteredClientId] = useState('all');
  const [filteredPosition, setFilteredPosition] = useState('all');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [positionSearchQuery, setPositionSearchQuery] = useState('');
  
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [leavesOnSelectedDate, setLeavesOnSelectedDate] = useState<Leave[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [dateActionDialogOpen, setDateActionDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>();

  // Check if user must change password
  useEffect(() => {
    if (user && !profilesLoading) {
      const currentProfile = profiles.find(p => p.id === user.id);
      if (currentProfile?.must_change_password) {
        setMustChangePassword(true);
        setChangePasswordOpen(true);
      }
    }
  }, [user, profiles, profilesLoading]);

  // Redirect ONLY System Admin (position='Admin') to admin dashboard
  useEffect(() => {
    if (user && !profilesLoading) {
      const currentProfile = profiles.find(p => p.id === user.id);
      // Only position='Admin' goes to admin dashboard
      if (currentProfile?.position === 'Admin') {
        navigate('/admin');
      }
    }
  }, [user, profiles, profilesLoading, navigate]);

  const handleSignIn = async (employeeCode: string, password: string) => {
    return await signIn(employeeCode, password);
  };

  const handleLogout = useCallback(() => {
    signOut();
  }, [signOut]);

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onSignIn={handleSignIn} />;
  }

  const handlePrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Show loading state until calendar data is ready
  if (profilesLoading || clientsLoading || assignmentsLoading || leavesLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <Navigation canEdit={canEdit} userPosition={undefined} />
        <CalendarHeader
          currentDate={currentDate}
          viewMode={viewMode}
          onPrev={handlePrevious}
          onNext={handleNext}
          onToday={handleToday}
          onViewChange={setViewMode}
          employees={[]}
          clients={[]}
          filteredEmployeeId={filteredEmployeeId}
          filteredClientId={filteredClientId}
          filteredPosition={filteredPosition}
          onEmployeeFilterChange={setFilteredEmployeeId}
          onClientFilterChange={setFilteredClientId}
          onPositionFilterChange={setFilteredPosition}
          employeeSearchQuery={employeeSearchQuery}
          clientSearchQuery={clientSearchQuery}
          positionSearchQuery={positionSearchQuery}
          onEmployeeSearchChange={setEmployeeSearchQuery}
          onClientSearchChange={setClientSearchQuery}
          onPositionSearchChange={setPositionSearchQuery}
          currentUser={null}
          onLogout={handleLogout}
          onNewAssignment={() => handleCreateAssignment()}
          onRequestLeave={() => handleCreateLeave()}
          canCreateAssignment={false}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading calendar...</div>
        </div>
      </div>
    );
  }

  const handleCreateAssignment = (date?: Date) => {
    setSelectedAssignment(null);
    setSelectedDate(date || null);
    setAssignmentDialogOpen(true);
  };

  const handleDateClick = (date: Date, employeeId?: string) => {
    // Open action dialog to choose between assignment or leave
    setSelectedDate(date);
    setSelectedEmployeeId(employeeId);
    setDateActionDialogOpen(true);
  };

  const handleAssignmentClick = (assignment: Assignment) => {
    // Check if this is a leave assignment
    const isLeaveAssignment = assignment.activityName && LEAVE_TYPES.some(t => assignment.activityName?.startsWith(t));
    
    if (isLeaveAssignment) {
      // For leave assignments, find the corresponding leave record
      const leaveDate = assignment.date;
      const leaveRecord = leaves.find(l => 
        l.employeeId === assignment.employeeIds[0] &&
        leaveDate >= l.startDate && 
        leaveDate <= l.endDate
      );
      
      if (leaveRecord) {
        handleLeaveClick(leaveRecord);
        return;
      }
    }
    
    // Allow viewing if: assigned to user, has edit role, is partner, or is Senior+
    const isSeniorOrAbove = currentProfile?.position && ['Senior', 'Supervisor', 'Assistant Manager', 'Manager', 'Senior Manager', 'Partner'].includes(currentProfile.position);
    if (assignment.employeeIds.includes(user?.id || '') || canEdit || isPartner || isSeniorOrAbove) {
      setSelectedAssignment(assignment);
      setAssignmentDialogOpen(true);
    }
  };

  const handleSaveAssignment = async (data: any) => {
    // If data contains multiple dates (for multi-day leave), create multiple assignments
    if (data.dates && Array.isArray(data.dates)) {
      for (const date of data.dates) {
        const assignmentData = {
          client_id: data.clientId || null,
          activity_name: data.activityName || null,
          job_type: data.jobType,
          date: date,
          start_time: data.startTime,
          end_time: data.endTime,
          employee_ids: data.employeeIds,
          isHolidayFn: isHoliday
        };
        
        saveAssignment(assignmentData);
      }
      setSelectedDate(null);
      return;
    }
    
    // Single assignment
    const assignmentData = {
      client_id: data.clientId || null,
      activity_name: data.activityName || null,
      job_type: data.jobType,
      date: data.date,
      start_time: data.startTime,
      end_time: data.endTime,
      employee_ids: data.employeeIds,
      isHolidayFn: isHoliday
    };
    
    if (selectedAssignment) {
      saveAssignment({ id: selectedAssignment.id, ...assignmentData });
    } else {
      saveAssignment(assignmentData);
    }
    
    setSelectedDate(null);
  };

  const handlePasswordChangeSuccess = () => {
    setMustChangePassword(false);
    setChangePasswordOpen(false);
    window.location.reload();
  };

  const handleDeleteAssignment = (id: string) => {
    deleteAssignment(id);
  };

  const handleCreateLeave = (date?: Date, employeeId?: string) => {
    setSelectedLeave(null);
    setSelectedDate(date || null);
    setSelectedEmployeeId(employeeId);
    setLeaveDialogOpen(true);
  };

  const handleLeaveClick = (leave: Leave | Leave[]) => {
    if (Array.isArray(leave)) {
      // Multiple leaves on the same date - show summary only
      setSelectedLeave(null);
      setLeavesOnSelectedDate(leave);
    } else {
      // Single leave
      setSelectedLeave(leave);
      setLeavesOnSelectedDate([]);
    }
    setLeaveDialogOpen(true);
  };

  const handleSaveLeave = (data: any) => {
    if (selectedLeave) {
      saveLeave({ id: selectedLeave.id, ...data });
    } else {
      saveLeave(data);
    }
  };

  const handleDeleteLeave = (id: string) => {
    deleteLeave(id);
  };

  const handleApproveLeave = (id: string) => {
    if (user?.id) {
      approveLeave({ id, approvedBy: user.id });
      setLeaveDialogOpen(false);
    }
  };

  const handlePartnerApproveLeave = (id: string) => {
    if (user?.id) {
      partnerApproveLeave({ id, approvedBy: user.id });
      setLeaveDialogOpen(false);
    }
  };

  const handleCancelLeave = (id: string) => {
    if (user?.id) {
      cancelLeave({ id, cancelledBy: user.id });
      setLeaveDialogOpen(false);
    }
  };

  const handleApproveAssignment = (id: string) => {
    if (user?.id) {
      approveAssignment({ id, approvedBy: user.id });
      setAssignmentDialogOpen(false);
    }
  };

  const handlePartnerApproveAssignment = (id: string) => {
    if (user?.id) {
      partnerApproveAssignment({ id, approvedBy: user.id });
      setAssignmentDialogOpen(false);
    }
  };

  const handleCancelAssignment = (id: string) => {
    if (user?.id) {
      cancelAssignment({ id, cancelledBy: user.id });
      setAssignmentDialogOpen(false);
    }
  };

  // Transform database data to match component expectations
  const transformedAssignments = assignments.map(a => ({
    id: a.id,
    clientId: a.client_id || undefined,
    activityName: a.activity_name || undefined,
    jobType: a.job_type,
    date: a.date,
    startTime: a.start_time,
    endTime: a.end_time,
    employeeIds: a.employee_ids,
    status: a.status,
    approvedBy: a.approved_by,
    partnerApprovalRequired: a.partner_approval_required,
    partnerApprovedBy: a.partner_approved_by,
    cancelledBy: a.cancelled_by,
    cancelledAt: a.cancelled_at,
    createdAt: a.created_at || a.createdAt,
    updatedAt: a.updated_at || a.updatedAt
  }));

  const transformedClients = clients.map(c => ({
    id: c.id,
    name: c.name,
    colorClass: c.colorClass
  }));

  // Filter out System Admin from employee list (position === 'Admin')
  const transformedProfiles = profiles
    .filter(p => p.position !== 'Admin')
    .map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      employeeCode: p.employee_code
    }));

  // Filter clients based on search queries
  const filteredClients = transformedClients.filter(client =>
    client.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  // Filter employees based on search queries, position filter, and client assignments
  let filteredEmployees = transformedProfiles.filter(emp => {
    const matchesName = emp.name.toLowerCase().includes(employeeSearchQuery.toLowerCase());
    const matchesPosition = filteredPosition === 'all' || emp.position === filteredPosition;
    const matchesPositionSearch = emp.position.toLowerCase().includes(positionSearchQuery.toLowerCase());
    return matchesName && matchesPosition && matchesPositionSearch;
  });

  // If client search is active in Week view, show only employees assigned to those clients
  if (viewMode === 'week' && clientSearchQuery.trim()) {
    const employeesWithClientAssignments = new Set<string>();
    
    // Get week dates for current view
    const getWeekStart = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff));
    };
    
    const weekStart = getWeekStart(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Find all employees assigned to filtered clients in current week
    transformedAssignments.forEach(assignment => {
      const assignmentDate = new Date(assignment.date);
      if (assignmentDate >= weekStart && assignmentDate <= weekEnd) {
        const client = filteredClients.find(c => c.id === assignment.clientId);
        if (client) {
          assignment.employeeIds.forEach(empId => {
            employeesWithClientAssignments.add(empId);
          });
        }
      }
    });
    
    filteredEmployees = filteredEmployees.filter(emp =>
      employeesWithClientAssignments.has(emp.id)
    );
  }

  const transformedLeaves = leaves
    .filter(l => l.status !== 'cancelled') // Hide cancelled leaves from calendar
    .map(l => ({
      id: l.id,
      employeeId: l.employee_id,
      startDate: l.start_date,
      endDate: l.end_date,
      startTime: l.start_time || undefined,
      endTime: l.end_time || undefined,
      leaveType: l.leave_type,
      reason: l.reason,
      status: l.status,
      approvedBy: l.approved_by,
      partnerApprovalRequired: l.partner_approval_required,
      partnerApprovedBy: l.partner_approved_by,
      cancelledBy: l.cancelled_by,
      cancelledAt: l.cancelled_at
    }));

  const currentProfile = profiles.find(p => p.id === user.id);

  return (
    <div className="flex flex-col h-screen bg-background">
      <Navigation canEdit={canEdit} userPosition={currentProfile?.position} isPartner={isPartner} />
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onPrev={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
        onViewChange={setViewMode}
        employees={filteredEmployees}
        clients={filteredClients}
        filteredEmployeeId={filteredEmployeeId}
        filteredClientId={filteredClientId}
        filteredPosition={filteredPosition}
        onEmployeeFilterChange={setFilteredEmployeeId}
        onClientFilterChange={setFilteredClientId}
        onPositionFilterChange={setFilteredPosition}
        employeeSearchQuery={employeeSearchQuery}
        clientSearchQuery={clientSearchQuery}
        positionSearchQuery={positionSearchQuery}
        onEmployeeSearchChange={setEmployeeSearchQuery}
        onClientSearchChange={setClientSearchQuery}
        onPositionSearchChange={setPositionSearchQuery}
        currentUser={currentProfile ? {
          id: currentProfile.id,
          name: currentProfile.name,
          position: currentProfile.position
        } : null}
        onLogout={handleLogout}
        onNewAssignment={() => handleCreateAssignment()}
        onRequestLeave={() => handleCreateLeave()}
        canCreateAssignment={canEdit || isPartner || (currentProfile?.position && ['Senior', 'Supervisor', 'Assistant Manager', 'Manager', 'Senior Manager', 'Partner'].includes(currentProfile.position))}
      />

      {viewMode === 'week' ? (
        <WeekView
          currentDate={currentDate}
          assignments={transformedAssignments}
          leaves={transformedLeaves}
          employees={filteredEmployees}
          clients={filteredClients}
          filteredEmployeeId={filteredEmployeeId}
          filteredClientId={filteredClientId}
          onAssignmentClick={handleAssignmentClick}
          onLeaveClick={handleLeaveClick}
          onDateClick={handleDateClick}
        />
      ) : (
        <MonthView
          currentDate={currentDate}
          assignments={transformedAssignments}
          leaves={transformedLeaves}
          employees={filteredEmployees}
          clients={filteredClients}
          filteredEmployeeId={filteredEmployeeId}
          filteredClientId={filteredClientId}
          onAssignmentClick={handleAssignmentClick}
          onLeaveClick={handleLeaveClick}
          onDateClick={handleDateClick}
        />
      )}


      <AssignmentDialog
        open={assignmentDialogOpen}
        onClose={() => {
          setAssignmentDialogOpen(false);
          setSelectedDate(null);
        }}
        assignment={selectedAssignment}
        initialDate={selectedDate}
        employees={transformedProfiles}
        clients={transformedClients}
        onSave={handleSaveAssignment}
        onDelete={handleDeleteAssignment}
        onApprove={handleApproveAssignment}
        onPartnerApprove={handlePartnerApproveAssignment}
        onCancel={handleCancelAssignment}
        canEdit={canEdit}
        canApprove={canApprove}
        isPartner={isPartner}
        currentUserId={user?.id}
        currentUserPosition={currentProfile?.position}
      />

      <LeaveDialog
        open={leaveDialogOpen}
        onClose={() => {
          setLeaveDialogOpen(false);
          setSelectedLeave(null);
          setSelectedDate(null);
          setLeavesOnSelectedDate([]);
          setSelectedEmployeeId(undefined);
        }}
        leave={selectedLeave}
        initialDate={selectedDate}
        initialEmployeeId={selectedEmployeeId}
        employees={transformedProfiles}
        currentUserId={user?.id}
        currentUserPosition={currentProfile?.position}
        onSave={handleSaveLeave}
        onDelete={handleDeleteLeave}
        onApprove={handleApproveLeave}
        onPartnerApprove={handlePartnerApproveLeave}
        onCancel={handleCancelLeave}
        canEdit={canEdit}
        canApprove={canApprove}
        isPartner={isPartner}
        leavesOnDate={leavesOnSelectedDate}
      />

      <DateActionDialog
        open={dateActionDialogOpen}
        onClose={() => {
          setDateActionDialogOpen(false);
          // Don't reset selectedDate here - it will be reset when AssignmentDialog/LeaveDialog closes
        }}
        onNewAssignment={() => handleCreateAssignment(selectedDate || undefined)}
        onRequestLeave={() => handleCreateLeave(selectedDate || undefined, selectedEmployeeId)}
        canCreateAssignment={canEdit || isPartner || (currentProfile?.position && ['Senior', 'Supervisor', 'Assistant Manager', 'Manager', 'Senior Manager', 'Partner'].includes(currentProfile.position))}
        selectedDate={selectedDate}
        selectedEmployeeId={selectedEmployeeId}
      />

      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => !mustChangePassword && setChangePasswordOpen(false)}
        onSuccess={handlePasswordChangeSuccess}
        required={mustChangePassword}
      />
    </div>
  );
};

export default EmployeePage;
