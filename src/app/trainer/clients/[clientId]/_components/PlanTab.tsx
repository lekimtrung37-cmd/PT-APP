

'use client';
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ChevronLeft, ChevronRight, BookCopy, Folder, FileText, ClipboardList, Library, Users, ChevronDown, CalendarPlus, Calendar as CalendarIcon, ChevronsUpDown, Check, Info, History, Trash2 } from 'lucide-react';
import { addDays, startOfWeek, format, isToday, startOfMonth, endOfMonth, eachDayOfInterval, getDay, endOfWeek, getYear, setYear, getMonth, setMonth, addMonths, subMonths, addYears, subYears, subDays, set } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import WorkoutExerciseHistory from './WorkoutExerciseHistory';


import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp, getDoc, getDocs, orderBy, writeBatch, Timestamp, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarView } from '@/app/client/calendar/_components/CalendarView';


type ProgramTemplate = {
    id: string;
    ten: string;
    moTaNgan?: string;
    ownerType?: 'admin' | 'trainer';
};

type ProgramSession = {
    id: string;
    tieuDeBuoi: string;
    thuTu: number;
    exercises: any[];
}

export type Appointment = {
    id: string;
    title: string;
    trainerId: string;
    clientId?: string;
    clientName?: string;
    startAt: any; // Using `any` to avoid Timestamp type issues on client
    endAt: any;
    notes?: string;
    workoutId?: string;
    createdBy?: string;
};


const SessionDetailsSheet = ({ templateId, sessionId, ownerType, trainerId }: { templateId: string; sessionId: string; ownerType: 'admin' | 'trainer'; trainerId: string | undefined }) => {
    const firestore = useFirestore();

    const sessionDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        const path = ownerType === 'admin'
            ? `programTemplatesPublic/${templateId}/sessions/${sessionId}`
            : `programTemplatesTrainer/${trainerId}/items/${templateId}/sessions/${sessionId}`;
        return doc(firestore, path);
    }, [firestore, templateId, sessionId, ownerType, trainerId]);

    const { data: session, isLoading } = useDoc<ProgramSession>(sessionDocRef);

    return (
        <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
                <SheetTitle>{isLoading ? <Skeleton className="h-6 w-48" /> : session?.tieuDeBuoi}</SheetTitle>
                <SheetDescription>
                    Xem chi tiết các bài tập trong buổi tập này.
                </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-80px)] pr-4 mt-4">
                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : session?.exercises && session.exercises.length > 0 ? (
                    <div className="space-y-4">
                        {session.exercises.map((ex, index) => (
                             <Card key={index} className="p-3">
                                <p className="font-semibold text-sm">{ex.tenBaiTap}</p>
                                <div className="text-xs text-muted-foreground grid grid-cols-3 gap-x-4 gap-y-1 mt-2">
                                    <p>Sets: <span className="font-medium text-foreground">{ex.sets || '-'}</span></p>
                                    <p>Reps/Time: <span className="font-medium text-foreground">{ex.repsOrDuration || '-'}</span></p>
                                    <p>Load: <span className="font-medium text-foreground">{ex.loadKg || '-'} kg</span></p>
                                    <p>RPE: <span className="font-medium text-foreground">{ex.rpe || '-'}</span></p>
                                    <p>Tempo: <span className="font-medium text-foreground">{ex.tempo || '-'}</span></p>
                                    <p>Rest: <span className="font-medium text-foreground">{ex.rest || '-'}s</span></p>
                                </div>
                                {ex.notes && <p className="text-xs mt-2 italic border-t pt-2">"{ex.notes}"</p>}
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p>Buổi tập này chưa có bài tập nào.</p>
                )}
            </ScrollArea>
        </SheetContent>
    );
};


const ProgramSessions = ({ templateId, ownerType, trainerId }: { templateId: string, ownerType: 'admin' | 'trainer', trainerId: string | undefined }) => {
    const firestore = useFirestore();

    const sessionsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const path = ownerType === 'admin' 
            ? `programTemplatesPublic/${templateId}/sessions`
            : `programTemplatesTrainer/${trainerId}/items/${templateId}/sessions`;
        return query(collection(firestore, path), orderBy('thuTu'));
    }, [firestore, templateId, ownerType, trainerId]);

    const { data: sessions, isLoading } = useCollection<ProgramSession>(sessionsQuery);

    const handleDragStart = (e: React.DragEvent, session: ProgramSession) => {
        e.stopPropagation();
        const dragData = {
            type: 'programDay',
            templateId,
            ownerType,
            session,
        };
        e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    };

    if (isLoading) {
        return <div className="pl-4 pr-2 py-2 space-y-1"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
    }

    return (
        <div className="pl-4 pr-2 py-2 space-y-1">
            {sessions && sessions.map(session => (
                <Sheet key={session.id}>
                    <div 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, session)}
                        className="flex items-center gap-2 p-2 rounded-md bg-background hover:bg-muted cursor-grab active:cursor-grabbing group"
                    >
                        <span className="text-xs font-semibold text-muted-foreground">{`Buổi ${session.thuTu}`}</span>
                         <SheetTrigger asChild>
                             <p className="text-sm font-medium flex-1 cursor-pointer hover:underline">{session.tieuDeBuoi}</p>
                        </SheetTrigger>
                    </div>
                     <SessionDetailsSheet
                        templateId={templateId}
                        sessionId={session.id}
                        ownerType={ownerType}
                        trainerId={trainerId}
                    />
                </Sheet>
            ))}
        </div>
    );
};

const LibraryItem = ({ item, trainerId }: { item: ProgramTemplate, trainerId: string | undefined }) => {
    const handleDragStart = (e: React.DragEvent) => {
        const dragData = {
            type: 'programTemplate',
            ...item
        };
        e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    };

    return (
       <AccordionItem value={item.id} className="border-none">
            <AccordionTrigger 
                draggable 
                onDragStart={handleDragStart} 
                className="p-3 border rounded-lg bg-card cursor-grab active:cursor-grabbing flex items-center gap-3 hover:bg-muted/50 hover:no-underline"
                onClick={(e) => e.stopPropagation()}
            >
                 <BookCopy className="h-4 w-4 text-muted-foreground"/>
                 <span className="font-semibold text-sm flex-1 text-left">{item.ten}</span>
            </AccordionTrigger>
            <AccordionContent>
                <ProgramSessions templateId={item.id} ownerType={item.ownerType || 'trainer'} trainerId={trainerId} />
            </AccordionContent>
       </AccordionItem>
    )
};

const MonthView = ({ currentDate, onSlotClick, appointments }: { currentDate: Date, onSlotClick: (date: Date) => void, appointments: Appointment[] }) => {
    const firstDay = startOfMonth(currentDate);
    const lastDay = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastDay });
    const startDayOfWeek = getDay(firstDay);
    const calendarDays = Array.from({ length: startDayOfWeek }).map((_, i) => addDays(firstDay, -(startDayOfWeek - i))).concat(daysInMonth);
    
    while(calendarDays.length % 7 !== 0) {
        calendarDays.push(addDays(calendarDays[calendarDays.length - 1], 1));
    }

    const getEventsForDay = (day: Date) => {
        return appointments
            .filter(apt => {
                if (!apt || !apt.startAt) return false;
                const aptDate = apt.startAt.toDate();
                return aptDate.getDate() === day.getDate() && aptDate.getMonth() === day.getMonth() && aptDate.getFullYear() === day.getFullYear();
            })
            .sort((a,b) => a.startAt.toMillis() - b.startAt.toMillis());
    }

    return (
        <div className="border-t border-l">
            <div className="grid grid-cols-7">
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                    <div key={day} className="text-center font-semibold text-xs py-2 border-b border-r text-muted-foreground">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                    const dayEvents = getEventsForDay(day);
                    return (
                        <div 
                            key={index}
                            onClick={() => onSlotClick(day)}
                            className={cn(
                                "border-b border-r p-2 min-h-[120px] cursor-pointer hover:bg-secondary/50 transition-colors",
                                getMonth(day) !== getMonth(currentDate) && "bg-muted/30 text-muted-foreground",
                                isToday(day) && "relative"
                            )}
                        >
                            <span className={cn("text-sm", isToday(day) && "bg-primary rounded-full h-6 w-6 flex items-center justify-center text-primary-foreground font-bold")}>
                                {format(day, 'd')}
                            </span>
                            <div className="mt-1 space-y-1">
                                {dayEvents.map(event => (
                                    <div key={event.id} className="flex items-center gap-1.5 text-xs truncate">
                                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
                                        <span className="truncate">{event.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

const YearView = ({ currentDate, onMonthClick }: { currentDate: Date, onMonthClick: (month: Date) => void }) => {
    const year = getYear(currentDate);
    const months = Array.from({length: 12}, (_, i) => new Date(year, i, 1));
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {months.map(month => {
                 const firstDayOfMonth = startOfMonth(month);
                 const lastDayOfMonth = endOfMonth(month);
                 const days = eachDayOfInterval({start: firstDayOfMonth, end: lastDayOfMonth});
                 const startingDay = getDay(firstDayOfMonth);
                return (
                    <div key={getMonth(month)} className="p-2">
                        <button onClick={() => onMonthClick(month)} className="font-semibold text-center w-full mb-2 hover:text-primary">{format(month, 'MMMM', {locale: vi})}</button>
                        <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
                            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => <div key={d}>{d[0]}</div>)}
                        </div>
                         <div className="grid grid-cols-7 text-center text-xs">
                           {Array.from({length: startingDay}).map((_, i) => <div key={`empty-${i}`}></div>)}
                           {days.map(day => (
                               <div key={day.toISOString()} className={cn("p-1", isToday(day) && "bg-primary rounded-full text-primary-foreground")}>
                                   {format(day, 'd')}
                               </div>
                           ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

const PlaceholderContent = ({ title, icon: Icon }: { title: string, icon: React.ElementType }) => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg mt-4 h-full">
        <Icon className="w-10 h-10" />
        <p className="mt-4 text-sm font-semibold">{title} đang được xây dựng</p>
    </div>
);

const ProgramLibrary = ({ searchTerm }: { searchTerm: string }) => {
    const { user: trainer, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [activeTab, setActiveTab] = React.useState("all");

    const publicTemplatesQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'programTemplatesPublic'), where('isHidden', '!=', true)) : null
    , [firestore]);
    const { data: publicTemplates, isLoading: isPublicLoading } = useCollection<ProgramTemplate>(publicTemplatesQuery);

    const trainerTemplatesQuery = useMemoFirebase(() => {
        if (!firestore || !trainer) return null;
        return collection(firestore, `programTemplatesTrainer/${trainer.uid}/items`);
    }, [firestore, trainer]);
    const { data: trainerTemplates, isLoading: isTrainerLoading } = useCollection<ProgramTemplate>(trainerTemplatesQuery);

    const isLoading = isUserLoading || isPublicLoading || isTrainerLoading;
    
    const getFilteredTemplates = () => {
        const term = searchTerm.toLowerCase();
        let source: ProgramTemplate[] = [];

        const publicWithFlag = publicTemplates?.map(t => ({ ...t, ownerType: 'admin' as const })) || [];
        const trainerWithFlag = trainerTemplates?.map(t => ({ ...t, ownerType: 'trainer' as const })) || [];

        if (activeTab === 'all') {
            source = [...publicWithFlag, ...trainerWithFlag];
        } else if (activeTab === 'public') {
            source = publicWithFlag;
        } else if (activeTab === 'mine') {
            source = trainerWithFlag;
        }
        
        return source.filter(t => t.ten.toLowerCase().includes(term));
    }
    
    const filteredTemplates = getFilteredTemplates();

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="programs" className="border-none">
                <AccordionTrigger>Giáo án mẫu</AccordionTrigger>
                <AccordionContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-2">
                            <TabsTrigger value="all">Tất cả</TabsTrigger>
                            <TabsTrigger value="public">Kho chung</TabsTrigger>
                            <TabsTrigger value="mine">Của tôi</TabsTrigger>
                        </TabsList>
                        <ScrollArea className="h-72">
                            <Accordion type="multiple" className="space-y-2">
                                {isLoading ? <Skeleton className="h-20 w-full" /> : filteredTemplates.map(t => <LibraryItem key={t.id} item={t} trainerId={trainer?.uid} />)}
                            </Accordion>
                        </ScrollArea>
                    </Tabs>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="assessments">
                <AccordionTrigger>Mẫu đánh giá</AccordionTrigger>
                <AccordionContent>
                        <PlaceholderContent title="Mẫu đánh giá" icon={ClipboardList} />
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="forms">
                <AccordionTrigger>Biểu mẫu & Câu hỏi</AccordionTrigger>
                <AccordionContent>
                    <PlaceholderContent title="Biểu mẫu" icon={FileText} />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
};

type FormattedSession = {
    value: string; // "templateId/sessionId"
    label: string; // "Template Name - Session Name"
    type: 'programDay';
    templateId: string;
    ownerType: 'admin' | 'trainer';
    session: ProgramSession;
}


export function PlanTab({ clientId }: { clientId?: string }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user: trainer, isUserLoading: isTrainerUserLoading } = useUser();
    
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [selectedSlot, setSelectedSlot] = React.useState<{date: Date, time: string} | null>(null);
    const [selectedTemplate, setSelectedTemplate] = React.useState<any | null>(null);
    const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null);
    const [view, setView] = React.useState<'week' | 'month' | 'year'>('week');
    
    const [isComboOpen, setIsComboOpen] = React.useState(false);
    const [comboSearch, setComboSearch] = React.useState("");
    const [selectedEventTitle, setSelectedEventTitle] = React.useState('');


    // --- Data Fetching for ComboBox ---
    const publicTemplatesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'programTemplatesPublic'), where('isHidden', '!=', true)) : null, [firestore]);
    const { data: publicTemplates, isLoading: isPublicLoading } = useCollection<ProgramTemplate>(publicTemplatesQuery);
    const trainerTemplatesQuery = useMemoFirebase(() => trainer ? collection(firestore, `programTemplatesTrainer/${trainer.uid}/items`) : null, [firestore, trainer]);
    const { data: trainerTemplates, isLoading: isTrainerLoading } = useCollection<ProgramTemplate>(trainerTemplatesQuery);

    const [allSessions, setAllSessions] = React.useState<FormattedSession[]>([]);
    const [areAllSessionsLoading, setAreAllSessionsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchAllSessions = async () => {
            if (!firestore || isPublicLoading || isTrainerLoading) return;

            setAreAllSessionsLoading(true);
            const formattedSessions: FormattedSession[] = [];
            const allTemplates = [
                ...(publicTemplates?.map(t => ({ ...t, ownerType: 'admin' as const })) || []),
                ...(trainerTemplates?.map(t => ({ ...t, ownerType: 'trainer' as const })) || [])
            ];

            for (const template of allTemplates) {
                const path = template.ownerType === 'admin'
                    ? `programTemplatesPublic/${template.id}/sessions`
                    : `programTemplatesTrainer/${trainer?.uid}/items/${template.id}/sessions`;
                const sessionsSnapshot = await getDocs(query(collection(firestore, path), orderBy('thuTu')));
                sessionsSnapshot.forEach(doc => {
                    const session = { id: doc.id, ...doc.data() } as ProgramSession;
                    formattedSessions.push({
                        value: `${template.id}/${session.id}`,
                        label: `${template.ten} - ${session.tieuDeBuoi}`,
                        type: 'programDay',
                        templateId: template.id,
                        ownerType: template.ownerType,
                        session: session,
                    });
                });
            }
            setAllSessions(formattedSessions);
            setAreAllSessionsLoading(false);
        };
        fetchAllSessions();
    }, [firestore, publicTemplates, trainerTemplates, isPublicLoading, isTrainerLoading, trainer?.uid]);


    const appointmentsQuery = useMemoFirebase(() => {
        if (!firestore || !trainer) return null;

        const baseQuery = collection(firestore, 'appointments');
        
        if (clientId) {
            return query(baseQuery, where("clientId", "==", clientId));
        } else {
            return query(baseQuery, where("trainerId", "==", trainer.uid));
        }
    }, [firestore, clientId, trainer]);


    const { data: appointments } = useCollection<Appointment>(appointmentsQuery);
    
    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
    const week = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));

    const handlePrev = () => {
        if (view === 'week') setCurrentDate(subDays(currentDate, 7));
        else if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
        else if (view === 'year') setCurrentDate(subYears(currentDate, 1));
    }

    const handleNext = () => {
        if (view === 'week') setCurrentDate(addDays(currentDate, 7));
        else if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
        else if (view === 'year') setCurrentDate(addYears(currentDate, 1));
    }

    const handleDrop = (e: React.DragEvent, date: Date) => {
        const item = JSON.parse(e.dataTransfer.getData("application/json"));
        onDrop(date, "09:00", item);
    };
    
    const onDrop = (date: Date, time: string, item: any) => {
        setSelectedAppointment(null);
        setSelectedSlot({date, time});
        setSelectedTemplate(item);
        setSelectedEventTitle(item?.session?.tieuDeBuoi || item?.ten || '');
        setIsDialogOpen(true);
    };

    const handleSlotClick = (date: Date) => {
        setSelectedAppointment(null);
        setSelectedSlot({date, time: "09:00"});
        setSelectedTemplate(null);
        setSelectedEventTitle('');
        setIsDialogOpen(true);
    }
    
    const handleAppointmentClick = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setSelectedSlot(null);
        setSelectedTemplate(null);
        setSelectedEventTitle(appointment.title);
        setIsDialogOpen(true);
    }
    
    const handleYearViewMonthClick = (month: Date) => {
        setCurrentDate(month);
        setView('month');
    }

    const handleAssignWorkout = async () => {
        if (!firestore || !trainer) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Thiếu thông tin để gán buổi tập.' });
            return;
        }

        const cleanup = () => {
            setIsSubmitting(false);
            setIsDialogOpen(false);
            setSelectedSlot(null);
            setSelectedAppointment(null);
            setSelectedTemplate(null);
            setSelectedEventTitle('');
        };

        setIsSubmitting(true);
        try {
            if (selectedAppointment) {
                // Logic for updating an existing appointment
                const { time } = selectedSlot || { time: format(selectedAppointment.startAt.toDate(), 'HH:mm') };
                const [hours, minutes] = time.split(':').map(Number);
                const newStartAt = set(selectedAppointment.startAt.toDate(), { hours, minutes });

                const appointmentRef = doc(firestore, 'appointments', selectedAppointment.id);
                await updateDoc(appointmentRef, { 
                    startAt: Timestamp.fromDate(newStartAt), 
                    endAt: Timestamp.fromDate(newStartAt),
                    title: selectedEventTitle 
                });
                toast({ title: 'Thành công!', description: `Đã cập nhật lịch hẹn.` });

            } else if (selectedSlot) {
                // Logic for creating a new appointment/workout
                const { date, time } = selectedSlot;
                const [hours, minutes] = time.split(':').map(Number);
                const startAt = set(date, { hours, minutes });

                const appointmentColRef = collection(firestore, 'appointments');

                if (selectedTemplate && selectedTemplate.type === 'programDay') {
                    // Assigning a workout from a template
                    if (!clientId) {
                        toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng chọn khách hàng khi gán buổi tập từ thư viện.' });
                        setIsSubmitting(false);
                        return;
                    }
                    const { session } = selectedTemplate;
                    const workoutData = { title: session.tieuDeBuoi, exercises: session.exercises || [] };
                    const workoutId = format(startAt, 'yyyy-MM-dd');
                    const workoutDocRef = doc(firestore, `users/${clientId}/workouts/${workoutId}`);
                    
                    const batch = writeBatch(firestore);
                    batch.set(workoutDocRef, { id: workoutId, ...workoutData, date: workoutId });
                    
                    const appointmentData = { 
                        title: workoutData.title, 
                        startAt: Timestamp.fromDate(startAt), 
                        endAt: Timestamp.fromDate(startAt),
                        clientId: clientId, 
                        trainerId: trainer.uid,
                        workoutId: workoutId 
                    };
                    batch.set(doc(appointmentColRef), appointmentData);
        
                    await batch.commit();
                    toast({ title: 'Thành công!', description: `Đã gán "${workoutData.title}" cho ngày ${format(date, 'dd/MM/yyyy')}.` });

                } else {
                     // Creating a general event or a new workout from scratch
                    if (!selectedEventTitle) {
                         toast({ variant: 'destructive', title: 'Lỗi', description: 'Tiêu đề sự kiện không được để trống.' });
                         setIsSubmitting(false);
                         return;
                    }
                     const appointmentData = {
                        title: selectedEventTitle,
                        startAt: Timestamp.fromDate(startAt),
                        endAt: Timestamp.fromDate(startAt),
                        trainerId: trainer.uid,
                        createdBy: trainer.uid,
                        ...(clientId && {clientId: clientId}) // Add clientId if it exists
                    };
                     await addDoc(appointmentColRef, appointmentData);
                     toast({ title: 'Thành công!', description: `Đã tạo sự kiện "${appointmentData.title}".` });
                }
            }
        } catch (error: any) {
            console.error("Error assigning workout/event:", error);
            toast({ variant: 'destructive', title: 'Lỗi', description: error.message || 'Không thể tạo sự kiện.' });
        } finally {
            cleanup();
        }
    };

    const handleDeleteAppointment = async () => {
        if (!firestore || !selectedAppointment) return;
        setIsSubmitting(true);
        try {
            const appointmentRef = doc(firestore, 'appointments', selectedAppointment.id);
            await deleteDoc(appointmentRef);

            if(selectedAppointment.workoutId && selectedAppointment.clientId) {
                const workoutRef = doc(firestore, 'users', selectedAppointment.clientId, 'workouts', selectedAppointment.workoutId);
                await deleteDoc(workoutRef);
            }

            toast({ title: 'Đã xóa sự kiện', variant: 'destructive' });
        } catch (error) {
            toast({ title: 'Lỗi', description: 'Không thể xóa sự kiện.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
            setIsDialogOpen(false);
            setSelectedAppointment(null);
        }
    }
    
    const getCurrentTitle = () => {
        if (view === 'week') {
            const weekNumber = format(currentDate, 'w', { locale: vi });
            return `Tuần ${weekNumber}, ${getYear(currentDate)}`;
        }
        if (view === 'month') return format(currentDate, 'MMMM, yyyy', {locale: vi});
        if (view === 'year') return format(currentDate, 'yyyy');
        return '';
    }
    
    return (
        <div className="flex flex-col gap-6 h-full">
             <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl font-bold font-headline">
                    {clientId ? 'Xây dựng Kế hoạch' : 'Lịch làm việc'}
                </h1>
                 <div className="flex items-center gap-2 w-full sm:w-auto">
                     <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-auto">
                        <TabsList>
                            <TabsTrigger value="week">Tuần</TabsTrigger>
                            <TabsTrigger value="month">Tháng</TabsTrigger>
                            <TabsTrigger value="year">Năm</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Button variant="outline" size="icon" onClick={() => handleSlotClick(new Date())}>
                        <CalendarPlus className="h-4 w-4" />
                    </Button>
                    <div className="flex-grow sm:flex-grow-0" />
                    <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Hôm nay</Button>
                    <Button variant="outline" size="icon" onClick={handlePrev}><ChevronLeft className="h-4 w-4"/></Button>
                    <Button variant="outline" size="icon" onClick={handleNext}><ChevronRight className="h-4 w-4"/></Button>
                    <span className="font-semibold w-48 text-center">{getCurrentTitle()}</span>
                </div>
            </div>
            <div className={cn("gap-6 flex-1 overflow-hidden", clientId ? "grid grid-cols-1 lg:grid-cols-4" : "")}>
                {clientId && (
                    <Card className="lg:col-span-1 flex flex-col">
                        <CardHeader>
                            <CardTitle>Thư viện</CardTitle>
                            <div className="relative pt-2">
                                <Search className="absolute left-2.5 top-4 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Tìm kiếm..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto -mt-4 flex flex-col">
                        <ProgramLibrary searchTerm={searchTerm} />
                        </CardContent>
                    </Card>
                )}

                <div className={cn(clientId ? "lg:col-span-3" : "w-full")}>
                    <ScrollArea className="h-full">
                         {view === 'week' && <CalendarView week={week} appointments={appointments || []} onDrop={handleDrop} onSlotClick={handleSlotClick} onAppointmentClick={handleAppointmentClick} />}
                         {view === 'month' && <MonthView currentDate={currentDate} onSlotClick={handleSlotClick} appointments={appointments || []} />}
                         {view === 'year' && <YearView currentDate={currentDate} onMonthClick={handleYearViewMonthClick} />}
                    </ScrollArea>
                </div>
            </div>
             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedAppointment ? 'Chi tiết Sự kiện' : 'Thêm Sự kiện'}</DialogTitle>
                        <DialogDescription>
                            {selectedAppointment ? 'Xem lại hoặc xóa sự kiện đã lên lịch.' : 'Thêm một sự kiện mới vào lịch.'}
                        </DialogDescription>
                    </DialogHeader>
                     {(selectedSlot || selectedAppointment) && (
                        <div className="py-4 space-y-4">
                            <p><strong>Ngày:</strong> {(selectedSlot?.date instanceof Date && !isNaN(selectedSlot.date.getTime())) ? format(selectedSlot.date, 'eeee, dd/MM/yyyy', { locale: vi }) : (selectedAppointment?.startAt ? format(selectedAppointment.startAt.toDate(), 'eeee, dd/MM/yyyy', { locale: vi }) : '')}</p>
                           
                           <div className="space-y-2">
                                <Label htmlFor="event-time">Giờ bắt đầu</Label>
                                <Input 
                                    id="event-time"
                                    type="time" 
                                    defaultValue={selectedAppointment ? format(selectedAppointment.startAt.toDate(), 'HH:mm') : selectedSlot?.time}
                                    onChange={(e) => setSelectedSlot(prev => ({date: prev?.date || new Date(), time: e.target.value}))}
                                />
                           </div>
                           
                           <div>
                                <Label>Nội dung</Label>
                                {selectedAppointment ? (
                                     <Input className="font-semibold mt-2" value={selectedEventTitle} onChange={e => setSelectedEventTitle(e.target.value)} />
                                ) : (
                                    <Popover open={isComboOpen} onOpenChange={setIsComboOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={isComboOpen}
                                                className="w-full justify-between mt-2"
                                                disabled={!!selectedEventTitle && !selectedTemplate}
                                            >
                                                {selectedTemplate
                                                    ? allSessions.find((s) => s.value === selectedTemplate.value)?.label
                                                    : selectedEventTitle || "Chọn buổi tập từ giáo án..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Tìm buổi tập..." onValueChange={setComboSearch}/>
                                                <CommandEmpty>
                                                    {areAllSessionsLoading ? 'Đang tải...' : 'Không tìm thấy buổi tập.'}
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    <ScrollArea className="h-72">
                                                        {allSessions.filter(s => s.label.toLowerCase().includes(comboSearch.toLowerCase())).map((s) => (
                                                            <CommandItem
                                                                key={s.value}
                                                                value={s.label}
                                                                onSelect={() => {
                                                                    setSelectedTemplate(s);
                                                                    setSelectedEventTitle(s.session.tieuDeBuoi);
                                                                    setIsComboOpen(false);
                                                                }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", selectedTemplate?.value === s.value ? "opacity-100" : "opacity-0")} />
                                                                {s.label}
                                                            </CommandItem>
                                                        ))}
                                                    </ScrollArea>
                                                </CommandGroup>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                )}
                           </div>
                           {!selectedAppointment && (
                            <>
                               <p className="text-xs text-muted-foreground text-center">hoặc</p>
                               <div className="space-y-2">
                                  <Label htmlFor="event-title">Nhập tiêu đề sự kiện (nếu không chọn từ thư viện)</Label>
                                  <Input id="event-title" value={selectedEventTitle} onChange={(e) => {
                                      setSelectedEventTitle(e.target.value);
                                      setSelectedTemplate(null);
                                  }} placeholder="Ví dụ: Họp với team" />
                              </div>
                            </>
                           )}
                        </div>
                    )}
                    <DialogFooter className="justify-between">
                         {selectedAppointment ? (
                            <Button variant="destructive" onClick={handleDeleteAppointment} disabled={isSubmitting}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Xóa
                            </Button>
                         ) : <div></div>}
                        <div className="flex gap-2">
                             <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                             <Button onClick={handleAssignWorkout} disabled={isSubmitting || (!selectedTemplate && !selectedEventTitle && !selectedAppointment)}>
                                {isSubmitting ? 'Đang lưu...' : (selectedAppointment ? 'Lưu thay đổi' : 'Xác nhận')}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
