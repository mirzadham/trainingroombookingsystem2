<?php

namespace App\Notifications;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;

class AdminNewBookingNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected Booking $booking
    ) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $roomName = $this->booking->room->name;
        $locationName = $this->booking->room->location->name;
        $startTime = $this->booking->start_time->setTimezone('Asia/Kuala_Lumpur')->format('d M Y, h:i A');
        $endTime = $this->booking->end_time->setTimezone('Asia/Kuala_Lumpur')->format('d M Y, h:i A');
        $requesterName = $this->booking->user->name;
        $requesterEmail = $this->booking->user->email;
        $requesterDept = $this->booking->user->department ?? 'N/A';

        return (new MailMessage)
            ->subject("[Action Required] New Booking Request: {$roomName} ({$locationName})")
            ->greeting("Hello {$notifiable->name},")
            ->line("A new booking request has been submitted and requires your administrative review and approval.")
            ->line("### Booking Details")
            ->line("- **Requested By:** {$requesterName} ({$requesterEmail} | Dept: {$requesterDept})")
            ->line("- **Room:** {$roomName} ({$locationName})")
            ->line("- **Time:** {$startTime} to {$endTime} MYT")
            ->line("- **Purpose:** {$this->booking->title}")
            ->line("- **Attendees:** {$this->booking->attendees} people")
            ->action('Review Pending Request', url('/admin'))
            ->line('Please log in to the administrator portal to approve or reject this booking request.')
            ->salutation("Regards,\nMIMOS Academy");
    }
}
