import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginScreen } from '@/components/LoginScreen';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, Briefcase, Shield, Plus, Trash2, Pencil, Calendar, RefreshCw, Search } from 'lucide-react';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { EditEmployeeDialog } from '@/components/EditEmployeeDialog';
import { RoleManagement } from '@/components/RoleManagement';
import { HolidayManagement } from '@/components/HolidayManagement';
import { EMPLOYEE_POSITIONS } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useClients } from '@/hooks/useClients';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const { profiles, isLoading: profilesLoading } = useProfiles();
  const { clients, isLoading: clientsLoading, addClient, updateClient, deleteClient } = useClients();
  const { canEdit, canApprove, isPartner, role, isLoading: roleLoading } = useUserRole(user?.id);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [newEmployee, setNewEmployee] = useState({ name: '', position: 'A1' as any, employeeCode: '' });
  const [newClient, setNewClient] = useState({ name: '', colorClass: 'bg-blue-600', clientCode: '' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [deleteClientConfirmOpen, setDeleteClientConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteEmployeeConfirmOpen, setDeleteEmployeeConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: string; name: string } | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ employeeCode: string; tempPassword: string; name: string } | null>(null);
  const [deleteOldAssignmentsOpen, setDeleteOldAssignmentsOpen] = useState(false);
  const [isDeletingOldAssignments, setIsDeletingOldAssignments] = useState(false);
  const [deleteStartDate, setDeleteStartDate] = useState('');
  const [deleteEndDate, setDeleteEndDate] = useState('');
  const [editingClient, setEditingClient] = useState<{ id: string; name: string; colorClass: string; clientCode?: string } | null>(null);
  const [editClientDialogOpen, setEditClientDialogOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

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

  // Non-admin users should not see this page
  useEffect(() => {
    if (user && !profilesLoading) {
      const currentProfile = profiles.find(p => p.id === user.id);
      // Only position='Admin' can access admin dashboard
      if (currentProfile?.position !== 'Admin') {
        navigate('/');
      }
    }
  }, [user, profiles, profilesLoading, navigate]);

  const handleSignIn = async (employeeCode: string, password: string) => {
    return await signIn(employeeCode, password);
  };

  const handleLogout = useCallback(() => {
    signOut();
  }, [signOut]);

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.employeeCode) {
      toast.error('Please fill all fields');
      return;
    }

    if (role !== 'admin' && role !== 'super_admin') {
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
    addClient({
      name: newClient.name,
      color_class: newClient.colorClass,
      client_code: newClient.clientCode
    });
    setNewClient({ name: '', colorClass: 'bg-blue-600', clientCode: '' });
    toast.success('Client added successfully');
  };

  const handleDeleteClient = () => {
    if (clientToDelete) {
      deleteClient(clientToDelete.id);
      toast.success('Client deleted');
      setDeleteClientConfirmOpen(false);
      setClientToDelete(null);
    }
  };

  const handleEditEmployee = (employee: any) => {
    setEditingEmployee(employee);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handlePasswordChangeSuccess = () => {
    setMustChangePassword(false);
    setChangePasswordOpen(false);
    window.location.reload();
  };

  const handleResetPassword = async (employee: any) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
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

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('delete-employee', {
        body: { employeeId: employeeToDelete.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('ลบพนักงานสำเร็จ');
      setDeleteEmployeeConfirmOpen(false);
      setEmployeeToDelete(null);

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Error deleting employee:', err);
      toast.error(err.message || 'ไม่สามารถลบพนักงานได้');
    }
  };

  const handleEditClient = (client: { id: string; name: string; colorClass: string; clientCode?: string }) => {
    setEditingClient(client);
    setEditClientDialogOpen(true);
  };

  const handleUpdateClient = () => {
    if (!editingClient) return;

    updateClient({
      id: editingClient.id,
      data: {
        name: editingClient.name,
        color_class: editingClient.colorClass,
        client_code: editingClient.clientCode
      }
    });

    setEditClientDialogOpen(false);
    setEditingClient(null);
  };

  const handleDeleteOldAssignments = async () => {
    if (!deleteStartDate || !deleteEndDate) {
      toast.error('กรุณาเลือกวันที่เริ่มต้นและวันที่สิ้นสุด');
      return;
    }

    if (new Date(deleteStartDate) > new Date(deleteEndDate)) {
      toast.error('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
      return;
    }

    setIsDeletingOldAssignments(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');

      // Delete assignments within the selected date range
      const { error } = await supabase
        .from('assignments')
        .delete()
        .gte('date', deleteStartDate)
        .lte('date', deleteEndDate);

      if (error) throw error;

      toast.success('ลบข้อมูล Assignment ในช่วงเวลาที่เลือกสำเร็จ');
      setDeleteOldAssignmentsOpen(false);
      setDeleteStartDate('');
      setDeleteEndDate('');

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Error deleting assignments:', err);
      toast.error(err.message || 'ไม่สามารถลบข้อมูลได้');
    } finally {
      setIsDeletingOldAssignments(false);
    }
  };

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

  // Transform database data to match component expectations
  const transformedClients = clients.map(c => ({
    id: c.id,
    name: c.name,
    colorClass: c.colorClass,
    clientCode: c.clientCode
  }));

  // Filter clients based on search query (name or client code)
  const filteredClients = transformedClients.filter(client =>
    client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    (client.clientCode && client.clientCode.toLowerCase().includes(clientSearchQuery.toLowerCase()))
  );

  const transformedProfiles = profiles.map(p => ({
    id: p.id,
    name: p.name,
    position: p.position,
    employeeCode: p.employee_code
  }));

  // Filter employees based on search query
  const filteredProfiles = transformedProfiles.filter(emp =>
    emp.name.toLowerCase().includes(employeeSearchQuery.toLowerCase())
  );

  const currentProfile = profiles.find(p => p.id === user.id);

  return (
    <div className="flex flex-col h-screen bg-background">
      <Navigation canEdit={canEdit} userPosition={currentProfile?.position} isPartner={isPartner} />

      {/* Admin Dashboard Header */}
      <div className="border-b border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">System Management & Configuration</p>
          </div>
          <div className="flex items-center gap-2">
            {currentProfile && (
              <span className="text-sm text-muted-foreground">
                {currentProfile.name} ({currentProfile.position})
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <Settings className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Management Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="employees" className="w-full">
          <TabsList className={`grid w-full max-w-2xl ${role === 'admin' || role === 'super_admin' ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="employees">
              <Users className="w-4 h-4 mr-2" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="clients">
              <Briefcase className="w-4 h-4 mr-2" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="holidays">
              <Calendar className="w-4 h-4 mr-2" />
              Holidays
            </TabsTrigger>
            {(role === 'admin' || role === 'super_admin') && (
              <TabsTrigger value="roles">
                <Shield className="w-4 h-4 mr-2" />
                Roles
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="employees" className="space-y-4 mt-6">
            {(role === 'admin' || role === 'super_admin') && (
              <div className="border border-border rounded-lg p-6 space-y-4 bg-card">
                <h3 className="font-semibold text-lg">Add New Employee</h3>
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

            <div className="space-y-4 bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Employee List</h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={employeeSearchQuery}
                    onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                    placeholder="ค้นหาพนักงาน..."
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="border border-border rounded-lg divide-y divide-border">
                {filteredProfiles.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    ไม่พบพนักงานที่ค้นหา
                  </div>
                ) : (
                  filteredProfiles.map(emp => (
                    <div key={emp.id} className="p-4 flex items-center justify-between hover:bg-secondary/50">
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
                        {(role === 'admin' || role === 'super_admin') && (
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
                                setEmployeeToDelete({ id: emp.id, name: emp.name });
                                setDeleteEmployeeConfirmOpen(true);
                              }}
                              title="ลบพนักงาน"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4 mt-6">
            <div className="border border-border rounded-lg p-6 space-y-4 bg-card">
              <h3 className="font-semibold text-lg">Add New Client</h3>
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

            <div className="space-y-4 bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Client List</h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    placeholder="ค้นหาลูกค้า..."
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="border border-border rounded-lg divide-y divide-border">
                {filteredClients.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    ไม่พบลูกค้าที่ค้นหา
                  </div>
                ) : (
                  filteredClients.map(client => (
                    <div key={client.id} className="p-4 flex items-center justify-between hover:bg-secondary/50">
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
                            setClientToDelete({ id: client.id, name: client.name });
                            setDeleteClientConfirmOpen(true);
                          }}
                          title="ลบลูกค้า"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="holidays" className="space-y-4 mt-6">
            <HolidayManagement />
          </TabsContent>

          {(role === 'admin' || role === 'super_admin') && (
            <TabsContent value="roles" className="space-y-4 mt-6 bg-card border border-border rounded-lg p-6">
              <RoleManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <EditEmployeeDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingEmployee(null);
        }}
        employee={editingEmployee}
        onSuccess={handleEditSuccess}
      />

      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => !mustChangePassword && setChangePasswordOpen(false)}
        onSuccess={handlePasswordChangeSuccess}
        required={mustChangePassword}
      />

      <AlertDialog open={deleteClientConfirmOpen} onOpenChange={setDeleteClientConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ Client</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบ Client <strong>{clientToDelete?.name}</strong>?
              <br />
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive hover:bg-destructive/90">
              ลบ Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteEmployeeConfirmOpen} onOpenChange={setDeleteEmployeeConfirmOpen}>
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

      <AlertDialog open={deleteOldAssignmentsOpen} onOpenChange={setDeleteOldAssignmentsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบข้อมูล Assignment เก่า</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบข้อมูล Assignment ทั้งหมดที่มีอายุมากกว่า 1 ปี?
              <br />
              <strong className="text-destructive">การกระทำนี้ไม่สามารถย้อนกลับได้</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingOldAssignments}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOldAssignments}
              disabled={isDeletingOldAssignments}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingOldAssignments ? 'กำลังลบ...' : 'ลบข้อมูล'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Client Dialog */}
      <AlertDialog open={editClientDialogOpen} onOpenChange={setEditClientDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>แก้ไขข้อมูลลูกค้า</AlertDialogTitle>
          </AlertDialogHeader>
          {editingClient && (
            <div className="space-y-4 py-4">
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
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEditClientDialogOpen(false)}>
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateClient}>
              บันทึก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Old Assignments Dialog */}
      <AlertDialog open={deleteOldAssignmentsOpen} onOpenChange={setDeleteOldAssignmentsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบข้อมูล Assignment ตามช่วงเวลา</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>เลือกช่วงเวลาที่ต้องการลบข้อมูล Assignment</p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>วันที่เริ่มต้น</Label>
                    <Input
                      type="date"
                      value={deleteStartDate}
                      onChange={(e) => setDeleteStartDate(e.target.value)}
                      disabled={isDeletingOldAssignments}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>วันที่สิ้นสุด</Label>
                    <Input
                      type="date"
                      value={deleteEndDate}
                      onChange={(e) => setDeleteEndDate(e.target.value)}
                      disabled={isDeletingOldAssignments}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  การกระทำนี้ไม่สามารถย้อนกลับได้
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingOldAssignments}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOldAssignments}
              disabled={isDeletingOldAssignments}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingOldAssignments ? 'กำลังลบ...' : 'ลบข้อมูล'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
