

'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Papa from 'papaparse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, serverTimestamp, doc, writeBatch } from 'firebase/firestore';
import { Search, PlusCircle, Pencil, Trash2, Loader2, Upload, Library, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    displayName: string;
    tags?: string[];
};

export default function AdminExercisesPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();

    // --- State Management ---
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filters, setFilters] = React.useState<Record<string, string[]>>({ phanLoai: [], chuyenDong: [] });
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [editingExercise, setEditingExercise] = React.useState<Exercise | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [exerciseToDelete, setExerciseToDelete] = React.useState<Exercise | null>(null);
    
    // CSV Import State
    const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
    const [csvFile, setCsvFile] = React.useState<File | null>(null);
    const [parsedData, setParsedData] = React.useState<any[]>([]);
    const [isParsing, setIsParsing] = React.useState(false);


    // --- Firestore ---
    const publicExercisesQuery = useMemoFirebase(() => 
        firestore ? collection(firestore, 'publicExercises') : null
    , [firestore]);
    const { data: exercises, isLoading } = useCollection<Exercise>(publicExercisesQuery, {
        transform: (data) => ({...data, displayName: data.ten})
    });

    // --- Form ---
    const form = useForm<ExerciseFormData>({
        resolver: zodResolver(exerciseSchema),
        defaultValues: { ten: '', moTaNgan: '', videoUrl: '', phanLoai: [], chuyenDong: [] }
    });

    React.useEffect(() => {
        if (editingExercise) {
            form.reset(editingExercise);
        } else {
            form.reset({ ten: '', moTaNgan: '', videoUrl: '', phanLoai: [], chuyenDong: [] });
        }
    }, [editingExercise, form]);

    // --- CRUD Handlers ---
    const onSubmit = async (data: ExerciseFormData) => {
        if (!user || !firestore) return;
        setIsSubmitting(true);
        const tags = [...(data.phanLoai || []), ...(data.chuyenDong || [])];
        const dataToSave = { ...data, tags, taoBoi: user.uid, ownerType: 'admin' as const };

        try {
            if (editingExercise) {
                const docRef = doc(firestore, `publicExercises/${editingExercise.id}`);
                await updateDoc(docRef, { ...dataToSave, capNhatLuc: serverTimestamp() });
                toast({ title: "Thành công!", description: "Đã cập nhật bài tập." });
            } else {
                const colRef = collection(firestore, `publicExercises`);
                await addDoc(colRef, { ...dataToSave, taoLuc: serverTimestamp() });
                toast({ title: "Thành công!", description: "Đã thêm bài tập mới vào kho chung." });
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
        if (!exerciseToDelete || !firestore) return;
        const docRef = doc(firestore, `publicExercises/${exerciseToDelete.id}`);
        try {
            await deleteDoc(docRef);
            toast({ title: "Đã xóa", description: `Đã xóa bài tập "${exerciseToDelete.displayName}".`, variant: 'destructive' });
        } catch (error) {
            console.error("Error deleting exercise:", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể xóa bài tập.' });
        } finally {
            setIsDeleteDialogOpen(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setCsvFile(file);
            setIsParsing(true);
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setParsedData(results.data);
                    setIsParsing(false);
                },
                error: (error) => {
                    toast({ variant: 'destructive', title: 'Lỗi phân tích CSV', description: error.message });
                    setIsParsing(false);
                }
            });
        }
    };
    
    const handleImport = async () => {
        if (!firestore || !user || parsedData.length === 0) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không có dữ liệu hợp lệ để import.' });
            return;
        }
        setIsSubmitting(true);
        const batch = writeBatch(firestore);
        const collectionRef = collection(firestore, 'publicExercises');
    
        parsedData.forEach(row => {
            const docRef = doc(collectionRef);
            const phanLoai = row.phanLoai ? row.phanLoai.split(',').map((s: string) => s.trim()) : [];
            const chuyenDong = row.chuyenDong ? row.chuyenDong.split(',').map((s: string) => s.trim()) : [];
            const tags = [...phanLoai, ...chuyenDong];
    
            const exerciseData = {
                ten: row.ten || '',
                moTaNgan: row.moTaNgan || '',
                videoUrl: row.videoUrl || '',
                phanLoai,
                chuyenDong,
                tags,
                taoBoi: user.uid,
                ownerType: 'admin' as const,
                taoLuc: serverTimestamp(),
            };
            batch.set(docRef, exerciseData);
        });
    
        try {
            await batch.commit();
            toast({ title: 'Thành công!', description: `Đã import ${parsedData.length} bài tập vào kho chung.` });
            setIsImportDialogOpen(false);
            setParsedData([]);
            setCsvFile(null);
        } catch (error) {
            console.error("Error importing CSV:", error);
            toast({ variant: 'destructive', title: 'Lỗi Import', description: 'Không thể ghi dữ liệu vào Firestore.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Filtering ---
     const handleFilterChange = (category: string, value: string) => {
        setFilters(prev => {
            const current = prev[category] || [];
            if (current.includes(value)) {
                return { ...prev, [category]: current.filter(item => item !== value) };
            } else {
                return { ...prev, [category]: [...current, value] };
            }
        });
    };
    
    const filteredExercises = React.useMemo(() => {
        if (!exercises) return [];

        const activeFilterCategories = Object.keys(filters).filter(key => filters[key].length > 0);

        return exercises
            .filter(ex => ex.displayName && ex.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(ex => {
                if (activeFilterCategories.length === 0) return true;
                return activeFilterCategories.every(category => 
                    filters[category].some(filterValue => ex.tags?.includes(filterValue))
                );
            })
            .sort((a, b) => a.displayName.localeCompare(b.displayName));
    }, [exercises, searchTerm, filters]);


    const FilterCard = ({ title, options, category }: { title: string, options: string[], category: keyof typeof filters }) => (
        <Card>
            <CardHeader className="p-4 border-b">
                 <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{title}</CardTitle>
                    {filters[category].length > 0 && <Button variant="ghost" size="sm" onClick={() => setFilters(prev => ({...prev, [category]: []}))}>Xóa</Button>}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <ScrollArea className="h-40">
                    <div className="space-y-2">
                        {options.map(option => (
                           <div key={option} className="flex flex-row items-center space-x-3 space-y-0">
                                <Checkbox
                                    id={`filter-${category}-${option}`}
                                    checked={filters[category].includes(option)}
                                    onCheckedChange={() => handleFilterChange(category, option)}
                                />
                                <label
                                    htmlFor={`filter-${category}-${option}`}
                                    className="text-sm font-normal flex-1 cursor-pointer"
                                >
                                    {option}
                                </label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );

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
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Quản lý Thư viện Bài tập Chung</h1>
                <p className="mt-1 text-muted-foreground">Thêm, sửa, xóa các bài tập trong kho chung cho toàn bộ hệ thống.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
                {/* Filters Sidebar */}
                <div className="md:col-span-1 flex flex-col gap-6">
                    <FilterCard title="Phân Loại" options={PHAN_LOAI} category="phanLoai" />
                    <FilterCard title="Chuyển Động" options={CHUYEN_DONG} category="chuyenDong" />
                </div>
                
                {/* Main Content */}
                <div className="md:col-span-3">
                     <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input placeholder="Tìm kiếm bài tập..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full sm:w-auto">
                                            <Upload className="mr-2 h-4 w-4" />
                                            Import CSV
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl">
                                        <DialogHeader>
                                            <DialogTitle>Import bài tập từ file CSV</DialogTitle>
                                            <DialogDescription>
                                                Tải lên file CSV để thêm hàng loạt bài tập vào kho chung. Đảm bảo file của bạn có các cột: <strong>ten, moTaNgan, videoUrl, phanLoai, chuyenDong</strong>.
                                                <br/>
                                                Đối với các cột nhiều giá trị (phanLoai, chuyenDong), hãy ngăn cách bằng dấu phẩy (ví dụ: "Ngực, Tay").
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4 space-y-4">
                                            <Input type="file" accept=".csv" onChange={handleFileChange} />
                                            {isParsing && <p>Đang phân tích file...</p>}
                                            {parsedData.length > 0 && (
                                                <div className="mt-4">
                                                    <h4 className="font-semibold">Xem trước dữ liệu ({parsedData.length} bài tập):</h4>
                                                    <ScrollArea className="h-64 mt-2 border rounded-md">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Tên</TableHead>
                                                                    <TableHead>Phân Loại</TableHead>
                                                                    <TableHead>Chuyển Động</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {parsedData.slice(0, 10).map((row, i) => (
                                                                    <TableRow key={i}>
                                                                        <TableCell>{row.ten}</TableCell>
                                                                        <TableCell>{row.phanLoai}</TableCell>
                                                                        <TableCell>{row.chuyenDong}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                        {parsedData.length > 10 && <p className="p-4 text-sm text-muted-foreground">... và {parsedData.length - 10} bài tập khác.</p>}
                                                    </ScrollArea>
                                                </div>
                                            )}
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleImport} disabled={isSubmitting || parsedData.length === 0}>
                                                {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null}
                                                Xác nhận Import
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                                <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingExercise(null); }}>
                                    <DialogTrigger asChild>
                                        <Button className="w-full sm:w-auto" onClick={() => setEditingExercise(null)}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Thêm bài tập mới
                                        </Button>
                                    </DialogTrigger>
                                     <DialogContent className="sm:max-w-[600px]">
                                        <DialogHeader>
                                            <DialogTitle>{editingExercise ? 'Chỉnh sửa' : 'Tạo mới'} bài tập</DialogTitle>
                                            <DialogDescription>Điền thông tin chi tiết cho bài tập.</DialogDescription>
                                        </DialogHeader>
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
                                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                                        {form.formState.isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null}
                                                        Lưu bài tập
                                                    </Button>
                                                </DialogFooter>
                                            </form>
                                        </Form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md">
                                {isLoading ? (
                                    <div className="p-4 space-y-2">
                                        {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                                    </div>
                                ) : filteredExercises.length > 0 ? (
                                    filteredExercises.map((exercise, index) => (
                                        <Dialog key={exercise.id}>
                                            <div className={`flex items-center justify-between p-4 ${index < filteredExercises.length - 1 ? 'border-b' : ''}`}>
                                                <div className="flex items-center gap-4 cursor-pointer flex-1">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <button type="button" className="focus:outline-none">
                                                                     <Library className="h-5 w-5 text-muted-foreground" />
                                                                </button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Bài tập chung</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <DialogTrigger asChild>
                                                         <div>
                                                            <p className="font-semibold hover:text-primary transition-colors">{exercise.displayName}</p>
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {exercise.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                                            </div>
                                                        </div>
                                                    </DialogTrigger>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => { setEditingExercise(exercise); setIsFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { setExerciseToDelete(exercise); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                            <DialogContent className="sm:max-w-xl">
                                                <DialogHeader>
                                                    <DialogTitle>{exercise.displayName}</DialogTitle>
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
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này sẽ xóa vĩnh viễn bài tập "{exerciseToDelete?.displayName}" khỏi kho chung.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Xóa</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
