import { Employee, Client, Assignment, Leave } from '@/types';

export const initialEmployees: Employee[] = [
  { id: 'e1', name: 'John Smith', position: 'Partner', password: 'admin123', requiresPasswordChange: false },
  { id: 'e2', name: 'Sarah Johnson', position: 'Manager', password: 'password', requiresPasswordChange: true },
  { id: 'e3', name: 'Michael Brown', position: 'Senior', password: 'password', requiresPasswordChange: true },
  { id: 'e4', name: 'Emily Davis', position: 'A1', password: 'password', requiresPasswordChange: true },
];

export const initialClients: Client[] = [
  { id: 'c1', name: 'ABC Corporation', colorClass: 'bg-blue-500' },
  { id: 'c2', name: 'XYZ Industries', colorClass: 'bg-green-500' },
  { id: 'c3', name: 'Tech Solutions Ltd', colorClass: 'bg-purple-500' },
  { id: 'c4', name: 'Global Enterprises', colorClass: 'bg-orange-500' },
];

export const initialAssignments: Assignment[] = [];
export const initialLeaves: Leave[] = [];

export const canApprove = (position: string): boolean => {
  const approverPositions = ['Senior', 'Supervisor', 'Assistant Manager', 'Manager', 'Senior Manager', 'Partner'];
  return approverPositions.includes(position);
};

export const canEdit = (position: string): boolean => {
  const editorPositions = ['Senior', 'Supervisor', 'Assistant Manager', 'Manager', 'Senior Manager', 'Partner'];
  return editorPositions.includes(position);
};

export const getRoleFromPosition = (position: string): 'super_admin' | 'admin' | 'editor' | 'viewer' => {
  // System Admin has privileged user role
  if (position === 'Admin') {
    return 'super_admin';
  }
  // Partner and Senior Manager have admin privileges
  if (['Partner', 'Senior Manager'].includes(position)) {
    return 'admin';
  }
  // Senior positions have editor privileges
  if (['Manager', 'Assistant Manager', 'Supervisor', 'Senior'].includes(position)) {
    return 'editor';
  }
  // Junior positions (Semi-Senior, A2, A1) have viewer privileges
  return 'viewer';
};
