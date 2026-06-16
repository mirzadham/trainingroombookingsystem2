<?php

namespace App\Notifications;

use App\Models\Booking;
use App\Services\CalendarExportService;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;

class BookingStatusChangedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected Booking $booking,
        protected string $type
    ) {}

    public function getBooking(): Booking
    {
        return $this->booking;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $roomName = $this->booking->room->name;
        $locationName = $this->booking->room->location->name;
        $startTime = $this->booking->start_time->format('d M Y, h:i A');
        $endTime = $this->booking->end_time->format('d M Y, h:i A');
        $dateStr = $this->booking->start_time->format('d M Y');

        $mail = (new MailMessage)->salutation("Regards,  \nMIMOS Academy");
        
        $pic = $this->getPicDetails();
        $picLine = "**Support Contact (Person in Charge):** {$pic['name']} (Email: {$pic['email']}" . ($pic['phone'] ? ", Phone: {$pic['phone']}" : "") . ")";

        switch ($this->type) {
            case 'submitted':
                $mail->subject("Booking Request Submitted — MIMOS Academy Booking | Ref: {$this->booking->reference_no}")
                    ->greeting('Hello ' . $notifiable->name . ',')
                    ->line('Thank you for your submission. Your booking request has been successfully received and is currently pending review by our administrative team. We will notify you via email once a decision has been made.')
                    ->line('### Booking Details')
                    ->line("- **Booking Reference:** {$this->booking->reference_no}")
                    ->line("- **Room:** {$roomName} ({$locationName})")
                    ->line("- **Time:** {$startTime} to {$endTime} MYT")
                    ->line($picLine)
                    ->action('View My Bookings', url('/my-bookings'));
                break;

            case 'approved':
                $mail->subject("✅ Booking Approved – {$roomName} | {$dateStr} | {$this->booking->reference_no}")
                    ->greeting('Hello ' . $notifiable->name . ',')
                    ->line('Great news! Your booking request has been officially approved. Below are the details of your upcoming reservation.')
                    ->line('### Booking Details')
                    ->line("- **Booking Reference:** {$this->booking->reference_no}")
                    ->line("- **Room:** {$roomName} ({$locationName})")
                    ->line("- **Time:** {$startTime} to {$endTime} MYT")
                    ->line($picLine)
                    ->line('📅 A calendar event (.ics file) is attached to this email — open it to add this booking directly to your calendar (Outlook, Google Calendar, Apple Calendar, etc.).')
                    ->action('View Booking Details', url('/my-bookings'));

                // Attach .ics calendar file for approved bookings
                try {
                    $icsService = app(CalendarExportService::class);
                    $icsContent = $icsService->generateIcs($this->booking);
                    $mail->attachData(
                        $icsContent,
                        'booking-' . $this->booking->reference_no . '.ics',
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
                $mail->subject("❌ Booking Request Unsuccessful – {$roomName} | {$dateStr} | {$this->booking->reference_no}")
                    ->greeting('Hello ' . $notifiable->name . ',')
                    ->line('Thank you for submitting your booking request. We regret to inform you that your reservation request has been rejected.')
                    ->line('**Reason for Rejection:**')
                    ->line('> ' . $reason)
                    ->line('### Booking Details')
                    ->line("- **Booking Reference:** {$this->booking->reference_no}")
                    ->line("- **Room:** {$roomName} ({$locationName})")
                    ->line("- **Time:** {$startTime} to {$endTime} MYT")
                    ->line($picLine)
                    ->action('Search Alternative Rooms', url('/'));
                break;

            case 'cancelled':
                $mail->subject("🚫 Booking Cancellation Notice – {$roomName} | {$dateStr} | {$this->booking->reference_no}")
                    ->greeting('Hello ' . $notifiable->name . ',')
                    ->line('This email confirms that your booking request has been successfully cancelled at your request.')
                    ->line('### Booking Details')
                    ->line("- **Booking Reference:** {$this->booking->reference_no}")
                    ->line("- **Room:** {$roomName} ({$locationName})")
                    ->line("- **Time:** {$startTime} to {$endTime} MYT")
                    ->line($picLine)
                    ->action('Book Another Room', url('/'));
                break;

            case 'admin_cancelled':
                $reason = $this->booking->cancellation_reason ?? 'No reason provided';
                $mail->subject("🚫 Booking Cancellation Notice – {$roomName} | {$dateStr} | {$this->booking->reference_no}")
                    ->greeting('Hello ' . $notifiable->name . ',')
                    ->line('Please be informed that your training room booking has been cancelled by the system administrator.')
                    ->line('**Reason for Cancellation:**')
                    ->line('> ' . $reason)
                    ->line('### Booking Details')
                    ->line("- **Booking Reference:** {$this->booking->reference_no}")
                    ->line("- **Room:** {$roomName} ({$locationName})")
                    ->line("- **Time:** {$startTime} to {$endTime} MYT")
                    ->line($picLine)
                    ->action('Search Alternative Rooms', url('/'));
                break;
        }

        return $mail;
    }

    /**
     * Get the contact details of the Person in Charge (PIC) for this booking.
     */
    protected function getPicDetails(): array
    {
        $fallbackName = env('ADMIN_CONTACT_NAME', 'MIMOS Academy');
        $fallbackEmail = env('ADMIN_CONTACT_EMAIL', 'academy@mimos.my');
        $fallbackPhone = env('ADMIN_CONTACT_PHONE', '04-40525404');

        $this->booking->loadMissing(['room.location.admins', 'approver', 'rejecter', 'canceller']);

        $picUser = null;
        switch ($this->type) {
            case 'approved':
                $picUser = $this->booking->approver;
                break;
            case 'rejected':
                $picUser = $this->booking->rejecter;
                break;
            case 'admin_cancelled':
                $picUser = $this->booking->canceller;
                break;
        }

        if ($picUser) {
            return [
                'name' => $picUser->name,
                'email' => $picUser->email,
                'phone' => $picUser->phone ?? $fallbackPhone,
            ];
        }

        $locationAdmins = $this->booking->room->location->admins;
        if ($locationAdmins && $locationAdmins->isNotEmpty()) {
            $locationAdmin = $locationAdmins->first();
            return [
                'name' => $locationAdmin->name,
                'email' => $locationAdmin->email,
                'phone' => $locationAdmin->phone ?? $fallbackPhone,
            ];
        }

        return [
            'name' => $fallbackName,
            'email' => $fallbackEmail,
            'phone' => $fallbackPhone,
        ];
    }
}
