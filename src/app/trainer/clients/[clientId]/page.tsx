

'use client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { getOrCreateConversation } from '@/lib/chatService';
import ChatWindow from '@/components/ChatWindow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import Link from 'next/link';

import OverviewTab from './_components/OverviewTab';
import NutritionTab from './_components/NutritionTab';
import ProfileTab from './_components/ProfileTab';
import ProgressTab from './_components/ProgressTab';
import { PlanTab } from './_components/PlanTab'; 
import { cn } from '@/lib/utils';

type ClientData = {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
  onboardingData?: any;
  ptNote?: string;
  sessions?: {
    remaining: number;
    total: number;
  };
};

export default function ClientDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = params.clientId as string;
  const firestore = useFirestore();
  const { user: trainer, isUserLoading: isTrainerLoading } = useUser();
  const { toast } = useToast();

  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [chatId, setChatId] = React.useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = React.useState(false);
  
  const defaultTab = searchParams.get('tab') || 'overview';

  const clientDocRef = useMemoFirebase(() =>
    firestore && clientId ? doc(firestore, 'users', clientId) : null
  , [firestore, clientId]);
  const { data: client, isLoading: isClientLoading } = useDoc<ClientData>(clientDocRef);

  const handleOpenChat = async () => {
    if (!firestore || !trainer || !client) return;
    setIsChatLoading(true);
    setIsChatOpen(true);
    try {
        const id = await getOrCreateConversation(firestore, trainer.uid, client.id);
        setChatId(id);
    } catch (error) {
        console.error("Failed to initialize chat:", error);
        toast({ variant: "destructive", title: "Lỗi Chat", description: "Không thể bắt đầu cuộc trò chuyện." });
        setIsChatOpen(false);
    } finally {
        setIsChatLoading(false);
    }
  }

  const isLoadingInitial = isClientLoading || isTrainerLoading;

  if (isLoadingInitial) {
    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </div>
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
                <div className="flex flex-col gap-6">
                     <Skeleton className="h-40 w-full" />
                     <Skeleton className="h-40 w-full" />
                </div>
            </div>
        </div>
    );
  }

  if (!client) {
    return <div>Không tìm thấy thông tin khách hàng.</div>;
  }

  if (!trainer) {
    return <div>Đang tải thông tin huấn luyện viên...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-primary">
            <AvatarImage src={client.profileImageUrl} />
            <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
            <h1 className="text-3xl font-bold font-headline">{client.name}</h1>
            <p className="text-muted-foreground">{client.email}</p>
        </div>
        <div className='flex-grow' />
         <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" onClick={handleOpenChat}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Nhắn tin
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] p-0 border-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Nhắn tin với {client.name}</DialogTitle>
                </DialogHeader>
                 {isChatLoading ? (
                    <div className="h-[600px] flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : chatId && trainer ? (
                    <ChatWindow conversationId={chatId} currentUserId={trainer.uid} />
                ) : (
                    <div className="h-[600px] flex flex-col items-center justify-center text-center p-4">
                        <p className='font-semibold'>Không thể tải cuộc trò chuyện.</p>
                        <p className='text-sm text-muted-foreground'>Vui lòng thử lại.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue={defaultTab} className="h-full">
        <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="plan">Kế hoạch</TabsTrigger>
            <TabsTrigger value="nutrition">Dinh dưỡng</TabsTrigger>
            <TabsTrigger value="progress">Tiến độ</TabsTrigger>
            <TabsTrigger value="profile">Hồ sơ</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
            <OverviewTab client={client} trainer={trainer} />
        </TabsContent>
        <TabsContent value="plan" className="mt-6 h-full">
            <PlanTab clientId={client.id} />
        </TabsContent>
        <TabsContent value="nutrition" className="mt-6">
            <NutritionTab clientId={client.id} />
        </TabsContent>
        <TabsContent value="progress" className="mt-6">
            <ProgressTab clientId={client.id} />
        </TabsContent>
        <TabsContent value="profile" className="mt-6">
             <ProfileTab client={client} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
