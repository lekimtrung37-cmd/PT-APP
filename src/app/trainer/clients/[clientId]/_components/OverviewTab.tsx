

'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, FilePenLine, Save, CheckCircle, Loader2, Package, History, Undo, BarChart, Dumbbell, Zap, ListChecks, Video } from 'lucide-react';
import { useDoc, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, updateDoc, collection, query, orderBy, serverTimestamp, Timestamp, getDocs, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getLocalDateString } from '@/lib/utils';
import type { User as TrainerUser } from 'firebase/auth';
import CompactExerciseHistory from './CompactExerciseHistory';
import { Progress } from '@/components/ui/progress';
import { YoutubeEmbed } from '@/components/coach/YoutubeEmbed';


// --- TYPE DEFINITIONS ---
type Workout = {
  id: string;
  title: string;
  exercises: Exercise[];
  isCompleted?: boolean;
};

type Exercise = {
  tenBaiTap: string;
  sets?: string;
  repsOrDuration?: string;
  rpe?: string;
  rest?: string;
  tempo?: string;
  loadKg?: string;
  notes?: string;
};

// Full exercise definition from library
interface ExerciseWithVideo extends Exercise {
    displayName: string;
    videoUrl?: string;
}

type ClientData = {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
  sessions?: {
    remaining: number;
    total: number;
  };
  onboardingData?: any;
};

type SessionHistoryItem = {
    id: string;
    date: Timestamp;
    type: 'add' | 'use' | 'correction';
    amount: number;
    notes?: string;
    ptId: string;
    relatedWorkoutId?: string;
};

type HabitTask = {
    id: string;
    date: string;
    isCompleted: boolean;
};

interface OverviewTabProps {
    client: ClientData;
    trainer: TrainerUser;
}

const WelcomeChecklist = ({ client }: { client: ClientData }) => {
    const isSampleClient = client.name === 'Sầu Riêng';
    if (!isSampleClient) return null;

    const checklistItems = [
        { id: 'note', text: 'Tạo một ghi chú nhanh về khách hàng trong tab "Hồ sơ".' },
        { id: 'plan', text: 'Vào tab "Kế hoạch" và kéo một buổi tập vào lịch.' },
        { id: 'nutrition', text: 'Vào tab "Dinh dưỡng" và thêm một bữa ăn gợi ý.' },
        { id: 'task', text: 'Giao một nhiệm vụ/thói quen cho khách hàng hôm nay.' },
    ];
    
    // In a real app, you'd check which tasks are completed from Firestore
    const completedTasks = new Set(['note']); 

    return (
        <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
                <CardTitle className="text-blue-900 flex items-center gap-2"><ListChecks /> Nhiệm vụ đầu tiên của bạn</CardTitle>
                <CardDescription className="text-blue-800">
                    Hãy làm quen với hệ thống bằng cách thực hiện vài thao tác cơ bản trên khách hàng mẫu này.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {checklistItems.map(item => (
                         <li key={item.id} className={`flex items-center gap-3 text-sm ${completedTasks.has(item.id) ? 'text-muted-foreground line-through' : 'font-medium'}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${completedTasks.has(item.id) ? 'bg-green-500' : 'border-2 border-blue-400'}`}>
                                {completedTasks.has(item.id) && <CheckCircle className="w-5 h-5 text-white" />}
                            </div>
                            <span>{item.text}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}

export default function OverviewTab({ client, trainer }: OverviewTabProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const clientId = client.id;
    
    // State for this tab
    const [isSessionDialogOpen, setIsSessionDialogOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [transactionAmount, setTransactionAmount] = React.useState('');
    const [transactionNotes, setTransactionNotes] = React.useState('');
    const [transactionType, setTransactionType] = React.useState<'add' | 'correction'>('add');
    const [editableExercises, setEditableExercises] = React.useState<Exercise[]>([]);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isCompleting, setIsCompleting] = React.useState(false);
    const [exercisesWithVideos, setExercisesWithVideos] = React.useState<ExerciseWithVideo[]>([]);


    // Data fetching for this tab
    const todayString = getLocalDateString();
    const todayWorkoutDocRef = useMemoFirebase(() => 
        firestore && clientId ? doc(firestore, 'users', clientId, 'workouts', todayString) : null
    , [firestore, clientId, todayString]);
    const { data: todayWorkout, isLoading: isWorkoutLoading } = useDoc<Workout>(todayWorkoutDocRef);

    const publicExercisesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'publicExercises') : null, [firestore]);
    const { data: publicExercises } = useCollection(publicExercisesQuery, {
      transform: (data: any) => ({ ...data, displayName: data.ten || data.name || data.tenBaiTap || 'Unnamed Exercise' })
    });
    
    const trainerExercisesQuery = useMemoFirebase(() => 
        firestore && trainer ? collection(firestore, `trainerExercises/${trainer.uid}/items`) : null, 
    [firestore, trainer]);
    const { data: trainerExercises } = useCollection(trainerExercisesQuery, {
      transform: (data: any) => ({ ...data, displayName: data.ten || data.name || data.tenBaiTap || 'Unnamed Exercise' })
    });

    React.useEffect(() => {
        const fetchVideoUrls = async () => {
            if (todayWorkout && todayWorkout.exercises) {
                const combinedLibrary = [...(publicExercises || []), ...(trainerExercises || [])];
                const enrichedExercises = todayWorkout.exercises.map(exercise => {
                    const libraryMatch = combinedLibrary.find(libEx => libEx.displayName === exercise.tenBaiTap);
                    return {
                        ...exercise,
                        displayName: exercise.tenBaiTap,
                        videoUrl: libraryMatch?.videoUrl || undefined
                    };
                });
                setExercisesWithVideos(enrichedExercises);
            } else {
                setExercisesWithVideos([]);
            }
        };

        fetchVideoUrls();
    }, [todayWorkout, publicExercises, trainerExercises]);

    const sessionHistoryQuery = useMemoFirebase(() => 
        firestore && clientId ? query(collection(firestore, 'users', clientId, 'sessionHistory'), orderBy('date', 'desc')) : null,
    [firestore, clientId]);
    const { data: sessionHistory, isLoading: isHistoryLoading } = useCollection<SessionHistoryItem>(sessionHistoryQuery);
    
    // Fetch habit tasks for the last 7 days to calculate commitment
    const habitTasksQuery = useMemoFirebase(() => {
        if (!firestore || !clientId) return null;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoString = getLocalDateString(); // Note: This is today, we need to adjust
        
        // Correctly calculate 7 days ago string
        const date = new Date();
        date.setDate(date.getDate() - 7);
        const startDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        return query(
            collection(firestore, 'users', clientId, 'habitTasks'),
            where('date', '>=', startDate)
        );
    }, [firestore, clientId]);
    const { data: recentTasks, isLoading: areTasksLoading } = useCollection<HabitTask>(habitTasksQuery);
    
    const commitmentRate = React.useMemo(() => {
        if (!recentTasks || recentTasks.length === 0) return 0;
        const completedTasks = recentTasks.filter(task => task.isCompleted).length;
        return Math.round((completedTasks / recentTasks.length) * 100);
    }, [recentTasks]);


    React.useEffect(() => {
        if (todayWorkout?.exercises) {
            setEditableExercises(todayWorkout.exercises);
        } else {
            setEditableExercises([]);
        }
    }, [todayWorkout]);
    
    const handleSaveSessions = async () => {
        if (!firestore || !client || !trainer) return;
        const amount = parseInt(transactionAmount, 10);
        if (isNaN(amount) || amount === 0) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Số buổi không hợp lệ.' });
            return;
        }
        setIsSubmitting(true);
        
        try {
            const batch = writeBatch(firestore);
            const clientDocRef = doc(firestore, 'users', client.id);

            const historyColRef = collection(clientDocRef, 'sessionHistory');
            const historyDocRef = doc(historyColRef);
            batch.set(historyDocRef, {
                date: serverTimestamp(),
                type: transactionType,
                amount: transactionType === 'add' ? amount : amount, 
                notes: transactionNotes,
                ptId: trainer.uid
            });
    
            const currentRemaining = client.sessions?.remaining || 0;
            const currentTotal = client.sessions?.total || 0;
            const newRemaining = currentRemaining + amount;
            const newTotal = transactionType === 'add' ? currentTotal + amount : currentTotal;
    
            batch.update(clientDocRef, { 
                'sessions.remaining': newRemaining,
                'sessions.total': newTotal
            });
    
            await batch.commit();
    
            toast({ title: "Thành công!", description: `Đã cập nhật gói tập cho ${client?.name}.` });
            setIsSessionDialogOpen(false);
            setTransactionAmount('');
            setTransactionNotes('');
        } catch (error) {
            console.error("Error saving session transaction: ", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể cập nhật gói tập.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateExerciseLog = (index: number, field: keyof Exercise, value: string) => {
        const newExercises = [...editableExercises];
        (newExercises[index] as any)[field] = value;
        setEditableExercises(newExercises);
    };

    const handleSaveWorkoutResults = async () => {
        if (!firestore || !todayWorkout || !todayWorkoutDocRef) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Thiếu thông tin cần thiết để lưu.' });
            return;
        }
        setIsSaving(true);
        try {
            await updateDoc(todayWorkoutDocRef, { exercises: editableExercises });
            toast({ title: "Đã lưu kết quả!", description: "Kết quả buổi tập đã được cập nhật." });
        } catch (error) {
            console.error("Error saving workout results:", error);
            toast({ variant: 'destructive', title: "Lỗi!", description: "Không thể lưu kết quả." });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCompleteSession = async () => {
        if (!firestore || !client || !todayWorkout || !trainer || !todayWorkoutDocRef) {
           toast({ variant: 'destructive', title: 'Lỗi', description: 'Thiếu thông tin cần thiết để hoàn thành.' });
          return;
        }
         if (todayWorkout.isCompleted) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Buổi tập này đã được hoàn thành.' });
            return;
        }
    
        setIsCompleting(true);
        
        try {
            const batch = writeBatch(firestore);
            const clientDocRef = doc(firestore, 'users', client.id);
            
            batch.update(todayWorkoutDocRef, { exercises: editableExercises, isCompleted: true });
            
            const historyColRef = collection(clientDocRef, 'sessionHistory');
            const historyDocRef = doc(historyColRef);
            batch.set(historyDocRef, {
                date: serverTimestamp(),
                type: 'use',
                amount: -1,
                notes: `Hoàn thành buổi tập: ${todayWorkout.title}`,
                ptId: trainer.uid,
                relatedWorkoutId: todayWorkout.id,
            });
            
            const newRemainingSessions = Math.max(0, (client.sessions?.remaining || 0) - 1);
            batch.update(clientDocRef, { 'sessions.remaining': newRemainingSessions });
            
            await batch.commit();
    
            toast({ title: "Hoàn tất!", description: `Buổi tập đã được lưu và gói tập đã được cập nhật.` });
        } catch (error) {
            console.error("Error completing session:", error);
            toast({ variant: 'destructive', title: "Lỗi!", description: "Không thể hoàn thành buổi tập. Vui lòng thử lại." });
        } finally {
            setIsCompleting(false);
        }
    };

    const handleUndoTransaction = async (transaction: SessionHistoryItem) => {
        if (!firestore || !client || !trainer) return;
        
        if (transaction.type !== 'use') {
            toast({ variant: 'destructive', title: 'Không thể hoàn tác', description: 'Chỉ có thể hoàn tác giao dịch "sử dụng".' });
            return;
        }
    
        setIsSubmitting(true);
        try {
            const batch = writeBatch(firestore);
            const clientDocRef = doc(firestore, 'users', client.id);
            
            const originalTransactionRef = doc(clientDocRef, 'sessionHistory', transaction.id);
            batch.update(originalTransactionRef, { type: 'correction', notes: `[ĐÃ HOÀN TÁC] ${transaction.notes}` });
            
            const historyColRef = collection(clientDocRef, 'sessionHistory');
            const newTransactionRef = doc(historyColRef);
            const newAmount = -transaction.amount;
            batch.set(newTransactionRef, {
                date: serverTimestamp(),
                type: 'correction',
                amount: newAmount,
                notes: `Hoàn tác cho buổi tập ngày ${transaction.date.toDate().toLocaleDateString('vi-VN')}`,
                ptId: trainer.uid,
            });
    
            const currentRemaining = client.sessions?.remaining || 0;
            const newRemaining = currentRemaining + newAmount;
            batch.update(clientDocRef, { 'sessions.remaining': newRemaining });
            
            if (transaction.relatedWorkoutId) {
                 const workoutDocRef = doc(clientDocRef, 'workouts', transaction.relatedWorkoutId);
                 batch.update(workoutDocRef, { isCompleted: false });
            }
    
            await batch.commit();
            toast({ title: 'Đã hoàn tác!', description: 'Buổi tập đã được cộng lại vào gói.' });
        } catch (error) {
            console.error("Error undoing transaction:", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể hoàn tác giao dịch.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
                <WelcomeChecklist client={client} />
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                             <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Lịch tập hôm nay
                            </CardTitle>
                             {todayWorkout?.isCompleted && (
                                 <Badge variant="default" className="mt-2 bg-green-600">Đã hoàn thành</Badge>
                             )}
                        </div>
                        <div className="flex items-center gap-2">
                            {todayWorkout && (
                                <>
                                 <Button size="sm" onClick={handleSaveWorkoutResults} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                    Lưu kết quả
                                </Button>
                                <Button size="sm" onClick={handleCompleteSession} disabled={isCompleting || todayWorkout.isCompleted}>
                                    {isCompleting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                    Hoàn thành
                                </Button>
                                </>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                       {isWorkoutLoading ? (
                           <Skeleton className="h-48 w-full" />
                       ) : todayWorkout ? (
                            <div className="space-y-4">
                               <h3 className="font-semibold text-xl">{todayWorkout.title}</h3>
                                {exercisesWithVideos?.map((exercise, index) => (
                                    <div key={index} className="p-3 bg-secondary/50 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold">{exercise.displayName}</p>
                                            {exercise.videoUrl && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Xem video ${exercise.displayName}`}>
                                                            <Video className="w-4 h-4 text-primary" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-2xl">
                                                        <DialogHeader>
                                                            <DialogTitle>{exercise.displayName}</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="aspect-video w-full">
                                                            <YoutubeEmbed url={exercise.videoUrl} />
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 mt-2">
                                            <div>
                                                <Label htmlFor={`sets-${index}`} className="text-xs">Số hiệp</Label>
                                                <Input id={`sets-${index}`} type="text" placeholder="-" defaultValue={exercise.sets || ''} onChange={e => handleUpdateExerciseLog(index, 'sets', e.target.value)} className="h-8"/>
                                            </div>
                                            <div>
                                                <Label htmlFor={`reps-${index}`} className="text-xs">Số lần/TG</Label>
                                                <Input id={`reps-${index}`} type="text" placeholder="-" defaultValue={exercise.repsOrDuration || ''} onChange={e => handleUpdateExerciseLog(index, 'repsOrDuration', e.target.value)} className="h-8"/>
                                            </div>
                                            <div>
                                                <Label htmlFor={`load-${index}`} className="text-xs">Số kg</Label>
                                                <Input id={`load-${index}`} type="text" placeholder="-" defaultValue={exercise.loadKg || ''} onChange={e => handleUpdateExerciseLog(index, 'loadKg', e.target.value)} className="h-8"/>
                                            </div>
                                             <div>
                                                <Label htmlFor={`rpe-${index}`} className="text-xs">RPE</Label>
                                                <Input id={`rpe-${index}`} type="text" placeholder="-" defaultValue={exercise.rpe || ''} onChange={e => handleUpdateExerciseLog(index, 'rpe', e.target.value)} className="h-8"/>
                                            </div>
                                            <div>
                                                <Label htmlFor={`tempo-${index}`} className="text-xs">Tempo</Label>
                                                <Input id={`tempo-${index}`} type="text" placeholder="-" defaultValue={exercise.tempo || ''} onChange={e => handleUpdateExerciseLog(index, 'tempo', e.target.value)} className="h-8"/>
                                            </div>
                                            <div>
                                                <Label htmlFor={`rest-${index}`} className="text-xs">Nghỉ (s)</Label>
                                                <Input id={`rest-${index}`} type="text" placeholder="-" defaultValue={exercise.rest || ''} onChange={e => handleUpdateExerciseLog(index, 'rest', e.target.value)} className="h-8"/>
                                            </div>
                                            <div className='col-span-2 md:col-span-7'>
                                              <Label htmlFor={`notes-${index}`} className="text-xs">Ghi chú</Label>
                                              <Textarea placeholder="Ghi chú cho bài tập..." id={`notes-${index}`} defaultValue={exercise.notes || ''} onChange={e => handleUpdateExerciseLog(index, 'notes', e.target.value)} className="mt-1 text-sm" rows={1}/>
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <CompactExerciseHistory clientId={clientId} exerciseName={exercise.displayName} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                       ) : (
                           <p className="text-muted-foreground text-center py-8">Khách hàng chưa có lịch tập nào cho hôm nay.</p>
                       )}
                    </CardContent>
                </Card>
            </div>
            <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Zap className="w-5 h-5"/> Đánh giá Kỷ luật
                        </CardTitle>
                        <CardDescription>Tỷ lệ hoàn thành nhiệm vụ trong 7 ngày qua.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {areTasksLoading ? <Skeleton className="h-20 w-full" /> : (
                            <>
                                <div className="flex items-center justify-between mb-2">
                                     <span className="text-sm font-medium">{commitmentRate}% Hoàn thành</span>
                                     <span className="text-sm text-muted-foreground">{recentTasks?.filter(t=>t.isCompleted).length || 0} / {recentTasks?.length || 0} tasks</span>
                                </div>
                                <Progress value={commitmentRate} />
                                 {commitmentRate < 50 && (
                                    <p className="text-xs text-orange-500 mt-2">Cần nhắc nhở khách hàng tập trung hơn.</p>
                                 )}
                            </>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Package className="w-5 h-5"/> Quản lý Gói tập
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                         <div className="flex items-baseline justify-center gap-1">
                            <span className="text-6xl font-bold text-primary">{client.sessions?.remaining ?? 0}</span>
                            <span className="text-2xl text-muted-foreground">/ {client.sessions?.total ?? 0}</span>
                         </div>
                        <p className="text-muted-foreground -mt-2">buổi</p>
                    </CardContent>
                    <CardFooter>
                         <Dialog open={isSessionDialogOpen} onOpenChange={setIsSessionDialogOpen}>
                            <DialogTrigger asChild>
                                 <Button variant="outline" className="w-full">Thêm/Điều chỉnh Gói tập</Button>
                            </DialogTrigger>
                             <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Thêm hoặc Điều chỉnh Gói tập</DialogTitle>
                                    <DialogDescription>
                                        Cộng hoặc trừ số buổi tập cho khách hàng và xem lại lịch sử giao dịch.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                    <div className="space-y-4 p-4 border rounded-lg">
                                        <h4 className="font-semibold">Thực hiện Giao dịch</h4>
                                        <div className="space-y-2">
                                            <Label>Loại Giao dịch</Label>
                                            <Select value={transactionType} onValueChange={(value) => setTransactionType(value as any)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="add">Thêm gói mới</SelectItem>
                                                    <SelectItem value="correction">Điều chỉnh (cộng/trừ)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="amount">Số buổi</Label>
                                            <Input 
                                                id="amount" 
                                                type="number" 
                                                placeholder={transactionType === 'add' ? "Ví dụ: 12" : "Ví dụ: -1 để trừ, 1 để cộng"}
                                                value={transactionAmount}
                                                onChange={(e) => setTransactionAmount(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="notes">Ghi chú (Tùy chọn)</Label>
                                            <Textarea 
                                                id="notes" 
                                                placeholder="Ví dụ: Khách hàng gia hạn gói 12 buổi"
                                                value={transactionNotes}
                                                onChange={(e) => setTransactionNotes(e.target.value)}
                                            />
                                        </div>
                                        <Button onClick={handleSaveSessions} disabled={isSubmitting}>
                                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null}
                                            Lưu thay đổi
                                        </Button>
                                    </div>

                                    <div className="space-y-4">
                                         <h4 className="font-semibold">Lịch sử Giao dịch</h4>
                                         <ScrollArea className="h-72">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="text-xs">Ngày</TableHead>
                                                        <TableHead className="text-xs">Loại</TableHead>
                                                        <TableHead className="text-xs">SL</TableHead>
                                                        <TableHead className="text-right text-xs">Hoàn tác</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {isHistoryLoading ? (
                                                        Array.from({length: 3}).map((_, i) => (
                                                            <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full"/></TableCell></TableRow>
                                                        ))
                                                    ) : sessionHistory && sessionHistory.length > 0 ? (
                                                        sessionHistory.map(item => (
                                                            <TableRow key={item.id}>
                                                                <TableCell className="text-xs py-2">{item.date ? item.date.toDate().toLocaleDateString('vi-VN') : 'N/A'}</TableCell>
                                                                <TableCell className="py-2">
                                                                    <Badge variant={item.type === 'add' ? 'default' : item.type === 'use' ? 'secondary' : 'outline'}
                                                                    className={`text-xs ${item.type === 'add' ? 'bg-green-100 text-green-800' : item.type === 'use' ? 'bg-red-100 text-red-800' : ''}`}
                                                                    >
                                                                        {item.type === 'add' ? 'Thêm' : item.type === 'use' ? 'Dùng' : 'Sửa'}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className={`text-xs font-semibold py-2 ${item.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {item.amount > 0 ? `+${item.amount}` : item.amount}
                                                                </TableCell>
                                                                <TableCell className="text-right py-2">
                                                                    {item.type === 'use' && (
                                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUndoTransaction(item)} disabled={isSubmitting}>
                                                                            <Undo className="h-3 w-3" />
                                                                        </Button>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={4} className="text-center h-24 text-xs text-muted-foreground">Chưa có giao dịch.</TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                         </ScrollArea>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardFooter>
                 </Card>
            </div>
        </div>
    );
}

    
