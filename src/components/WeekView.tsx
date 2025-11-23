import { Assignment, Employee, Client, Leave, EmployeePosition, LEAVE_TYPES } from '@/types';
import { getWeekDates, formatDate, isToday, formatTimeWithoutSeconds } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { useHolidays } from '@/hooks/useHolidays';

interface WeekViewProps {
  currentDate: Date;
  assignments: Assignment[];
  leaves: Leave[];
  employees: Employee[];
  clients: Client[];
  filteredEmployeeId: string;
  filteredClientId: string;
  onAssignmentClick: (assignment: Assignment) => void;
  onLeaveClick?: (leave: Leave | Leave[]) => void;
  onDateClick?: (date: Date, employeeId?: string) => void;
}

type EmployeeGroup = {
  name: string;
  positions: EmployeePosition[];
};

const EMPLOYEE_GROUPS: EmployeeGroup[] = [
  {
    name: 'Management',
    positions: ['Partner', 'Senior Manager', 'Manager', 'Assistant Manager', 'Supervisor']
  },
  {
    name: 'Senior',
    positions: ['Senior']
  },
  {
    name: 'Semi-Senior',
    positions: ['Semi-Senior']
  },
  {
    name: 'Assistant',
    positions: ['A2', 'A1']
  }
];

export const WeekView = ({
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
}: WeekViewProps) => {
  const weekDates = getWeekDates(currentDate);
  const { holidays } = useHolidays();

  const getEmployeesByGroup = (group: EmployeeGroup) => {
    let groupEmployees = employees.filter(e => group.positions.includes(e.position));
    
    if (filteredEmployeeId !== 'all') {
      groupEmployees = groupEmployees.filter(e => e.id === filteredEmployeeId);
    }
    
    // Sort by position hierarchy
    return groupEmployees.sort((a, b) => {
      const aIndex = group.positions.indexOf(a.position);
      const bIndex = group.positions.indexOf(b.position);
      return aIndex - bIndex;
    });
  };

  const getEmployeeAssignmentsForDate = (employeeId: string, date: Date) => {
    const dateStr = formatDate(date);
    return assignments.filter(a => {
      const matchesDate = a.date === dateStr;
      const matchesEmployee = a.employeeIds.includes(employeeId);
      const matchesClient = filteredClientId === 'all' || 
                           (a.activityName ? true : a.clientId === filteredClientId);
      return matchesDate && matchesEmployee && matchesClient;
    });
  };

  const getEmployeeLeaveForDate = (employeeId: string, date: Date) => {
    const dateStr = formatDate(date);
    return leaves.find(l => {
      const isThisEmployee = l.employeeId === employeeId;
      const isInRange = dateStr >= l.startDate && dateStr <= l.endDate;
      return isThisEmployee && isInRange;
    });
  };

  const isHolidayDate = (date: Date) => {
    const dateStr = formatDate(date);
    return holidays.some(h => h.date === dateStr);
  };

  const getHolidayName = (date: Date) => {
    const dateStr = formatDate(date);
    return holidays.find(h => h.date === dateStr)?.name;
  };

  const calculateWorkingHours = (startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    let totalMinutes = endMinutes - startMinutes;
    
    // Deduct lunch hour if work spans across noon (12:00-13:00)
    if (startMinutes < 13 * 60 && endMinutes > 12 * 60) {
      totalMinutes -= 60;
    }
    
    return totalMinutes / 60;
  };

  const getUnassignedHours = (employeeId: string, date: Date): number => {
    const dateStr = formatDate(date);
    const dayOfWeek = date.getDay();
    
    // Weekend or holiday = 0 working hours
    if (dayOfWeek === 0 || dayOfWeek === 6 || isHolidayDate(date)) {
      return 0;
    }
    
    // Check if on leave
    const employeeLeave = getEmployeeLeaveForDate(employeeId, date);
    if (employeeLeave && employeeLeave.status === 'approved') {
      return 0;
    }
    
    // Standard working hours: 8:00-17:00 with 1 hour lunch = 8 hours
    const standardHours = 8;
    
    // Calculate assigned hours
    const employeeAssignments = getEmployeeAssignmentsForDate(employeeId, date);
    const assignedHours = employeeAssignments
      .filter(a => a.status === 'approved')
      .reduce((total, assignment) => {
        return total + calculateWorkingHours(assignment.startTime, assignment.endTime);
      }, 0);
    
    return Math.max(0, standardHours - assignedHours);
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header with dates */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="grid grid-cols-8 gap-px bg-border min-w-[800px]">
          <div className="bg-card p-2 font-semibold text-sm">Position</div>
          {weekDates.map((date, idx) => {
            const today = isToday(date);
            const isHoliday = isHolidayDate(date);
            const holidayName = getHolidayName(date);
            return (
              <div 
                key={idx}
                className={cn(
                  "bg-card p-2 text-center",
                  today && "bg-accent/10",
                  isHoliday && "bg-red-50 dark:bg-red-950/20"
                )}
              >
                <div className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)}
                </div>
                <div className={cn(
                  "text-sm font-medium",
                  today && "text-primary font-bold",
                  isHoliday && "text-red-600 dark:text-red-400"
                )}>
                  {date.getDate()}
                </div>
                 {isHoliday && holidayName && (
                   <div className="text-xs text-red-600 dark:text-red-400 opacity-70 whitespace-normal break-words mt-0.5">
                     {holidayName}
                   </div>
                 )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {employees.length === 0 && (
        <div className="p-6 text-center text-muted-foreground">No employees found.</div>
      )}

      {/* Groups */}
      {EMPLOYEE_GROUPS.map(group => {
        const groupEmployees = getEmployeesByGroup(group);
        
        if (groupEmployees.length === 0) return null;

        return (
          <div key={group.name} className="border-b">
            {/* Group Header */}
            <div className="bg-blue-500 text-white p-2 font-semibold text-sm sticky top-[57px] z-[9]">
              {group.name}
            </div>
            
            {/* Employee Rows */}
            {groupEmployees.map(employee => (
              <div key={employee.id} className="grid grid-cols-8 gap-px bg-border min-w-[800px]">
                {/* Employee Name Column */}
                <div className="bg-card p-2 text-xs">
                  <div className="font-medium">{employee.name}</div>
                  <div className="text-muted-foreground">{employee.position}</div>
                </div>
                
                {/* Date Columns */}
                {weekDates.map((date, idx) => {
                  const employeeAssignments = getEmployeeAssignmentsForDate(employee.id, date);
                  const employeeLeave = getEmployeeLeaveForDate(employee.id, date);
                  const today = isToday(date);
                  const isHoliday = isHolidayDate(date);

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "bg-card p-1 min-h-[60px] cursor-pointer hover:bg-accent/5 transition-colors",
                        today && "bg-accent/10",
                        isHoliday && "bg-red-50 dark:bg-red-950/20"
                      )}
                      onClick={() => onDateClick && onDateClick(date, employee.id)}
                    >
                      <div className="space-y-1">
                        {/* Assignments */}
                        {employeeAssignments.map(assignment => {
                          const client = clients.find(c => c.id === assignment.clientId);
                          const isNonCharge = !assignment.clientId;
                          const isLeaveAssignment = assignment.activityName && LEAVE_TYPES.some(t => assignment.activityName?.startsWith(t));
                          const isApprovedLeave = !!isLeaveAssignment && assignment.status === 'approved';
                          
                          // Check if it's OT/holiday and pending
                          const dayOfWeek = date.getDay();
                          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                          const isOT = isHoliday || isWeekend || 
                            parseInt(assignment.startTime.split(':')[0]) < 8 || 
                            parseInt(assignment.endTime.split(':')[0]) > 17 ||
                            (parseInt(assignment.endTime.split(':')[0]) === 17 && parseInt(assignment.endTime.split(':')[1]) > 0);
                          const isPendingOT = isOT && assignment.status === 'pending';
                          
                          // Get assigned employee names
                          const assignedEmployees = assignment.employeeIds
                            .map(id => employees.find(e => e.id === id)?.name)
                            .filter(Boolean)
                            .join(', ');
                          
                          return (
                            <div
                              key={assignment.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAssignmentClick(assignment);
                              }}
                              className={cn(
                                "p-1 rounded text-xs cursor-pointer transition-all hover:shadow-md",
                                isApprovedLeave 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-800'
                                  : isPendingOT
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800'
                                    : isNonCharge 
                                      ? 'bg-blue-300 dark:bg-blue-600 text-blue-900 dark:text-blue-100' 
                                       : cn(client?.colorClass || 'bg-primary', 'text-white')
                               )}
                             >
                               <div className="font-medium whitespace-normal break-words">
                                 {isNonCharge ? assignment.activityName : client?.name}
                                 {!isNonCharge && assignment.jobType && ` (${assignment.jobType})`}
                               </div>
                               <div className={cn("text-xs", isApprovedLeave ? "text-green-700 dark:text-green-300" : isPendingOT ? "text-red-700 dark:text-red-300" : "opacity-90")}>
                                 {formatTimeWithoutSeconds(assignment.startTime)}-{formatTimeWithoutSeconds(assignment.endTime)}
                               </div>
                              {assignment.status === 'pending' && !isPendingOT && (
                                <div className="text-xs bg-warning text-warning-foreground px-1 rounded mt-1">
                                  Pending
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Leave */}
                        {employeeLeave && (
                          <div 
                            className={cn(
                              "p-1 rounded text-xs border cursor-pointer transition-colors",
                              employeeLeave.status === 'approved' 
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/50"
                                : "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-800 hover:bg-orange-200 dark:hover:bg-orange-900/50"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              onLeaveClick && onLeaveClick(employeeLeave);
                            }}
                          >
                            <div className="font-medium">{employeeLeave.leaveType}</div>
                            {employeeLeave.status === 'pending' && (
                              <div className="text-xs bg-orange-600 text-white px-1 rounded mt-1">
                                รออนุมัติ
                              </div>
                            )}
                          </div>
                        )}

                        {/* Unassigned Hours */}
                        {(() => {
                          const unassignedHours = getUnassignedHours(employee.id, date);
                          if (unassignedHours > 0) {
                            return (
                              <div className="text-xs text-muted-foreground mt-1 pt-1 border-t border-border">
                                ว่าง: {unassignedHours.toFixed(1)} ชม.
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
