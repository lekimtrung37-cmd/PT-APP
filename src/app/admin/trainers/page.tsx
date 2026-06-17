

'use client';
import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  Search,
  UserPlus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, query, writeBatch, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Combined type for a trainer with data from both collections
type Trainer = {
    id: string; // This will be the user ID
    name: string;
    email: string;
    status: 'Active' | 'Inactive';
    profileImageUrl?: string;
    specialty?: string;
    createdAt: string; 
};

// Component to fetch user details for a given trainer profile
const TrainerRow: React.FC<{ trainerProfile: any, onEdit: (trainer: Trainer) => void, onActivate: (trainer: Trainer) => void, onDeactivate: (trainer: Trainer) => void }> = ({ trainerProfile, onEdit, onActivate, onDeactivate }) => {
    const firestore = useFirestore();
    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !trainerProfile?.userId) return null;
        return doc(firestore, 'users', trainerProfile.userId);
    }, [firestore, trainerProfile]);

    const { data: userData, isLoading: isUserLoading } = useDoc(userDocRef);

    if (isUserLoading || !userData) {
         return (
            <TableRow>
                <TableCell>
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                           <Skeleton className="h-4 w-32" />
                           <Skeleton className="h-3 w-40" />
                        </div>
                       </div>
                </TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
            </TableRow>
        );
    }
    
    const trainer: Trainer = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        status: userData.status || 'Inactive',
        profileImageUrl: userData.profileImageUrl,
        specialty: trainerProfile.specialty,
        createdAt: trainerProfile.createdAt,
    };

    return (
         <TableRow key={trainer.id}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={trainer.profileImageUrl || `https://picsum.photos/seed/${trainer.id}/40/40`} />
                <AvatarFallback>
                  {trainer.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{trainer.name}</div>
                <div className="text-sm text-muted-foreground">
                  {trainer.email}
                </div>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <Badge
              variant={
                trainer.status === 'Active' ? 'default' : 'secondary'
              }
              className={
                trainer.status === 'Active' ? 'bg-green-500/20 text-green-700 border-green-500/30' : 
                trainer.status === 'Inactive' ? 'bg-gray-500/20 text-gray-700 border-gray-500/30' : ''
              }
            >
              {trainer.status}
            </Badge>
          </TableCell>
          <TableCell>{trainer.specialty || 'N/A'}</TableCell>
           <TableCell>
            {trainer.createdAt ? new Date(trainer.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
          </TableCell>
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Mở menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                {trainer.status === 'Active' ? (
                    <>
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/trainers/${trainer.id}/performance`}>Xem hiệu suất</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onEdit(trainer)}>Chỉnh sửa</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => onDeactivate(trainer)} className="text-red-600">Vô hiệu hóa</DropdownMenuItem>
                    </>
                ) : (
                    <DropdownMenuItem onSelect={() => onActivate(trainer)}>Kích hoạt tài khoản</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
    );
};


export default function TrainersPage() {
  const { toast } = useToast();
  const { auth } = useFirebase();
  const firestore = useFirestore();
  
  const trainersQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, "trainerProfiles"));
  }, [firestore]);

  const { data: trainerProfiles, isLoading: areTrainersLoading } = useCollection(trainersQuery);

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [selectedTrainer, setSelectedTrainer] = React.useState<Trainer | null>(null);
  const [actionToConfirm, setActionToConfirm] = React.useState<'activate' | 'deactivate' | null>(null);


  // State for add dialog
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [specialty, setSpecialty] = React.useState('');

  // State for edit dialog
  const [editName, setEditName] = React.useState('');
  const [editSpecialty, setEditSpecialty] = React.useState('');


  const handleOpenEditDialog = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setEditName(trainer.name);
    setEditSpecialty(trainer.specialty || '');
    setIsEditDialogOpen(true);
  };
  
  const handleOpenConfirmDialog = (trainer: Trainer, action: 'activate' | 'deactivate') => {
      setSelectedTrainer(trainer);
      setActionToConfirm(action);
      setIsConfirmDialogOpen(true);
  }


  const handleCreateTrainer = async () => {
    if (!name || !email || !password || !specialty) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin.",
      });
      return;
    }
    if (!auth || !firestore) {
        toast({ variant: "destructive", title: "Lỗi", description: "Dịch vụ Firebase không khả dụng." });
        return;
    }

    setIsSubmitting(true);
    try {
        // Create user in Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newAuthUser = userCredential.user;

        // Prepare documents for batch write
        const userDocRef = doc(firestore, "users", newAuthUser.uid);
        const trainerProfileDocRef = doc(firestore, "trainerProfiles", newAuthUser.uid);
        
        const profileImageUrl = `https://picsum.photos/seed/${email}/40/40`;

        const newUserDoc = {
            id: newAuthUser.uid,
            email: email,
            name: name,
            role: 'pt',
            status: 'Active',
            isNew: true, // Flag for first-time password change
            profileImageUrl,
        };

        const newTrainerProfile = {
            id: newAuthUser.uid,
            userId: newAuthUser.uid,
            name: name,
            email: email,
            profileImageUrl,
            specialty: specialty,
            createdAt: new Date().toISOString(),
            bio: '',
            clientIds: [],
        };
        
        // Use a batch to write both documents atomically
        const batch = writeBatch(firestore);
        batch.set(userDocRef, newUserDoc);
        batch.set(trainerProfileDocRef, newTrainerProfile);
        
        await batch.commit();
        
        toast({
          title: "Thành công!",
          description: "Đã tạo tài khoản PT. Hãy gửi mật khẩu cho họ.",
        });
        
        setIsAddDialogOpen(false);
        setName(''); setEmail(''); setPassword(''); setSpecialty('');
    } catch (error: any) {
        let errorMessage = "Đã xảy ra lỗi khi tạo tài khoản PT.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "Địa chỉ email này đã được sử dụng.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "Mật khẩu quá yếu. Vui lòng chọn mật khẩu khác."
        } else {
             // For permission errors caught on the client
            errorMessage = "Lỗi phân quyền. Đảm bảo bạn có quyền Admin."
        }
        toast({
            variant: "destructive",
            title: "Tạo tài khoản thất bại",
            description: errorMessage,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleUpdateTrainer = async () => {
    if (!selectedTrainer || !firestore) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không có PT nào được chọn.' });
      return;
    }
    if (!editName || !editSpecialty) {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Tên và chuyên môn không được để trống.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const batch = writeBatch(firestore);

        const userDocRef = doc(firestore, 'users', selectedTrainer.id);
        batch.update(userDocRef, {
            name: editName,
        });

        const trainerProfileDocRef = doc(firestore, 'trainerProfiles', selectedTrainer.id);
        batch.update(trainerProfileDocRef, {
            name: editName,
            specialty: editSpecialty,
        });

        await batch.commit();

        toast({
            title: 'Thành công!',
            description: `Đã cập nhật thông tin cho ${editName}.`,
        });
        setIsEditDialogOpen(false);
        setSelectedTrainer(null);
    } catch (error) {
        console.error('Error updating trainer:', error);
        toast({
            variant: 'destructive',
            title: 'Lỗi',
            description: 'Không thể cập nhật thông tin. Vui lòng thử lại.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedTrainer || !actionToConfirm || !firestore) return;
    
    setIsSubmitting(true);
    const newStatus = actionToConfirm === 'activate' ? 'Active' : 'Inactive';

    try {
        const userDocRef = doc(firestore, 'users', selectedTrainer.id);
        await updateDoc(userDocRef, { status: newStatus });
        toast({
            title: "Thành công!",
            description: `Đã ${newStatus === 'Active' ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản của ${selectedTrainer.name}.`
        });
    } catch (error) {
         toast({
            variant: "destructive",
            title: "Lỗi!",
            description: "Không thể cập nhật trạng thái tài khoản."
        });
    } finally {
        setIsSubmitting(false);
        setIsConfirmDialogOpen(false);
        setSelectedTrainer(null);
        setActionToConfirm(null);
    }
  }
  

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Quản lý Huấn luyện viên</h1>
        <p className="mt-1 text-muted-foreground">
          Xem, thêm và quản lý các huấn luyện viên trong hệ thống.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Danh sách Huấn luyện viên</CardTitle>
            <CardDescription>
              Hiện có {areTrainersLoading ? '...' : trainerProfiles?.length || 0} huấn luyện viên trong hệ thống.
            </CardDescription>
          </div>
           <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Thêm PT mới
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Tạo tài khoản PT mới</DialogTitle>
                  <DialogDescription>
                    Điền thông tin chi tiết để tạo tài khoản cho huấn luyện viên mới.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="add-name" className="text-right">
                      Họ và Tên
                    </Label>
                    <Input id="add-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Alex Pham" className="col-span-3" disabled={isSubmitting} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="add-email" className="text-right">
                      Email
                    </Label>
                    <Input id="add-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pt@kimtrung.com" className="col-span-3" disabled={isSubmitting} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="add-specialty" className="text-right">
                      Chuyên môn
                    </Label>
                    <Input id="add-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ví dụ: Strength & Conditioning" className="col-span-3" disabled={isSubmitting} />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="add-password" className="text-right">
                      Mật khẩu
                    </Label>
                    <Input id="add-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tạo mật khẩu tạm thời" className="col-span-3" disabled={isSubmitting} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleCreateTrainer} disabled={isSubmitting}>
                    {isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản PT'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
           <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Tìm kiếm PT..." className="pl-9" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên PT</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Chuyên môn</TableHead>
                <TableHead>Ngày tham gia</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areTrainersLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                ))
              ) : trainerProfiles?.map((profile) => (
                  <TrainerRow 
                    key={profile.id} 
                    trainerProfile={profile} 
                    onEdit={handleOpenEditDialog} 
                    onActivate={(trainer) => handleOpenConfirmDialog(trainer, 'activate')}
                    onDeactivate={(trainer) => handleOpenConfirmDialog(trainer, 'deactivate')}
                    />
              ))}
               {!areTrainersLoading && trainerProfiles?.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        Không có huấn luyện viên nào trong hệ thống.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin PT</DialogTitle>
            <DialogDescription>
              Cập nhật chi tiết cho {selectedTrainer?.name}. Nhấn lưu khi bạn hoàn tất.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Họ và Tên
              </Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} className="col-span-3" disabled={isSubmitting} />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-specialty" className="text-right">
                Chuyên môn
              </Label>
              <Input id="edit-specialty" value={editSpecialty} onChange={(e) => setEditSpecialty(e.target.value)} className="col-span-3" disabled={isSubmitting} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleUpdateTrainer} disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hành động</AlertDialogTitle>
            <AlertDialogDescription>
                Bạn có chắc chắn muốn {actionToConfirm === 'activate' ? 'kích hoạt lại' : 'vô hiệu hóa'} tài khoản của PT <strong>{selectedTrainer?.name}</strong>?
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} disabled={isSubmitting} className={actionToConfirm === 'deactivate' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
