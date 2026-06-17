
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { getOrCreateConversation } from '@/lib/chatService';
import ChatWindow from '@/components/ChatWindow';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Client = {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
};

export default function TrainerMessagesPage() {
  const firestore = useFirestore();
  const { user: trainer, isUserLoading: isTrainerLoading } = useUser();
  const searchParams = useSearchParams();
  
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  // Fetch all clients assigned to the current trainer
  const clientsQuery = useMemoFirebase(() => {
    if (!trainer || !firestore) return null;
    return query(
      collection(firestore, 'users'),
      where('role', '==', 'user'),
      where('assignedPtId', '==', trainer.uid)
    );
  }, [firestore, trainer]);
  const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);
  
  // Effect to pre-select a client if clientId is in the URL
  React.useEffect(() => {
      const clientIdFromUrl = searchParams.get('clientId');
      if (clientIdFromUrl && clients) {
          const clientToSelect = clients.find(c => c.id === clientIdFromUrl);
          if (clientToSelect) {
              handleSelectClient(clientToSelect);
          }
      }
  }, [searchParams, clients]);


  const handleSelectClient = async (client: Client) => {
    if (!trainer || !firestore) return;
    setSelectedClient(client);
    setIsChatLoading(true);
    setActiveChatId(null);
    try {
      const chatId = await getOrCreateConversation(firestore, trainer.uid, client.id);
      setActiveChatId(chatId);
    } catch (error) {
      console.error("Failed to initialize chat:", error);
      // You might want to show a toast notification here
    } finally {
      setIsChatLoading(false);
    }
  };

  const filteredClients = React.useMemo(() => {
      if (!clients) return [];
      return clients.filter(client => client.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [clients, searchTerm]);
  
  const isLoading = isTrainerLoading || areClientsLoading;

  return (
    <div className="flex flex-col gap-8 h-[calc(100vh-100px)]">
      <div>
        <h1 className="text-3xl font-bold font-headline">Tin nhắn</h1>
        <p className="text-muted-foreground mt-1">
          Trò chuyện và hỗ trợ khách hàng của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 flex-1 border rounded-lg bg-card p-4">
        {/* Client List */}
        <div className="md:col-span-1 lg:col-span-1 flex flex-col gap-4 border-r pr-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Tìm khách hàng..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <ScrollArea className="flex-1">
                <div className="space-y-2">
                    {isLoading ? (
                        Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
                    ) : (
                        filteredClients.map(client => (
                            <button
                                key={client.id}
                                onClick={() => handleSelectClient(client)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                                    selectedClient?.id === client.id ? "bg-muted" : "hover:bg-muted/50"
                                )}
                            >
                                <Avatar>
                                    <AvatarImage src={client.profileImageUrl} />
                                    <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{client.name}</p>
                                    <p className="text-xs text-muted-foreground">{client.email}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>

        {/* Chat Window */}
        <div className="md:col-span-2 lg:col-span-3">
          {selectedClient ? (
            isChatLoading || !activeChatId || !trainer ? (
                <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : (
              <ChatWindow conversationId={activeChatId} currentUserId={trainer.uid} />
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12" />
              <p className="mt-4 font-semibold">Chọn một khách hàng để bắt đầu</p>
              <p className="text-sm">Danh sách các cuộc trò chuyện của bạn sẽ hiển thị ở đây.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
