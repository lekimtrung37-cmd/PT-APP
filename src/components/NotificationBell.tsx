
'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ScrollArea } from './ui/scroll-area';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  title: string;
  description: string;
  link?: string;
  isRead: boolean;
  createdAt: any; // Firebase Timestamp
}

export function NotificationBell() {
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

  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex justify-between items-center">
            <span>Thông báo</span>
             {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-auto p-1 text-xs" onClick={handleMarkAllAsRead}>
                    <CheckCheck className="w-3 h-3 mr-1" />
                    Đánh dấu tất cả đã đọc
                </Button>
            )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {notifications && notifications.length > 0 ? (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                asChild
                className={`flex flex-col items-start gap-1 p-3 ${!n.isRead ? 'bg-blue-500/10' : ''}`}
                onSelect={(e) => {
                  e.preventDefault();
                  handleNotificationClick(n);
                }}
              >
                <div className="w-full">
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.description}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    {n.createdAt ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true, locale: vi }) : ''}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Không có thông báo mới.
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="border-t p-2">
            <DropdownMenuItem asChild>
                <Link href="/notifications" className="justify-center">Xem tất cả</Link>
            </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
