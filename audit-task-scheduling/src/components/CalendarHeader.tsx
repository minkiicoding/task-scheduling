import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar, Users, Briefcase, LogOut, Search, Plus, FileText, UserCircle } from 'lucide-react';
import { ViewMode, Employee, Client, EMPLOYEE_POSITIONS } from '@/types';
import { toThaiYear } from '@/utils/dateUtils';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (mode: ViewMode) => void;
  employees: Employee[];
  clients: Client[];
  filteredEmployeeId: string;
  filteredClientId: string;
  filteredPosition: string;
  onEmployeeFilterChange: (id: string) => void;
  onClientFilterChange: (id: string) => void;
  onPositionFilterChange: (position: string) => void;
  employeeSearchQuery: string;
  clientSearchQuery: string;
  positionSearchQuery: string;
  onEmployeeSearchChange: (query: string) => void;
  onClientSearchChange: (query: string) => void;
  onPositionSearchChange: (query: string) => void;
  currentUser: Employee | null;
  onLogout: () => void;
  onNewAssignment?: () => void;
  onRequestLeave?: () => void;
  canCreateAssignment?: boolean;
}

export const CalendarHeader = (props: CalendarHeaderProps) => {
  const {
    currentDate, viewMode, onPrev, onNext, onToday, onViewChange,
    employees, clients, filteredEmployeeId, filteredClientId, filteredPosition,
    onEmployeeFilterChange, onClientFilterChange, onPositionFilterChange,
    employeeSearchQuery, clientSearchQuery, positionSearchQuery,
    onEmployeeSearchChange, onClientSearchChange, onPositionSearchChange,
    currentUser, onLogout,
    onNewAssignment, onRequestLeave, canCreateAssignment
  } = props;

  const getDateRangeText = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const thaiYear = toThaiYear(year);

    if (viewMode === 'month') {
      const monthName = new Intl.DateTimeFormat('th-TH', { month: 'long' }).format(currentDate);
      return `${monthName} ${thaiYear}`;
    } else {
      const monthName = new Intl.DateTimeFormat('th-TH', { month: 'short' }).format(currentDate);
      return `${monthName} ${thaiYear}`;
    }
  };

  return (
    <div className="bg-card border-b border-border p-2 md:p-4 space-y-2 md:space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 md:gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          <h1 className="text-lg md:text-2xl font-bold text-foreground">Audit Scheduling</h1>
        </div>
        <div className="flex items-center gap-1 md:gap-2 flex-wrap">
          {canCreateAssignment && onNewAssignment && (
            <Button variant="default" size="sm" onClick={onNewAssignment}>
              <Plus className="w-4 h-4 mr-2" />
              New Assignment
            </Button>
          )}
          {onRequestLeave && (
            <Button variant="outline" size="sm" onClick={onRequestLeave}>
              <FileText className="w-4 h-4 mr-2" />
              Request Leave
            </Button>
          )}
          {currentUser && (
            <span className="text-xs md:text-sm text-muted-foreground hidden sm:inline">
              {currentUser.name} ({currentUser.position})
            </span>
          )}
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 md:gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={onNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-lg font-semibold ml-2">{getDateRangeText()}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('week')}
          >
            Week
          </Button>
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('month')}
          >
            Month
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 flex-wrap overflow-x-auto pb-2">
        <div className="flex items-center gap-2 min-w-fit">
          <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Select value={filteredEmployeeId} onValueChange={onEmployeeFilterChange}>
            <SelectTrigger className="w-[180px] md:w-[220px]">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={employeeSearchQuery}
                    onChange={(e) => onEmployeeSearchChange(e.target.value)}
                    placeholder="ค้นหาพนักงาน..."
                    className="pl-10"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <SelectItem value="all">All Employees</SelectItem>
              {employees
                .filter(emp => emp.name.toLowerCase().includes(employeeSearchQuery.toLowerCase()))
                .map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 min-w-fit">
          <UserCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Select value={filteredPosition} onValueChange={onPositionFilterChange}>
            <SelectTrigger className="w-[180px] md:w-[220px]">
              <SelectValue placeholder="All Positions" />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={positionSearchQuery}
                    onChange={(e) => onPositionSearchChange(e.target.value)}
                    placeholder="ค้นหาตำแหน่ง..."
                    className="pl-10"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <SelectItem value="all">All Positions</SelectItem>
              {EMPLOYEE_POSITIONS
                .filter(position => position.toLowerCase().includes(positionSearchQuery.toLowerCase()))
                .map(position => (
                  <SelectItem key={position} value={position}>{position}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 min-w-fit">
          <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Select value={filteredClientId} onValueChange={onClientFilterChange}>
            <SelectTrigger className="w-[180px] md:w-[220px]">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={clientSearchQuery}
                    onChange={(e) => onClientSearchChange(e.target.value)}
                    placeholder="ค้นหาลูกค้า..."
                    className="pl-10"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <SelectItem value="all">All Clients</SelectItem>
              {clients
                .filter(client => client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()))
                .map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
