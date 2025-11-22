import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles } from "@/hooks/useProfiles";
import { useAssignments } from "@/hooks/useAssignments";
import { useLeaves } from "@/hooks/useLeaves";
import { useClients } from "@/hooks/useClients";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Download, Search } from "lucide-react";
import { MultiSelect } from "@/components/MultiSelect";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const AssignmentReports = () => {
  const { user } = useAuth();
  const { profiles } = useProfiles();
  const { assignments } = useAssignments();
  const { leaves } = useLeaves();
  const { clients } = useClients();
  const { role } = useUserRole(user?.id);

  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [employeeReportData, setEmployeeReportData] = useState<any[]>([]);
  const [clientReportData, setClientReportData] = useState<any[]>([]);
  const [nonChargeReportData, setNonChargeReportData] = useState<any[]>([]);
  const [leaveReportData, setLeaveReportData] = useState<any[]>([]);
  const [showReports, setShowReports] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [reportType, setReportType] = useState<'employee' | 'client' | 'noncharge' | 'leave'>('employee');
  const [searchTerm, setSearchTerm] = useState('');

  // Clear all filters when report type changes
  useEffect(() => {
    setSearchTerm('');
    setSelectedEmployeeIds([]);
    setSelectedClientIds([]);
    setShowReports(false);
    setEmployeeReportData([]);
    setClientReportData([]);
    setNonChargeReportData([]);
    setLeaveReportData([]);
  }, [reportType]);

  // Check if user has permission to view reports
  const myProfile = profiles?.find((p: any) => p.id === user?.id);
  const userPosition = myProfile?.position as string | undefined;
  const isSeniorOrAbove = !!userPosition && [
    'Senior', 'Supervisor', 'Assistant Manager', 'Manager', 'Senior Manager', 'Partner', 'Admin'
  ].includes(userPosition);
  const canViewReports = role === 'admin' || role === 'editor' || role === 'super_admin' || isSeniorOrAbove;

  if (!canViewReports) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation canEdit={false} />
        <div className="container mx-auto p-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">คุณไม่มีสิทธิ์เข้าดูรายงาน</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const calculateHours = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let hours = endHour - startHour;
    let minutes = endMin - startMin;
    
    if (minutes < 0) {
      hours -= 1;
      minutes += 60;
    }
    
    const totalHours = hours + minutes / 60;
    
    // Deduct 1 hour for lunch if working period is 4+ hours
    if (totalHours >= 4) {
      return Math.max(0, totalHours - 1);
    }
    
    return totalHours;
  };

  const generateEmployeeReport = () => {
    const dateInterval = {
      start: parseISO(startDate),
      end: parseISO(endDate)
    };

    const filteredProfiles = (profiles || []).filter((p) =>
      selectedEmployeeIds.length === 0 || selectedEmployeeIds.includes(p.id)
    );

    const employeeData = filteredProfiles.map(profile => {
      // Filter assignments for this employee in date range
      const employeeAssignments = assignments?.filter(a => 
        Array.isArray(a.employee_ids) &&
        a.employee_ids.includes(profile.id) &&
        a.date && isWithinInterval(parseISO(a.date), dateInterval)
      ) || [];

      // Calculate client hours
      const clientHours = employeeAssignments
        .filter(a => a.client_id && (selectedClientIds.length === 0 || selectedClientIds.includes(a.client_id)))
        .reduce((acc, a) => {
          const client = clients?.find(c => c.id === a.client_id);
          const clientName = client?.name || 'Unknown';
          const hours = calculateHours(a.start_time, a.end_time);
          acc[clientName] = (acc[clientName] || 0) + hours;
          return acc;
        }, {} as Record<string, number>);

      // Calculate non-charge hours
      const nonChargeHours = employeeAssignments
        .filter(a => !a.client_id && a.activity_name)
        .reduce((acc, a) => {
          const hours = calculateHours(a.start_time, a.end_time);
          acc[a.activity_name!] = (acc[a.activity_name!] || 0) + hours;
          return acc;
        }, {} as Record<string, number>);

      // Calculate leave hours
      const employeeLeaves = leaves?.filter(l =>
        l.employee_id === profile.id &&
        l.status === 'approved' &&
        isWithinInterval(parseISO(l.start_date), dateInterval)
      ) || [];

      const leaveHours = employeeLeaves.reduce((acc, l) => {
        const start = parseISO(l.start_date as any);
        const end = parseISO(l.end_date as any);
        
        // If partial day leave
        if (l.start_time && l.end_time) {
          const hours = calculateHours(l.start_time as any, l.end_time as any);
          acc[l.leave_type as any] = (acc[l.leave_type as any] || 0) + hours;
        } else {
          // Full day leave (8 hours per day)
          // Calculate number of days including both start and end date
          const leaveDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          acc[l.leave_type as any] = (acc[l.leave_type as any] || 0) + (leaveDays * 8);
        }
        return acc;
      }, {} as Record<string, number>);

      const totalClientHours = (Object.values(clientHours) as number[]).reduce((a, b) => a + b, 0);
      const totalNonChargeHours = (Object.values(nonChargeHours) as number[]).reduce((a, b) => a + b, 0);
      const totalLeaveHours = (Object.values(leaveHours) as number[]).reduce((a, b) => a + b, 0);

      return {
        employeeCode: profile.employee_code || profile.name,
        name: profile.name,
        position: profile.position,
        clientHours,
        nonChargeHours,
        leaveHours,
        totalClientHours,
        totalNonChargeHours,
        totalLeaveHours,
        grandTotal: totalClientHours + totalNonChargeHours + totalLeaveHours
      };
    }).filter(emp => emp.grandTotal > 0) || []; // Only show employees with hours

    setEmployeeReportData(employeeData);
  };

  const generateClientReport = () => {
    const dateInterval = {
      start: parseISO(startDate),
      end: parseISO(endDate)
    };

    const filteredClients = (clients || []).filter((c) =>
      selectedClientIds.length === 0 || selectedClientIds.includes(c.id)
    );

    const clientData = filteredClients.map(client => {
      // Filter assignments for this client in date range
      const clientAssignments = assignments?.filter(a =>
        a.client_id === client.id &&
        a.date && isWithinInterval(parseISO(a.date), dateInterval)
      ) || [];

      // Calculate hours per employee
      const employeeHours: Record<string, { name: string; hours: number; position: string }> = {};

      clientAssignments.forEach(assignment => {
        (Array.isArray(assignment.employee_ids) ? assignment.employee_ids : []).forEach(empId => {
          if (selectedEmployeeIds.length > 0 && !selectedEmployeeIds.includes(empId)) return;
          const employee = profiles?.find(p => p.id === empId);
          if (employee) {
            const hours = calculateHours(assignment.start_time, assignment.end_time);
            if (!employeeHours[empId]) {
              employeeHours[empId] = {
                name: employee.name,
                hours: 0,
                position: employee.position
              };
            }
            employeeHours[empId].hours += hours;
          }
        });
      });

      return {
        clientCode: client.clientCode || client.name,
        clientName: client.name,
        employees: Object.values(employeeHours),
        totalHours: Object.values(employeeHours).reduce((a, b) => a + b.hours, 0)
      };
    }).filter(c => c.employees.length > 0) || [];

    setClientReportData(clientData);
  };

  const generateNonChargeReport = () => {
    const dateInterval = {
      start: parseISO(startDate),
      end: parseISO(endDate)
    };

    // Filter assignments for non-charge activities
    const nonChargeAssignments = assignments?.filter(a =>
      !a.client_id && 
      a.activity_name &&
      a.date && isWithinInterval(parseISO(a.date), dateInterval)
    ) || [];

    // Group by activity name
    const activityMap: Record<string, any> = {};

    nonChargeAssignments.forEach(assignment => {
      const activityName = assignment.activity_name!;
      
      if (!activityMap[activityName]) {
        activityMap[activityName] = {
          activityName,
          employees: {},
          totalHours: 0
        };
      }

      (Array.isArray(assignment.employee_ids) ? assignment.employee_ids : []).forEach(empId => {
        if (selectedEmployeeIds.length > 0 && !selectedEmployeeIds.includes(empId)) return;
        
        const employee = profiles?.find(p => p.id === empId);
        if (employee) {
          const hours = calculateHours(assignment.start_time, assignment.end_time);
          
          if (!activityMap[activityName].employees[empId]) {
            activityMap[activityName].employees[empId] = {
              name: employee.name,
              hours: 0,
              position: employee.position,
              employeeCode: employee.employee_code || employee.name
            };
          }
          
          activityMap[activityName].employees[empId].hours += hours;
          activityMap[activityName].totalHours += hours;
        }
      });
    });

    const reportData = Object.values(activityMap).map(activity => ({
      ...activity,
      employees: Object.values(activity.employees)
    })).filter(a => a.employees.length > 0);

    setNonChargeReportData(reportData);
  };

  const generateLeaveReport = () => {
    const dateInterval = {
      start: parseISO(startDate),
      end: parseISO(endDate)
    };

    const filteredProfiles = (profiles || []).filter((p) =>
      selectedEmployeeIds.length === 0 || selectedEmployeeIds.includes(p.id)
    );

    const leaveData: any[] = [];

    filteredProfiles.forEach(profile => {
      const employeeLeaves = leaves?.filter(l =>
        l.employee_id === profile.id &&
        l.status === 'approved' &&
        isWithinInterval(parseISO(l.start_date), dateInterval)
      ) || [];

      employeeLeaves.forEach(leave => {
        const start = parseISO(leave.start_date as any);
        const end = parseISO(leave.end_date as any);
        
        let hours = 0;
        let days = 0;
        
        // If partial day leave
        if (leave.start_time && leave.end_time) {
          hours = calculateHours(leave.start_time as any, leave.end_time as any);
          days = hours / 8;
        } else {
          // Full day leave (8 hours per day)
          days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          hours = days * 8;
        }

        const approver = profiles?.find(p => p.id === leave.approved_by);
        const partnerApprover = leave.partner_approved_by ? profiles?.find(p => p.id === leave.partner_approved_by) : null;

        leaveData.push({
          employeeCode: profile.employee_code || profile.name,
          employeeName: profile.name,
          position: profile.position,
          leaveType: leave.leave_type,
          startDate: format(start, 'dd/MM/yyyy'),
          endDate: format(end, 'dd/MM/yyyy'),
          startTime: leave.start_time || '-',
          endTime: leave.end_time || '-',
          days: days.toFixed(2),
          hours: hours.toFixed(2),
          reason: leave.reason || '-',
          approvedBy: approver?.name || '-',
          partnerApprovedBy: partnerApprover?.name || '-',
          status: leave.status
        });
      });
    });

    setLeaveReportData(leaveData);
  };

  const generateReports = () => {
    if (reportType === 'employee') {
      generateEmployeeReport();
    } else if (reportType === 'client') {
      generateClientReport();
    } else if (reportType === 'noncharge') {
      generateNonChargeReport();
    } else {
      generateLeaveReport();
    }
    setShowReports(true);
  };

  const exportEmployeeReportToCSV = () => {
    const headers = ['Employee Code', 'Name', 'Position', 'Category', 'Detail', 'Hours'];
    const rows: string[][] = [];
    
    employeeReportData.forEach(emp => {
      // Client hours
      Object.entries(emp.clientHours).forEach(([client, hours]) => {
        rows.push([emp.employeeCode, emp.name, emp.position, 'Client', client, (hours as number).toFixed(2)]);
      });
      
      // Non-charge hours
      Object.entries(emp.nonChargeHours).forEach(([activity, hours]) => {
        rows.push([emp.employeeCode, emp.name, emp.position, 'Non-Charge', activity, (hours as number).toFixed(2)]);
      });
      
      // Leave hours
      Object.entries(emp.leaveHours).forEach(([leaveType, hours]) => {
        rows.push([emp.employeeCode, emp.name, emp.position, 'Leave', leaveType, (hours as number).toFixed(2)]);
      });
      
      // Total row
      rows.push([
        emp.employeeCode,
        emp.name,
        emp.position,
        'TOTAL',
        '',
        (emp.totalClientHours + emp.totalNonChargeHours + emp.totalLeaveHours).toFixed(2)
      ]);
      
      // Empty row for spacing
      rows.push(['', '', '', '', '', '']);
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employee_report_${startDate}_${endDate}.csv`;
    link.click();
  };

  const exportClientReportToCSV = () => {
    const headers = ['Client Code', 'Client Name', 'Employee', 'Position', 'Hours'];
    const rows: string[][] = [];
    
    clientReportData.forEach(client => {
      client.employees.forEach((emp: any) => {
        rows.push([
          client.clientCode,
          client.clientName,
          emp.name,
          emp.position,
          emp.hours.toFixed(2)
        ]);
      });
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client_report_${startDate}_${endDate}.csv`;
    link.click();
  };

  const exportNonChargeReportToCSV = () => {
    const headers = ['Activity', 'Employee Code', 'Employee', 'Position', 'Hours'];
    const rows: string[][] = [];
    
    nonChargeReportData.forEach(activity => {
      activity.employees.forEach((emp: any) => {
        rows.push([
          activity.activityName,
          emp.employeeCode,
          emp.name,
          emp.position,
          emp.hours.toFixed(2)
        ]);
      });
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `noncharge_report_${startDate}_${endDate}.csv`;
    link.click();
  };

  const exportLeaveReportToCSV = () => {
    const headers = ['Employee Code', 'Employee', 'Position', 'Leave Type', 'Start Date', 'End Date', 'Start Time', 'End Time', 'Days', 'Hours', 'Reason', 'Approved By', 'Partner Approved By', 'Status'];
    const rows: string[][] = [];
    
    leaveReportData.forEach(leave => {
      rows.push([
        leave.employeeCode,
        leave.employeeName,
        leave.position,
        leave.leaveType,
        leave.startDate,
        leave.endDate,
        leave.startTime,
        leave.endTime,
        leave.days,
        leave.hours,
        leave.reason,
        leave.approvedBy,
        leave.partnerApprovedBy,
        leave.status
      ]);
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leave_report_${startDate}_${endDate}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation canEdit={canViewReports} />
      <div className="container mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>กำหนดช่วงเวลา</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">วันที่เริ่มต้น</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">วันที่สิ้นสุด</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>ประเภทรายงาน</Label>
              <RadioGroup value={reportType} onValueChange={(value: 'employee' | 'client' | 'noncharge' | 'leave') => setReportType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="employee" id="employee" />
                  <Label htmlFor="employee" className="cursor-pointer font-normal">สรุปรายพนักงาน</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="client" id="client" />
                  <Label htmlFor="client" className="cursor-pointer font-normal">มอบหมายตามลูกค้า</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="noncharge" id="noncharge" />
                  <Label htmlFor="noncharge" className="cursor-pointer font-normal">กิจกรรม Non-Charge</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="leave" id="leave" />
                  <Label htmlFor="leave" className="cursor-pointer font-normal">รายงานการลา</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(reportType === 'employee' || reportType === 'noncharge' || reportType === 'leave') && (
                <MultiSelect
                  items={(profiles || []).map((p: any) => ({
                    label: `${p.employee_code ? p.employee_code + ' - ' : ''}${p.name}`,
                    value: p.id,
                  }))}
                  selected={selectedEmployeeIds}
                  onChange={setSelectedEmployeeIds}
                  placeholder="เลือกพนักงาน"
                />
              )}
              {reportType === 'client' && (
                <MultiSelect
                  items={(clients || []).map((c: any) => ({
                    label: `${c.clientCode ? c.clientCode + ' - ' : ''}${c.name}`,
                    value: c.id,
                  }))}
                  selected={selectedClientIds}
                  onChange={setSelectedClientIds}
                  placeholder="เลือกลูกค้า"
                />
              )}
            </div>
            <Button onClick={generateReports} className="w-full md:w-auto mt-2">
              สร้างรายงาน
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              รายงาน ({format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reportType === 'employee' && (
              <>
                <div className="flex justify-between items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    {showReports && employeeReportData.length > 0 
                      ? `พบ ${employeeReportData.length} พนักงาน` 
                      : 'กรุณากด "สร้างรายงาน" เพื่อดูข้อมูล'}
                  </div>
                  <div className="flex items-center gap-2">
                    {showReports && employeeReportData.length > 0 && (
                      <>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="ค้นหาพนักงาน..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-64"
                          />
                        </div>
                        <Button onClick={exportEmployeeReportToCSV} variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export CSV
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {!showReports || employeeReportData.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      ยังไม่มีข้อมูล
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {employeeReportData
                      .filter(emp => 
                        searchTerm === '' || 
                        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        emp.position.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((emp, idx) => (
                      <Card key={idx}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>{emp.name}</CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                {emp.employeeCode} | {emp.position}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold">
                                {emp.grandTotal.toFixed(2)}
                              </div>
                              <p className="text-sm text-muted-foreground">ชั่วโมงรวม</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {Object.keys(emp.clientHours).length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2 flex items-center justify-between">
                                งานลูกค้า (Client Hours)
                                <span className="text-sm font-normal text-muted-foreground">
                                  {emp.totalClientHours.toFixed(2)} ชม.
                                </span>
                              </h4>
                              <div className="space-y-1">
                                {Object.entries(emp.clientHours).map(([client, hours]) => (
                                  <div key={client} className="flex justify-between text-sm pl-4">
                                    <span>• {client}</span>
                                    <span className="font-medium">{(hours as number).toFixed(2)} ชม.</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {Object.keys(emp.nonChargeHours).length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2 flex items-center justify-between">
                                งานไม่คิดค่าใช้จ่าย (Non-Charge)
                                <span className="text-sm font-normal text-muted-foreground">
                                  {emp.totalNonChargeHours.toFixed(2)} ชม.
                                </span>
                              </h4>
                              <div className="space-y-1">
                                {Object.entries(emp.nonChargeHours).map(([activity, hours]) => (
                                  <div key={activity} className="flex justify-between text-sm pl-4">
                                    <span>• {activity}</span>
                                    <span className="font-medium">{(hours as number).toFixed(2)} ชม.</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {Object.keys(emp.leaveHours).length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2 flex items-center justify-between">
                                การลา (Leave)
                                <span className="text-sm font-normal text-muted-foreground">
                                  {emp.totalLeaveHours.toFixed(2)} ชม.
                                </span>
                              </h4>
                              <div className="space-y-1">
                                {Object.entries(emp.leaveHours).map(([leaveType, hours]) => (
                                  <div key={leaveType} className="flex justify-between text-sm pl-4">
                                    <span>• {leaveType}</span>
                                    <span className="font-medium">{(hours as number).toFixed(2)} ชม.</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {reportType === 'client' && (
              <>
                <div className="flex justify-between items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    {showReports && clientReportData.length > 0 
                      ? `พบ ${clientReportData.length} ลูกค้า` 
                      : 'กรุณากด "สร้างรายงาน" เพื่อดูข้อมูล'}
                  </div>
                  <div className="flex items-center gap-2">
                    {showReports && clientReportData.length > 0 && (
                      <>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="ค้นหาลูกค้า..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-64"
                          />
                        </div>
                        <Button onClick={exportClientReportToCSV} variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export CSV
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {!showReports || clientReportData.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      ยังไม่มีข้อมูล
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {clientReportData
                      .filter(client => 
                        searchTerm === '' ||
                        client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        client.clientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        client.employees.some((emp: any) => 
                          emp.name.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                      )
                      .map((client, idx) => (
                      <Card key={idx}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>{client.clientName}</CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                {client.clientCode}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold">
                                {client.totalHours.toFixed(2)}
                              </div>
                              <p className="text-sm text-muted-foreground">ชั่วโมงรวม</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>พนักงาน</TableHead>
                                  <TableHead>ตำแหน่ง</TableHead>
                                  <TableHead className="text-right">ชั่วโมง</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {client.employees.map((emp: any, empIdx: number) => (
                                  <TableRow key={empIdx}>
                                    <TableCell>{emp.name}</TableCell>
                                    <TableCell>{emp.position}</TableCell>
                                    <TableCell className="text-right font-medium">{emp.hours.toFixed(2)} ชม.</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {reportType === 'noncharge' && (
              <>
                <div className="flex justify-between items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    {showReports && nonChargeReportData.length > 0 
                      ? `พบ ${nonChargeReportData.length} กิจกรรม` 
                      : 'กรุณากด "สร้างรายงาน" เพื่อดูข้อมูล'}
                  </div>
                  <div className="flex items-center gap-2">
                    {showReports && nonChargeReportData.length > 0 && (
                      <>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="ค้นหากิจกรรม..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-64"
                          />
                        </div>
                        <Button onClick={exportNonChargeReportToCSV} variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export CSV
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {!showReports || nonChargeReportData.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      ยังไม่มีข้อมูล
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {nonChargeReportData
                      .filter(activity => 
                        searchTerm === '' ||
                        activity.activityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        activity.employees.some((emp: any) => 
                          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                      )
                      .map((activity, idx) => (
                      <Card key={idx}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>{activity.activityName}</CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                กิจกรรม Non-Charge
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold">
                                {activity.totalHours.toFixed(2)}
                              </div>
                              <p className="text-sm text-muted-foreground">ชั่วโมงรวม</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>รหัสพนักงาน</TableHead>
                                  <TableHead>ชื่อ</TableHead>
                                  <TableHead>ตำแหน่ง</TableHead>
                                  <TableHead className="text-right">ชั่วโมง</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {activity.employees.map((emp: any, empIdx: number) => (
                                  <TableRow key={empIdx}>
                                    <TableCell>{emp.employeeCode}</TableCell>
                                    <TableCell>{emp.name}</TableCell>
                                    <TableCell>{emp.position}</TableCell>
                                    <TableCell className="text-right font-medium">{emp.hours.toFixed(2)} ชม.</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {reportType === 'leave' && (
              <>
                <div className="flex justify-between items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    {showReports && leaveReportData.length > 0 
                      ? `พบ ${leaveReportData.length} รายการ` 
                      : 'กรุณากด "สร้างรายงาน" เพื่อดูข้อมูล'}
                  </div>
                  <div className="flex items-center gap-2">
                    {showReports && leaveReportData.length > 0 && (
                      <>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="ค้นหา..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-64"
                          />
                        </div>
                        <Button onClick={exportLeaveReportToCSV} variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export CSV
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {!showReports || leaveReportData.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      ยังไม่มีข้อมูล
                    </CardContent>
                  </Card>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>รหัสพนักงาน</TableHead>
                          <TableHead>ชื่อ</TableHead>
                          <TableHead>ตำแหน่ง</TableHead>
                          <TableHead>ประเภทการลา</TableHead>
                          <TableHead>วันที่เริ่มต้น</TableHead>
                          <TableHead>วันที่สิ้นสุด</TableHead>
                          <TableHead>เวลาเริ่ม</TableHead>
                          <TableHead>เวลาสิ้นสุด</TableHead>
                          <TableHead className="text-right">วัน</TableHead>
                          <TableHead className="text-right">ชั่วโมง</TableHead>
                          <TableHead>เหตุผล</TableHead>
                          <TableHead>ผู้อนุมัติ</TableHead>
                          <TableHead>Partner อนุมัติ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaveReportData
                          .filter(leave => 
                            searchTerm === '' ||
                            leave.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            leave.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            leave.leaveType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            leave.position.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((leave, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{leave.employeeCode}</TableCell>
                            <TableCell>{leave.employeeName}</TableCell>
                            <TableCell>{leave.position}</TableCell>
                            <TableCell>{leave.leaveType}</TableCell>
                            <TableCell>{leave.startDate}</TableCell>
                            <TableCell>{leave.endDate}</TableCell>
                            <TableCell>{leave.startTime}</TableCell>
                            <TableCell>{leave.endTime}</TableCell>
                            <TableCell className="text-right font-medium">{leave.days}</TableCell>
                            <TableCell className="text-right font-medium">{leave.hours}</TableCell>
                            <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                            <TableCell>{leave.approvedBy}</TableCell>
                            <TableCell>{leave.partnerApprovedBy}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
