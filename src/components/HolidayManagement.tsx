import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Trash2, Pencil } from 'lucide-react';
import { useHolidays } from '@/hooks/useHolidays';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const HolidayManagement = () => {
  const { holidays, isLoading, addHoliday, updateHoliday, deleteHoliday } = useHolidays();
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<{ id: string; name: string; date: string } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleAddHoliday = () => {
    if (!newHoliday.name || !newHoliday.date) {
      toast.error('Please fill all fields');
      return;
    }

    addHoliday({
      name: newHoliday.name,
      date: newHoliday.date
    });
    
    setNewHoliday({ name: '', date: '' });
    toast.success('Holiday added successfully');
  };

  const handleDeleteHoliday = () => {
    if (holidayToDelete) {
      deleteHoliday(holidayToDelete.id);
      toast.success('Holiday deleted');
      setDeleteConfirmOpen(false);
      setHolidayToDelete(null);
    }
  };

  const handleEditHoliday = (holiday: { id: string; name: string; date: string }) => {
    setEditingHoliday(holiday);
    setEditDialogOpen(true);
  };

  const handleUpdateHoliday = () => {
    if (!editingHoliday) return;
    
    if (!editingHoliday.name || !editingHoliday.date) {
      toast.error('Please fill all fields');
      return;
    }

    updateHoliday({
      id: editingHoliday.id,
      data: {
        name: editingHoliday.name,
        date: editingHoliday.date
      }
    });
    
    setEditDialogOpen(false);
    setEditingHoliday(null);
  };

  if (isLoading) {
    return <div>Loading holidays...</div>;
  }

  // Sort holidays by date
  const sortedHolidays = [...holidays].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-lg p-6 space-y-4 bg-card">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Add New Holiday
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Holiday Name</Label>
            <Input
              value={newHoliday.name}
              onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              placeholder="e.g., New Year's Day"
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={newHoliday.date}
              onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={handleAddHoliday}>
          <Plus className="w-4 h-4 mr-2" />
          Add Holiday
        </Button>
      </div>

      <div className="space-y-4 bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold text-lg">Holiday List ({sortedHolidays.length})</h3>
        {sortedHolidays.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No holidays added yet. Add your first holiday above.
          </p>
        ) : (
          <div className="border border-border rounded-lg divide-y divide-border">
            {sortedHolidays.map(holiday => (
              <div key={holiday.id} className="p-4 flex items-center justify-between hover:bg-secondary/50">
                <div>
                  <div className="font-medium">{holiday.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(holiday.date), 'EEEE, MMMM d, yyyy')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditHoliday(holiday)}
                    title="แก้ไขข้อมูล"
                  >
                    <Pencil className="w-4 h-4 text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setHolidayToDelete({ id: holiday.id, name: holiday.name });
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบวันหยุด</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบวันหยุด <strong>{holidayToDelete?.name}</strong>?
              <br />
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHoliday} className="bg-destructive hover:bg-destructive/90">
              ลบวันหยุด
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขวันหยุด</DialogTitle>
          </DialogHeader>
          {editingHoliday && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>ชื่อวันหยุด</Label>
                <Input
                  value={editingHoliday.name}
                  onChange={(e) => setEditingHoliday({ ...editingHoliday, name: e.target.value })}
                  placeholder="เช่น วันปีใหม่"
                />
              </div>
              <div className="space-y-2">
                <Label>วันที่</Label>
                <Input
                  type="date"
                  value={editingHoliday.date}
                  onChange={(e) => setEditingHoliday({ ...editingHoliday, date: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleUpdateHoliday}>
                  บันทึก
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
