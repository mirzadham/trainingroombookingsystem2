<?php

namespace App\Notifications;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BookingReminderNotification extends Notification implements ShouldQueue
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
        $this->booking->loadMissing(['room.location', 'user']);

        $roomName = $this->booking->room->name;
        $locationName = $this->booking->room->location->name;
        $dateFormatted = $this->booking->start_time->format('l, d F Y');
        $timeFormatted = $this->booking->start_time->format('h:i A').' – '.$this->booking->end_time->format('h:i A');

        return (new MailMessage)
            ->subject("Booking Reminder – {$roomName} | {$dateFormatted} | {$this->booking->reference_no}")
            ->greeting("Dear {$notifiable->name},")
            ->line('This is a friendly reminder that your training room booking is coming up soon.')
            ->line('')
            ->line('**Confirmed Booking Details:**')
            ->line("- **Booking Reference:** {$this->booking->reference_no}")
            ->line("- **Room:** {$roomName} / {$locationName}")
            ->line("- **Date:** {$dateFormatted}")
            ->line("- **Time:** {$timeFormatted}")
            ->line("- **Programme / Purpose:** {$this->booking->title}")
            ->line("- **Number of Participants:** {$this->booking->attendees} pax")
            ->line('')
            ->line('If you need to cancel or modify this booking, please do so as early as possible through the booking system.')
            ->line('')
            ->line('We look forward to supporting your programme.')
            ->action('View My Bookings', url('/my-bookings'))
            ->salutation("Regards,  \n**MIMOS Academy Administration Team**  \nMIMOS Berhad");
    }
}
