
'use client';
import { addDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, getMonth, format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { type Appointment } from './CalendarView';

const MonthView = ({ currentDate, onSlotClick, appointments }: { currentDate: Date, onSlotClick: (date: Date) => void, appointments: Appointment[] }) => {
    const firstDay = startOfMonth(currentDate);
    const lastDay = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastDay });
    const startDayOfWeek = getDay(firstDay);

    // Fill days from previous month
    const calendarDays = Array.from({ length: startDayOfWeek }).map((_, i) => addDays(firstDay, -(startDayOfWeek - i))).concat(daysInMonth);
    
    // Fill days from next month to make a full 7-day week row
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
        <div className="border-t border-l rounded-lg">
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
                                {dayEvents.slice(0, 3).map(event => (
                                    <div key={event.id} className="flex items-center gap-1.5 text-xs truncate">
                                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
                                        <span className="truncate">{event.title}</span>
                                    </div>
                                ))}
                                {dayEvents.length > 3 && <div className="text-xs text-muted-foreground mt-1">...và {dayEvents.length - 3} sự kiện khác</div>}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default MonthView;
