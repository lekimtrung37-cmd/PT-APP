
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, serverTimestamp, doc, query } from 'firebase/firestore';
import { Search, PlusCircle, Pencil, Trash2, Loader2, Library, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


// --- Constants ---
const PHAN_LOAI = ["Tay", "Ngực", "Lưng", "Bụng/Core", "Chân", "Vai", "Tim mạch", "Khởi động", "Giãn cơ", "Toàn thân"];
const CHUYEN_DONG = ["Squat", "Hinge", "Push", "Pull", "Carry", "Rotation"];

// --- Zod Schema ---
const exerciseSchema = z.object({
    ten: z.string().min(1, 'Tên bài tập là bắt buộc'),
    moTaNgan: z.string().optional(),
    videoUrl: z.string().url('URL video không hợp lệ').optional().or(z.literal('')),
    phanLoai: z.array(z.string()).optional(),
    chuyenDong: z.array(z.string()).optional(),
});

type ExerciseFormData = z.infer<typeof exerciseSchema>;

type Exercise = ExerciseFormData & {
    id: string;
    tags?: string[];
    ownerType?: 'admin' | 'trainer';
};

// --- Exercise Form Component ---
const ExerciseForm = ({
    onSubmit,
    defaultValues,
    isSubmitting,
}: {
    onSubmit: (data: ExerciseFormData) => void;
    defaultValues: Partial<ExerciseFormData>;
    isSubmitting: boolean;
}) => {
    const form = useForm<ExerciseFormData>({
        resolver: zodResolver(exerciseSchema),
        defaultValues,
    });
    
    React.useEffect(() => {
        form.reset(defaultValues);
    }, [defaultValues, form]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-6 pl-2">
                <FormField control={form.control} name="ten" render={({ field }) => (<FormItem><FormLabel>Tên bài tập</FormLabel><FormControl><Input placeholder="Ví dụ: Barbell Bench Press" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="moTaNgan" render={({ field }) => (<FormItem><FormLabel>Mô tả ngắn</FormLabel><FormControl><Textarea placeholder="Mô tả kỹ thuật hoặc lưu ý..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="videoUrl" render={({ field }) => (<FormItem><FormLabel>URL Video Hướng dẫn (YouTube)</FormLabel><FormControl><Input placeholder="https://youtube.com/..." {...field} /></FormControl><FormMessage /></FormItem>)} />

                <div className="space-y-2">
                    <FormLabel>Phân Loại</FormLabel>
                    <div className="grid grid-cols-3 gap-2">
                        {PHAN_LOAI.map(item => (<FormField key={item} control={form.control} name="phanLoai" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), item]) : field.onChange(field.value?.filter(value => value !== item))}} /></FormControl><FormLabel className="text-sm font-normal">{item}</FormLabel></FormItem>)} />))}
                    </div>
                </div>
                 <div className="space-y-2">
                    <FormLabel>Chuyển Động</FormLabel>
                    <div className="grid grid-cols-3 gap-2">
                        {CHUYEN_DONG.map(item => (<FormField key={item} control={form.control} name="chuyenDong" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), item]) : field.onChange(field.value?.filter(value => value !== item))}} /></FormControl><FormLabel className="text-sm font-normal">{item}</FormLabel></FormItem>)} />))}
                    </div>
                </div>
                
                <DialogFooter className="pr-4 pt-4">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null}
                        Lưu bài tập
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
};

export default function TrainerExercisesPage() {
    const firestore = useFirestore();
    const { user: trainer, isUserLoading } = useUser();
    const { toast } = useToast();

    // --- State Management ---
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [editingExercise, setEditingExercise] = React.useState<Exercise | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [exerciseToDelete, setExerciseToDelete] = React.useState<Exercise | null>(null);
    const [activeTab, setActiveTab] = React.useState("all");

    // --- Firestore ---
    const publicExercisesQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'publicExercises')) : null, [firestore]);
    const { data: publicExercises, isLoading: isPublicLoading } = useCollection<Exercise>(publicExercisesQuery);

    const trainerExercisesQuery = useMemoFirebase(() => 
        firestore && trainer ? query(collection(firestore, `trainerExercises/${trainer.uid}/items`)) : null, [firestore, trainer]);
    const { data: trainerExercises, isLoading: isTrainerLoading } = useCollection<Exercise>(trainerExercisesQuery);

    const isLoading = isUserLoading || isPublicLoading || isTrainerLoading;

    // --- CRUD Handlers ---
    const onSubmit = async (data: ExerciseFormData) => {
        if (!trainer || !firestore) return;
        setIsSubmitting(true);
        const tags = [...(data.phanLoai || []), ...(data.chuyenDong || [])];
        const dataToSave = { ...data, tags, taoBoi: trainer.uid, ownerType: 'trainer' as const };

        try {
            if (editingExercise) {
                const docRef = doc(firestore, `trainerExercises/${trainer.uid}/items/${editingExercise.id}`);
                await updateDoc(docRef, { ...dataToSave, capNhatLuc: serverTimestamp() });
                toast({ title: "Thành công!", description: "Đã cập nhật bài tập." });
            } else {
                const colRef = collection(firestore, `trainerExercises/${trainer.uid}/items`);
                await addDoc(colRef, { ...dataToSave, taoLuc: serverTimestamp() });
                toast({ title: "Thành công!", description: "Đã thêm bài tập mới vào kho riêng." });
            }
            setIsFormOpen(false);
            setEditingExercise(null);
        } catch (error) {
            console.error("Error saving exercise:", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể lưu bài tập.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!exerciseToDelete || !trainer || !firestore) return;
        const docRef = doc(firestore, `trainerExercises/${trainer.uid}/items/${exerciseToDelete.id}`);
        try {
            await deleteDoc(docRef);
            toast({ title: "Đã xóa", description: `Đã xóa bài tập "${exerciseToDelete.ten}".`, variant: 'destructive' });
        } catch (error) {
            console.error("Error deleting exercise:", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể xóa bài tập.' });
        } finally {
            setIsDeleteDialogOpen(false);
        }
    };

    // --- Filtering & Sorting ---
    const combinedExercises = React.useMemo(() => {
        const publicWithFlag = publicExercises?.map(e => ({ ...e, ownerType: 'admin' as const })) || [];
        const trainerWithFlag = trainerExercises?.map(e => ({ ...e, ownerType: 'trainer' as const })) || [];
        return [...publicWithFlag, ...trainerWithFlag];
    }, [publicExercises, trainerExercises]);

    
    const filteredExercises = React.useMemo(() => {
        let source: Exercise[] = [];
        if (activeTab === 'all') source = combinedExercises;
        else if (activeTab === 'public') source = publicExercises || [];
        else source = trainerExercises || [];

        return source
            .filter(ex => ex.ten.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.ten.localeCompare(b.ten));
    }, [combinedExercises, publicExercises, trainerExercises, activeTab, searchTerm]);


    const getYoutubeEmbedUrl = (url: string) => {
        if (!url) return null;
        let videoId;
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('watch?v=')[1].split('&')[0];
        } else {
            return null; // Not a valid YouTube URL
        }
        return `https://www.youtube.com/embed/${videoId}`;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Thư viện Bài tập</CardTitle>
                <CardDescription>Tra cứu, tạo mới và quản lý các bài tập.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                        <TabsList className="grid w-full grid-cols-3 sm:w-[400px]">
                            <TabsTrigger value="all">Tất cả</TabsTrigger>
                            <TabsTrigger value="public">Kho chung</TabsTrigger>
                            <TabsTrigger value="mine">Bài tập của tôi</TabsTrigger>
                        </TabsList>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input placeholder="Tìm kiếm..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingExercise(null); }}>
                                <DialogTrigger asChild>
                                    <Button className="w-fit" onClick={() => setEditingExercise(null)}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Thêm mới
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[600px]">
                                    <DialogHeader>
                                        <DialogTitle>{editingExercise ? 'Chỉnh sửa' : 'Tạo mới'} bài tập</DialogTitle>
                                        <DialogDescription>Bài tập này sẽ được lưu vào thư viện riêng của bạn.</DialogDescription>
                                    </DialogHeader>
                                    <ExerciseForm 
                                        onSubmit={onSubmit} 
                                        defaultValues={editingExercise || { ten: '', moTaNgan: '', videoUrl: '', phanLoai: [], chuyenDong: [] }}
                                        isSubmitting={isSubmitting}
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                    <div className="border rounded-md mt-4">
                        {isLoading ? (
                            <div className="p-4 space-y-2">
                                {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                            </div>
                        ) : filteredExercises.length > 0 ? (
                            filteredExercises.map((exercise, index) => (
                                <Dialog key={exercise.id + index}>
                                    <div className={`flex items-center justify-between p-4 ${index < filteredExercises.length - 1 ? 'border-b' : ''}`}>
                                        <DialogTrigger asChild>
                                            <div className="flex items-center gap-4 cursor-pointer flex-1">
                                                {exercise.ownerType === 'admin' ? 
                                                    <TooltipProvider><Tooltip><TooltipTrigger><Library className="h-5 w-5 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>Bài tập chung</p></TooltipContent></Tooltip></TooltipProvider>
                                                    : <TooltipProvider><Tooltip><TooltipTrigger><Users className="h-5 w-5 text-muted-foreground"/></TooltipTrigger><TooltipContent><p>Bài tập của bạn</p></TooltipContent></Tooltip></TooltipProvider>
                                                }
                                                <div>
                                                    <p className="font-semibold hover:text-primary transition-colors">{exercise.ten}</p>
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {exercise.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                                    </div>
                                                </div>
                                            </div>
                                        </DialogTrigger>
                                        {exercise.ownerType === 'trainer' && (
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingExercise(exercise); setIsFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { setExerciseToDelete(exercise); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        )}
                                    </div>
                                    <DialogContent className="sm:max-w-xl">
                                        <DialogHeader>
                                            <DialogTitle>{exercise.ten}</DialogTitle>
                                            <DialogDescription>{exercise.moTaNgan}</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            {exercise.videoUrl && getYoutubeEmbedUrl(exercise.videoUrl) ? (
                                                <div className="aspect-video w-full">
                                                    <iframe
                                                        width="100%"
                                                        height="100%"
                                                        src={getYoutubeEmbedUrl(exercise.videoUrl) || ''}
                                                        title="YouTube video player"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                        className="rounded-lg"
                                                    ></iframe>
                                                </div>
                                            ) : exercise.videoUrl && <p className="text-sm text-destructive">URL video không hợp lệ.</p>}
                                            <div className="flex flex-wrap gap-2">
                                                {exercise.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            ))
                        ) : (
                            <div className="p-12 text-center text-muted-foreground">Không tìm thấy bài tập nào.</div>
                        )}
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
}
