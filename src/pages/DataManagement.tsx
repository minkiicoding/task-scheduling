import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfiles } from '@/hooks/useProfiles';

export const DataManagement = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { role } = useUserRole(user?.id);
    const { profiles } = useProfiles();

    const [deleteOldAssignmentsOpen, setDeleteOldAssignmentsOpen] = useState(false);
    const [isDeletingOldAssignments, setIsDeletingOldAssignments] = useState(false);
    const [deleteStartDate, setDeleteStartDate] = useState('');
    const [deleteEndDate, setDeleteEndDate] = useState('');

    const currentProfile = profiles?.find(p => p.id === user?.id);
    const canManageData = role === 'admin' || role === 'super_admin';

    if (!canManageData) {
        return (
            <div className="min-h-screen bg-background">
                <Navigation canEdit={false} />
                <div className="container mx-auto p-4">
                    <Card>
                        <CardContent className="p-6">
                            <p className="text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

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

    return (
        <div className="min-h-screen bg-background">
            <Navigation canEdit={canManageData} userPosition={currentProfile?.position} />

            <div className="container mx-auto p-4 space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        กลับ
                    </Button>
                    <h1 className="text-2xl font-bold">Data Management</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-destructive">ลบข้อมูล Assignment</CardTitle>
                        <CardDescription>
                            ลบข้อมูล Assignment ตามช่วงเวลาที่กำหนด - การดำเนินการนี้ไม่สามารถย้อนกลับได้
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            คำเตือน: การลบข้อมูลจะส่งผลต่อรายงานและสถิติต่างๆ กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ
                        </p>

                        <Button
                            variant="destructive"
                            onClick={() => setDeleteOldAssignmentsOpen(true)}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            ลบข้อมูล Assignment ตามช่วงเวลา
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Old Assignments Dialog */}
            <AlertDialog open={deleteOldAssignmentsOpen} onOpenChange={setDeleteOldAssignmentsOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ลบข้อมูล Assignment ตามช่วงเวลา</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                <p>กรุณาเลือกช่วงเวลาที่ต้องการลบข้อมูล Assignment</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="deleteStartDate">วันที่เริ่มต้น</Label>
                                        <Input
                                            id="deleteStartDate"
                                            type="date"
                                            value={deleteStartDate}
                                            onChange={(e) => setDeleteStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="deleteEndDate">วันที่สิ้นสุด</Label>
                                        <Input
                                            id="deleteEndDate"
                                            type="date"
                                            value={deleteEndDate}
                                            onChange={(e) => setDeleteEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <p className="text-sm text-destructive font-medium">
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

export default DataManagement;
