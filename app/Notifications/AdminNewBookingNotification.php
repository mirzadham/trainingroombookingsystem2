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
        $dateFormatted = $this->booking->start_time->format('l, d F Y');
        $timeFormatted = $this->booking->start_time->format('h:i A') . ' – ' . $this->booking->end_time->format('h:i A');
        
        $requesterName = $this->booking->user->name;
        $requesterEmail = $this->booking->user->email;
        $requesterDept = $this->booking->user->department ?? 'N/A';

        return (new MailMessage)
            ->subject("[Action Required] New Booking Request – {$roomName} | {$dateFormatted} | {$this->booking->reference_no}")
            ->greeting("Dear {$notifiable->name},")
            ->line("A new booking request has been submitted and requires your administrative review and approval.")
            ->line("")
            ->line("**Booking Request Details:**")
            ->line("- **Booking Reference:** {$this->booking->reference_no}")
            ->line("- **Requested By:** {$requesterName} ({$requesterEmail} | Dept: {$requesterDept})")
            ->line("- **Room Requested:** {$roomName} / {$locationName}")
            ->line("- **Date Requested:** {$dateFormatted}")
            ->line("- **Time Requested:** {$timeFormatted}")
            ->line("- **Programme / Purpose:** {$this->booking->title}")
            ->line("- **Number of Participants:** {$this->booking->attendees} pax")
            ->line("")
            ->line("Please log in to the administrator portal to review and process this booking request.")
            ->action('Review Pending Request', url('/admin'))
            ->salutation("Regards,  \n**MIMOS Academy Administration Team**  \nMIMOS Berhad");
    }
}
