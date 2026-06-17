
'use client';
import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, addDoc, serverTimestamp, deleteDoc, doc, writeBatch, getDocs, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Search, Loader2, Edit, MoreHorizontal, Pencil, Copy, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';

// Types
type ProgramTemplate = {
  id: string;
  ten: string;
  moTaNgan?: string;
  ownerType?: 'admin' | 'trainer';
  isHidden?: boolean;
};

export default function TrainerProgramsPage() {
  const { user: trainer, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAddFormOpen, setIsAddFormOpen] = React.useState(false);
  const [newTemplateName, setNewTemplateName] = React.useState('');
  const [newTemplateDescription, setNewTemplateDescription] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // State for delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [templateToDelete, setTemplateToDelete] = React.useState<ProgramTemplate | null>(null);

  // --- Data Fetching ---
  const publicTemplatesQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'programTemplatesPublic'), where('isHidden', '!=', true)) : null
  , [firestore]);
  const { data: publicTemplates, isLoading: isPublicLoading } = useCollection<ProgramTemplate>(publicTemplatesQuery);

  const trainerTemplatesQuery = useMemoFirebase(() => {
    if (!firestore || !trainer) return null;
    return collection(firestore, `programTemplatesTrainer/${trainer.uid}/items`);
  }, [firestore, trainer]);
  const { data: trainerTemplates, isLoading: isTrainerLoading } = useCollection<ProgramTemplate>(trainerTemplatesQuery);

  const isLoading = isUserLoading || isPublicLoading || isTrainerLoading;

  // --- Derived Data ---
  const allTemplates = React.useMemo(() => {
    const publicWithFlag = publicTemplates?.map(t => ({...t, ownerType: 'admin' as const})) || [];
    const trainerWithFlag = trainerTemplates?.map(t => ({...t, ownerType: 'trainer' as const})) || [];
    return [...publicWithFlag, ...trainerWithFlag];
  }, [publicTemplates, trainerTemplates]);

  const filteredTemplates = React.useMemo(() => {
    let source: ProgramTemplate[] = [];
    if (activeTab === 'all') source = allTemplates;
    else if (activeTab === 'public') source = publicTemplates?.map(t => ({...t, ownerType: 'admin' as const})) || [];
    else if (activeTab === 'mine') source = trainerTemplates?.map(t => ({...t, ownerType: 'trainer' as const})) || [];

    return source.filter(t => t.ten && t.ten.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allTemplates, publicTemplates, trainerTemplates, activeTab, searchTerm]);
  
  // --- Handlers ---
  const handleCreateTemplate = async () => {
    if (!trainer || !firestore) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Bạn phải đăng nhập.' });
      return;
    }
    if (!newTemplateName.trim()) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Tên giáo án không được để trống.' });
      return;
    }
    setIsSubmitting(true);
    
    try {
      const colRef = collection(firestore, `programTemplatesTrainer/${trainer.uid}/items`);
      const docRef = await addDoc(colRef, {
        ten: newTemplateName,
        moTaNgan: newTemplateDescription,
        ownerType: 'trainer',
        ownerId: trainer.uid,
        taoLuc: serverTimestamp(),
        capNhatLuc: serverTimestamp(),
      });
      toast({
        title: 'Thành công!',
        description: `Đã tạo giáo án "${newTemplateName}".`,
      });
       setIsAddFormOpen(false);
       setNewTemplateName('');
       setNewTemplateDescription('');
       // Navigate to the editor page
       window.location.href = `/trainer/library/programs/${docRef.id}`;
    } catch(error) {
      console.error("Error creating trainer template:", error);
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể tạo giáo án.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicateTemplate = async (template: ProgramTemplate) => {
    if (!firestore || !trainer) return;
    setIsSubmitting(true);
    const newName = `(Bản sao) ${template.ten}`;
    const newDescription = `Bản sao của "${template.ten}"`;

    try {
      // 1. Determine source collection
      let sourceCollectionPath: string;
      if (template.ownerType === 'admin') {
        sourceCollectionPath = `programTemplatesPublic/${template.id}/sessions`;
      } else {
        sourceCollectionPath = `programTemplatesTrainer/${trainer.uid}/items/${template.id}/sessions`;
      }
      
      // 2. Fetch all sessions from the source template
      const sessionsSnapshot = await getDocs(collection(firestore, sourceCollectionPath));
      const sessionsData = sessionsSnapshot.docs.map(doc => doc.data());
      
      // 3. Create the new template document in the trainer's library
      const trainerTemplatesColRef = collection(firestore, `programTemplatesTrainer/${trainer.uid}/items`);
      const newTemplateDocRef = await addDoc(trainerTemplatesColRef, {
        ten: newName,
        moTaNgan: newDescription,
        ownerType: 'trainer',
        ownerId: trainer.uid,
        taoLuc: serverTimestamp(),
        capNhatLuc: serverTimestamp(),
      });

      // 4. Batch write all copied sessions to the new template's subcollection
      if (sessionsData.length > 0) {
        const batch = writeBatch(firestore);
        const newSessionsColRef = collection(newTemplateDocRef, 'sessions');
        sessionsData.forEach(session => {
          const newSessionDocRef = doc(newSessionsColRef);
          batch.set(newSessionDocRef, session);
        });
        await batch.commit();
      }
      
      toast({
        title: "Đã nhân bản giáo án!",
        description: `Đã tạo "${newName}". Giờ bạn có thể chỉnh sửa nó.`,
      });
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể sao chép giáo án.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete || !firestore || !trainer) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy giáo án để xóa.' });
      return;
    }
    
    setIsSubmitting(true);
    const docRef = doc(firestore, `programTemplatesTrainer/${trainer.uid}/items`, templateToDelete.id);
    
    try {
      await deleteDoc(docRef);
      toast({ title: 'Đã xóa!', description: `Giáo án "${templateToDelete.ten}" đã được xóa.`, variant: 'destructive' });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể xóa giáo án.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const TemplateList = ({ templates, showOwner }: { templates: ProgramTemplate[], showOwner: boolean }) => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      );
    }
    if (templates.length === 0) {
      return (
        <div className="p-12 text-center text-muted-foreground">
          <p>Không có giáo án nào.</p>
        </div>
      );
    }
    return (
      <ul className="divide-y">
        {templates.map(template => (
          <li key={template.id} className="group">
             <div className="p-4 hover:bg-muted/50 flex justify-between items-center">
                 <Link 
                    href={`/trainer/library/programs/${template.id}${template.ownerType === 'admin' ? '?isPublic=true' : ''}`}
                    className="flex-1"
                 >
                    <div className="flex-1">
                        <p className="font-semibold">{template.ten}</p>
                        <div className="flex items-center gap-2">
                            {showOwner && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${template.ownerType === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{template.ownerType === 'admin' ? 'Kho chung' : 'Của tôi'}</span>}
                            <p className="text-sm text-muted-foreground truncate">{template.moTaNgan || 'Chưa có mô tả'}</p>
                        </div>
                    </div>
                 </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                      <span className="sr-only">Mở menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {template.ownerType === 'trainer' ? (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href={`/trainer/library/programs/${template.id}`}>
                            <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onSelect={() => handleDuplicateTemplate(template)} 
                          disabled={isSubmitting}
                        >
                          <Copy className="mr-2 h-4 w-4" /> Sao chép
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onSelect={() => {
                            setTemplateToDelete(template);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Xóa
                        </DropdownMenuItem>
                      </>
                    ) : (
                       <DropdownMenuItem 
                          onSelect={() => handleDuplicateTemplate(template)} 
                          disabled={isSubmitting}
                        >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Copy className="mr-2 h-4 w-4" />}
                        Sao chép về của tôi
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Quản lý Giáo án mẫu</h1>
        <p className="mt-1 text-muted-foreground">Xem kho giáo án chung và tạo các giáo án của riêng bạn để tái sử dụng.</p>
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
            <div className="flex w-full sm:w-auto gap-2">
                <Button variant="outline" asChild className="flex-1 sm:flex-initial">
                    <Link href="/trainer/library/programs/import">
                        <Upload className="mr-2 h-4 w-4" />
                        Import từ CSV
                    </Link>
                </Button>
                <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
                <DialogTrigger asChild>
                    <Button className="flex-1 sm:flex-initial">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tạo giáo án mới
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Tạo Giáo án mẫu mới</DialogTitle>
                    <DialogDescription>
                        Giáo án này sẽ được lưu vào kho riêng của bạn.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label htmlFor="template-name">Tên giáo án</label>
                        <Input id="template-name" placeholder="Ví dụ: Giáo án tăng cơ 3 buổi/tuần" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="template-desc">Mô tả ngắn (tùy chọn)</label>
                        <Input id="template-desc" placeholder="Mô tả mục tiêu của giáo án này" value={newTemplateDescription} onChange={(e) => setNewTemplateDescription(e.target.value)} />
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
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="public">Kho chung</TabsTrigger>
              <TabsTrigger value="mine">Của tôi</TabsTrigger>
            </TabsList>
            <div className="border rounded-md mt-4">
              <TabsContent value="all" className="m-0">
                <TemplateList templates={filteredTemplates} showOwner={true} />
              </TabsContent>
              <TabsContent value="public" className="m-0">
                <TemplateList templates={filteredTemplates} showOwner={false} />
              </TabsContent>
              <TabsContent value="mine" className="m-0">
                 <TemplateList templates={filteredTemplates} showOwner={false} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn giáo án "{templateToDelete?.ten}". Thao tác này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} disabled={isSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting ? "Đang xóa..." : "Xác nhận Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
