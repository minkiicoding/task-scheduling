import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';

interface DateActionDialogProps {
  open: boolean;
  onClose: () => void;
  onNewAssignment: () => void;
  onRequestLeave: () => void;
  canCreateAssignment: boolean;
  selectedDate?: Date | null;
  selectedEmployeeId?: string;
}

export const DateActionDialog = ({
  open,
  onClose,
  onNewAssignment,
  onRequestLeave,
  canCreateAssignment,
  selectedDate,
  selectedEmployeeId
}: DateActionDialogProps) => {
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('th-TH', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>เลือกประเภทรายการ</DialogTitle>
          {selectedDate && (
            <p className="text-sm text-muted-foreground pt-2">
              {formatDate(selectedDate)}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-3 py-4">
          {canCreateAssignment && (
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => {
                onNewAssignment();
                onClose();
              }}
            >
              <Plus className="w-5 h-5 mr-3 text-primary" />
              <div className="text-left">
                <div className="font-medium">New Assignment</div>
                <div className="text-xs text-muted-foreground">
                  มอบหมายงานให้กับพนักงาน
                </div>
              </div>
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={() => {
              onRequestLeave();
              onClose();
            }}
          >
            <FileText className="w-5 h-5 mr-3 text-primary" />
            <div className="text-left">
              <div className="font-medium">Request Leave</div>
              <div className="text-xs text-muted-foreground">
                ขอลาหยุดงาน
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
