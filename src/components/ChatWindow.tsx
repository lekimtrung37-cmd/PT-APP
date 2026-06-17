
'use client'
import { useState, useEffect, useRef } from 'react';
import { useFirestore, useStorage } from '@/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { sendMessage, uploadFile } from '@/lib/chatService';
import { Button } from '@/components/ui/button'; 
import { Input } from '@/components/ui/input'; 
import { ScrollArea } from '@/components/ui/scroll-area'; 
import { Image as ImageIcon, Loader2, Send, Paperclip, File as FileIcon } from 'lucide-react';
import Image from 'next/image';

// This component needs the chat room ID and the current user's ID to run
interface Props {
  conversationId: string; 
  currentUserId: string;
}

export default function ChatWindow({ conversationId, currentUserId }: Props) {
  const firestore = useFirestore();
  const storage = useStorage();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Listen for messages from Firebase (Realtime)
  useEffect(() => {
    if (!conversationId || !firestore) return;

    const q = query(
      collection(firestore, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
        console.error("Error listening to messages:", error);
    });

    return () => unsubscribe();
  }, [conversationId, firestore]);

  // 2. Handle send button click
  const handleSendText = async () => {
    if(!inputText.trim() || !firestore) return;
    await sendMessage(firestore, conversationId, currentUserId, inputText, 'text');
    setInputText('');
  };

  // 3. Handle file selection and sending
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage || !firestore) return;

    try {
      setIsUploading(true);
      const { downloadURL, fileName, fileType } = await uploadFile(storage, file, `chat_files/${conversationId}/${Date.now()}_${file.name}`);
      
      let messageType: 'image' | 'video' | 'file' = 'file';
      if (fileType.startsWith('image/')) {
        messageType = 'image';
      } else if (fileType.startsWith('video/')) {
        messageType = 'video';
      }

      await sendMessage(firestore, conversationId, currentUserId, downloadURL, messageType, { fileName, fileType });
    } catch (error) {
      alert("Lỗi tải tệp lên!");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-card shadow-md">
      {/* Header */}
      <div className="p-4 border-b bg-muted/50 font-bold text-lg text-card-foreground flex justify-between items-center">
        <span>Tin nhắn</span>
        {isUploading && <span className="text-xs text-primary flex items-center gap-1"><Loader2 className="animate-spin w-3 h-3"/> Đang gửi...</span>}
      </div>

      {/* Message display area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            let content;
            switch (msg.type) {
                case 'image':
                    content = (
                        <div className="max-w-[70%] p-1 bg-muted rounded-lg">
                            <Image 
                            src={msg.content} 
                            alt={msg.fileName || 'Gửi ảnh'}
                            className="rounded-lg border shadow-sm max-h-[250px] w-auto object-cover"
                            width={300}
                            height={250}
                            loading="lazy"
                            />
                        </div>
                    );
                    break;
                case 'video':
                    content = (
                         <div className="max-w-[80%] rounded-lg overflow-hidden">
                            <video controls src={msg.content} className="max-h-[300px] w-full" />
                         </div>
                    );
                    break;
                 case 'file':
                    content = (
                         <a href={msg.content} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 max-w-[75%] px-4 py-3 rounded-2xl text-sm ${isMe ? 'bg-primary/90 text-primary-foreground' : 'bg-muted/80 text-muted-foreground'} hover:bg-opacity-80`}>
                            <FileIcon className="h-6 w-6 shrink-0" />
                            <span className="truncate">{msg.fileName || 'Tải về tệp'}</span>
                         </a>
                    );
                    break;
                default:
                    content = (
                        <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                            isMe 
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                            {msg.content}
                        </div>
                    );
            }
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                {content}
              </div>
            );
          })}
          <div ref={bottomRef} /> {/* Anchor point to scroll to */}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-3 border-t flex gap-2">
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileSelect}
        />
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Paperclip className="w-5 h-5 text-muted-foreground" />
        </Button>
        <Input 
          value={inputText} 
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nhập tin nhắn..."
          onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
          disabled={isUploading}
        />
        <Button onClick={handleSendText} size="icon" disabled={!inputText.trim() || isUploading}>
            <Send className="w-4 h-4" />
            <span className="sr-only">Gửi</span>
        </Button>
      </div>
    </div>
  );
}
