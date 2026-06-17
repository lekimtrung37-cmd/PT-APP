
'use client';
import * as React from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, PlusCircle, Trash2, Utensils, Check, X, BookHeart, Send } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp, doc, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { getLocalDateString } from '@/lib/utils';

// --- TYPE DEFINITIONS ---
interface NutritionPlanItem {
    id: string;
    type: 'meal' | 'habit';
    time: string;
    description: string;
}

// --- SUB-COMPONENTS ---
const itemIcons = {
    meal: Utensils,
    habit: Utensils,
};

const EditableTimelineItem: React.FC<{
    item: NutritionPlanItem;
    onUpdate: (id: string, newTime: string, newDescription: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onAssignTask: (title: string) => Promise<void>;
}> = ({ item, onUpdate, onDelete, onAssignTask }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [time, setTime] = React.useState(item.time);
    const [description, setDescription] = React.useState(item.description);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isAssigning, setIsAssigning] = React.useState(false);

    const handleSave = async () => {
        setIsSubmitting(true);
        await onUpdate(item.id, time, description);
        setIsEditing(false);
        setIsSubmitting(false);
    };

    const handleCancel = () => {
        setTime(item.time);
        setDescription(item.description);
        setIsEditing(false);
    };

    const handleAssignClick = async () => {
        setIsAssigning(true);
        await onAssignTask(item.description);
        setIsAssigning(false);
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
        if (e.key === 'Escape') {
            handleCancel();
        }
    };
    
    const Icon = itemIcons[item.type as keyof typeof itemIcons] || Utensils;

    return (
        <div className="relative flex items-start gap-4 group">
            <div className="absolute left-9 top-4 h-3 w-3 rounded-full bg-primary border-2 border-background -translate-x-1/2 z-10"></div>
            <div className="flex items-center gap-4 text-sm font-semibold text-muted-foreground w-28 pt-2">
                {isEditing ? (
                    <Input
                        type="time" 
                        value={time} 
                        onChange={(e) => setTime(e.target.value)}
                        className="h-9"
                        onKeyDown={handleKeyDown}
                        disabled={isSubmitting}
                    />
                ) : (
                    <>
                        <Icon className="w-5 h-5 text-primary" />
                        <span onClick={() => setIsEditing(true)} className="cursor-pointer">{item.time}</span>
                    </>
                )}
            </div>
            <div className="flex-1 p-3 bg-secondary rounded-lg flex items-start justify-between gap-2">
                {isEditing ? (
                    <>
                        <Textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-background min-h-[60px]"
                            onKeyDown={handleKeyDown}
                            disabled={isSubmitting}
                            autoFocus
                        />
                        <div className="flex flex-col gap-2 pt-1">
                            <Button size="icon" className="h-7 w-7 bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancel} disabled={isSubmitting}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <p onClick={() => setIsEditing(true)} className="font-medium text-secondary-foreground flex-1 cursor-pointer whitespace-pre-wrap">{item.description}</p>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAssignClick} disabled={isAssigning}>
                                {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(item.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default function NutritionTab({ clientId }: { clientId: string }) {
    const firestore = useFirestore();
    const { user: trainer } = useUser();
    const { toast } = useToast();

    const [newItemTime, setNewItemTime] = React.useState('08:00');
    const [newItemDescription, setNewItemDescription] = React.useState('');
    const [isAddingNutrition, setIsAddingNutrition] = React.useState(false);

    // --- Data Fetching ---
    const nutritionPlanQuery = useMemoFirebase(() => 
        firestore && clientId ? query(collection(firestore, 'users', clientId, 'nutritionPlan'), orderBy('time', 'asc')) : null
    , [firestore, clientId]);
    const { data: timelineItems, isLoading: areItemsLoading, error: nutritionError } = useCollection<NutritionPlanItem>(nutritionPlanQuery);
    

    React.useEffect(() => {
        if(nutritionError) {
           toast({
                variant: 'destructive',
                title: 'Lỗi phân quyền',
                description: 'Không thể tải kế hoạch dinh dưỡng. Kiểm tra lại quy tắc bảo mật.',
           });
        }
    }, [nutritionError, toast]);

    const handleAddNutritionItem = async () => {
        if (!firestore || !clientId || !newItemDescription.trim()) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Mô tả không được để trống.'});
            return;
        }
        setIsAddingNutrition(true);
        const dataToSave = {
            type: 'meal' as const,
            time: newItemTime,
            description: newItemDescription,
            createdAt: serverTimestamp(),
        };
        const planColRef = collection(firestore, 'users', clientId, 'nutritionPlan');
        try {
            await addDoc(planColRef, dataToSave);
            setNewItemDescription('');
            setNewItemTime('08:00');
        } catch (e) {
            const permissionError = new FirestorePermissionError({
                path: planColRef.path,
                operation: 'create',
                requestResourceData: dataToSave,
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsAddingNutrition(false);
        }
    };

    const handleUpdateNutritionItem = async (id: string, newTime: string, newDescription: string) => {
        if (!firestore || !clientId) return;
        const itemDocRef = doc(firestore, 'users', clientId, 'nutritionPlan', id);
        try {
            await updateDoc(itemDocRef, { time: newTime, description: newDescription });
            toast({title: 'Đã cập nhật!', description: 'Mục đã được lưu.'});
        } catch (e) {
            const permissionError = new FirestorePermissionError({
                path: itemDocRef.path,
                operation: 'update',
                requestResourceData: { time: newTime, description: newDescription },
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    };

    const handleDeleteNutritionItem = async (id: string) => {
        if (!firestore || !clientId) return;
        const itemDocRef = doc(firestore, 'users', clientId, 'nutritionPlan', id);
        try {
            await deleteDoc(itemDocRef);
            toast({title: 'Đã xóa mục', variant: 'destructive'});
        } catch (e) {
            const permissionError = new FirestorePermissionError({
                path: itemDocRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    };

    const handleAssignTask = async (taskTitle: string) => {
        if (!firestore || !clientId || !trainer) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể giao task.' });
            return;
        }
        const taskData = {
            clientId: clientId,
            trainerId: trainer.uid,
            title: taskTitle,
            date: getLocalDateString(),
            isCompleted: false,
            createdAt: serverTimestamp(),
        };

        try {
            const tasksColRef = collection(firestore, 'users', clientId, 'habitTasks');
            await addDoc(tasksColRef, taskData);
            toast({ title: 'Thành công!', description: `Đã giao task "${taskTitle}" cho khách hàng.` });
        } catch (error) {
             const permissionError = new FirestorePermissionError({
                path: `users/${clientId}/habitTasks`,
                operation: 'create',
                requestResourceData: taskData,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    };

    return (
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Lịch trình trong ngày</CardTitle>
                <CardDescription>
                    Thêm, sửa, xóa hoặc giao các mục trong lịch trình như một nhiệm vụ cho khách hàng.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative pl-6">
                    <div className="absolute left-9 top-0 bottom-0 w-px bg-border -translate-x-1/2"></div>
                    
                    {areItemsLoading ? (
                         <div className="space-y-8">
                            {Array.from({length: 3}).map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="w-24 h-6" />
                                    <Skeleton className="h-12 flex-1" />
                                </div>
                            ))}
                        </div>
                    ) : timelineItems && timelineItems.length > 0 ? (
                        <div className="space-y-4">
                            {timelineItems.map((item) => (
                                <EditableTimelineItem 
                                    key={item.id}
                                    item={item}
                                    onUpdate={handleUpdateNutritionItem}
                                    onDelete={handleDeleteNutritionItem}
                                    onAssignTask={handleAssignTask}
                                />
                            ))}
                        </div>
                    ) : (
                         <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                            <p className="font-semibold">Kế hoạch dinh dưỡng trống.</p>
                            <p className="text-sm mt-1">Nhấn "Thêm mục mới" để bắt đầu xây dựng kế hoạch.</p>
                        </div>
                    )}
                </div>
            </CardContent>
             <CardFooter className="pt-6 border-t">
                <div className="flex w-full items-start gap-4">
                    <Input 
                        type="time" 
                        value={newItemTime}
                        onChange={e => setNewItemTime(e.target.value)}
                        className="w-28"
                        disabled={isAddingNutrition}
                    />
                    <Textarea 
                        placeholder="Thêm một bữa ăn hoặc thói quen mới..."
                        value={newItemDescription}
                        onChange={e => setNewItemDescription(e.target.value)}
                        rows={1}
                        className="flex-1"
                        disabled={isAddingNutrition}
                    />
                    <Button onClick={handleAddNutritionItem} disabled={isAddingNutrition || !newItemDescription.trim()}>
                        {isAddingNutrition ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                        <span className="ml-2 hidden sm:inline">Thêm mục</span>
                    </Button>
                </div>
            </CardFooter>
        </Card>
      </div>
    );
}
