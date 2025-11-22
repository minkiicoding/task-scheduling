import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Assignment, Employee, Client, LEAVE_TYPES, EMPLOYEE_POSITIONS } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Clock, Check, ChevronsUpDown } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface AssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  initialDate?: Date | null;
  employees: Employee[];
  clients: Client[];
  onSave: (assignment: Omit<Assignment, 'id'>) => void;
  onDelete?: (id: string) => void;
  onApprove?: (id: string) => void;
  onPartnerApprove?: (id: string) => void;
  onCancel?: (id: string) => void;
  canEdit: boolean;
  canApprove: boolean;
  isPartner?: boolean;
  currentUserId?: string;
  currentUserPosition?: string;
}

export const AssignmentDialog = ({
  open,
  onClose,
  assignment,
  initialDate,
  employees,
  clients,
  onSave,
  onDelete,
  onApprove,
  onPartnerApprove,
  onCancel,
  canEdit,
  canApprove,
  isPartner = false,
  currentUserId,
  currentUserPosition
}: AssignmentDialogProps) => {
  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState<Omit<Assignment, 'id'>>({
    clientId: assignment?.clientId || '',
    activityName: assignment?.activityName || '',
    jobType: assignment?.jobType || '',
    date: assignment?.date || formatDateForInput(initialDate),
    startTime: assignment?.startTime || '08:00',
    endTime: assignment?.endTime || '17:00',
    employeeIds: assignment?.employeeIds || [],
    status: assignment?.status || 'pending',
    approvedBy: assignment?.approvedBy
  });

  const [assignmentType, setAssignmentType] = useState<'client' | 'noncharge'>('client');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [assignmentEndDate, setAssignmentEndDate] = useState('');
  const [conflictWarningOpen, setConflictWarningOpen] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<string>('');

  // Update form when assignment or initialDate changes
  useEffect(() => {
    if (assignment) {
      // Determine type based on existing assignment
      const type = !assignment.clientId && assignment.activityName ? 'noncharge' : 'client';
      setAssignmentType(type);
      setFormData({
        clientId: assignment?.clientId || '',
        activityName: assignment?.activityName || '',
        jobType: assignment?.jobType || '',
        date: assignment?.date || formatDateForInput(initialDate),
        startTime: assignment?.startTime || '08:00',
        endTime: assignment?.endTime || '17:00',
        employeeIds: assignment?.employeeIds || [],
        status: assignment?.status || 'pending',
        approvedBy: assignment?.approvedBy
      });
    } else {
      setAssignmentType('client');
      setFormData({
        clientId: '',
        activityName: '',
        jobType: '',
        date: formatDateForInput(initialDate),
        startTime: '08:00',
        endTime: '17:00',
        employeeIds: [],
        status: 'pending',
        approvedBy: undefined
      });
      setAssignmentEndDate('');
    }
  }, [assignment, initialDate]);

  const checkForConflicts = async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Check for time conflicts with existing assignments
    const { data: existingAssignments, error: fetchError } = await supabase
      .from('assignments')
      .select('*')
      .eq('date', formData.date)
      .neq('status', 'cancelled');
    
    if (fetchError) return null;
    if (!existingAssignments) return null;

    // Check if any assigned employee has a conflict
    for (const employeeId of formData.employeeIds) {
      const conflictingAssignment = existingAssignments.find(existing => {
        // Skip checking against current assignment when editing
        if (assignment && existing.id === assignment.id) return false;
        
        if (!existing.employee_ids.includes(employeeId)) return false;
        
        const newStart = formData.startTime;
        const newEnd = formData.endTime;
        const existingStart = existing.start_time;
        const existingEnd = existing.end_time;
        
        return (newStart < existingEnd && newEnd > existingStart);
      });

      if (conflictingAssignment) {
        const emp = employees.find(e => e.id === employeeId);
        const conflictClient = clients.find(c => c.id === conflictingAssignment.client_id);
        return `พนักงาน ${emp?.name || 'ไม่ทราบชื่อ'} มีตารางงานอื่นในช่วงเวลา ${conflictingAssignment.start_time}-${conflictingAssignment.end_time} (${conflictClient?.name || conflictingAssignment.activity_name || 'ไม่ระบุ'}) แล้ว`;
      }
    }
    
    return null;
  };

  const handleSave = async () => {
    if (!formData.date || formData.employeeIds.length === 0) {
      return;
    }
    
    // Validate based on assignment type
    if (assignmentType === 'client' && !formData.clientId) {
      return;
    }
    if (assignmentType === 'noncharge' && !formData.activityName?.trim()) {
      return;
    }
    
    // กิจกรรมต้องระบุเสมอสำหรับ client assignment
    if (assignmentType === 'client' && !formData.jobType?.trim()) {
      return;
    }

    // Check for conflicts
    const conflictMessage = await checkForConflicts();
    if (conflictMessage) {
      setConflictDetails(conflictMessage);
      setConflictWarningOpen(true);
      return;
    }
    
    // Check if it's a full-day (8 hour) assignment with end date
    const isFullDay = formData.startTime === '08:00' && formData.endTime === '17:00';
    
    // For multi-day full-day assignments (client or non-charge)
    if (isFullDay && assignmentEndDate && assignmentEndDate > formData.date) {
      const startDate = new Date(formData.date);
      const endDate = new Date(assignmentEndDate);
      const dates: string[] = [];
      
      // Collect all dates in the range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const saveData = {
        ...formData,
        dates: dates, // Send array of dates for multi-day assignment
        clientId: assignmentType === 'client' ? formData.clientId : undefined,
        activityName: assignmentType === 'noncharge' ? formData.activityName : undefined,
        jobType: formData.jobType
      };
      
      onSave(saveData);
      onClose();
      return;
    }
    
    // Clean up the data based on type
    const saveData = {
      ...formData,
      clientId: assignmentType === 'client' ? formData.clientId : undefined,
      activityName: assignmentType === 'noncharge' ? formData.activityName : undefined,
      jobType: formData.jobType
    };
    
    onSave(saveData);
    onClose();
  };

  const handleEmployeeToggle = async (employeeId: string) => {
    // If unchecking, just remove
    if (formData.employeeIds.includes(employeeId)) {
      setFormData(prev => ({
        ...prev,
        employeeIds: prev.employeeIds.filter(id => id !== employeeId)
      }));
      return;
    }

    // If checking, verify no conflicts first
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data: existingAssignments, error: fetchError } = await supabase
      .from('assignments')
      .select('*')
      .eq('date', formData.date)
      .neq('status', 'cancelled');
    
    if (!fetchError && existingAssignments) {
      const conflictingAssignment = existingAssignments.find(existing => {
        // Skip checking against current assignment when editing
        if (assignment && existing.id === assignment.id) return false;
        
        if (!existing.employee_ids.includes(employeeId)) return false;
        
        const newStart = formData.startTime;
        const newEnd = formData.endTime;
        const existingStart = existing.start_time;
        const existingEnd = existing.end_time;
        
        return (newStart < existingEnd && newEnd > existingStart);
      });

      if (conflictingAssignment) {
        const emp = employees.find(e => e.id === employeeId);
        const conflictClient = clients.find(c => c.id === conflictingAssignment.client_id);
        const conflictMessage = `พนักงาน ${emp?.name || 'ไม่ทราบชื่อ'} มีตารางงานอื่นในช่วงเวลา ${conflictingAssignment.start_time}-${conflictingAssignment.end_time} (${conflictClient?.name || conflictingAssignment.activity_name || 'ไม่ระบุ'}) แล้ว ไม่สามารถมอบหมายงานในช่วงเวลาที่ทับซ้อนกันได้`;
        setConflictDetails(conflictMessage);
        setConflictWarningOpen(true);
        return;
      }
    }

    // No conflicts, add employee
    setFormData(prev => ({
      ...prev,
      employeeIds: [...prev.employeeIds, employeeId]
    }));
  };

  const client = clients.find(c => c.id === assignment?.clientId);
  const isAssignedEmployee = assignment?.employeeIds.includes(currentUserId || '');
  
  // Check if user is Senior level or above (can create/edit assignments)
  const isSeniorOrAbove = currentUserPosition && ['Senior', 'Supervisor', 'Assistant Manager', 'Manager', 'Senior Manager', 'Partner', 'Admin'].includes(currentUserPosition);
  
  // Partner can always edit all assignments
  const isPartnerPosition = currentUserPosition === 'Partner' || currentUserPosition === 'Admin';
  
  // Can edit if:
  // 1. User has canEdit permission (admin/editor role), OR
  // 2. User is Partner/Admin (by position), OR
  // 3. User is Senior or above (can create/edit all assignments)
  // Senior and above can edit both pending and approved assignments
  const canEditAssignment = canEdit || isPartnerPosition || isSeniorOrAbove;
  
  // Users below Senior level can only view assignments, not create or edit
  const isViewing = !canEditAssignment;
  
  // Filter employees by position
  const filteredEmployees = selectedPosition === 'all' 
    ? employees 
    : employees.filter(emp => emp.position === selectedPosition);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isViewing ? 'Assignment Details' : assignment ? 'Edit Assignment' : 'New Assignment'}
          </DialogTitle>
          <DialogDescription>
            {isViewing ? 'View assignment information' : assignment ? 'Update assignment details' : 'Create a new audit assignment'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Message for users below Senior level when trying to create new assignment */}
          {!assignment && !canEditAssignment && (
            <div className="flex items-center gap-2 p-3 bg-muted border border-border rounded-md">
              <span className="text-sm text-foreground">
                You don't have permission to create assignments. Only Senior level and above can create assignments.
              </span>
            </div>
          )}

          {assignment?.partnerApprovalRequired && assignment?.status === 'pending' && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning rounded-md">
              <Clock className="w-4 h-4 text-warning" />
              <span className="text-sm text-foreground font-medium">
                Requires Partner Approval (After 6 PM / Weekend / Holiday)
              </span>
            </div>
          )}

          {assignment?.status === 'pending' && !assignment?.partnerApprovalRequired && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning rounded-md">
              <Clock className="w-4 h-4 text-warning" />
              <span className="text-sm text-foreground font-medium">Pending approval</span>
            </div>
          )}

          {assignment?.status === 'approved' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-success/10 border border-success rounded-md">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <div className="flex flex-col">
                  <span className="text-sm text-green-700 dark:text-green-300 font-medium">Approved</span>
                  {assignment.approvedBy && (
                    <span className="text-xs text-green-700 dark:text-green-300">
                      by {employees.find(e => e.id === assignment.approvedBy)?.name || "Unknown"}
                    </span>
                  )}
                  {assignment.partnerApprovedBy && (
                    <span className="text-xs text-green-700 dark:text-green-300">
                      Partner: {employees.find(e => e.id === assignment.partnerApprovedBy)?.name || "Unknown"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {assignment && (
            <div className="space-y-2 p-3 bg-muted/30 border border-border rounded-md">
              <div className="text-sm font-medium text-foreground">รายละเอียดการบันทึก</div>
              {assignment.createdAt && (
                <div className="text-xs text-muted-foreground">
                  บันทึกเมื่อ: {new Date(assignment.createdAt).toLocaleString('th-TH', { 
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              )}
              {assignment.updatedAt && assignment.updatedAt !== assignment.createdAt && (
                <div className="text-xs text-muted-foreground">
                  แก้ไขล่าสุด: {new Date(assignment.updatedAt).toLocaleString('th-TH', { 
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Assignment Type</Label>
            {isViewing ? (
              <div className="p-2 bg-secondary rounded-md">
                {assignment?.activityName ? 'Non-Charge Activity' : 'Client Assignment'}
              </div>
            ) : (
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={assignmentType === 'client'}
                    onChange={() => {
                      setAssignmentType('client');
                      setFormData({ ...formData, activityName: '', clientId: '' });
                    }}
                    className="w-4 h-4"
                  />
                  <span>Client Assignment</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={assignmentType === 'noncharge'}
                    onChange={() => {
                      setAssignmentType('noncharge');
                      setFormData({ ...formData, clientId: '', activityName: '' });
                    }}
                    className="w-4 h-4"
                  />
                  <span>Non-Charge Activity</span>
                </label>
              </div>
            )}
          </div>

          {assignmentType === 'noncharge' ? (
            <div className="space-y-2">
              <Label>Activity Name</Label>
              {isViewing ? (
                <div className="p-2 bg-secondary rounded-md">{assignment?.activityName}</div>
              ) : (
                <Input
                  value={formData.activityName || ''}
                  onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
                  placeholder="Enter activity name (e.g., Training, Internal Meeting)"
                />
              )}
            </div>
          ) : assignmentType === 'client' ? (
            <div className="space-y-2">
              <Label>Client</Label>
              {isViewing ? (
                <div className="p-2 bg-secondary rounded-md">{client?.name}</div>
              ) : (
                <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientSearchOpen}
                      className="w-full justify-between"
                    >
                      {formData.clientId
                        ? clients.find(c => c.id === formData.clientId)?.name
                        : "Select client..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-popover z-50" align="start">
                    <Command>
                      <CommandInput placeholder="Search client..." />
                      <CommandList>
                        <CommandEmpty>No client found.</CommandEmpty>
                        <CommandGroup>
                          {clients.map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.name}
                              onSelect={() => {
                                setFormData({ ...formData, clientId: client.id });
                                setClientSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.clientId === client.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {client.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          ) : null}

          {assignmentType === 'client' && (
            <div className="space-y-2">
              <Label>กิจกรรมที่มอบหมาย <span className="text-destructive">*</span></Label>
              {isViewing ? (
                <div className="p-2 bg-secondary rounded-md">{formData.jobType}</div>
              ) : (
                <Input
                  value={formData.jobType}
                  onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                  placeholder="ระบุกิจกรรมที่มอบหมาย"
                  required
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              {isViewing ? (
                <div className="p-2 bg-secondary rounded-md">{formData.date}</div>
              ) : (
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              {isViewing ? (
                <div className="p-2 bg-secondary rounded-md">{formData.startTime}</div>
              ) : (
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              {isViewing ? (
                <div className="p-2 bg-secondary rounded-md">{formData.endTime}</div>
              ) : (
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              )}
            </div>
          </div>

          {/* Multi-day assignment for full-day (8 hours) bookings */}
          {!isViewing && formData.startTime === '08:00' && formData.endTime === '17:00' && (
            <div className="space-y-2">
              <Label>End Date (for multi-day full-day assignment)</Label>
              <Input
                type="date"
                value={assignmentEndDate}
                onChange={(e) => setAssignmentEndDate(e.target.value)}
                min={formData.date}
                placeholder="Optional: Select for multi-day assignment"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank for single day, or select an end date to create assignments for multiple consecutive days (8:00-17:00 only)
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Assigned Employees</Label>
            {isViewing ? (
              <div className="space-y-1">
                {employees
                  .filter(e => formData.employeeIds.includes(e.id))
                  .map(emp => (
                    <div key={emp.id} className="p-2 bg-secondary rounded-md">
                      {emp.name} - {emp.position}
                    </div>
                  ))}
              </div>
            ) : (
              <>
                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {EMPLOYEE_POSITIONS.filter(pos => pos !== 'Admin').map(position => (
                      <SelectItem key={position} value={position}>{position}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="border border-border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                  {filteredEmployees.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      No employees found for this position
                    </div>
                  ) : (
                    filteredEmployees.map(emp => (
                      <div key={emp.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.employeeIds.includes(emp.id)}
                          onCheckedChange={() => handleEmployeeToggle(emp.id)}
                        />
                        <span className="text-sm">{emp.name} - {emp.position}</span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-between">
        <div className="flex gap-2">
            {assignment && (canEdit || isSeniorOrAbove) && onDelete && (
              <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                Delete
              </Button>
            )}
            {assignment?.status === 'approved' && (isPartner || isPartnerPosition || isAssignedEmployee) && onCancel && (
              <Button variant="outline" onClick={() => setCancelConfirmOpen(true)}>
                Cancel Assignment
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {assignment?.partnerApprovalRequired && assignment?.status === 'pending' && isPartner && onPartnerApprove && (
              <Button variant="default" onClick={() => {
                onPartnerApprove(assignment.id);
                onClose();
              }}>
                Partner Approve
              </Button>
            )}
            {assignment?.status === 'pending' && !assignment?.partnerApprovalRequired && canApprove && onApprove && (
              <Button variant="default" onClick={() => {
                onApprove(assignment.id);
                onClose();
              }}>
                Approve
              </Button>
            )}
            {canEditAssignment && (
              <Button onClick={handleSave}>
                {assignment ? 'Update' : 'Create'}
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              {isViewing ? 'Close' : 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบ Assignment นี้?
              <br />
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (assignment && onDelete) {
                  onDelete(assignment.id);
                  onClose();
                  setDeleteConfirmOpen(false);
                }
              }} 
              className="bg-destructive hover:bg-destructive/90"
            >
              ลบ Assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิก Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะยกเลิก Assignment นี้?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (assignment && onCancel) {
                  onCancel(assignment.id);
                  onClose();
                  setCancelConfirmOpen(false);
                }
              }}
            >
              ยกเลิก Assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={conflictWarningOpen} onOpenChange={setConflictWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>เตือน: พบการทับซ้อนของตารางงาน</AlertDialogTitle>
            <AlertDialogDescription>
              {conflictDetails}
              <br /><br />
              ไม่สามารถมอบหมายงานในช่วงเวลาที่ทับซ้อนกันได้ กรุณาเลือกช่วงเวลาอื่น
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setConflictWarningOpen(false)}>
              ตกลง
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
