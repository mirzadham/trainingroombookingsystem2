<?php

namespace App\Notifications;

use App\Models\AdminInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;

class AdminInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected AdminInvitation $invitation
    ) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $setupUrl = config('app.url') . '/admin/setup-account?token=' . $this->invitation->token;

        $roleLabel = $this->invitation->role === 'super_admin' ? 'Super Admin' : 'Location Admin';
        $locationLabel = $this->invitation->location ? $this->invitation->location->name : 'All Locations';

        $formattedExpiry = $this->invitation->expires_at
            ?->format('l, d F Y \a\t h:i A');

        return (new MailMessage)
            ->subject('Invitation to Join the MIMOS Academy Admin Panel')
            ->greeting('Dear ' . ($notifiable->name ?? 'Administrator') . ',')
            ->line("You have been invited to join the Training Room Booking System as an administrator.")
            ->line("")
            ->line("**Invitation Details:**")
            ->line("- **Role:** {$roleLabel}")
            ->line("- **Location:** {$locationLabel}")
            ->line("- **Invited By:** {$this->invitation->inviter->name}")
            ->line("- **Expires On:** {$formattedExpiry} MYT")
            ->line("")
            ->line('Please click the button below to accept your invitation and configure your administrator credentials:')
            ->action('Accept Invitation & Set Up Account', $setupUrl)
            ->line("")
            ->line("For your security, this invitation token is secure, single-use, and will expire on the date shown above.")
            ->line('If you were not expecting this invitation, you can safely ignore this email.')
            ->salutation("Regards,  \n**MIMOS Academy Administration Team**  \nMIMOS Berhad");
    }
}
