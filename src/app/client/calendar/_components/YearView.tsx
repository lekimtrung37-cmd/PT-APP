
'use client';

import { getYear, getMonth, format, isToday, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';


const YearView = ({ currentDate, onMonthClick }: { currentDate: Date, onMonthClick: (month: Date) => void }) => {
    const year = getYear(currentDate);
    const months = Array.from({length: 12}, (_, i) => new Date(year, i, 1));
    
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-card p-4 rounded-lg border">
            {months.map(month => {
                 const firstDayOfMonth = startOfMonth(month);
                 const lastDayOfMonth = endOfMonth(month);
                 const days = eachDayOfInterval({start: firstDayOfMonth, end: lastDayOfMonth});
                 const startingDay = getDay(firstDayOfMonth);
                return (
                    <div key={getMonth(month)} className="p-2 hover:bg-muted/50 rounded-lg">
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
};

export default YearView;
