import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Employee, Leave, LEAVE_TYPES, EmployeePosition } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface LeaveDialogProps {
  open: boolean;
  onClose: () => void;
  leave: Leave | null;
  initialDate?: Date;
  initialEmployeeId?: string;
  employees: Employee[];
  currentUserId?: string;
  currentUserPosition?: EmployeePosition;
  onSave: (leave: any) => void;
  onDelete?: (id: string) => void;
  onApprove?: (id: string) => void;
  onPartnerApprove?: (id: string) => void;
  onCancel?: (id: string) => void;
  canEdit: boolean;
  canApprove: boolean;
  isPartner: boolean;
  leavesOnDate?: Leave[];
}

export const LeaveDialog = ({
  open,
  onClose,
  leave,
  initialDate,
  initialEmployeeId,
  employees,
  currentUserId,
  currentUserPosition,
  onSave,
  onDelete,
  onApprove,
  onPartnerApprove,
  onCancel,
  canEdit,
  canApprove,
  isPartner,
  leavesOnDate = []
}: LeaveDialogProps) => {
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [leaveType, setLeaveType] = useState<string>('Annual Leave');
  const [reason, setReason] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  // Format time strings like "09:00:00" to "09:00" for display
  const formatTimeDisplay = (t?: string | null) => (t ? t.slice(0, 5) : '');

  useEffect(() => {
    if (leave) {
      setEmployeeId(leave.employeeId);
      setStartDate(new Date(leave.startDate));
      setEndDate(new Date(leave.endDate));
      setLeaveType(leave.leaveType);
      setReason(leave.reason);
      setStartTime(formatTimeDisplay(leave.startTime));
      setEndTime(formatTimeDisplay(leave.endTime));
    } else {
      // Use initialEmployeeId if provided, otherwise default to current user
      setEmployeeId(initialEmployeeId || currentUserId || '');
      // Use initialDate or current date as default
      const defaultDate = initialDate || new Date();
      setStartDate(defaultDate);
      setEndDate(defaultDate);
      setLeaveType('Annual Leave');
      setReason('');
      setStartTime('');
      setEndTime('');
    }
  }, [leave, currentUserId, initialDate, initialEmployeeId]);

  const handleSave = () => {
    if (!employeeId || !startDate || !endDate || !reason.trim()) {
      toast.error('Please fill all required fields');
      return;
    }

    if (endDate < startDate) {
      toast.error('End date must be after start date');
      return;
    }

    // Validate time if same day leave
    const isSameDay = startDate.getTime() === endDate.getTime();
    if (isSameDay && startTime && endTime) {
      if (startTime >= endTime) {
        toast.error('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
        return;
      }
    }

    // For same day leave, validate that times are provided if user wants partial day
    if (isSameDay && (startTime || endTime)) {
      if (!startTime || !endTime) {
        toast.error('กรุณาระบุทั้งเวลาเริ่มต้นและเวลาสิ้นสุด');
        return;
      }
    }

    onSave({
      employeeId,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      leaveType,
      reason,
      startTime: isSameDay && startTime ? startTime : undefined,
      endTime: isSameDay && endTime ? endTime : undefined
    });
    onClose();
  };

  const handleDelete = () => {
    if (leave && onDelete) {
      onDelete(leave.id);
      onClose();
      setDeleteConfirmOpen(false);
    }
  };

  const handleApprove = () => {
    if (leave && onApprove) {
      onApprove(leave.id);
      toast.success('Leave request approved');
      onClose();
    }
  };

  const handlePartnerApprove = () => {
    if (leave && onPartnerApprove) {
      onPartnerApprove(leave.id);
      toast.success('Leave approved by Partner');
      onClose();
    }
  };

  const handleCancel = () => {
    if (leave && onCancel) {
      onCancel(leave.id);
      onClose();
      setCancelConfirmOpen(false);
    }
  };

  // Position hierarchy for comparison
  const positionHierarchy: EmployeePosition[] = ['A1', 'A2', 'Semi-Senior', 'Senior', 'Supervisor', 'Assistant Manager', 'Manager', 'Senior Manager', 'Director', 'Partner', 'Admin'];

  const getPositionLevel = (position: EmployeePosition) => positionHierarchy.indexOf(position);

  // Get leave employee's position
  const leaveEmployee = employees.find(e => e.id === leave?.employeeId);
  const leaveEmployeePosition = leaveEmployee?.position;

  // Senior+ can request leave for others
  const isSeniorOrAbove = currentUserPosition && ['Senior', 'Supervisor', 'Assistant Manager', 'Manager', 'Senior Manager', 'Director', 'Partner', 'Admin'].includes(currentUserPosition);

  // Supervisor+ can view leaves
  const isSupervisorOrAbove = currentUserPosition && ['Supervisor', 'Assistant Manager', 'Manager', 'Senior Manager', 'Director', 'Partner', 'Admin'].includes(currentUserPosition);

  // Check if user's position is higher than leave employee's position
  const isHigherPosition = currentUserPosition && leaveEmployeePosition &&
    getPositionLevel(currentUserPosition) > getPositionLevel(leaveEmployeePosition);

  const isEditable = !leave || (canEdit && leave.status === 'pending');
  const isOwnLeave = leave?.employeeId === currentUserId;
  const isApprover = leave?.approvedBy === currentUserId;
  const isPartnerApprover = leave?.partnerApprovedBy === currentUserId;

  // Can approve if:
  // 1. Own leave (can't approve yourself)
  // 2. Partner or Admin (can approve anyone)
  // 3. Supervisor+ with higher position than leave employee
  const canApproveLeave = !isOwnLeave && (
    isPartner ||
    currentUserPosition === 'Admin' ||
    (isSupervisorOrAbove && isHigherPosition)
  );

  // Show approve button for non-partner approval (not requiring partner approval)
  const showApprove = leave && canApproveLeave && leave.status === 'pending' && !leave.partnerApprovalRequired;
  const showPartnerApprove = leave && isPartner && leave.status === 'pending' && leave.partnerApprovalRequired && !leave.partnerApprovedBy;

  // Can modify (cancel/delete) if:
  // 1. Own leave
  // 2. Higher position than leave employee
  // 3. Partner or Admin (can modify anyone)
  const canModifyLeave = isOwnLeave || isPartner || currentUserPosition === 'Admin' || (isSupervisorOrAbove && isHigherPosition);

  // Show cancel button if user can modify and leave is approved
  const showCancel = leave && canModifyLeave && leave.status === 'approved';

  // Show delete button if user can modify and leave is pending
  const showDelete = leave && canModifyLeave && leave.status === 'pending';

  const summaryOnly = leavesOnDate.length > 0 && !leave;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {summaryOnly ? 'Leave Request Details' : (leave ? 'Leave Request Details' : 'Request Leave')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 -mx-6">
          {leavesOnDate.length > 0 && (
            <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950/20 border-y border-blue-200 dark:border-blue-800">
              <div className="text-sm font-medium text-foreground">พนักงานที่ลาในวันนี้:</div>
              <div className="space-y-1">
                {leavesOnDate.map((l) => {
                  const emp = employees.find(e => e.id === l.employeeId);
                  return emp ? (
                    <div key={l.id} className="text-sm text-foreground flex items-center justify-between">
                      <span>• {emp.name}</span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded",
                        l.status === 'approved'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      )}>
                        {l.status === 'approved' ? 'อนุมัติ' : 'รออนุมัติ'}
                      </span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {!summaryOnly && (
            <>
              <div className="space-y-2">
                <Label htmlFor="employee">Employee</Label>
                <Select
                  value={employeeId}
                  onValueChange={setEmployeeId}
                  disabled={!isEditable || (!canEdit && !isSeniorOrAbove && !leave)}
                >
                  <SelectTrigger id="employee">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter(emp => {
                        // If creating new leave and user is Senior or above, show employees with lower position
                        if (!leave && isSeniorOrAbove) {
                          return emp.id === currentUserId || (emp.position && getPositionLevel(emp.position) < getPositionLevel(currentUserPosition!));
                        }
                        // Otherwise show all employees for admins/editors, or just current user
                        return canEdit || emp.id === currentUserId;
                      })
                      .map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} ({emp.position})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select
                  value={leaveType}
                  onValueChange={setLeaveType}
                  disabled={!isEditable}
                >
                  <SelectTrigger id="leaveType">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                        disabled={!isEditable}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                        disabled={!isEditable}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        defaultMonth={endDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {startDate && endDate && startDate.getTime() === endDate.getTime() && (
                <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/20 border-y border-blue-200 dark:border-blue-800">
                  <div className="text-sm text-foreground font-medium">
                    การลาภายในวันเดียว (สามารถระบุเวลาได้)
                  </div>
                  {(leave?.startTime && leave?.endTime) || (startTime && endTime) ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startTime">เวลาเริ่มต้น</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full"
                          disabled={!isEditable}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endTime">เวลาสิ้นสุด</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full"
                          disabled={!isEditable}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startTime">เวลาเริ่มต้น (ถ้าลาไม่เต็มวัน)</Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            disabled={!isEditable}
                            className="w-full"
                            placeholder="09:00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endTime">เวลาสิ้นสุด (ถ้าลาไม่เต็มวัน)</Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            disabled={!isEditable}
                            className="w-full"
                            placeholder="17:00"
                          />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        หากไม่ระบุเวลา จะถือว่าเป็นการลาเต็มวัน (8 ชั่วโมง)
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for leave"
                  rows={3}
                  disabled={!isEditable}
                />
              </div>
            </>
          )}


          {leave && (
            <div className="space-y-2 p-4 bg-muted border-y">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">Status:</span>
                <span className={cn(
                  "font-medium",
                  leave.status === 'approved' ? 'text-green-700 dark:text-green-300' :
                    leave.status === 'cancelled' ? 'text-red-600' :
                      'text-yellow-600'
                )}>
                  {leave.status === 'approved' ? 'Approved' :
                    leave.status === 'cancelled' ? 'Cancelled' :
                      'Pending'}
                </span>
              </div>
              {leave.startTime && leave.endTime && (
                <div className="text-sm text-foreground">
                  ช่วงเวลาที่ลา: {formatTimeDisplay(leave.startTime)} - {formatTimeDisplay(leave.endTime)}
                </div>
              )}
              {leave.partnerApprovalRequired && (
                <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                </div>
              )}
              {leave.approvedBy && (
                <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                  ✓ Approved by: {employees.find(e => e.id === leave.approvedBy)?.name || 'Unknown'}
                </div>
              )}
              {leave.partnerApprovedBy && (
                <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                  ✓ Partner Approved by: {employees.find(e => e.id === leave.partnerApprovedBy)?.name || 'Unknown'}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {summaryOnly ? (
            <Button variant="outline" onClick={onClose}>Close</Button>
          ) : (
            <>
              {showDelete && (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="mr-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              {showApprove && (
                <Button
                  variant="default"
                  onClick={handleApprove}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              )}
              {showPartnerApprove && (
                <Button
                  variant="default"
                  onClick={handlePartnerApprove}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Partner Approve
                </Button>
              )}
              {showCancel && (
                <Button
                  variant="destructive"
                  onClick={() => setCancelConfirmOpen(true)}
                >
                  Cancel Leave
                </Button>
              )}
              {isEditable && (
                <Button onClick={handleSave}>
                  Save Leave Request
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                {isEditable ? 'Cancel' : 'Close'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบคำขอลา</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบคำขอลานี้?
              <br />
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              ลบคำขอลา
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกคำขอลา</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะยกเลิกคำขอลานี้?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (leave && onCancel) {
                  onCancel(leave.id);
                  setCancelConfirmOpen(false);
                }
              }}
            >
              ยกเลิกคำขอลา
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
