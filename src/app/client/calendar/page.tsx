
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfWeek, addDays, subDays, getYear, subMonths, addMonths, subYears, addYears, set } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarPlus, Trash2, Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarView, type Appointment } from './_components/CalendarView';
import MonthView from './_components/MonthView';
import YearView from './_components/YearView';
import WorkoutSheet from './_components/WorkoutSheet';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function CalendarPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [view, setView] = React.useState<'week' | 'month' | 'year'>('week');
  
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  
  // State for the dialog form
  const [eventTitle, setEventTitle] = React.useState('');
  const [eventTime, setEventTime] = React.useState('09:00');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const appointmentsQuery = useMemoFirebase(() => 
    firestore && user ? query(
        collection(firestore, 'appointments'),
        where('clientId', '==', user.uid)
    ) : null
  , [firestore, user]);

  const { data: appointments, isLoading: areAppointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

  const isLoading = isUserLoading || areAppointmentsLoading;

  const handleSlotClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedAppointment(null);
    setEventTitle('');
    setEventTime('09:00');
    setIsDialogOpen(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
      // If the appointment has a workout attached, open the workout sheet.
      if (appointment.workoutId) {
        setSelectedAppointment(appointment);
        setIsSheetOpen(true);
      } else {
        // Otherwise, open the generic event dialog for editing/viewing.
        setSelectedAppointment(appointment);
        setSelectedDate(null);
        setEventTitle(appointment.title);
        setEventTime(format(appointment.startAt.toDate(), 'HH:mm'));
        setIsDialogOpen(true);
      }
  };

  const handleSaveEvent = async () => {
    if (!user || !firestore) return;
    if (!eventTitle.trim()) {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Tiêu đề không được để trống.'});
        return;
    }

    setIsSubmitting(true);
    const [hours, minutes] = eventTime.split(':').map(Number);
    
    try {
        if (selectedAppointment) {
            // Updating an existing appointment
            if (selectedAppointment.createdBy !== user.uid) {
                toast({ variant: 'destructive', title: 'Lỗi', description: 'Bạn không thể chỉnh sửa lịch do PT tạo.' });
                setIsSubmitting(false);
                return;
            }
            const appointmentRef = doc(firestore, 'appointments', selectedAppointment.id);
            const newStartAt = set(selectedAppointment.startAt.toDate(), { hours, minutes });
            await updateDoc(appointmentRef, {
                title: eventTitle,
                startAt: Timestamp.fromDate(newStartAt),
                endAt: Timestamp.fromDate(newStartAt), // Assuming 1hr duration for simplicity
            });
            toast({ title: 'Thành công', description: 'Đã cập nhật sự kiện.' });

        } else if (selectedDate) {
            // Creating a new appointment
            const startAt = set(selectedDate, { hours, minutes });
            await addDoc(collection(firestore, 'appointments'), {
                title: eventTitle,
                startAt: Timestamp.fromDate(startAt),
                endAt: Timestamp.fromDate(startAt),
                clientId: user.uid,
                clientName: user.displayName || user.email,
                createdBy: user.uid, // Mark who created it
            });
            toast({ title: 'Thành công', description: 'Đã tạo sự kiện mới.' });
        }
        setIsDialogOpen(false);
    } catch (error) {
        console.error("Error saving event:", error);
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể lưu sự kiện.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
      if (!user || !firestore || !selectedAppointment) return;
       if (selectedAppointment.createdBy !== user.uid) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Bạn không thể xóa lịch do PT tạo.' });
            return;
        }
      setIsSubmitting(true);
      try {
          await deleteDoc(doc(firestore, 'appointments', selectedAppointment.id));
          toast({ title: 'Đã xóa sự kiện', variant: 'destructive' });
          setIsDialogOpen(false);
      } catch (error) {
           console.error("Error deleting event:", error);
           toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể xóa sự kiện.' });
      } finally {
          setIsSubmitting(false);
      }
  }
  
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

  const handleYearViewMonthClick = (month: Date) => {
    setCurrentDate(month);
    setView('month');
  }

  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
  const week = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));

  const getCurrentTitle = () => {
    if (view === 'week') {
        const weekNumber = format(currentDate, 'w', { locale: vi });
        return `Tuần ${weekNumber}, ${getYear(currentDate)}`;
    }
    if (view === 'month') return format(currentDate, 'MMMM, yyyy', {locale: vi});
    if (view === 'year') return format(currentDate, 'yyyy');
    return '';
  }

  // Wrapper to prevent drop on client calendar
  const handleDrop = (e: React.DragEvent, date: Date) => {
      e.preventDefault();
  };


  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline">Lịch tập</h1>
            <p className="text-muted-foreground mt-1">
              Xem kế hoạch tập luyện và tự tạo lịch cá nhân.
            </p>
        </div>
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
      
      <div className="flex-1 overflow-auto">
        {isLoading ? <Skeleton className="h-[600px] w-full" /> : 
         view === 'week' ? <CalendarView week={week} appointments={appointments || []} onSlotClick={handleSlotClick} onAppointmentClick={handleAppointmentClick} onDrop={handleDrop} /> :
         view === 'month' ? <MonthView currentDate={currentDate} appointments={appointments || []} onSlotClick={handleSlotClick} /> :
         view === 'year' ? <YearView currentDate={currentDate} onMonthClick={handleYearViewMonthClick} /> : null
        }
      </div>

      <WorkoutSheet 
        appointment={selectedAppointment}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />

       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{selectedAppointment ? "Chỉnh sửa sự kiện" : "Tạo sự kiện mới"}</DialogTitle>
                    <DialogDescription>
                        {selectedAppointment ? `Chỉnh sửa sự kiện cho ngày ${format(selectedAppointment.startAt.toDate(), 'dd/MM/yyyy')}.` : `Tạo sự kiện mới cho ngày ${selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''}.`}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="event-title">Tiêu đề</Label>
                        <Input id="event-title" value={eventTitle} onChange={e => setEventTitle(e.target.value)} disabled={isSubmitting || (selectedAppointment?.createdBy !== user?.uid && selectedAppointment != null)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="event-time">Thời gian</Label>
                        <Input id="event-time" type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} disabled={isSubmitting || (selectedAppointment?.createdBy !== user?.uid && selectedAppointment != null)} />
                    </div>
                     {selectedAppointment && selectedAppointment.createdBy !== user?.uid && (
                        <p className="text-xs text-orange-500">Bạn không thể chỉnh sửa hoặc xóa sự kiện do PT của bạn tạo ra.</p>
                    )}
                </div>
                <DialogFooter className="sm:justify-between">
                    {selectedAppointment && selectedAppointment.createdBy === user?.uid && (
                         <Button variant="destructive" onClick={handleDeleteEvent} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleSaveEvent} disabled={isSubmitting || (selectedAppointment?.createdBy !== user?.uid && selectedAppointment != null)}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                            Lưu
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
