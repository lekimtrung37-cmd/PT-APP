
'use client';
import * as React from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Utensils, Loader2, PlusCircle, Camera, Upload, Trash2 } from "lucide-react";
import { useUser, useFirestore, useCollection, useMemoFirebase, useStorage, useDoc } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, deleteDoc, where, writeBatch } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getLocalDateString } from '@/lib/utils';
import { format, parseISO, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { uploadFile } from '@/lib/chatService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar } from '@/components/ui/calendar';


// --- TYPE DEFINITIONS ---
interface UserProfile {
    id: string;
    name: string;
    assignedPtId?: string;
}

interface NutritionPlanItem {
    id: string;
    type: 'meal' | 'habit';
    time: string;
    description: string;
}

interface FoodLog {
    id: string;
    date: string; // YYYY-MM-DD
    description: string;
    imageUrl?: string;
    storagePath?: string;
    createdAt: any; // Timestamp
}

const itemIcons = {
    meal: Utensils,
    habit: Utensils,
};

// --- MAIN PAGE COMPONENT ---
export default function NutritionPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();

    // Dialog state
    const [isLogDialogOpen, setIsLogDialogOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Calendar & Filtering state
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());

    // Form state
    const [logDate, setLogDate] = React.useState(getLocalDateString());
    const [logDescription, setLogDescription] = React.useState('');
    const [logImage, setLogImage] = React.useState<File | null>(null);
    const [imagePreview, setImagePreview] = React.useState<string | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [isCapturing, setIsCapturing] = React.useState(false);
    const [capturedImage, setCapturedImage] = React.useState<string | null>(null);

    // --- Data Fetching ---
    const userProfileRef = useMemoFirebase(() =>
        firestore && user ? doc(firestore, 'users', user.uid) : null
    , [firestore, user]);
    const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const nutritionPlanQuery = useMemoFirebase(() => 
        firestore && user ? query(collection(firestore, 'users', user.uid, 'nutritionPlan'), orderBy('time', 'asc')) : null
    , [firestore, user]);
    const { data: timelineItems, isLoading: areItemsLoading } = useCollection<NutritionPlanItem>(nutritionPlanQuery);

    const foodLogsQuery = useMemoFirebase(() =>
        firestore && user ? query(collection(firestore, 'users', user.uid, 'foodLogs'), orderBy('createdAt', 'desc')) : null
    , [firestore, user]);
    const { data: allFoodLogs, isLoading: areLogsLoading } = useCollection<FoodLog>(foodLogsQuery);

     const filteredFoodLogs = React.useMemo(() => {
        if (!allFoodLogs || !selectedDate) return [];
        return allFoodLogs.filter(log => {
            try {
                return isSameDay(parseISO(log.date), selectedDate);
            } catch (e) {
                console.warn("Invalid date format in food log:", log.date);
                return false;
            }
        });
    }, [allFoodLogs, selectedDate]);

    const loggedDays = React.useMemo(() => {
        if (!allFoodLogs) return [];
        const dates = allFoodLogs.map(log => {
            try {
                return parseISO(log.date);
            } catch (e) {
                return null;
            }
        }).filter(Boolean) as Date[];
        return dates;
    }, [allFoodLogs]);

    // --- Camera Logic ---
     React.useEffect(() => {
        if (isCapturing) {
            const getCameraPermission = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setHasCameraPermission(true);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (error) {
                    console.error('Error accessing camera:', error);
                    setHasCameraPermission(false);
                    toast({
                        variant: 'destructive',
                        title: 'Không thể truy cập Camera',
                        description: 'Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt.',
                    });
                    setIsCapturing(false);
                }
            };
            getCameraPermission();
        } else {
             if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        }
    }, [isCapturing, toast]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setCapturedImage(dataUrl);
            setImagePreview(dataUrl); // Also set preview
            setIsCapturing(false); // Turn off camera view
        }
    };

    // --- Handlers ---
    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogImage(file);
            setCapturedImage(null); // Clear captured image if a file is chosen
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const dataURLtoFile = (dataurl: string, filename: string): File => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    }

    const resetForm = () => {
        setLogDate(getLocalDateString());
        setLogDescription('');
        setLogImage(null);
        setImagePreview(null);
        setCapturedImage(null);
        setIsCapturing(false);
    };

    const handleSubmitLog = async () => {
        if (!user || !firestore || !storage) return;

        let finalImageFile: File | null = logImage;
        if (capturedImage && !logImage) {
            finalImageFile = dataURLtoFile(capturedImage, `capture-${Date.now()}.jpg`);
        }
        
        if (!logDescription.trim() && !finalImageFile) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng nhập mô tả hoặc thêm hình ảnh.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const foodLogData: {
                userId: string;
                date: string;
                description: string;
                createdAt: any;
                imageUrl?: string;
                storagePath?: string;
            } = {
                userId: user.uid,
                date: logDate,
                description: logDescription,
                createdAt: serverTimestamp(),
            };

            if (finalImageFile) {
                const uploadPath = `food_logs/${user.uid}/${Date.now()}_${finalImageFile.name}`;
                const result = await uploadFile(storage, finalImageFile, uploadPath);
                foodLogData.imageUrl = result.downloadURL;
                foodLogData.storagePath = result.storagePath;
            }

            const batch = writeBatch(firestore);

            // 1. Add food log document
            const foodLogColRef = collection(firestore, 'users', user.uid, 'foodLogs');
            const foodLogRef = doc(foodLogColRef);
            batch.set(foodLogRef, foodLogData);

            // 2. Add notification for the trainer
            if (userProfile?.assignedPtId) {
                const notificationColRef = collection(firestore, 'users', userProfile.assignedPtId, 'notifications');
                const notificationRef = doc(notificationColRef);
                batch.set(notificationRef, {
                    title: `Hoạt động mới từ ${userProfile.name || 'khách hàng'}`,
                    description: `${userProfile.name} vừa ghi lại một bữa ăn.`,
                    link: `/trainer/clients/${user.uid}?tab=nutrition`,
                    isRead: false,
                    createdAt: serverTimestamp(),
                });
            }

            await batch.commit();

            toast({ title: 'Thành công!', description: 'Đã ghi lại bữa ăn của bạn.' });
            setIsLogDialogOpen(false);
            resetForm();

        } catch (error) {
            console.error("Error saving food log:", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể lưu lại bữa ăn.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
     const handleDeleteLog = async (log: FoodLog) => {
        if (!firestore || !storage || !user) return;
        
        const logDocRef = doc(firestore, 'users', user.uid, 'foodLogs', log.id);
        
        try {
            await deleteDoc(logDocRef);

            if (log.storagePath) {
                const imageRef = ref(storage, log.storagePath);
                await deleteObject(imageRef);
            }
            
            toast({ title: "Đã xóa bữa ăn", variant: "destructive" });
        } catch (error) {
            console.error("Error deleting food log:", error);
            toast({
                title: "Lỗi!",
                description: "Không thể xóa bữa ăn này. Vui lòng thử lại.",
                variant: 'destructive'
            });
        }
    };


    const isLoading = isUserLoading || areItemsLoading || areLogsLoading || isUserProfileLoading;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Dinh dưỡng & Lối sống</h1>
                    <p className="text-muted-foreground mt-1">
                        Xem kế hoạch PT thiết lập và ghi lại nhật ký ăn uống hàng ngày của bạn.
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1">
                    <Card>
                        <CardContent className="p-2">
                             <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                locale={vi}
                                className="p-0"
                                modifiers={{
                                    logged: loggedDays,
                                }}
                                modifiersStyles={{
                                    logged: {
                                        position: 'relative',
                                    }
                                }}
                                components={{
                                    DayContent: ({ date, ...props }) => {
                                        const isLogged = loggedDays.some(loggedDate => isSameDay(loggedDate, date));
                                        return (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <span>{date.getDate()}</span>
                                                {isLogged && (
                                                    <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />
                                                )}
                                            </div>
                                        );
                                    }
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Nhật ký ăn uống</CardTitle>
                                <CardDescription>
                                    Các bữa ăn bạn đã ghi cho ngày {selectedDate ? format(selectedDate, "dd/MM/yyyy") : ''}
                                </CardDescription>
                            </div>
                            <Dialog open={isLogDialogOpen} onOpenChange={(isOpen) => { setIsLogDialogOpen(isOpen); if (!isOpen) resetForm(); }}>
                                <DialogTrigger asChild>
                                    <Button><PlusCircle className="mr-2 h-4 w-4"/> Thêm bữa ăn</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Ghi lại bữa ăn</DialogTitle>
                                        <DialogDescription>Mô tả và thêm hình ảnh bữa ăn của bạn.</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-4">
                                        {isCapturing ? (
                                            <div className="space-y-2">
                                                 <div className="w-full aspect-video bg-muted rounded-md overflow-hidden relative">
                                                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                                    <canvas ref={canvasRef} className="hidden" />
                                                </div>
                                                 {hasCameraPermission === false && (
                                                    <Alert variant="destructive">
                                                        <AlertTitle>Yêu cầu quyền truy cập Camera</AlertTitle>
                                                        <AlertDescription>Vui lòng cho phép truy cập camera để sử dụng tính năng này.</AlertDescription>
                                                    </Alert>
                                                 )}
                                                 <div className="flex justify-center gap-2">
                                                    <Button onClick={handleCapture} disabled={hasCameraPermission !== true}>Chụp ảnh</Button>
                                                    <Button variant="outline" onClick={() => setIsCapturing(false)}>Hủy</Button>
                                                 </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-2">
                                                    <Label>Ngày</Label>
                                                    <Input id="log-date" type="date" value={logDate} onChange={e => setLogDate(e.target.value)} disabled={isSubmitting} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="log-desc">Mô tả bữa ăn</Label>
                                                    <Textarea id="log-desc" placeholder="Hôm nay bạn ăn gì?" value={logDescription} onChange={e => setLogDescription(e.target.value)} disabled={isSubmitting}/>
                                                </div>
                                                
                                                {imagePreview ? (
                                                     <div className="space-y-2 text-center">
                                                         <Image src={imagePreview} alt="Ảnh xem trước" width={400} height={300} className="rounded-md mx-auto" />
                                                         <Button variant="link" onClick={() => { setImagePreview(null); setCapturedImage(null); setLogImage(null); }}>Xóa ảnh</Button>
                                                     </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                                        <Button variant="outline" className="w-full" onClick={() => setIsCapturing(true)}><Camera className="mr-2 h-4 w-4"/> Chụp ảnh</Button>
                                                        <Button asChild variant="outline" className="w-full"><Label htmlFor="log-image-upload" className="cursor-pointer flex items-center justify-center"><Upload className="mr-2 h-4 w-4" /> Tải ảnh lên</Label></Button>
                                                        <Input id="log-image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} disabled={isSubmitting} />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleSubmitLog} disabled={isSubmitting || isCapturing}>
                                            {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null} Lưu lại
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <Skeleton className="h-48 w-full" />
                                    <Skeleton className="h-48 w-full" />
                                </div>
                            ) : filteredFoodLogs && filteredFoodLogs.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {filteredFoodLogs.map(log => (
                                        <Card key={log.id} className="group relative">
                                            <CardHeader className="p-0">
                                                {log.imageUrl ? (
                                                    <Image src={log.imageUrl} alt={log.description} width={400} height={300} className="object-cover aspect-[4/3] rounded-t-lg" />
                                                ) : (
                                                    <div className="aspect-[4/3] bg-muted rounded-t-lg flex items-center justify-center">
                                                        <Utensils className="w-12 h-12 text-muted-foreground"/>
                                                    </div>
                                                )}
                                            </CardHeader>
                                            <CardContent className="p-4">
                                                <p className="font-semibold text-sm truncate">{log.description || "Bữa ăn không có mô tả"}</p>
                                                 <p className="text-xs text-muted-foreground">
                                                    {log.createdAt ? format(log.createdAt.toDate(), 'HH:mm') : 'Đang gửi...'}
                                                </p>
                                            </CardContent>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                     <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 className="h-4 w-4"/>
                                                     </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle>
                                                        <AlertDialogDescription>Hành động này sẽ xóa vĩnh viễn bữa ăn đã ghi. Không thể hoàn tác.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteLog(log)}>Xóa</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                                    <p>Chưa có bữa ăn nào được ghi lại cho ngày này.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Lịch trình gợi ý trong ngày</CardTitle>
                    <CardDescription>
                        Các mốc thời gian cho bữa ăn và thói quen lành mạnh do PT thiết lập.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="space-y-8 pl-6">
                            {Array.from({length: 3}).map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="w-24 h-6" />
                                    <Skeleton className="h-12 flex-1" />
                                </div>
                            ))}
                        </div>
                    ) : timelineItems && timelineItems.length > 0 ? (
                        <div className="relative pl-6">
                            <div className="absolute left-9 top-0 bottom-0 w-px bg-border -translate-x-1/2"></div>
                            <div className="space-y-8">
                                {timelineItems.map((item, index) => {
                                    const Icon = itemIcons[item.type as keyof typeof itemIcons] || Utensils;
                                    return (
                                    <div key={index} className="relative flex items-center gap-4">
                                        <div className="absolute left-9 top-1 h-3 w-3 rounded-full bg-primary border-2 border-background -translate-x-1/2 z-10"></div>
                                        <div className="flex items-center gap-4 text-sm font-semibold text-muted-foreground w-24">
                                            <Icon className="w-5 h-5 text-primary" />
                                            <span>{item.time}</span>
                                        </div>
                                        <div className="flex-1 p-3 bg-secondary rounded-lg">
                                            <p className="font-medium text-secondary-foreground">{item.description}</p>
                                        </div>
                                    </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                         <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                            <p>Kế hoạch dinh dưỡng của bạn chưa được thiết lập.</p>
                            <p className="text-sm mt-2">Vui lòng liên hệ với PT để tạo kế hoạch.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
