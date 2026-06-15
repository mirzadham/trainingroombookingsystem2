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
        $locationLabel = $this->invitation->location ? " for {$this->invitation->location->name}" : '';

        $formattedExpiry = $this->invitation->expires_at
            ?->format('M d, Y \a\t h:i A');

        return (new MailMessage)
            ->subject('Invitation to Join the MIMOS Academy Admin Panel')
            ->greeting('Welcome to the MIMOS Academy Admin Team,')
            ->line("You have been invited by **{$this->invitation->inviter->name}** to join the Training Room Booking System as a **{$roleLabel}**{$locationLabel}.")
            ->line('Please click the button below to accept your invitation and configure your administrator credentials:')
            ->action('Accept Invitation & Set Up Account', $setupUrl)
            ->line("For your security, this invitation token is secure, single-use, and will expire on **{$formattedExpiry} MYT**.")
            ->line('If you were not expecting this invitation, you can safely ignore this email.')
            ->salutation("Regards,  \nMIMOS Academy");
    }
}
