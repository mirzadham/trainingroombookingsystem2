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
        $dateFormatted = $this->booking->start_time->format('l, d F Y');
        $timeFormatted = $this->booking->start_time->format('h:i A') . ' – ' . $this->booking->end_time->format('h:i A');
        
        $durationVal = (float)($this->booking->start_time->diffInMinutes($this->booking->end_time) / 60);
        $durationFormatted = "{$durationVal} hour" . ($durationVal > 1 ? 's' : '(s)');

        $mail = (new MailMessage)->salutation("Regards,  \n**MIMOS Academy Administration Team**  \nMIMOS Berhad");
        
        $pic = $this->getPicDetails();
        $contactEmails = ['academy@mimos.my'];
        if (!empty($pic['email']) && strtolower($pic['email']) !== 'academy@mimos.my') {
            $contactEmails[] = $pic['email'];
        }

        switch ($this->type) {
            case 'submitted':
                $mail->subject("Booking Request Submitted – {$roomName} | {$dateFormatted} | {$this->booking->reference_no}")
                    ->greeting("Dear {$notifiable->name},")
                    ->line("Thank you for submitting your training room booking request. Your request has been successfully received and is currently pending review by our administrative team.")
                    ->line("")
                    ->line("**Details of the pending booking request:**")
                    ->line("- **Booking Reference:** {$this->booking->reference_no}")
                    ->line("- **Room Requested:** {$roomName} / {$locationName}")
                    ->line("- **Date Requested:** {$dateFormatted}")
                    ->line("- **Time Requested:** {$timeFormatted}")
                    ->line("- **Programme / Purpose:** {$this->booking->title}")
                    ->line("- **Number of Participants:** {$this->booking->attendees} pax");

                $mail->line("")
                    ->line("**Next Steps:**")
                    ->line("You will receive another email notification once your booking request has been reviewed and processed.");

                $mail->line("")
                    ->line("For further assistance, please contact:");
                foreach ($contactEmails as $email) {
                    $mail->line("- {$email}");
                }

                $mail->line("")
                    ->line("We appreciate your patience.")
                    ->action('View My Bookings', url('/my-bookings'));
                break;

            case 'approved':
                $mail->subject("Booking Approved – {$roomName} | {$dateFormatted} | {$this->booking->reference_no}")
                    ->greeting("Dear {$notifiable->name},")
                    ->line("We are pleased to inform you that your training room booking request has been **approved**.")
                    ->line("")
                    ->line("Please find your confirmed booking details below:")
                    ->line("- **Booking Reference:** {$this->booking->reference_no}")
                    ->line("- **Room:** {$roomName} / {$locationName}")
                    ->line("- **Date:** {$dateFormatted}")
                    ->line("- **Time:** {$timeFormatted}")
                    ->line("- **Duration:** {$durationFormatted}")
                    ->line("- **Programme / Purpose:** {$this->booking->title}")
                    ->line("- **Number of Participants:** {$this->booking->attendees} pax");

                $mail->line("")
                    ->line("Please note that the following arrangements are managed **separately** and must be coordinated independently:")
                    ->line("- **Catering / Food & Beverage** — Contact the Café directly")
                    ->line("- **MC, Protocol & Event Backdrop** — Contact Corporate Communications")
                    ->line("- **Room Setup & Equipment** — Contact Facilities Management");

                $mail->line("")
                    ->line("Should you need to cancel or modify your booking, please do so as early as possible through the booking system or by contacting us directly.");

                $mail->line("")
                    ->line("For further assistance, please contact:");
                foreach ($contactEmails as $email) {
                    $mail->line("- {$email}");
                }

                $mail->line("")
                    ->line("Thank you and we look forward to support your programme.")
                    ->line("")
                    ->line("📅 A calendar event (.ics file) is attached to this email — open it to add this booking directly to your calendar (Outlook, Google Calendar, Apple Calendar, etc.).")
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
                $mail->subject("Booking Rejected – {$roomName} | {$dateFormatted} | {$this->booking->reference_no}")
                    ->greeting("Dear {$notifiable->name},")
                    ->line("Thank you for submitting your training room booking request through the MIMOS Academy Training Room Booking System.")
                    ->line("")
                    ->line("After careful review, we regret to inform you that your booking request has been **rejected** for the following reason(s):")
                    ->line("> {$reason}")
                    ->line("")
                    ->line("**Details of the rejected booking request:**")
                    ->line("- **Booking Reference:** {$this->booking->reference_no}")
                    ->line("- **Room Requested:** {$roomName} / {$locationName}")
                    ->line("- **Date Requested:** {$dateFormatted}")
                    ->line("- **Time Requested:** {$timeFormatted}");

                $mail->line("")
                    ->line("**Next Steps:**")
                    ->line("You are welcome to resubmit your booking request once the above matter(s) have been resolved. Please ensure all required information is complete and accurate before resubmitting.");

                $mail->line("")
                    ->line("For further assistance, please contact:");
                foreach ($contactEmails as $email) {
                    $mail->line("- {$email}");
                }

                $mail->line("")
                    ->line("We appreciate your understanding and look forward to assist you.")
                    ->action('Search Alternative Rooms', url('/'));
                break;

            case 'cancelled':
                $mail->subject("Booking Cancelled – {$roomName} | {$dateFormatted} | {$this->booking->reference_no}")
                    ->greeting("Dear {$notifiable->name},")
                    ->line("This email confirms that your booking request has been successfully cancelled at your request.")
                    ->line("")
                    ->line("**Cancelled Booking Details:**")
                    ->line("- **Booking Reference:** {$this->booking->reference_no}")
                    ->line("- **Room:** {$roomName} / {$locationName}")
                    ->line("- **Date:** {$dateFormatted}")
                    ->line("- **Time:** {$timeFormatted}")
                    ->line("- **Programme / Purpose:** {$this->booking->title}");

                $mail->line("")
                    ->line("If you wish to reserve another room, please feel free to submit a new request.");

                $mail->line("")
                    ->line("For further assistance, please contact:");
                foreach ($contactEmails as $email) {
                    $mail->line("- {$email}");
                }

                $mail->line("")
                    ->line("Thank you for your understanding.")
                    ->action('Book Another Room', url('/'));
                break;

            case 'admin_cancelled':
                $reason = $this->booking->cancellation_reason ?? 'No reason provided';
                $mail->subject("Booking Cancelled by Administrator – {$roomName} | {$dateFormatted} | {$this->booking->reference_no}")
                    ->greeting("Dear {$notifiable->name},")
                    ->line("We regret to inform you that your confirmed training room booking has been **cancelled** by the administrator.")
                    ->line("")
                    ->line("**Cancelled Booking Details:**")
                    ->line("- **Booking Reference:** {$this->booking->reference_no}")
                    ->line("- **Room:** {$roomName} / {$locationName}")
                    ->line("- **Date:** {$dateFormatted}")
                    ->line("- **Time:** {$timeFormatted}")
                    ->line("- **Programme / Purpose:** {$this->booking->title}")
                    ->line("")
                    ->line("**Reason for Cancellation:**")
                    ->line("> {$reason}")
                    ->line("")
                    ->line("We sincerely apologise for any inconvenience this may cause.");

                $mail->line("")
                    ->line("For further assistance, please contact:");
                foreach ($contactEmails as $email) {
                    $mail->line("- {$email}");
                }

                $mail->line("")
                    ->line("Thank you for your understanding and cooperation.")
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
