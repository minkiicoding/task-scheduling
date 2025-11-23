import { usePositionRoleMappings } from '@/hooks/usePositionRoleMappings';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Info, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

const ROLE_LABELS = {
  super_admin: 'Privileged User',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer'
} as const;

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Privileged User' },
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' }
];

export const RoleManagement = () => {
  const { user } = useAuth();
  const { role: currentUserRole } = useUserRole(user?.id);
  const { mappings, isLoading, updateMapping } = usePositionRoleMappings();
  const [editingPosition, setEditingPosition] = useState<string | null>(null);

  const canEdit = currentUserRole === 'super_admin';

  if (isLoading) {
    return <div className="text-center py-8">กำลังโหลด...</div>;
  }

  const handleRoleChange = (position: string, newRole: string) => {
    updateMapping({ position, role: newRole });
    setEditingPosition(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">การจัดการสิทธิ์ตามตำแหน่งงาน</h3>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 dark:text-blue-100">
          <p className="font-medium mb-1">สิทธิ์ถูกกำหนดโดยอัตโนมัติตามตำแหน่ง</p>
          <p className="text-blue-700 dark:text-blue-300">
            แต่ละตำแหน่งงานจะมีสิทธิ์การใช้งานที่กำหนดไว้ พนักงานทุกคนในตำแหน่งเดียวกันจะมีสิทธิ์เท่ากัน
            {canEdit && ' คุณสามารถปรับเปลี่ยนสิทธิ์ของแต่ละตำแหน่งได้'}
          </p>
        </div>
      </div>
      
      <div className="border border-border rounded-lg divide-y divide-border">
        {mappings.map((mapping: any) => (
          <div key={mapping.position} className="p-4 hover:bg-secondary/50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="font-medium text-lg">{mapping.position}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  ตำแหน่งงาน
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {editingPosition === mapping.position ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">สิทธิ์:</span>
                    <Select
                      value={mapping.role}
                      onValueChange={(value) => handleRoleChange(mapping.position, value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingPosition(null)}
                    >
                      ยกเลิก
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-muted-foreground">สิทธิ์:</span>
                    <Badge 
                      variant={
                        mapping.role === 'super_admin' ? 'destructive' :
                        mapping.role === 'admin' ? 'default' :
                        mapping.role === 'editor' ? 'secondary' :
                        'outline'
                      }
                      className="font-medium"
                    >
                      {ROLE_LABELS[mapping.role as keyof typeof ROLE_LABELS] || mapping.role}
                    </Badge>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingPosition(mapping.position)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-sm text-muted-foreground bg-secondary/50 p-4 rounded-lg">
        <p className="font-medium mb-2">คำอธิบายสิทธิ์:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>Privileged User:</strong> เข้าถึงทุกฟังก์ชันรวมถึงการยกเลิก Assignment และ Leave ที่อนุมัติแล้ว สามารถจัดการสิทธิ์ของตำแหน่งงานได้</li>
          <li><strong>Admin:</strong> จัดการพนักงาน, ลูกค้า, อนุมัติ Assignment และ Leave ทั้งหมด</li>
          <li><strong>Editor:</strong> สร้าง/แก้ไข Assignment, อนุมัติ Leave ของตำแหน่งที่ต่ำกว่า</li>
          <li><strong>Viewer:</strong> ดูข้อมูลในระบบเท่านั้น ไม่สามารถแก้ไขได้</li>
        </ul>
      </div>
    </div>
  );
};
