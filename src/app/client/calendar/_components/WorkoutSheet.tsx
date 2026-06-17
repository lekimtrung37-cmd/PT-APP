
'use client';
import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { useDoc, useFirestore, useMemoFirebase, useUser, useCollection } from '@/firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { type Appointment } from './CalendarView';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Loader2, Video } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { YoutubeEmbed } from '@/components/coach/YoutubeEmbed';


interface Workout {
    id: string;
    title: string;
    exercises: Exercise[];
}

interface Exercise {
  tenBaiTap: string;
  sets?: string;
  repsOrDuration?: string;
  loadKg?: string;
  rpe?: string;
  videoUrl?: string; // This might not be directly available here
}

interface LoggedExercise extends Exercise {
    actualSets?: string;
    actualReps?: string;
    actualWeight?: string;
}

// Full exercise definition from library
interface ExerciseWithVideo extends Exercise {
    displayName: string;
    videoUrl?: string;
}


interface WorkoutSheetProps {
    appointment: Appointment | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function WorkoutSheet({ appointment, open, onOpenChange }: WorkoutSheetProps) {
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [loggedExercises, setLoggedExercises] = React.useState<Record<number, Partial<LoggedExercise>>>({});
    const [exercisesWithVideos, setExercisesWithVideos] = React.useState<ExerciseWithVideo[]>([]);
    
    const workoutDocRef = useMemoFirebase(() => {
        if (!firestore || !user || !appointment?.workoutId) return null;
        return doc(firestore, 'users', user.uid, 'workouts', appointment.workoutId);
    }, [firestore, user, appointment]);

    const { data: workout, isLoading: isWorkoutLoading } = useDoc<Workout>(workoutDocRef);
    
    const publicExercisesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'publicExercises') : null, [firestore]);
    const { data: publicExercises } = useCollection<ExerciseWithVideo>(publicExercisesQuery, {
      transform: (data: any) => ({ ...data, displayName: data.ten || data.name || data.tenBaiTap || 'Unnamed Exercise' })
    });
    
    const trainerId = appointment?.trainerId;
    const trainerExercisesQuery = useMemoFirebase(() => 
        firestore && trainerId ? collection(firestore, `trainerExercises/${trainerId}/items`) : null, 
    [firestore, trainerId]);
    const { data: trainerExercises } = useCollection<ExerciseWithVideo>(trainerExercisesQuery, {
      transform: (data: any) => ({ ...data, displayName: data.ten || data.name || data.tenBaiTap || 'Unnamed Exercise' })
    });


    React.useEffect(() => {
        const fetchVideoUrls = async () => {
            if (workout && workout.exercises) {
                const combinedLibrary = [...(publicExercises || []), ...(trainerExercises || [])];
                const enrichedExercises = workout.exercises.map(exercise => {
                    const libraryMatch = combinedLibrary.find(libEx => libEx.displayName === exercise.tenBaiTap);
                    return {
                        ...exercise,
                        displayName: exercise.tenBaiTap,
                        videoUrl: libraryMatch?.videoUrl || undefined
                    };
                });
                setExercisesWithVideos(enrichedExercises);
            }
        };

        fetchVideoUrls();
    }, [workout, publicExercises, trainerExercises]);
    
    // Reset logs when sheet opens for a new workout
    React.useEffect(() => {
        if (open) {
            setLoggedExercises({});
        }
    }, [open]);

    const handleLogChange = (index: number, field: keyof LoggedExercise, value: string) => {
        setLoggedExercises(prev => ({
        ...prev,
        [index]: {
            ...prev[index],
            [field]: value
        }
        }));
    };

    const handleSaveResults = async () => {
        if (!user || !firestore || !workout) return;
        setIsSubmitting(true);

        const completedWorkoutData = {
            title: workout.title,
            originalWorkoutId: workout.id,
            completedAt: new Date().toISOString(),
            exercises: workout.exercises.map((ex, index) => ({
                name: ex.tenBaiTap,
                actualSets: loggedExercises[index]?.actualSets || '',
                actualReps: loggedExercises[index]?.actualReps || '',
                actualWeight: loggedExercises[index]?.actualWeight || '',
            }))
        };
        
        const docId = `${workout.id}_${Date.now()}`;
        const completedWorkoutRef = doc(firestore, 'users', user.uid, 'completedWorkouts', docId);

        try {
            await setDoc(completedWorkoutRef, completedWorkoutData);
            toast({
                title: "Đã lưu kết quả!",
                description: "Kết quả buổi tập của bạn đã được ghi lại.",
            });
            onOpenChange(false);
        } catch(error) {
            console.error("Error saving workout results: ", error);
            toast({
                variant: 'destructive',
                title: "Lỗi!",
                description: "Không thể lưu kết quả. Vui lòng thử lại.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLoading = isUserLoading || isWorkoutLoading;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                    {isLoading ? <Skeleton className="h-6 w-3/4" /> : <SheetTitle>{workout?.title || appointment?.title}</SheetTitle>}
                    <SheetDescription>
                        Xem chi tiết buổi tập và điền kết quả thực tế của bạn.
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-160px)] pr-6">
                    <div className="py-4">
                        {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        ) : workout ? (
                             <ul className="space-y-4">
                                {exercisesWithVideos.map((exercise, index) => (
                                <li key={index} className="flex flex-col gap-3 p-3 bg-secondary/50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">{exercise.tenBaiTap}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Kế hoạch: {exercise.sets} hiệp x {exercise.repsOrDuration}
                                                {exercise.loadKg && ` @ ${exercise.loadKg}kg`}
                                                {exercise.rpe && ` (RPE ${exercise.rpe})`}
                                            </p>
                                        </div>
                                        {exercise.videoUrl && (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" aria-label={`Xem video ${exercise.tenBaiTap}`}>
                                                    <Video className="w-5 h-5 text-primary" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl">
                                                <DialogHeader>
                                                    <DialogTitle>{exercise.tenBaiTap}</DialogTitle>
                                                </DialogHeader>
                                                <div className="aspect-video w-full">
                                                    <YoutubeEmbed url={exercise.videoUrl} />
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <Label htmlFor={`actual-sets-${index}`} className="text-xs">Số hiệp</Label>
                                            <Input id={`actual-sets-${index}`} type="number" placeholder={String(exercise.sets)} className="h-8" value={loggedExercises[index]?.actualSets || ''} onChange={(e) => handleLogChange(index, 'actualSets', e.target.value)} disabled={isSubmitting} />
                                        </div>
                                        <div>
                                            <Label htmlFor={`actual-reps-${index}`} className="text-xs">Số lần</Label>
                                            <Input id={`actual-reps-${index}`} type="number" placeholder={String(exercise.repsOrDuration)} className="h-8" value={loggedExercises[index]?.actualReps || ''} onChange={(e) => handleLogChange(index, 'actualReps', e.target.value)} disabled={isSubmitting} />
                                        </div>
                                        <div>
                                            <Label htmlFor={`actual-weight-${index}`} className="text-xs">Số kg</Label>
                                            <Input id={`actual-weight-${index}`} type="number" placeholder={exercise.loadKg || '--'} className="h-8" value={loggedExercises[index]?.actualWeight || ''} onChange={(e) => handleLogChange(index, 'actualWeight', e.target.value)} disabled={isSubmitting} />
                                        </div>
                                    </div>
                                </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-muted-foreground">Đây là một sự kiện chung hoặc chưa có giáo án chi tiết.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                 {workout && (
                    <SheetFooter className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
                        <Button className="w-full" onClick={handleSaveResults} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : (
                                <CheckCircle className="mr-2 h-4 w-4" />
                            )}
                            Lưu Kết quả
                        </Button>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    )
}
