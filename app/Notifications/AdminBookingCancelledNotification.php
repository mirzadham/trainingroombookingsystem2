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
        $startTime = $this->booking->start_time->setTimezone('Asia/Kuala_Lumpur')->format('d M Y, h:i A');
        $endTime = $this->booking->end_time->setTimezone('Asia/Kuala_Lumpur')->format('d M Y, h:i A');
        $userName = $this->booking->user->name;
        $userEmail = $this->booking->user->email;

        // Determine if it was an approved reservation or a pending request
        $isApproved = $this->oldStatus === BookingStatus::Approved;

        $subject = $isApproved
            ? "[Cancelled] Approved Booking: {$roomName} ({$locationName})"
            : "[Withdrawn] Booking Request: {$roomName} ({$locationName})";

        $headline = $isApproved
            ? "An approved training room reservation has been cancelled by the user."
            : "A pending training room booking request has been withdrawn by the user.";

        $mail = (new MailMessage)
            ->subject($subject)
            ->greeting("Hello {$notifiable->name},")
            ->line($headline)
            ->line("### Booking Details")
            ->line("- **User:** {$userName} ({$userEmail})")
            ->line("- **Room:** {$roomName} ({$locationName})")
            ->line("- **Time:** {$startTime} to {$endTime} MYT")
            ->line("- **Purpose:** {$this->booking->title}");

        if ($isApproved) {
            $mail->line("⚠️ **Action Required:** Please release any room logistics, keys, AV setups, or other preparation plans for this slot as the room is now available for other bookings.");
        } else {
            $mail->line("No further administrative action is required for this request.");
        }

        return $mail->action('Go to Admin Portal', url('/admin'))
            ->salutation("Regards,  \nMIMOS Academy");
    }
}
