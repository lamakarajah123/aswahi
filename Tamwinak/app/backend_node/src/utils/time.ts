export function isWithinWorkingHours(hoursStr: string | null | undefined): boolean {
    if (!hoursStr || hoursStr.toLowerCase() === 'all' || hoursStr === '24/7' || hoursStr.trim() === '') return true;
    
    try {
        const [start, end] = hoursStr.split('-');
        if (!start || !end) return true;

        // Use Palestinian Time (UTC+2) for consistent checks
        // Offset is usually +2, but we can use Intl to be sure of local time if server is different
        // For simplicity and speed in a Node environment, we use UTC+2
        const now = new Date();
        const palestineTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Gaza' }));
        const currentMinutes = palestineTime.getHours() * 60 + palestineTime.getMinutes();

        const [startH, startM] = start.trim().split(':').map(Number);
        const [endH, endM] = end.trim().split(':').map(Number);

        if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return true;

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (endMinutes < startMinutes) {
            // Case for overnight (e.g., 22:00-06:00)
            return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }

        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch (e) {
        console.error('Error parsing working hours:', hoursStr, e);
        return true; // Default to true if format is weird
    }
}
