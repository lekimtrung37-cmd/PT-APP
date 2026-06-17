
// Path: src/lib/chatService.ts
import { 
  collection, addDoc, query, where, getDocs, 
  serverTimestamp, doc, updateDoc, writeBatch, Firestore, getDoc, setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, FirebaseStorage, UploadMetadata } from 'firebase/storage';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';


/**
 * Uploads a file to Firebase Storage. This is a generic and robust function.
 * It uses async/await and will throw any errors from the upload process,
 * which should be caught by the calling function.
 *
 * @param storage The FirebaseStorage instance.
 * @param file The file to upload.
 * @param path Optional custom path for the file.
 * @returns A promise that resolves with the file's metadata.
 */
export const uploadFile = async (storage: FirebaseStorage, file: File, path?: string): Promise<{ downloadURL: string; storagePath: string; fileName: string; fileType: string; }> => {
  const storagePath = path || `uploads/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, storagePath);
  const metadata: UploadMetadata = { contentType: file.type };

  // Let uploadBytes throw an error if it fails. The caller must handle it.
  const uploadResult = await uploadBytes(storageRef, file, metadata);
  const downloadURL = await getDownloadURL(uploadResult.ref);
  
  return {
    downloadURL,
    storagePath: uploadResult.ref.fullPath,
    fileName: file.name,
    fileType: file.type,
  };
};


// 2. UPDATED: sendMessage handles new types and metadata
export const sendMessage = async (
  firestore: Firestore,
  conversationId: string, 
  senderId: string, 
  content: string, 
  type: 'text' | 'image' | 'video' | 'file' = 'text',
  metadata: { fileName?: string, fileType?: string } = {}
) => {
  if (!content.trim()) return;

  const conversationRef = doc(firestore, 'conversations', conversationId);
  const messagesColRef = collection(conversationRef, 'messages');
  const newMessageRef = doc(messagesColRef);
  const batch = writeBatch(firestore);

  const messageData = {
    senderId,
    content,
    type,
    createdAt: serverTimestamp(),
    ...metadata, // Add fileName, fileType if they exist
  };

  // 1. Add new message
  batch.set(newMessageRef, messageData);

  // 2. Update last message in conversation
  let lastMessageContent: string;
  switch (type) {
    case 'image':
      lastMessageContent = '[Hình ảnh]';
      break;
    case 'video':
      lastMessageContent = '[Video]';
      break;
    case 'file':
      lastMessageContent = `[Tệp] ${metadata.fileName || 'file'}`;
      break;
    default:
      lastMessageContent = content;
  }
  
  batch.update(conversationRef, {
    lastMessage: { 
      content: lastMessageContent, 
      createdAt: serverTimestamp(),
      senderId 
    },
  });

  try {
      await batch.commit();
  } catch(e) {
      // Create and emit a contextual error for the write operation
      const permissionError = new FirestorePermissionError({
          path: conversationRef.path, // Could be messages subcollection path too
          operation: 'write',
          requestResourceData: { message: messageData, lastMessage: { content: lastMessageContent } }
      });
      errorEmitter.emit('permission-error', permissionError);
  }
};


// 3. (Giữ nguyên hàm getOrCreateConversation)
export const getOrCreateConversation = async (db: Firestore, currentUserId: string, otherUserId: string): Promise<string> => {
    // Create a predictable and unique ID for the conversation
    const conversationId = [currentUserId, otherUserId].sort().join('_');
    const conversationRef = doc(db, 'conversations', conversationId);

    try {
        const conversationSnap = await getDoc(conversationRef);

        if (conversationSnap.exists()) {
            // Conversation already exists
            return conversationSnap.id;
        } else {
            // Conversation does not exist, create it
            const newConversationData = {
                participantIds: [currentUserId, otherUserId].sort(),
                createdAt: serverTimestamp(),
                lastMessage: { content: 'Bắt đầu trò chuyện', createdAt: serverTimestamp() }
            };
            await setDoc(conversationRef, newConversationData);
            return conversationId;
        }
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            // This could be a 'get' or 'set' denial.
            const operation = e.message.includes("does not exist") ? 'get' : 'create';
            const permissionError = new FirestorePermissionError({
                path: `conversations/${conversationId}`,
                operation: operation,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        // Re-throw other errors
        throw e;
    }
};

    
