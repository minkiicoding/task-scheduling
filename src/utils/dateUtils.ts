export const toThaiYear = (year: number): number => year + 543;

export const getWeekDates = (date: Date): Date[] => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
};

export const getMonthDates = (date: Date): Date[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const startDay = firstDay.getDay();
  const endDay = lastDay.getDay();
  
  const dates: Date[] = [];
  
  // Previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    dates.push(d);
  }
  
  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    dates.push(new Date(year, month, i));
  }
  
  // Next month days
  const remainingDays = 42 - dates.length;
  for (let i = 1; i <= remainingDays; i++) {
    dates.push(new Date(year, month + 1, i));
  }
  
  return dates;
};

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  // Reset time to compare only dates
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return todayDate.getTime() === compareDate.getTime();
};

export const formatTimeWithoutSeconds = (time: string): string => {
  // Remove seconds from time string (HH:MM:SS -> HH:MM)
  if (!time) return '';
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
};
