export const EMPLOYEE_POSITIONS = ["A1", "A2", "Semi-Senior", "Senior", "Supervisor", "Assistant Manager", "Manager", "Senior Manager", "Director", "Partner", "Admin"] as const;
export type EmployeePosition = typeof EMPLOYEE_POSITIONS[number];

export type JobType = string; // Free text field for custom values

export const LEAVE_TYPES = ["Annual Leave", "Personal Leave", "Sick Leave", "CPA Leave"] as const;
export type LeaveType = typeof LEAVE_TYPES[number];

export interface Employee {
  id: string;
  name: string;
  position: EmployeePosition;
  employeeCode?: string;
  password?: string;
  requiresPasswordChange?: boolean;
  passwordResetRequested?: boolean;
}

export interface Client {
  id: string;
  name: string;
  colorClass?: string;
  clientCode?: string;
}

export interface Assignment {
  id: string;
  clientId?: string; // Optional for non-charge activities
  activityName?: string; // For non-charge activities
  jobType: JobType;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  employeeIds: string[];
  status: 'approved' | 'pending';
  approvedBy?: string;
  partnerApprovalRequired?: boolean;
  partnerApprovedBy?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Leave {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  startTime?: string; // HH:mm (optional, for partial day leave)
  endTime?: string; // HH:mm (optional, for partial day leave)
  reason: string;
  leaveType: LeaveType;
  status: 'approved' | 'pending' | 'cancelled';
  approvedBy?: string;
  partnerApprovedBy?: string;
  partnerApprovalRequired?: boolean;
  cancelledBy?: string;
  cancelledAt?: string;
}

export type ViewMode = 'week' | 'month';
