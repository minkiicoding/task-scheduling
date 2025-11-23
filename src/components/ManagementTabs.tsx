import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Employee, Client, EMPLOYEE_POSITIONS } from '@/types';
import { Users, Briefcase, Plus, Trash2, Pencil, KeyRound, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { EditEmployeeDialog } from './EditEmployeeDialog';
import { RoleManagement } from './RoleManagement';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ManagementTabsProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  clients: Client[];
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
  onDeleteEmployee: (id: string) => void;
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onUpdateClient: (id: string, client: Omit<Client, 'id'>) => void;
  onDeleteClient: (id: string) => void;
  isAdmin: boolean;
}

const CLIENT_COLORS = [
  'bg-blue-600',      // น้ำเงินเข้ม - ความน่าเชื่อถือ
  'bg-sky-500',       // ฟ้า - เทคโนโลยี
  'bg-indigo-600',    // ม่วงน้ำเงิน - ปัญญา
  'bg-teal-600',      // เขียวอมน้ำเงิน - มืออาชีพ
  'bg-emerald-600',   // เขียวสด - การเติบโต
  'bg-green-600',     // เขียว - ความยั่งยืน
  'bg-purple-600',    // ม่วง - ความหรูหรา
  'bg-fuchsia-500',   // ม่วงชมพู - นวัตกรรม
  'bg-rose-500',      // ชมพูแดง - พลังสร้างสรรค์
  'bg-orange-500',    // ส้ม - พลังงาน
  'bg-amber-600',     // ทอง - ความอบอุ่น
  'bg-red-600',       // แดง - ความกระตือรือร้น
  'bg-slate-600',     // เทาน้ำเงิน - ความมั่นคง
  'bg-gray-600',      // เทา - มืออาชีพ
  'bg-cyan-600',      // ฟ้าเขียว - เทคโนโลยี
];

export const ManagementTabs = ({
  open,
  onClose,
  employees,
  clients,
  onAddEmployee,
  onDeleteEmployee,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  isAdmin
}: ManagementTabsProps) => {
  const [newEmployee, setNewEmployee] = useState({ name: '', position: 'A1' as any, employeeCode: '' });
  const [newClient, setNewClient] = useState({ name: '', colorClass: 'bg-blue-600', clientCode: '' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [resetPasswordEmployee, setResetPasswordEmployee] = useState<Employee | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{employeeCode: string; tempPassword: string; name: string} | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editClientDialogOpen, setEditClientDialogOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  // Get role display based on position
  const getRoleDisplay = (pos: string) => {
    if (pos === 'Admin') return 'Privileged User';
    if (['Partner', 'Senior Manager'].includes(pos)) return 'Admin';
    if (['Manager', 'Assistant Manager', 'Supervisor', 'Senior'].includes(pos)) return 'Editor';
    return 'Viewer';
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.employeeCode) {
      toast.error('Please fill all fields');
      return;
    }

    if (!isAdmin) {
      toast.error('Only admins can create users');
      return;
    }

    setIsCreatingUser(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { 
          employeeCode: newEmployee.employeeCode, 
          name: newEmployee.name, 
          position: newEmployee.position 
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Employee created successfully with password: 1234');
      setNewEmployee({ name: '', position: 'A1', employeeCode: '' });
      
      // Refresh the page to show new employee
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Error creating employee:', err);
      toast.error(err.message || 'Failed to create employee');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleAddClient = () => {
    if (!newClient.name) {
      toast.error('Please enter client name');
      return;
    }
    onAddClient(newClient);
    setNewClient({ name: '', colorClass: 'bg-blue-600', clientCode: '' });
    toast.success('Client added successfully');
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    // Refresh the page to show updated data
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      const { data, error } = await supabase.functions.invoke('delete-employee', {
        body: { employeeId: employeeToDelete.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('ลบพนักงานสำเร็จ');
      setDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
      
      // Refresh the page
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Error deleting employee:', err);
      toast.error(err.message || 'ไม่สามารถลบพนักงานได้');
    }
  };

  const handleResetPassword = async (employee: Employee) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-employee-password', {
        body: { employeeId: employee.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.success) {
        setResetPasswordResult({
          employeeCode: data.employeeCode,
          tempPassword: data.tempPassword,
          name: data.name
        });
        toast.success('รีเซ็ตรหัสผ่านสำเร็จ!');
      }
    } catch (err: any) {
      console.error('Error resetting password:', err);
      toast.error(err.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้');
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setEditClientDialogOpen(true);
  };

  const handleUpdateClient = () => {
    if (!editingClient) return;
    
    onUpdateClient(editingClient.id, {
      name: editingClient.name,
      colorClass: editingClient.colorClass,
      clientCode: editingClient.clientCode
    });
    
    setEditClientDialogOpen(false);
    setEditingClient(null);
    toast.success('Client updated successfully');
  };

  // Filter clients based on search term
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    (client.clientCode && client.clientCode.toLowerCase().includes(clientSearchTerm.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Management</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="employees" className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="employees">
              <Users className="w-4 h-4 mr-2" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="clients">
              <Briefcase className="w-4 h-4 mr-2" />
              Clients
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="roles">
                <Users className="w-4 h-4 mr-2" />
                Roles
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="employees" className="space-y-4">
            {isAdmin && (
              <div className="border border-border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold">Add New Employee</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Employee Code</Label>
                    <Input
                      value={newEmployee.employeeCode}
                      onChange={(e) => setNewEmployee({ ...newEmployee, employeeCode: e.target.value })}
                      placeholder="Employee code"
                      disabled={isCreatingUser}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      placeholder="Employee name"
                      disabled={isCreatingUser}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Select 
                      value={newEmployee.position} 
                      onValueChange={(value: any) => setNewEmployee({ ...newEmployee, position: value })}
                      disabled={isCreatingUser}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYEE_POSITIONS.map(pos => (
                          <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleAddEmployee} disabled={isCreatingUser}>
                  <Plus className="w-4 h-4 mr-2" />
                  {isCreatingUser ? 'Creating...' : 'Add Employee'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Default password will be <strong>1234</strong>. Employee must change it on first login.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold">Employee List</h3>
              <div className="border border-border rounded-lg divide-y divide-border">
                {employees.map(emp => (
                  <div key={emp.id} className="p-3 flex items-center justify-between hover:bg-secondary/50">
                    <div>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-sm text-muted-foreground">{emp.position}</div>
                      {emp.employeeCode && (
                        <div className="text-xs text-muted-foreground">Code: {emp.employeeCode}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEmployee(emp)}
                        title="แก้ไขข้อมูล"
                      >
                        <Pencil className="w-4 h-4 text-primary" />
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetPassword(emp)}
                            title="รีเซ็ตรหัสผ่าน"
                          >
                            <RefreshCw className="w-4 h-4 text-orange-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEmployeeToDelete(emp);
                              setDeleteConfirmOpen(true);
                            }}
                            title="ลบพนักงาน"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <div className="border border-border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Add New Client</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    placeholder="Client name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Code</Label>
                  <Input
                    value={newClient.clientCode}
                    onChange={(e) => setNewClient({ ...newClient, clientCode: e.target.value })}
                    placeholder="Client code"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select value={newClient.colorClass} onValueChange={(value) => setNewClient({ ...newClient, colorClass: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_COLORS.map(color => (
                        <SelectItem key={color} value={color}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${color}`} />
                            {color}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAddClient}>
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Client List</h3>
                <Input
                  placeholder="Search by name or code..."
                  className="max-w-xs"
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                />
              </div>
              <div className="border border-border rounded-lg divide-y divide-border">
                {filteredClients.map(client => (
                  <div key={client.id} className="p-3 flex items-center justify-between hover:bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded ${client.colorClass}`} />
                      <div>
                        <div className="font-medium">{client.name}</div>
                        {client.clientCode && (
                          <div className="text-xs text-muted-foreground">Code: {client.clientCode}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClient(client)}
                        title="แก้ไขข้อมูล"
                      >
                        <Pencil className="w-4 h-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onDeleteClient(client.id);
                          toast.success('Client deleted');
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="roles" className="space-y-4">
              <RoleManagement />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>

      <EditEmployeeDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingEmployee(null);
        }}
        employee={editingEmployee}
        onSuccess={handleEditSuccess}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบพนักงาน</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบพนักงาน <strong>{employeeToDelete?.name}</strong>?
              <br />
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee} className="bg-destructive hover:bg-destructive/90">
              ลบพนักงาน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resetPasswordResult} onOpenChange={(open) => !open && setResetPasswordResult(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>รีเซ็ตรหัสผ่านสำเร็จ</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>รีเซ็ตรหัสผ่านสำหรับ: <strong>{resetPasswordResult?.name}</strong></p>
                <div className="bg-muted p-3 rounded-md space-y-2">
                  <p className="text-sm">
                    รหัสพนักงาน: <span className="font-mono font-bold">{resetPasswordResult?.employeeCode}</span>
                  </p>
                  <p className="text-sm">
                    รหัสผ่านชั่วคราว: <span className="font-mono font-bold text-primary">{resetPasswordResult?.tempPassword}</span>
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  พนักงานจะต้องเปลี่ยนรหัสผ่านนี้เมื่อเข้าสู่ระบบครั้งแรก
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setResetPasswordResult(null)}>
              ปิด
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editClientDialogOpen} onOpenChange={setEditClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลลูกค้า</DialogTitle>
          </DialogHeader>
          {editingClient && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>ชื่อลูกค้า</Label>
                <Input
                  value={editingClient.name}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                  placeholder="ชื่อลูกค้า"
                />
              </div>
              <div className="space-y-2">
                <Label>รหัสลูกค้า</Label>
                <Input
                  value={editingClient.clientCode || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, clientCode: e.target.value })}
                  placeholder="รหัสลูกค้า"
                />
              </div>
              <div className="space-y-2">
                <Label>สี</Label>
                <Select 
                  value={editingClient.colorClass} 
                  onValueChange={(value) => setEditingClient({ ...editingClient, colorClass: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_COLORS.map(color => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${color}`} />
                          {color}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditClientDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleUpdateClient}>
                  บันทึก
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
