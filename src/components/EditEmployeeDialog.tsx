import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { EMPLOYEE_POSITIONS } from '@/types';

interface EditEmployeeDialogProps {
  open: boolean;
  onClose: () => void;
  employee: {
    id: string;
    name: string;
    position: string;
    employeeCode?: string;
  } | null;
  onSuccess: () => void;
}

export const EditEmployeeDialog = ({ open, onClose, employee, onSuccess }: EditEmployeeDialogProps) => {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('A1');
  const [employeeCode, setEmployeeCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setPosition(employee.position);
      setEmployeeCode(employee.employeeCode || '');
      // Load email from database
      const loadEmail = async () => {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', employee.id)
          .single();
        if (data?.email) setEmail(data.email);
      };
      loadEmail();
    }
  }, [employee]);

  const getRoleDisplay = (pos: string) => {
    if (['Admin', 'Partner', 'Senior Manager'].includes(pos)) return 'Admin';
    if (['Manager', 'Assistant Manager', 'Supervisor', 'Senior'].includes(pos)) return 'Editor';
    return 'Viewer';
  };

  const handleSubmit = async () => {
    setError('');

    if (!name) {
      setError('Please enter employee name');
      return;
    }

    setIsLoading(true);

    try {
      const { supabase } = await import('@/integrations/supabase/client');

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name,
          position,
          employee_code: employeeCode || null,
          email: email || null
        })
        .eq('id', employee?.id);

      if (updateError) throw updateError;

      toast.success('Employee updated successfully!', {
        description: `${name}'s information has been updated.`
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating employee:', err);
      setError(err.message || 'Failed to update employee');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="employee-code">Employee Code</Label>
            <Input
              id="employee-code"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              placeholder="Full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="example@company.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Select value={position} onValueChange={setPosition} disabled={isLoading}>
              <SelectTrigger id="position">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEE_POSITIONS.map(pos => (
                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Role will be: <strong>{getRoleDisplay(position)}</strong>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
