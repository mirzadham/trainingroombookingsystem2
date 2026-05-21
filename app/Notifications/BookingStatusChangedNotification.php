<?php

namespace App\Notifications;

use App\Models\Booking;
use App\Services\CalendarExportService;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BookingStatusChangedNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected Booking $booking,
        protected string $type
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

        $mail = (new MailMessage)
            ->line('MIMOS Academy Training Room Booking System');

        switch ($this->type) {
            case 'submitted':
                $mail->subject('Booking Request Submitted - MIMOS Academy')
                    ->greeting('Hello ' . $notifiable->name . ',')
                    ->line('Your booking request has been successfully submitted and is currently pending approval.')
                    ->line('**Room**: ' . $roomName . ' (' . $locationName . ')')
                    ->line('**Time**: ' . $startTime . ' to ' . $endTime)
                    ->action('View My Bookings', url('/my-bookings'));
                break;

            case 'approved':
                $mail->subject('Booking Approved! - MIMOS Academy')
                    ->greeting('Hello ' . $notifiable->name . ',')
                    ->line('Great news! Your booking request has been approved by the administrator.')
                    ->line('**Room**: ' . $roomName . ' (' . $locationName . ')')
                    ->line('**Time**: ' . $startTime . ' to ' . $endTime)
                    ->line('📅 A calendar event is attached to this email — open it to add this booking directly to your calendar (Outlook, Google Calendar, Apple Calendar, etc.).')
                    ->action('View Booking Details', url('/my-bookings'));

                // Attach .ics calendar file for approved bookings
                try {
                    $icsService = app(CalendarExportService::class);
                    $icsContent = $icsService->generateIcs($this->booking);
                    $mail->attachData(
                        $icsContent,
                        'mimos-booking-' . $this->booking->id . '.ics',
                        ['mime' => 'text/calendar; charset=UTF-8; method=PUBLISH']
                    );
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Failed to attach .ics file to booking notification', [
                        'booking_id' => $this->booking->id,
                        'error' => $e->getMessage(),
                    ]);
                }
                break;

            case 'rejected':
                $reason = $this->booking->rejection_reason ?? 'No reason provided';
                $mail->subject('Booking Rejected - MIMOS Academy')
                    ->greeting('Hello ' . $notifiable->name . ',')
                    ->line('We regret to inform you that your booking request has been rejected.')
                    ->line('**Room**: ' . $roomName . ' (' . $locationName . ')')
                    ->line('**Time**: ' . $startTime . ' to ' . $endTime)
                    ->line('**Reason**: ' . $reason)
                    ->action('Search Alternative Rooms', url('/'));
                break;

            case 'cancelled':
                $mail->subject('Booking Cancelled - MIMOS Academy')
                    ->greeting('Hello ' . $notifiable->name . ',')
                    ->line('Your booking request has been successfully cancelled.')
                    ->line('**Room**: ' . $roomName . ' (' . $locationName . ')')
                    ->line('**Time**: ' . $startTime . ' to ' . $endTime)
                    ->action('Book Another Room', url('/'));
                break;
        }

        return $mail;
    }
}
