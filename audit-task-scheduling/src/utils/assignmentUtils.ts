// Check if an assignment requires partner approval (for OT periods)
export const requiresPartnerApproval = (
  date: string,
  startTime: string,
  endTime: string,
  isHolidayFn: (date: string) => boolean
): boolean => {
  // Check if it's a holiday
  if (isHolidayFn(date)) {
    return true;
  }

  // Check if it's weekend (Saturday = 6, Sunday = 0)
  const dayOfWeek = new Date(date).getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  // Check if start time is before 08:00 or end time is after 17:00
  const startHour = parseInt(startTime.split(':')[0]);
  const endHour = parseInt(endTime.split(':')[0]);
  const endMinute = parseInt(endTime.split(':')[1] || '0');
  
  if (startHour < 8 || endHour > 17 || (endHour === 17 && endMinute > 0)) {
    return true;
  }

  return false;
};
