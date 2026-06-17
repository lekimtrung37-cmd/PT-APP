
'use client';

import * as React from 'react';
import {
  useFirestore,
  useCollection,
  useUser,
  useMemoFirebase,
} from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Search, Loader2, Upload, MoreHorizontal, EyeOff, Eye, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';


// Types
type ProgramTemplate = {
    id: string;
    ten: string;
    moTaNgan?: string;
    taoLuc: { seconds: number; nanoseconds: number; };
    isHidden?: boolean;
};

export default function AdminProgramsPage() {
  const firestore = useFirestore();
  const { user: admin, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [newTemplateName, setNewTemplateName] = React.useState('');
  const [newTemplateDescription, setNewTemplateDescription] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [templateToDelete, setTemplateToDelete] = React.useState<ProgramTemplate | null>(null);

  const publicTemplatesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'programTemplatesPublic');
  }, [firestore]);

  const { data: templates, isLoading } = useCollection<ProgramTemplate>(publicTemplatesQuery);

  const filteredTemplates = React.useMemo(() => {
    if (!templates) return [];
    return templates.filter(t => t.ten.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [templates, searchTerm]);

  const handleCreateTemplate = async () => {
    if (!admin || !firestore) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Bạn phải đăng nhập với quyền Admin.' });
      return;
    }
    if (!newTemplateName.trim()) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Tên giáo án không được để trống.' });
      return;
    }
    setIsSubmitting(true);

    try {
      const colRef = collection(firestore, 'programTemplatesPublic');
      const docRef = await addDoc(colRef, {
        ten: newTemplateName,
        moTaNgan: newTemplateDescription,
        ownerType: 'admin',
        createdByAdminId: admin.uid,
        taoLuc: serverTimestamp(),
        capNhatLuc: serverTimestamp(),
        isHidden: false,
      });
      
      toast({
        title: 'Thành công!',
        description: `Đã tạo giáo án "${newTemplateName}". Giờ bạn có thể thêm các buổi tập cho giáo án này.`,
      });
      
      setIsFormOpen(false);
      setNewTemplateName('');
      setNewTemplateDescription('');
      
      // Navigate to the new template's editor page
      window.location.href = `/admin/library/programs/${docRef.id}`;

    } catch (error) {
      console.error('Error creating template:', error);
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể tạo giáo án.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVisibility = async (template: ProgramTemplate) => {
    if (!firestore) return;
    const templateRef = doc(firestore, 'programTemplatesPublic', template.id);
    const newVisibility = !template.isHidden;
    try {
      await updateDoc(templateRef, { isHidden: newVisibility });
      toast({
        title: 'Thành công!',
        description: `Đã ${newVisibility ? 'ẩn' : 'hiển thị'} giáo án "${template.ten}".`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái giáo án.',
      });
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete || !firestore) return;
    const templateRef = doc(firestore, 'programTemplatesPublic', templateToDelete.id);
    try {
      await deleteDoc(templateRef);
      toast({
        title: 'Đã xóa!',
        description: `Giáo án "${templateToDelete.ten}" đã được xóa vĩnh viễn.`,
        variant: 'destructive'
      });
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể xóa giáo án.',
      });
    } finally {
      setTemplateToDelete(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Quản lý Giáo án mẫu (Kho chung)</h1>
        <p className="mt-1 text-muted-foreground">Tạo, sửa, và quản lý các giáo án mẫu dùng chung trong toàn hệ thống.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm giáo án..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
             <Button variant="outline" asChild>
                <Link href="/admin/library/programs/import">
                    <Upload className="mr-2 h-4 w-4" />
                    Import từ CSV
                </Link>
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Tạo giáo án mới
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tạo Giáo án mẫu mới</DialogTitle>
                  <DialogDescription>
                    Đặt tên và mô tả cho giáo án. Bạn sẽ có thể thêm các buổi tập sau khi tạo.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="template-name">Tên giáo án</label>
                    <Input
                      id="template-name"
                      placeholder="Ví dụ: Giảm mỡ cho người mới bắt đầu"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="template-desc">Mô tả ngắn (tùy chọn)</label>
                    <Input
                      id="template-desc"
                      placeholder="Mô tả mục tiêu của giáo án này"
                      value={newTemplateDescription}
                      onChange={(e) => setNewTemplateDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateTemplate} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin mr-2" />}
                    Tạo và Chỉnh sửa
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredTemplates.length > 0 ? (
              <ul className="divide-y">
                {filteredTemplates.map(template => (
                  <li key={template.id} className={cn("p-4 group hover:bg-muted/50 flex justify-between items-center", template.isHidden && "opacity-50")}>
                    <Link href={`/admin/library/programs/${template.id}`} className="block flex-1">
                      <p className="font-semibold">{template.ten}</p>
                      <p className="text-sm text-muted-foreground">{template.moTaNgan || 'Chưa có mô tả'}</p>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                          <span className="sr-only">Mở menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                         <DropdownMenuItem asChild>
                           <Link href={`/admin/library/programs/${template.id}`}>
                              <Pencil className="mr-2 h-4 w-4" />Chỉnh sửa
                           </Link>
                         </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => handleToggleVisibility(template)}>
                           {template.isHidden ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                           {template.isHidden ? 'Hiện' : 'Ẩn'}
                         </DropdownMenuItem>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem className="text-destructive" onSelect={() => setTemplateToDelete(template)}>
                           <Trash2 className="mr-2 h-4 w-4" />Xóa
                         </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <p>Không có giáo án mẫu nào. Hãy tạo một cái!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn giáo án "{templateToDelete?.ten}". Thao tác này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-destructive hover:bg-destructive/90">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
