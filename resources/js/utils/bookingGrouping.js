/**
 * Groups consecutive multi-day bookings (sharing group_id) and
 * weekly recurring bookings (sharing recurrence_group_id) visually
 * so they don't clutter lists.
 * 
 * @param {Array} bookings Raw flat bookings list from the API
 * @returns {Array} List of grouped or standalone booking objects
 */
export function groupBookingsList(bookings) {
    if (!bookings || !Array.isArray(bookings)) return [];
    
    const groups = new Map(); // key: groupId -> groupObject
    const result = [];
    
    bookings.forEach(b => {
        const groupId = b.group_id || b.recurrence_group_id;
        
        if (groupId) {
            if (!groups.has(groupId)) {
                const groupObj = {
                    id: `group-${groupId}`,
                    isGroup: true,
                    groupId: groupId,
                    isRecurring: !!b.recurrence_group_id,
                    title: b.title,
                    description: b.description,
                    room: b.room,
                    user: b.user,
                    phone: b.phone,
                    attendees: b.attendees,
                    rejection_reason: b.rejection_reason,
                    cancellation_reason: b.cancellation_reason,
                    // Collect individual occurrences
                    occurrences: [b],
                };
                groups.set(groupId, groupObj);
                result.push(groupObj);
            } else {
                const groupObj = groups.get(groupId);
                groupObj.occurrences.push(b);
            }
        } else {
            // Standalone booking
            result.push({
                ...b,
                isGroup: false,
                occurrences: [b]
            });
        }
    });

    // For each group, sort occurrences by start_time ascending
    // and populate aggregate details like start_time, end_time, status, etc.
    result.forEach(item => {
        if (item.isGroup) {
            item.occurrences.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
            const first = item.occurrences[0];
            const last = item.occurrences[item.occurrences.length - 1];
            
            item.start_time = first.start_time;
            item.end_time = first.end_time; // Keep the daily slot's time range
            item.group_start_date = first.start_time;
            item.group_end_date = last.start_time;
            
            // Determine aggregated status:
            // If all statuses are identical, use that status.
            // If statuses are mixed, label it 'mixed'.
            const statuses = new Set(item.occurrences.map(o => o.status));
            if (statuses.size === 1) {
                item.status = item.occurrences[0].status;
            } else {
                item.status = 'mixed';
            }
            
            // Collect any reasons from occurrences
            const rejectionReasons = item.occurrences.map(o => o.rejection_reason).filter(Boolean);
            if (rejectionReasons.length > 0) {
                item.rejection_reason = rejectionReasons[0]; // grab the first visible reason
            }
            
            const cancellationReasons = item.occurrences.map(o => o.cancellation_reason).filter(Boolean);
            if (cancellationReasons.length > 0) {
                item.cancellation_reason = cancellationReasons[0];
            }
        }
    });
    
    return result;
}
