'use client';
import React from 'react';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface WorkoutExerciseHistoryProps {
    clientId: string;
    workoutId?: string;
}

type Workout = {
    id: string;
    title: string;
    exercises: { tenBaiTap: string }[];
};

type CompletedWorkout = {
    id: string;
    title: string;
    completedAt: string;
    exercises?: { name: string; actualSets?: string; actualReps?: string; actualWeight?: string; notes?: string }[];
}

const ExerciseHistoryDialog = ({ clientId, exerciseName }: { clientId: string, exerciseName: string }) => {
    const firestore = useFirestore();

    const completedWorkoutsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'users', clientId, 'completedWorkouts'), orderBy('completedAt', 'desc')) : null,
    [firestore, clientId]);

    const { data: completedWorkouts, isLoading } = useCollection<CompletedWorkout>(completedWorkoutsQuery);
    
    const relevantHistory = React.useMemo(() => {
        if (!completedWorkouts) return [];
        return completedWorkouts.map(workout => {
            if (!workout || !Array.isArray(workout.exercises)) {
                return null;
            }
            const exerciseLog = workout.exercises.find(ex => ex.name === exerciseName);
            return exerciseLog ? { ...exerciseLog, date: new Date(workout.completedAt).toLocaleDateString('vi-VN') } : null;
        }).filter(Boolean);
    }, [completedWorkouts, exerciseName]);

    return (
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Lịch sử tập luyện: {exerciseName}</DialogTitle>
                <DialogDescription>Xem lại kết quả các buổi tập trước của khách hàng cho bài tập này.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-96">
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                ) : relevantHistory.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ngày</TableHead>
                                <TableHead>Hiệp</TableHead>
                                <TableHead>Lần/TG</TableHead>
                                <TableHead>Tạ (kg)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {relevantHistory.map((log, index) => (
                                <TableRow key={index}>
                                    <TableCell>{log!.date}</TableCell>
                                    <TableCell>{log!.actualSets || '-'}</TableCell>
                                    <TableCell>{log!.actualReps || '-'}</TableCell>
                                    <TableCell>{log!.actualWeight || '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-center text-muted-foreground p-8">Không tìm thấy lịch sử cho bài tập này.</p>
                )}
            </ScrollArea>
        </DialogContent>
    )
}

export default function WorkoutExerciseHistory({ clientId, workoutId }: WorkoutExerciseHistoryProps) {
    const firestore = useFirestore();

    const workoutDocRef = useMemoFirebase(() =>
        firestore && workoutId ? doc(firestore, 'users', clientId, 'workouts', workoutId) : null,
    [firestore, clientId, workoutId]);

    const { data: workout, isLoading } = useDoc<Workout>(workoutDocRef);

    if (isLoading) {
        return <Skeleton className="h-48 w-full" />;
    }

    if (!workout) {
        return <p className="text-muted-foreground p-4 text-center">Không tìm thấy chi tiết buổi tập.</p>;
    }

    return (
        <div className="space-y-2 mt-2">
            <h4 className="font-bold">{workout.title}</h4>
            {workout.exercises.map((exercise, index) => (
                <Dialog key={index}>
                    <Card className="p-3 flex items-center justify-between hover:bg-muted/50">
                        <p className="font-medium text-sm">{exercise.tenBaiTap}</p>
                        <DialogTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-7 w-7">
                                <History className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                    </Card>
                    <ExerciseHistoryDialog clientId={clientId} exerciseName={exercise.tenBaiTap} />
                </Dialog>
            ))}
        </div>
    );
}
