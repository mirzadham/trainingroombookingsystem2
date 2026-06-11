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

        return (new MailMessage)
            ->subject('Invitation to Join Room Booking Admin Panel')
            ->greeting('Hello,')
            ->line("You have been invited by {$this->invitation->inviter->name} to join the Training Room Booking System as a **{$roleLabel}**{$locationLabel}.")
            ->line('Please click the button below to accept your invitation and set up your password details:')
            ->action('Set Up Admin Account', $setupUrl)
            ->line("This invitation token is secure, single-use, and will expire on **{$this->invitation->expires_at->format('M d, Y H:i')}**.")
            ->line('If you were not expecting this invitation, you can safely ignore this email.')
            ->salutation("Regards,\nMIMOS Academy");
    }
}
