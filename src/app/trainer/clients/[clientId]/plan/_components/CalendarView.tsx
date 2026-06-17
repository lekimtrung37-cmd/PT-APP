

'use client';

import * as React from 'react';
import { format, isToday } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Appointment } from '../../_components/PlanTab';
import { Card } from '@/components/ui/card';

export const CalendarView = ({
    week,
    appointments,
    onDrop,
    onSlotClick,
    onAppointmentClick,
}: {
    week: Date[],
    appointments: Appointment[],
    onDrop: (e: React.DragEvent, date: Date) => void;
    onSlotClick: (date: Date) => void;
    onAppointmentClick: (appointment: Appointment) => void;
}) => {

    const getAppointmentsForDay = (day: Date) => {
        const startOfDay = new Date(day).setHours(0, 0, 0, 0);
        const endOfDay = new Date(day).setHours(23, 59, 59, 999);

        return appointments
            .filter(apt => {
                // Defensive check to ensure apt and apt.startAt exist
                if (!apt || !apt.startAt) {
                    return false;
                }
                const aptStart = apt.startAt.toDate();
                return aptStart >= new Date(startOfDay) && aptStart <= new Date(endOfDay);
            })
            .sort((a, b) => {
                if (!a.startAt || !b.startAt) return 0;
                return a.startAt.toMillis() - b.startAt.toMillis();
            });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
         <div className="grid grid-cols-7 border-l rounded-lg bg-card">
            {week.map(day => {
                const dayAppointments = getAppointmentsForDay(day);
                return (
                    <div 
                        key={day.toString()} 
                        className="border-r min-h-[600px]"
                        onDragOver={handleDragOver}
                        onDrop={(e) => onDrop(e, day)}
                        onClick={() => onSlotClick(day)}
                    >
                        <div className={cn("p-2 text-center border-b h-[77px]", isToday(day) && "bg-primary/10")}>
                            <p className="text-sm text-muted-foreground">{format(day, 'EEE', { locale: vi })}</p>
                            <p className={cn("text-2xl font-bold", isToday(day) && "text-primary")}>{format(day, 'd')}</p>
                        </div>
                        <div className="p-2 space-y-2">
                             {dayAppointments.map(apt => (
                                 <Card 
                                    key={apt.id} 
                                    className="p-2 text-xs hover:bg-muted/80 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent onSlotClick from firing
                                        onAppointmentClick(apt);
                                    }}
                                >
                                    <p className="font-semibold truncate">{apt.title}</p>
                                    <p className="text-muted-foreground">{format(apt.startAt.toDate(), 'h:mm a')}</p>
                                </Card>
                             ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
};
