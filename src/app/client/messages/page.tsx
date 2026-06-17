
'use client';
import { useEffect, useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { getOrCreateConversation } from '@/lib/chatService';
import ChatWindow from '@/components/ChatWindow';
import { Skeleton } from '@/components/ui/skeleton';
import { doc } from 'firebase/firestore';

type UserProfile = {
  id: string;
  assignedPtId?: string;
}

export default function ClientMessagesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [chatId, setChatId] = useState<string | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(true);

  // Fetch the current user's profile to get their assigned PT
  const userProfileRef = useMemoFirebase(() => 
    firestore && user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    const initChat = async () => {
      // Ensure all required data is available
      if (user && firestore && userProfile && userProfile.assignedPtId) {
        setIsLoadingChat(true);
        try {
            const id = await getOrCreateConversation(firestore, user.uid, userProfile.assignedPtId);
            setChatId(id);
        } catch (error) {
            console.error("Failed to initialize chat:", error);
        } finally {
            setIsLoadingChat(false);
        }
      } else if (!isProfileLoading && !userProfile?.assignedPtId) {
          // Handle case where user has no assigned PT
          setIsLoadingChat(false);
      }
    };
    initChat();
  }, [user, firestore, userProfile, isProfileLoading]);

  const isLoading = isUserLoading || isProfileLoading || isLoadingChat;

  return (
    <div className="flex flex-col gap-8 h-[calc(100vh-100px)]">
      <div>
        <h1 className="text-3xl font-bold font-headline">Tin nhắn</h1>
        <p className="text-muted-foreground mt-1">
          Trò chuyện trực tiếp với Huấn luyện viên của bạn.
        </p>
      </div>
      
      <div className="flex-1">
        {isLoading ? (
          <div className="w-full h-full max-w-[500px] mx-auto">
              <p className='text-sm text-muted-foreground mb-2'>Đang tải đoạn chat...</p>
              <Skeleton className="h-full w-full" />
          </div>
        ) : chatId && user ? (
          <div className="w-full h-full max-w-[500px] mx-auto">
            <ChatWindow conversationId={chatId} currentUserId={user.uid} />
          </div>
        ) : (
          <div className="w-full h-full max-w-[500px] mx-auto flex items-center justify-center text-center border rounded-lg bg-card">
            <p className='text-muted-foreground'>Bạn chưa được gán cho PT nào hoặc không thể tải đoạn chat.</p>
          </div>
        )}
      </div>
    </div>
  );
}

    