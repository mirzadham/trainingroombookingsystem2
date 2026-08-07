<?php

namespace App\Notifications;

use App\Models\Booking;
use App\Models\WaitlistEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WaitlistAvailableNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected Booking $booking,
        protected WaitlistEntry $entry
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
        $dateFormatted = $this->entry->start_time->format('l, d F Y');
        $timeFormatted = $this->entry->start_time->format('h:i A').' – '.$this->entry->end_time->format('h:i A');

        return (new MailMessage)
            ->subject("Room Available – {$roomName} | {$dateFormatted}")
            ->greeting("Dear {$notifiable->name},")
            ->line('Good news! The training room you joined the waitlist for has just become available.')
            ->line('')
            ->line('**Requested Slot:**')
            ->line("- **Room:** {$roomName} / {$locationName}")
            ->line("- **Date:** {$dateFormatted}")
            ->line("- **Time:** {$timeFormatted}")
            ->line('')
            ->line('Slots are released on a first-come, first-served basis, so we recommend booking as soon as possible.')
            ->line('')
            ->action('Book This Room Now', url('/search'))
            ->line('')
            ->line('If the slot is no longer suitable, you can simply ignore this email.')
            ->salutation("Regards,  \n**MIMOS Academy Administration Team**  \nMIMOS Berhad");
    }
}
