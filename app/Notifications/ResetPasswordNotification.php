<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;

class ResetPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected string $token,
        protected string $email
    ) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $resetUrl = config('app.url') . '/reset-password?token=' . urlencode($this->token) . '&email=' . urlencode($this->email);

        return (new MailMessage)
            ->subject('Reset Your Password — MIMOS Academy Booking')
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('We received a request to reset the password for your MIMOS Academy Training Room Booking System account.')
            ->line('If you initiated this request, please click the button below to establish a new password for your account:')
            ->action('Reset Password', $resetUrl)
            ->line('For security reasons, this password reset link is only valid for the next **60 minutes**.')
            ->line('If you did not request a password reset, no further action is required. Your account remains secure and your password will not be changed.')
            ->salutation("Regards,  \nMIMOS Academy");
    }
}
