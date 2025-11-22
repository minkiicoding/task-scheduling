import { Assignment, Employee, Client, Leave, LEAVE_TYPES } from '@/types';
import { getMonthDates, formatDate, isSameDay, isToday } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { useHolidays } from '@/hooks/useHolidays';

interface MonthViewProps {
  currentDate: Date;
  assignments: Assignment[];
  leaves: Leave[];
  employees: Employee[];
  clients: Client[];
  filteredEmployeeId: string;
  filteredClientId: string;
  onAssignmentClick: (assignment: Assignment) => void;
  onLeaveClick?: (leave: Leave | Leave[]) => void;
  onDateClick?: (date: Date) => void;
}

export const MonthView = ({
  currentDate,
  assignments,
  leaves,
  employees,
  clients,
  filteredEmployeeId,
  filteredClientId,
  onAssignmentClick,
  onLeaveClick,
  onDateClick
}: MonthViewProps) => {
  const monthDates = getMonthDates(currentDate);
  const { holidays } = useHolidays();

  const getAssignmentsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return assignments.filter(a => {
      const matchesDate = a.date === dateStr;
      const matchesEmployee = filteredEmployeeId === 'all' || a.employeeIds.includes(filteredEmployeeId);
      // For non-charge activities, don't filter by client
      const matchesClient = filteredClientId === 'all' || 
                           (a.activityName ? true : a.clientId === filteredClientId);
      return matchesDate && matchesEmployee && matchesClient;
    });
  };

  // Calculate working hours excluding lunch break (12:00-13:00)
  const calculateWorkingHours = (startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const totalMinutes = endMinutes - startMinutes;
    
    // Check if work period includes lunch break (12:00-13:00)
    const lunchStart = 12 * 60; // 12:00 in minutes
    const lunchEnd = 13 * 60;   // 13:00 in minutes
    
    let lunchBreakMinutes = 0;
    if (startMinutes < lunchEnd && endMinutes > lunchStart) {
      // Work period overlaps with lunch
      const overlapStart = Math.max(startMinutes, lunchStart);
      const overlapEnd = Math.min(endMinutes, lunchEnd);
      lunchBreakMinutes = overlapEnd - overlapStart;
    }
    
    return (totalMinutes - lunchBreakMinutes) / 60;
  };

  // Group assignments by client only (without time range)
  const getGroupedAssignmentsForDate = (date: Date) => {
    const dayAssignments = getAssignmentsForDate(date);
    const grouped = new Map<string, {
      client: Client | null;
      isNonCharge: boolean;
      activityName?: string;
      employeeHours: Map<string, number>;
      assignments: Assignment[];
      isPendingOT: boolean;
      isApprovedLeave: boolean;
      colorClass?: string;
    }>();

    dayAssignments.forEach(assignment => {
      const isNonCharge = !assignment.clientId;
      // Group by client/activity only (no time range)
      const key = isNonCharge 
        ? `noncharge-${assignment.activityName}` 
        : assignment.clientId!;
      
      if (!grouped.has(key)) {
        const client = assignment.clientId ? clients.find(c => c.id === assignment.clientId) : null;
        const isLeaveAssignment = assignment.activityName && LEAVE_TYPES.some(t => assignment.activityName?.startsWith(t));
        const isApprovedLeave = !!isLeaveAssignment && assignment.status === 'approved';
        
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = isHolidayDate(date);
        const isOT = isHoliday || isWeekend || 
          parseInt(assignment.startTime.split(':')[0]) < 8 || 
          parseInt(assignment.endTime.split(':')[0]) > 17 ||
          (parseInt(assignment.endTime.split(':')[0]) === 17 && parseInt(assignment.endTime.split(':')[1]) > 0);
        const isPendingOT = isOT && assignment.status === 'pending';
        
        grouped.set(key, {
          client,
          isNonCharge,
          activityName: assignment.activityName,
          employeeHours: new Map(),
          assignments: [],
          isPendingOT,
          isApprovedLeave,
          colorClass: client?.colorClass
        });
      }
      
      const group = grouped.get(key)!;
      group.assignments.push(assignment);
      
      // Calculate hours for each employee with lunch break deduction
      assignment.employeeIds.forEach(empId => {
        const hours = calculateWorkingHours(assignment.startTime, assignment.endTime);
        const currentHours = group.employeeHours.get(empId) || 0;
        group.employeeHours.set(empId, currentHours + hours);
      });
    });

    return Array.from(grouped.values());
  };

  const getLeavesForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return leaves.filter(l => {
      const matchesEmployee = filteredEmployeeId === 'all' || l.employeeId === filteredEmployeeId;
      const isInRange = dateStr >= l.startDate && dateStr <= l.endDate;
      return matchesEmployee && isInRange;
    });
  };

  const isCurrentMonth = (date: Date) => date.getMonth() === currentDate.getMonth();

  const isHolidayDate = (date: Date) => {
    const dateStr = formatDate(date);
    return holidays.some(h => h.date === dateStr);
  };

  const getHolidayName = (date: Date) => {
    const dateStr = formatDate(date);
    return holidays.find(h => h.date === dateStr)?.name;
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 gap-px bg-border min-w-[700px] sticky top-0 z-10">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-secondary p-2 text-center text-sm font-medium text-secondary-foreground">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border auto-rows-fr min-w-[700px]">
        {monthDates.map((date, idx) => {
          const groupedAssignments = getGroupedAssignmentsForDate(date);
          const dayLeaves = getLeavesForDate(date);
          const today = isToday(date);
          const currentMonth = isCurrentMonth(date);
          const isHoliday = isHolidayDate(date);
          const holidayName = getHolidayName(date);

          return (
            <div 
              key={idx} 
              className={cn(
                "bg-card p-2 min-h-[120px] cursor-pointer hover:bg-accent/5 transition-colors flex flex-col",
                !currentMonth && "bg-muted/30",
                today && "bg-accent/10",
                isHoliday && "bg-red-50 dark:bg-red-950/20"
              )}
              onClick={() => onDateClick && onDateClick(date)}
            >
              <div className="text-right mb-1">
                <span className={cn(
                  "text-sm",
                  !currentMonth && "text-muted-foreground",
                  today && "text-primary font-bold",
                  isHoliday && "text-red-600 dark:text-red-400 font-semibold"
                )}>
                  {date.getDate()}
                </span>
              </div>
              {isHoliday && holidayName && (
                <div className="text-xs text-red-600 dark:text-red-400 opacity-70 mb-1 whitespace-normal break-words">
                  {holidayName}
                </div>
              )}

              <div className="space-y-1 flex-1 overflow-y-auto">
                {groupedAssignments.map((group, gidx) => {
                  return (
                    <div
                      key={gidx}
                      className={cn(
                        "p-1 rounded text-xs",
                        group.isApprovedLeave 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-800'
                          : group.isPendingOT
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800'
                            : group.isNonCharge 
                              ? 'bg-blue-300 dark:bg-blue-600 text-blue-900 dark:text-blue-100'
                              : cn(group.colorClass || 'bg-primary', 'text-white')
                      )}
                    >
                      <div className="font-medium whitespace-normal break-words">
                        {group.isNonCharge ? group.activityName : group.client?.name}
                      </div>
                      <div className={cn(
                        "whitespace-normal break-words text-[10px]", 
                        group.isApprovedLeave ? "text-green-700 dark:text-green-300" : 
                        group.isPendingOT ? "text-red-700 dark:text-red-300" : "opacity-90"
                      )}>
                        {Array.from(group.employeeHours.entries()).map(([empId, hours]) => {
                          const emp = employees.find(e => e.id === empId);
                          if (!emp) return null;
                          return `${emp.name.split(' ')[0]} (${hours.toFixed(1)}h)`;
                        }).filter(Boolean).join(', ')}
                      </div>
                    </div>
                  );
                })}
                {(() => {
                  const approvedLeaves = dayLeaves.filter(l => l.status === 'approved');
                  const pendingLeaves = dayLeaves.filter(l => l.status === 'pending');
                  
                  return (
                    <>
                      {approvedLeaves.length > 0 && (
                        <div 
                          className="text-xs p-1 rounded cursor-pointer transition-colors bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLeaveClick && onLeaveClick(approvedLeaves);
                          }}
                        >
                           <div className="font-medium">
                             อนุมัติ: {approvedLeaves.length} รายการ
                           </div>
                           <div className="whitespace-normal break-words text-green-700 dark:text-green-300">
                             {approvedLeaves.map(l => {
                               const emp = employees.find(e => e.id === l.employeeId);
                               return emp ? emp.name.split(' ')[0] : '';
                             }).filter(Boolean).join(', ')}
                           </div>
                        </div>
                      )}
                      {pendingLeaves.length > 0 && (
                        <div 
                          className="text-xs p-1 rounded cursor-pointer transition-colors bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-900/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLeaveClick && onLeaveClick(pendingLeaves);
                          }}
                        >
                           <div className="font-medium">
                             รออนุมัติ: {pendingLeaves.length} รายการ
                           </div>
                           <div className="whitespace-normal break-words text-orange-700 dark:text-orange-300">
                             {pendingLeaves.map(l => {
                               const emp = employees.find(e => e.id === l.employeeId);
                               return emp ? emp.name.split(' ')[0] : '';
                             }).filter(Boolean).join(', ')}
                           </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
