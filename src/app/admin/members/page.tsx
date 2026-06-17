
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, where, doc, writeBatch, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { createUserWithEmailAndPassword } from 'firebase/auth';


type Member = {
  id: string;
  name: string;
  email: string;
  status: 'Active' | 'Inactive' | 'Pending Activation';
  assignedPtId?: string;
  profileImageUrl?: string;
  role: 'user' | 'pt' | 'admin';
};

type Trainer = {
    id: string;
    name: string;
}

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'Active':
            return 'bg-green-500/20 text-green-700 border-green-500/30';
        case 'Pending Activation':
            return 'bg-orange-500/20 text-orange-700 border-orange-500/30';
        case 'Inactive':
            return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
        default:
            return '';
    }
}

export default function MembersPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { auth } = useFirebase();

  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = React.useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = React.useState(false);
  
  const [selectedMember, setSelectedMember] = React.useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = React.useState<Member | null>(null);
  const [actionType, setActionType] = React.useState<'activate_user' | 'assign_pt' | 'promote_to_pt' | null>(null);
  const [selectedTrainerId, setSelectedTrainerId] = React.useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form state for new member
  const [newMemberName, setNewMemberName] = React.useState('');
  const [newMemberEmail, setNewMemberEmail] = React.useState('');
  const [newMemberPassword, setNewMemberPassword] = React.useState('');

  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterPt, setFilterPt] = React.useState('all');
  const [filterStatus, setFilterStatus] = React.useState('all');

  // --- Firestore Data Fetching ---
  const membersQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'users'), where('role', 'in', ['user', 'pt', 'admin'])) : null
  , [firestore]);
  const { data: members, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);

  const trainersQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'users'), where('role', '==', 'pt')) : null
  , [firestore]);
  const { data: trainers, isLoading: areTrainersLoading } = useCollection<Trainer>(trainersQuery);
  // --- End Firestore Data Fetching ---
  
  const filteredMembers = React.useMemo(() => {
    if (!members) return [];
    return members.filter(member => {
        const nameMatches = member.name.toLowerCase().includes(searchTerm.toLowerCase());
        const ptMatches = filterPt === 'all' ? true : member.assignedPtId === filterPt;
        const statusMatches = filterStatus === 'all' ? true : member.status === filterStatus;
        return nameMatches && ptMatches && statusMatches;
    }).sort((a, b) => {
        // Sort by status: Pending Activation first
        if (a.status === 'Pending Activation' && b.status !== 'Pending Activation') return -1;
        if (a.status !== 'Pending Activation' && b.status === 'Pending Activation') return 1;
        return a.name.localeCompare(b.name);
    });
  }, [members, searchTerm, filterPt, filterStatus]);


  const handleOpenDialog = (member: Member, type: 'activate_user' | 'assign_pt' | 'promote_to_pt') => {
    setSelectedMember(member);
    setActionType(type);
    setSelectedTrainerId(member.assignedPtId || undefined); // Reset selection
    setIsAssignDialogOpen(true);
  }
  
  const handleDialogSubmit = async () => {
    if (!selectedMember || !firestore) {
       toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng chọn một thành viên hoặc dịch vụ chưa sẵn sàng." });
      return;
    }
    
    setIsSubmitting(true);

    try {
        const userDocRef = doc(firestore, 'users', selectedMember.id);
        const batch = writeBatch(firestore);

        if (actionType === 'promote_to_pt') {
            // Nâng cấp user thành PT
            batch.update(userDocRef, {
                role: 'pt',
                status: 'Active'
            });
            const trainerProfileRef = doc(firestore, 'trainerProfiles', selectedMember.id);
            batch.set(trainerProfileRef, {
                id: selectedMember.id,
                userId: selectedMember.id,
                name: selectedMember.name, // Add name
                email: selectedMember.email, // Add email
                profileImageUrl: selectedMember.profileImageUrl, // Add profile image
                specialty: 'Chưa xác định', // Admin can edit this later
                createdAt: new Date().toISOString(),
                bio: '',
                clientIds: [],
            });
            toast({
                title: "Thành công!",
                description: `Đã nâng cấp ${selectedMember.name} thành Huấn luyện viên.`,
            });
        } else if (actionType === 'activate_user') {
            // Kích hoạt user và gán PT
            if (!selectedTrainerId) {
                toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng chọn một PT." });
                setIsSubmitting(false);
                return;
            }
            batch.update(userDocRef, {
                assignedPtId: selectedTrainerId,
                status: 'Active'
            });
            toast({
                title: "Thành công!",
                description: `Đã kích hoạt và gán PT cho ${selectedMember.name}.`,
            });
        } else if (actionType === 'assign_pt') {
             // Chỉ gán PT
             if (!selectedTrainerId) {
                toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng chọn một PT." });
                setIsSubmitting(false);
                return;
            }
            batch.update(userDocRef, { assignedPtId: selectedTrainerId });
            toast({
                title: "Thành công!",
                description: `Đã gán PT mới cho ${selectedMember.name}.`,
            });
        }

        await batch.commit();

    } catch (error) {
        console.error("Error updating user:", error);
        toast({
            variant: "destructive",
            title: "Đã xảy ra lỗi",
            description: "Không thể cập nhật thông tin. Vui lòng thử lại.",
        });
    } finally {
        setIsAssignDialogOpen(false);
        setIsSubmitting(false);
    }
  }


  const handleCreateMember = async () => {
    if (!newMemberName || !newMemberEmail || !newMemberPassword) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng điền đầy đủ thông tin." });
      return;
    }
     if (!auth || !firestore) {
        toast({ variant: "destructive", title: "Lỗi", description: "Dịch vụ Firebase không khả dụng." });
        return;
    }
    setIsSubmitting(true);
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, newMemberEmail, newMemberPassword);
        const user = userCredential.user;

        const userDocRef = doc(firestore, 'users', user.uid);
        const newUserProfile = {
            id: user.uid,
            email: newMemberEmail,
            name: newMemberName,
            role: 'user', // Always create as a regular user first
            status: 'Pending Activation',
            profileImageUrl: `https://picsum.photos/seed/${newMemberEmail}/40/40`,
        };
        
        await setDoc(userDocRef, newUserProfile);

        toast({ title: "Thành công!", description: "Tài khoản thành viên đã được tạo và đang chờ kích hoạt." });
        
        setIsAddMemberDialogOpen(false);
        setNewMemberName('');
        setNewMemberEmail('');
        setNewMemberPassword('');

    } catch (error: any) {
         let errorMessage = "Đã xảy ra lỗi khi tạo tài khoản.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "Địa chỉ email này đã được sử dụng.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "Mật khẩu quá yếu. Vui lòng chọn mật khẩu khác."
        }
        toast({
            variant: "destructive",
            title: "Tạo tài khoản thất bại",
            description: errorMessage,
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleConfirmDelete = async () => {
    if (!memberToDelete || !firestore) return;

    setIsSubmitting(true);
    try {
        const userDocRef = doc(firestore, 'users', memberToDelete.id);
        await deleteDoc(userDocRef);
        toast({
            title: "Đã xóa hồ sơ người dùng!",
            description: `Đã xóa hồ sơ của ${memberToDelete.name} khỏi cơ sở dữ liệu.`,
            variant: 'destructive',
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Lỗi',
            description: 'Không thể xóa hồ sơ người dùng.',
        });
    } finally {
        setIsSubmitting(false);
        setIsConfirmDeleteOpen(false);
        setMemberToDelete(null);
    }
  }


  const getTrainerName = (trainerId?: string) => {
    if (!trainerId || !trainers) return 'Chưa gán';
    return trainers?.find(t => t.id === trainerId)?.name || 'Không rõ';
  }

  const isLoading = areMembersLoading || areTrainersLoading;

  const renderDialogContent = () => {
    const titleMap = {
        activate_user: 'Kích hoạt & Gán PT',
        assign_pt: 'Gán PT cho thành viên',
        promote_to_pt: 'Nâng cấp thành Huấn luyện viên'
    }
    const descriptionMap = {
        activate_user: `Kích hoạt tài khoản cho ${selectedMember?.name} và gán một PT để bắt đầu.`,
        assign_pt: `Chọn một PT mới để gán cho ${selectedMember?.name}.`,
        promote_to_pt: `Xác nhận nâng cấp ${selectedMember?.name} thành Huấn luyện viên. Thao tác này không thể hoàn tác.`
    }
    const buttonTextMap = {
        activate_user: 'Xác nhận Kích hoạt',
        assign_pt: 'Lưu thay đổi',
        promote_to_pt: 'Xác nhận Nâng cấp'
    }

    return (
         <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>
                     {actionType ? titleMap[actionType] : ''}
                </DialogTitle>
                <DialogDescription>
                    {actionType ? descriptionMap[actionType] : ''}
                </DialogDescription>
            </DialogHeader>
            { (actionType === 'activate_user' || actionType === 'assign_pt') && (
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="trainer" className="text-right">
                            Gán PT
                        </Label>
                        <Select onValueChange={setSelectedTrainerId} value={selectedTrainerId}>
                            <SelectTrigger id="trainer" className="col-span-3">
                                <SelectValue placeholder="Chọn một PT" />
                            </SelectTrigger>
                            <SelectContent>
                            {trainers?.map(trainer => (
                                    <SelectItem key={trainer.id} value={trainer.id}>
                                        {trainer.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button type="button" onClick={handleDialogSubmit} disabled={isSubmitting || (actionType !== 'promote_to_pt' && !selectedTrainerId)}>
                    {isSubmitting ? 'Đang lưu...' : (actionType ? buttonTextMap[actionType] : 'Lưu')}
                </Button>
            </DialogFooter>
         </DialogContent>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Quản lý Thành viên & PT</h1>
        <p className="mt-1 text-muted-foreground">
          Xem, thêm và quản lý tất cả thành viên và PT trong hệ thống.
        </p>
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                 <div>
                    <CardTitle>Danh sách Người dùng</CardTitle>
                    <CardDescription>
                    {isLoading ? 'Đang tải...' : `Hiện có ${members?.length || 0} người dùng trong hệ thống.`}
                    </CardDescription>
                </div>
                <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Thêm thành viên mới
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Tạo tài khoản thành viên mới</DialogTitle>
                      <DialogDescription>
                        Điền thông tin chi tiết để tạo tài khoản cho thành viên mới. Họ sẽ ở trạng thái chờ cho đến khi bạn kích hoạt.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                       <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Họ và Tên
                        </Label>
                        <Input id="name" placeholder="Ví dụ: An Nguyễn" className="col-span-3" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} disabled={isSubmitting} />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                          Email
                        </Label>
                        <Input id="email" type="email" placeholder="thanhvien@email.com" className="col-span-3" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} disabled={isSubmitting}/>
                      </div>
                       <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">
                          Mật khẩu
                        </Label>
                        <Input id="password" type="password" placeholder="Tạo mật khẩu tạm thời" className="col-span-3" value={newMemberPassword} onChange={e => setNewMemberPassword(e.target.value)} disabled={isSubmitting}/>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" onClick={handleCreateMember} disabled={isSubmitting}>
                        {isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản thành viên'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
            </div>
            <div className="mt-6 flex flex-col md:flex-row md:items-center gap-4">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Tìm kiếm người dùng..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center gap-4">
                    <Select value={filterPt} onValueChange={setFilterPt} disabled={areTrainersLoading}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Lọc theo PT" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả PT</SelectItem>
                            {trainers?.map(trainer => (
                                <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Lọc theo trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả trạng thái</SelectItem>
                            <SelectItem value="Pending Activation">Pending Activation</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên người dùng</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>PT Phụ trách</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div>
                                    <Skeleton className="h-4 w-24 mb-2" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                ))
              ) : filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.profileImageUrl || `https://picsum.photos/seed/${member.id}/40/40`} />
                        <AvatarFallback>
                          {member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                      <Badge variant={member.role === 'pt' ? 'default' : (member.role === 'admin' ? 'destructive' : 'secondary')}>
                          {member.role === 'pt' ? 'PT' : (member.role === 'admin' ? 'Admin' : 'Thành viên')}
                      </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                       variant={member.status !== 'Active' ? 'secondary' : 'default'}
                       className={getStatusBadgeClass(member.status)}
                    >
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{getTrainerName(member.assignedPtId)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={member.role === 'admin'}>
                          <span className="sr-only">Mở menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                         <DropdownMenuItem asChild>
                            <Link href={`/admin/members/${member.id}`}>Xem chi tiết</Link>
                        </DropdownMenuItem>
                        {member.status === 'Pending Activation' && (
                            <>
                                <DropdownMenuItem onSelect={() => handleOpenDialog(member, 'activate_user')}>
                                    Kích hoạt & Gán PT
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleOpenDialog(member, 'promote_to_pt')}>
                                    Nâng cấp thành PT
                                </DropdownMenuItem>
                            </>
                        )}
                        {member.status === 'Active' && member.role === 'user' && (
                            <DropdownMenuItem onSelect={() => handleOpenDialog(member, 'assign_pt')}>
                                Gán / Đổi PT
                            </DropdownMenuItem>
                        )}
                         {member.role !== 'admin' && (
                             <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onSelect={() => { setMemberToDelete(member); setIsConfirmDeleteOpen(true); }}>
                                    Xóa người dùng (Chỉ trong App)
                                </DropdownMenuItem>
                             </>
                         )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
               {!isLoading && filteredMembers.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        Không tìm thấy người dùng nào.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
         {renderDialogContent()}
     </Dialog>

     <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa hồ sơ người dùng?</AlertDialogTitle>
            <AlertDialogDescription>
                Hành động này sẽ xóa vĩnh viễn hồ sơ của <strong>{memberToDelete?.name}</strong> khỏi cơ sở dữ liệu ứng dụng. Thao tác này không thể hoàn tác.
                <br/><br/>
                <strong>Quan trọng:</strong> Hành động này KHÔNG xóa tài khoản đăng nhập của họ. Bạn vẫn cần xóa tài khoản của họ trong mục <strong>Authentication</strong> trên Bảng điều khiển Firebase.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToDelete(null)}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận Xóa'}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
