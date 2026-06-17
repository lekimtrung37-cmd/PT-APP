
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Upload, Award, Weight, Ruler, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase, useStorage } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { getLocalDateString } from '@/lib/utils';
import { uploadFile } from '@/lib/chatService';
import { ref, deleteObject } from 'firebase/storage';


// --- TYPE DEFINITIONS ---
type ProgressMetric = {
    id: string;
    date: string;
    weight?: number;
    measurements?: {
        chest?: number;
        waist?: number;
        hips?: number;
    };
};

type PersonalRecord = {
    id: string;
    exercise: string;
    record: string;
    date: string;
};

type ProgressPhoto = {
    id: string;
    date: string;
    imageUrl: string;
    storagePath: string;
    'data-ai-hint'?: string;
};
// --- END TYPE DEFINITIONS ---

export default function ProgressPage() {
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();

    // --- DIALOG STATE ---
    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = React.useState(false);
    const [isPhotoDialogOpen, setIsPhotoDialogOpen] = React.useState(false);
    const [isPrDialogOpen, setIsPrDialogOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    // --- FORM STATE ---
    const [newWeight, setNewWeight] = React.useState('');
    const [newChest, setNewChest] = React.useState('');
    const [newWaist, setNewWaist] = React.useState('');
    const [newHips, setNewHips] = React.useState('');
    const [newPrExercise, setNewPrExercise] = React.useState('');
    const [newPrRecord, setNewPrRecord] = React.useState('');
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setSelectedFile(null);
            setPreviewUrl(null);
        }
    };

    // --- DATA FETCHING ---
    const metricsQuery = useMemoFirebase(() => 
        firestore && user ? query(collection(firestore, 'users', user.uid, 'progressMetrics'), orderBy('date', 'asc')) : null
    , [firestore, user]);
    const { data: metrics, isLoading: areMetricsLoading } = useCollection<ProgressMetric>(metricsQuery);

    const prsQuery = useMemoFirebase(() =>
        firestore && user ? query(collection(firestore, 'users', user.uid, 'personalRecords'), orderBy('date', 'desc')) : null
    , [firestore, user]);
    const { data: personalRecords, isLoading: arePrsLoading } = useCollection<PersonalRecord>(prsQuery);
    
    const photosQuery = useMemoFirebase(() =>
        firestore && user ? query(collection(firestore, 'users', user.uid, 'progressPhotos'), orderBy('date', 'desc')) : null
    , [firestore, user]);
    const { data: progressPhotos, isLoading: arePhotosLoading } = useCollection<ProgressPhoto>(photosQuery);
    // --- END DATA FETCHING ---
    
    const isLoading = isUserLoading || areMetricsLoading || arePrsLoading || arePhotosLoading;

    const weightData = React.useMemo(() => 
        metrics?.filter(m => m.weight).map(m => ({ date: new Date(m.date).toLocaleDateString('vi-VN'), weight: m.weight })) || []
    , [metrics]);
    
    const measurementsData = React.useMemo(() =>
        metrics?.filter(m => m.measurements).map(m => ({ date: new Date(m.date).toLocaleDateString('vi-VN'), ...m.measurements })) || []
    , [metrics]);

    const handleUpdateMetrics = async () => {
        if (!firestore || !user) return;
        if (!newWeight && !newChest && !newWaist && !newHips) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng nhập ít nhất một chỉ số.' });
            return;
        }
        setIsSubmitting(true);
        const dataToSave: Partial<ProgressMetric> & { createdAt: any } = {
            date: getLocalDateString(),
            createdAt: serverTimestamp()
        };
        if (newWeight) dataToSave.weight = parseFloat(newWeight);
        if (newChest || newWaist || newHips) {
            dataToSave.measurements = {
                chest: newChest ? parseFloat(newChest) : undefined,
                waist: newWaist ? parseFloat(newWaist) : undefined,
                hips: newHips ? parseFloat(newHips) : undefined,
            }
        }
        
        try {
            const metricsColRef = collection(firestore, 'users', user.uid, 'progressMetrics');
            await addDoc(metricsColRef, dataToSave);
            toast({ title: "Thành công!", description: "Số đo của bạn đã được cập nhật." });
            setIsUpdateDialogOpen(false);
            setNewWeight(''); setNewChest(''); setNewWaist(''); setNewHips('');
        } catch (error) {
            console.error("Error updating metrics: ", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể cập nhật số đo.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUploadPhoto = async () => {
        if (!firestore || !user || !storage || !selectedFile) {
             toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng chọn một file ảnh.' });
            return;
        }
        setIsSubmitting(true);
        
        const uploadPath = `progress_photos/${user.uid}/${Date.now()}_${selectedFile.name}`;
        
        try {
            const { downloadURL, storagePath } = await uploadFile(storage, selectedFile, uploadPath);

            const dataToSave = {
                userId: user.uid,
                date: new Date().toISOString(),
                imageUrl: downloadURL,
                storagePath: storagePath,
                'data-ai-hint': 'fitness progress',
                createdAt: serverTimestamp()
            };

            const photosColRef = collection(firestore, 'users', user.uid, 'progressPhotos');
            await addDoc(photosColRef, dataToSave);
            toast({ title: "Thành công!", description: "Ảnh tiến độ của bạn đã được tải lên." });
            setIsPhotoDialogOpen(false);
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error) {
             console.error("Error uploading photo: ", error);
             toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể tải ảnh lên.' });
        } finally {
             setIsSubmitting(false);
        }
    };

    const handleDeletePhoto = async (photo: ProgressPhoto) => {
        if (!firestore || !storage || !user || !photo.storagePath) {
             toast({
                title: "Lỗi!",
                description: "Không thể xóa ảnh do thiếu thông tin (đường dẫn lưu trữ).",
                variant: 'destructive'
            });
            return;
        }
        
        const photoDocRef = doc(firestore, 'users', user.uid, 'progressPhotos', photo.id);
        const imageRef = ref(storage, photo.storagePath);
        
        try {
            await Promise.all([
                deleteDoc(photoDocRef),
                deleteObject(imageRef)
            ]);
            
            toast({
                title: "Đã xóa ảnh!",
                variant: 'destructive'
            });
        } catch (error) {
            console.error("Error deleting photo:", error);
            toast({
                title: "Lỗi!",
                description: "Không thể xóa ảnh. Có thể bạn không có quyền hoặc file không tồn tại.",
                variant: 'destructive'
            });
        }
    };


    const handleUpdatePr = async () => {
         if (!firestore || !user || !newPrExercise || !newPrRecord) {
             toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng điền đầy đủ thông tin.' });
            return;
        }
        setIsSubmitting(true);
        const dataToSave = {
            userId: user.uid,
            exercise: newPrExercise,
            record: newPrRecord,
            date: getLocalDateString(),
            createdAt: serverTimestamp()
        };
        try {
            const prsColRef = collection(firestore, 'users', user.uid, 'personalRecords');
            await addDoc(prsColRef, dataToSave);
            toast({ title: "Thành công!", description: "PR của bạn đã được cập nhật." });
            setIsPrDialogOpen(false);
            setNewPrExercise(''); setNewPrRecord('');
        } catch (error) {
             console.error("Error updating PR: ", error);
             toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể cập nhật PR.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Theo dõi Tiến độ</h1>
                <p className="text-muted-foreground mt-1">
                    Ghi lại và trực quan hóa hành trình fitness của bạn.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Column */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Weight className="w-5 h-5 text-primary" />
                                Biểu đồ Cân nặng (kg)
                            </CardTitle>
                            <CardDescription>
                                Theo dõi sự thay đổi cân nặng của bạn theo thời gian.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-[300px] w-full" /> : 
                             <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={weightData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={{ stroke: 'hsl(var(--muted-foreground))' }} />
                                    <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={{ stroke: 'hsl(var(--muted-foreground))' }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--background))',
                                            borderColor: 'hsl(var(--border))'
                                        }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="weight" name="Cân nặng" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="space-y-1.5">
                                <CardTitle className="flex items-center gap-2">
                                    <Ruler className="w-5 h-5 text-primary" />
                                    Số đo Cơ thể (cm)
                                </CardTitle>
                                <CardDescription>Ghi lại các số đo cơ thể để theo dõi chi tiết hơn.</CardDescription>
                            </div>
                             <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <Upload className="mr-2 h-4 w-4" /> Cập nhật số đo
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Cập nhật số đo cơ thể</DialogTitle>
                                        <DialogDescription>Nhập các số đo mới nhất của bạn.</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                         <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="weight" className="text-right">Cân nặng (kg)</Label>
                                            <Input id="weight" type="number" className="col-span-3" value={newWeight} onChange={e => setNewWeight(e.target.value)} disabled={isSubmitting} />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="chest" className="text-right">Ngực (cm)</Label>
                                            <Input id="chest" type="number" className="col-span-3" value={newChest} onChange={e => setNewChest(e.target.value)} disabled={isSubmitting} />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="waist" className="text-right">Eo (cm)</Label>
                                            <Input id="waist" type="number" className="col-span-3" value={newWaist} onChange={e => setNewWaist(e.target.value)} disabled={isSubmitting} />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="hips" className="text-right">Hông (cm)</Label>
                                            <Input id="hips" type="number" className="col-span-3" value={newHips} onChange={e => setNewHips(e.target.value)} disabled={isSubmitting} />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" onClick={handleUpdateMetrics} disabled={isSubmitting}>{isSubmitting ? 'Đang lưu...' : 'Lưu'}</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-24 w-full" /> :
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ngày</TableHead>
                                        <TableHead className="text-right">Ngực</TableHead>
                                        <TableHead className="text-right">Eo</TableHead>
                                        <TableHead className="text-right">Hông</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {measurementsData.length > 0 ? measurementsData.slice().reverse().map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{row.date}</TableCell>
                                            <TableCell className="text-right">{row.chest || '-'}</TableCell>
                                            <TableCell className="text-right">{row.waist || '-'}</TableCell>
                                            <TableCell className="text-right">{row.hips || '-'}</TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="text-center h-24">Chưa có dữ liệu số đo.</TableCell></TableRow>}
                                </TableBody>
                            </Table>}
                        </CardContent>
                    </Card>
                </div>

                 {/* Right Column */}
                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-primary" />
                                Kỷ lục Cá nhân (PRs)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                           {isLoading ? Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />) :
                           personalRecords && personalRecords.length > 0 ? personalRecords.map((pr) => (
                                <div key={pr.id} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                                    <div>
                                        <p className="font-semibold">{pr.exercise}</p>
                                        <p className="text-sm text-muted-foreground">{new Date(pr.date).toLocaleDateString('vi-VN')}</p>
                                    </div>
                                    <span className="text-lg font-bold text-primary">{pr.record}</span>
                                </div>
                           )) : <p className="text-sm text-muted-foreground text-center">Chưa có kỷ lục nào.</p>}
                        </CardContent>
                        <CardFooter>
                            <Dialog open={isPrDialogOpen} onOpenChange={setIsPrDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full">Cập nhật PR</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Cập nhật Kỷ lục Cá nhân (PR)</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="exercise">Bài tập</Label>
                                             <Input id="exercise" value={newPrExercise} onChange={e => setNewPrExercise(e.target.value)} placeholder="Ví dụ: Squat" disabled={isSubmitting} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="record">Kỷ lục mới (kg, km, v.v..)</Label>
                                            <Input id="record" value={newPrRecord} onChange={e => setNewPrRecord(e.target.value)} placeholder="Ví dụ: 125kg" disabled={isSubmitting} />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="button" onClick={handleUpdatePr} disabled={isSubmitting}>{isSubmitting ? 'Đang lưu...' : 'Lưu PR'}</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                     <div>
                        <CardTitle>Hình ảnh Tiến độ</CardTitle>
                        <CardDescription>So sánh sự thay đổi của bạn qua các thời kỳ.</CardDescription>
                    </div>
                     <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Upload className="mr-2 h-4 w-4" /> Tải ảnh lên
                            </Button>
                        </DialogTrigger>
                         <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Tải ảnh tiến độ mới</DialogTitle>
                                <DialogDescription>Chọn ảnh từ thiết bị của bạn. Ảnh sẽ được hiển thị cho PT của bạn.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                               <div className="space-y-2">
                                    <Label htmlFor="progress-photo">Chọn ảnh</Label>
                                    <Input id="progress-photo" type="file" accept="image/*" onChange={handleFileChange} disabled={isSubmitting} />
                                </div>
                                {previewUrl && (
                                    <div className="mt-4 flex justify-center">
                                        <Image src={previewUrl} alt="Xem trước ảnh" width={200} height={300} className="rounded-md object-cover" />
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button type="button" onClick={handleUploadPhoto} disabled={isSubmitting || !selectedFile}>
                                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải lên...</> : 'Lưu ảnh'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                 <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {isLoading ? Array.from({length: 4}).map((_,i) => <Skeleton key={i} className="aspect-[2/3] w-full" />) :
                    progressPhotos && progressPhotos.length > 0 ? progressPhotos.map((photo) => (
                        <Dialog key={photo.id}>
                            <div className="relative group overflow-hidden rounded-lg">
                                <DialogTrigger asChild>
                                    <button className="absolute inset-0 w-full h-full cursor-pointer z-10">
                                        <span className="sr-only">Xem ảnh {photo.id}</span>
                                    </button>
                                </DialogTrigger>
                                <Image src={photo.imageUrl} alt={new Date(photo.date).toLocaleDateString()} width={400} height={600} className="object-cover aspect-[2/3] w-full h-full transition-transform group-hover:scale-105" data-ai-hint={photo['data-ai-hint'] || 'fitness progress'} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent transition-opacity group-hover:bg-black/70" />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Hành động này sẽ xóa vĩnh viễn ảnh tiến độ. Không thể hoàn tác.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeletePhoto(photo)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                Xác nhận Xóa
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <p className="absolute bottom-3 left-3 font-bold text-white text-lg z-10">{new Date(photo.date).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'})}</p>
                            </div>
                            <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>Ảnh tiến độ ngày {new Date(photo.date).toLocaleDateString('vi-VN')}</DialogTitle>
                                </DialogHeader>
                                <Image src={photo.imageUrl} alt={`Ảnh tiến độ ngày ${new Date(photo.date).toLocaleDateString('vi-VN')}`} width={800} height={1200} className="w-full h-auto rounded-md" />
                            </DialogContent>
                         </Dialog>
                    )) : (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            Chưa có ảnh tiến độ nào được tải lên.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
