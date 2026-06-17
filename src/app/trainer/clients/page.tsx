
'use client';
import * as React from 'react';
import Link from 'next/link';
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
  User,
  FilePenLine,
  MessageSquare,
  BarChart,
  CalendarDays,
  Repeat,
  Trash2,
  UserX,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInDays, formatDistanceToNow, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type Client = {
  id: string;
  name: string;
  email: string;
  status: 'Active' | 'Inactive' | 'Needs Attention';
  profileImageUrl?: string;
  sessions?: {
    remaining: number;
    total: number;
  };
  lastActivity?: string; // ISO date string
};

const getStatus = (client: Client): 'Active' | 'Needs Attention' | 'Inactive' => {
    if (client.status === 'Inactive') return 'Inactive';
    if (client.lastActivity && differenceInDays(new Date(), parseISO(client.lastActivity)) > 7) {
        return 'Needs Attention';
    }
    return 'Active';
}

const getStatusBadgeClass = (status: 'Active' | 'Needs Attention' | 'Inactive') => {
    switch (status) {
        case 'Active':
            return 'bg-green-100 text-green-800 border-green-200';
        case 'Needs Attention':
            return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'Inactive':
            return 'bg-gray-100 text-gray-800 border-gray-200';
        default:
            return '';
    }
}


export default function ClientsPage() {
  const { user: trainer, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [sortOrder, setSortOrder] = React.useState('lastActivity_desc');

  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [clientToAction, setClientToAction] = React.useState<Client | null>(null);
  const [actionType, setActionType] = React.useState<'deactivate' | 'delete' | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);


  const clientsQuery = useMemoFirebase(() => {
    if (!trainer || !firestore) return null;
    return query(
      collection(firestore, 'users'),
      where('role', '==', 'user'),
      where('assignedPtId', '==', trainer.uid)
    );
  }, [firestore, trainer]);
  
  const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);
  const isLoading = isUserLoading || areClientsLoading;


  const processedClients = React.useMemo(() => {
    if (!clients) return [];

    return clients
      .map(client => ({
        ...client,
        status: getStatus(client),
      }))
      .filter(client => {
        const searchMatch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'all' || client.status === statusFilter;
        return searchMatch && statusMatch;
      })
      .sort((a, b) => {
        const [sortBy, direction] = sortOrder.split('_');
        
        let compareA: any;
        let compareB: any;

        switch (sortBy) {
            case 'name':
                compareA = a.name;
                compareB = b.name;
                break;
            case 'sessions':
                compareA = a.sessions?.remaining ?? Infinity;
                compareB = b.sessions?.remaining ?? Infinity;
                break;
            case 'lastActivity':
                compareA = a.lastActivity ? parseISO(a.lastActivity).getTime() : 0;
                compareB = b.lastActivity ? parseISO(b.lastActivity).getTime() : 0;
                break;
            default:
                return 0;
        }
        
        if (direction === 'asc') {
            return compareA > compareB ? 1 : -1;
        } else {
            return compareA < compareB ? 1 : -1;
        }
      });
  }, [clients, searchTerm, statusFilter, sortOrder]);
  
  const handleOpenConfirmDialog = (client: Client, type: 'deactivate' | 'delete') => {
      setClientToAction(client);
      setActionType(type);
      setIsConfirmOpen(true);
  }

  const handleConfirmAction = async () => {
    if (!clientToAction || !actionType || !firestore) return;

    setIsSubmitting(true);
    
    try {
        if (actionType === 'deactivate') {
            const clientRef = doc(firestore, 'users', clientToAction.id);
            await updateDoc(clientRef, { status: 'Inactive' });
            toast({
                title: "Thành công",
                description: `Đã vô hiệu hóa tài khoản của ${clientToAction.name}.`
            });
        } else if (actionType === 'delete') {
            const clientRef = doc(firestore, 'users', clientToAction.id);
            await deleteDoc(clientRef);
            toast({
                title: "Đã xóa khách hàng",
                description: `Hồ sơ của ${clientToAction.name} đã được xóa.`,
                variant: 'destructive'
            });
        }
    } catch(error) {
         toast({
            variant: "destructive",
            title: "Đã có lỗi xảy ra",
            description: "Không thể thực hiện hành động này. Vui lòng thử lại.",
        });
    } finally {
        setIsSubmitting(false);
        setIsConfirmOpen(false);
    }
  }


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-gray-900">Quản lý Khách hàng</h1>
            <p className="mt-1 text-gray-500 font-normal">
            Xem và quản lý tất cả khách hàng được gán cho bạn.
            </p>
        </div>
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Tìm kiếm khách hàng..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Lọc trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả Trạng thái</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Needs Attention">Needs Attention</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                         <SelectValue placeholder="Sắp xếp theo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="lastActivity_desc">Hoạt động gần nhất</SelectItem>
                        <SelectItem value="name_asc">Tên (A-Z)</SelectItem>
                        <SelectItem value="sessions_asc">Buổi tập còn lại (Thấp-Cao)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-5 w-full" />
                            </CardContent>
                            <CardFooter>
                                 <Skeleton className="h-8 w-full" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : processedClients && processedClients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {processedClients.map((client) => (
                        <Card key={client.id} className="flex flex-col hover:shadow-lg transition-shadow">
                             <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                                <Link href={`/trainer/clients/${client.id}`} className="flex items-center gap-3 group flex-1">
                                    <Avatar className="h-12 w-12 border">
                                        <AvatarImage src={client.profileImageUrl || `https://picsum.photos/seed/${client.id}/48/48`} />
                                        <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="font-semibold text-base group-hover:text-primary transition-colors">{client.name}</div>
                                        <div className="text-sm text-muted-foreground truncate">{client.email}</div>
                                    </div>
                                </Link>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Mở menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                                        <DropdownMenuItem asChild><Link href={`/trainer/clients/${client.id}`}><User className="mr-2 h-4 w-4" />Xem chi tiết</Link></DropdownMenuItem>
                                        <DropdownMenuItem asChild><Link href={`/trainer/clients/${client.id}/plan`}><FilePenLine className="mr-2 h-4 w-4" />Chỉnh sửa kế hoạch</Link></DropdownMenuItem>
                                        <DropdownMenuItem asChild><Link href={`/trainer/clients/${client.id}/progress`}><BarChart className="mr-2 h-4 w-4" />Xem tiến độ</Link></DropdownMenuItem>
                                        <DropdownMenuItem asChild><Link href={`/trainer/messages?clientId=${client.id}`}><MessageSquare className="mr-2 h-4 w-4" />Gửi tin nhắn</Link></DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => handleOpenConfirmDialog(client, 'deactivate')}>
                                            <UserX className="mr-2 h-4 w-4" />
                                            Vô hiệu hóa
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleOpenConfirmDialog(client, 'delete')} className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Xóa khách hàng
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm flex-grow">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Trạng thái</span>
                                    <Badge variant={'outline'} className={getStatusBadgeClass(client.status)}>
                                        {client.status}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-1.5"><Repeat className="w-3.5 h-3.5"/>Buổi còn lại</span>
                                    <span className="font-semibold">{client.sessions ? `${client.sessions.remaining} / ${client.sessions.total}` : 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                     <span className="text-muted-foreground flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5"/>Hoạt động cuối</span>
                                     <span className="font-semibold">{typeof client.lastActivity === 'string' ? formatDistanceToNow(parseISO(client.lastActivity), { addSuffix: true, locale: vi }) : 'Chưa có'}</span>
                                </div>
                            </CardContent>
                             <CardFooter>
                                <Button asChild variant="outline" className="w-full">
                                    <Link href={`/trainer/clients/${client.id}`}>Quản lý Khách hàng</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-24 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Không tìm thấy khách hàng nào phù hợp.</p>
                </div>
              )}
        </CardContent>
      </Card>
        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận {actionType === 'delete' ? 'Xóa' : 'Vô hiệu hóa'}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {actionType === 'delete' ?
                            `Hành động này sẽ xóa vĩnh viễn hồ sơ của ${clientToAction?.name}. Thao tác này không thể hoàn tác và không xóa tài khoản đăng nhập.` :
                            `Bạn có chắc muốn vô hiệu hóa tài khoản của ${clientToAction?.name}? Khách hàng sẽ không thể truy cập cho đến khi được Admin kích hoạt lại.`
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleConfirmAction} 
                        disabled={isSubmitting} 
                        className={actionType === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}>
                        {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
