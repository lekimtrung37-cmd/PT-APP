'use client';
import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  title: string;
  description: string;
  link?: string;
  isRead: boolean;
  createdAt: any; // Firebase Timestamp
}

export default function NotificationsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);
  
  const unreadCount = React.useMemo(() => {
    return notifications?.filter(n => !n.isRead).length || 0;
  }, [notifications]);

  const handleMarkAllAsRead = async () => {
    if (!firestore || !user || !notifications || unreadCount === 0) return;
    const batch = writeBatch(firestore);
    notifications.forEach(n => {
        if (!n.isRead) {
            const notifRef = doc(firestore, 'users', user.uid, 'notifications', n.id);
            batch.update(notifRef, { isRead: true });
        }
    });
    await batch.commit();
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!firestore || !user) return;
    if (!notification.isRead) {
        const notifRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
        await updateDoc(notifRef, { isRead: true });
    }
    if (notification.link) {
        router.push(notification.link);
    }
  }

  return (
    <div className="flex flex-col gap-8">
        <div>
            <h1 className="text-3xl font-bold font-headline">Tất cả thông báo</h1>
            <p className="mt-1 text-muted-foreground">
                Xem lại tất cả các cập nhật và hoạt động của bạn.
            </p>
        </div>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bell className="w-6 h-6" />
                    <CardTitle>Hộp thư đến</CardTitle>
                </div>
                 {unreadCount > 0 && (
                    <Button variant="ghost" onClick={handleMarkAllAsRead}>
                        <CheckCheck className="w-4 h-4 mr-2" />
                        Đánh dấu tất cả đã đọc
                    </Button>
                 )}
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                    </div>
                ) : notifications && notifications.length > 0 ? (
                    <div className="space-y-2">
                        {notifications.map(n => (
                            <button
                                key={n.id}
                                onClick={() => handleNotificationClick(n)}
                                className={cn(
                                    "w-full text-left p-4 rounded-lg border transition-colors",
                                    !n.isRead ? "bg-primary/10 border-primary/20 hover:bg-primary/20" : "bg-card hover:bg-muted/50"
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold">{n.title}</p>
                                    {!n.isRead && <div className="w-2.5 h-2.5 bg-primary rounded-full mt-1.5 flex-shrink-0 ml-4"></div>}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{n.description}</p>
                                <p className="text-xs text-muted-foreground/80 mt-2">
                                    {n.createdAt ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true, locale: vi }) : ''}
                                </p>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="min-h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <Inbox className="w-12 h-12" />
                        <p className="mt-4 font-semibold">Hộp thư của bạn trống</p>
                        <p className="text-sm mt-1">Không có thông báo nào ở đây cả.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
