<?php

namespace App\Notifications;

use App\Enums\BookingStatus;
use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;

class AdminBookingCancelledNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected Booking $booking,
        protected ?BookingStatus $oldStatus = null
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
        
        $userName = $this->booking->user->name;
        $userEmail = $this->booking->user->email;

        // Determine if it was an approved reservation or a pending request
        $isApproved = $this->oldStatus === BookingStatus::Approved;

        $subject = $isApproved
            ? "[Cancelled] Approved Booking – {$roomName} | {$dateFormatted} | {$this->booking->reference_no}"
            : "[Withdrawn] Booking Request – {$roomName} | {$dateFormatted} | {$this->booking->reference_no}";

        $headline = $isApproved
            ? "An approved training room reservation has been cancelled by the user."
            : "A pending training room booking request has been withdrawn by the user.";

        $mail = (new MailMessage)
            ->subject($subject)
            ->greeting("Dear {$notifiable->name},")
            ->line($headline)
            ->line("")
            ->line("**Cancelled Booking Details:**")
            ->line("- **Booking Reference:** {$this->booking->reference_no}")
            ->line("- **User:** {$userName} ({$userEmail})")
            ->line("- **Room:** {$roomName} / {$locationName}")
            ->line("- **Date:** {$dateFormatted}")
            ->line("- **Time:** {$timeFormatted}")
            ->line("- **Programme / Purpose:** {$this->booking->title}");

        if ($isApproved) {
            $mail->line("")
                ->line("⚠️ **Action Required:** Please release any room logistics, keys, AV setups, or other preparation plans for this slot as the room is now available for other bookings.");
        } else {
            $mail->line("")
                ->line("No further administrative action is required for this request.");
        }

        return $mail->action('Go to Admin Portal', url('/admin'))
            ->salutation("Regards,  \n**MIMOS Academy Administration Team**  \nMIMOS Berhad");
    }
}
