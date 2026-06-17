
'use client';
import React from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CompactExerciseHistoryProps {
    clientId: string;
    exerciseName: string;
}

type CompletedWorkout = {
    id: string;
    completedAt: string;
    exercises?: { name: string; actualSets?: string; actualReps?: string; actualWeight?: string; }[];
}

export default function CompactExerciseHistory({ clientId, exerciseName }: CompactExerciseHistoryProps) {
    const firestore = useFirestore();

    const completedWorkoutsQuery = useMemoFirebase(() => 
        firestore ? query(
            collection(firestore, 'users', clientId, 'completedWorkouts'), 
            orderBy('completedAt', 'desc'),
            limit(5) // Limit to the last 5 workouts
        ) : null,
    [firestore, clientId]);

    const { data: completedWorkouts, isLoading } = useCollection<CompletedWorkout>(completedWorkoutsQuery);
    
    const relevantHistory = React.useMemo(() => {
        if (!completedWorkouts) return [];
        return completedWorkouts
            .map(workout => {
                if (!workout || !Array.isArray(workout.exercises)) {
                    return null;
                }
                const exerciseLog = workout.exercises.find(ex => ex.name === exerciseName);
                return exerciseLog ? { ...exerciseLog, date: new Date(workout.completedAt).toLocaleDateString('vi-VN') } : null;
            })
            .filter(Boolean);
    }, [completedWorkouts, exerciseName]);

    if (isLoading) {
        return <Skeleton className="h-16 w-full" />;
    }

    if (relevantHistory.length === 0) {
        return (
            <div className="text-xs text-muted-foreground italic flex items-center gap-2 mt-2">
                <History className="w-3 h-3"/>
                <span>Chưa có lịch sử cho bài tập này.</span>
            </div>
        );
    }

    return (
        <div className="mt-3">
             <h4 className="text-xs font-semibold mb-1 flex items-center gap-2">
                <History className="w-3 h-3"/>
                Lịch sử gần đây
            </h4>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="h-6 text-xs px-2">Ngày</TableHead>
                        <TableHead className="h-6 text-xs px-2">Hiệp</TableHead>
                        <TableHead className="h-6 text-xs px-2">Lần/TG</TableHead>
                        <TableHead className="h-6 text-xs px-2">Tạ (kg)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {relevantHistory.slice(0, 3).map((log, index) => (
                        <TableRow key={index}>
                            <TableCell className="text-xs py-1 px-2">{log!.date}</TableCell>
                            <TableCell className="text-xs py-1 px-2">{log!.actualSets || '-'}</TableCell>
                            <TableCell className="text-xs py-1 px-2">{log!.actualReps || '-'}</TableCell>
                            <TableCell className="text-xs py-1 px-2 font-semibold">{log!.actualWeight || '-'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
