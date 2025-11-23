import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  required?: boolean;
}

export const ChangePasswordDialog = ({ open, onClose, onSuccess, required = false }: ChangePasswordDialogProps) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = [
    'At least 8 characters long',
    'Contains uppercase letter (A-Z)',
    'Contains lowercase letter (a-z)',
    'Contains number (0-9)',
    'Contains special character (!@#$%^&*)',
  ];

  const validatePassword = (password: string) => {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess(false);

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!validatePassword(newPassword)) {
      setError('Password does not meet security requirements');
      return;
    }

    setIsLoading(true);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const { data, error: changeError } = await supabase.functions.invoke('change-password', {
        body: { newPassword }
      });

      if (changeError) throw changeError;
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        if (!required) {
          onClose();
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!required) {
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => required && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {required ? 'Change Password Required' : 'Change Password'}
          </DialogTitle>
          <DialogDescription>
            {required 
              ? 'You must change your password before continuing. Please create a secure password.'
              : 'Create a new secure password for your account.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Password changed successfully!</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading || success}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading || success}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Password Requirements:</Label>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4">
              {passwordRequirements.map((req, idx) => (
                <li key={idx} className="list-disc">{req}</li>
              ))}
            </ul>
          </div>

          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={isLoading || success}
          >
            {isLoading ? 'Changing Password...' : 'Change Password'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};