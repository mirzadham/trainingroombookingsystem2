<?php

namespace App\Services;

use App\Models\Booking;
use Carbon\Carbon;

class CalendarExportService
{
    /**
     * Generate a valid RFC 5545 iCalendar (.ics) string for a booking.
     *
     * The resulting string can be saved as a .ics file and imported into
     * any calendar application (Outlook, Google Calendar, Apple Calendar, etc.).
     */
    public function generateIcs(Booking $booking): string
    {
        $booking->loadMissing(['room.location', 'user']);

        $uid = "booking-{$booking->id}@mimos-academy";
        $now = Carbon::now('UTC')->format('Ymd\THis\Z');

        // Convert booking times to UTC for the DTSTART/DTEND values
        $dtStart = $booking->start_time->copy()->setTimezone('UTC')->format('Ymd\THis\Z');
        $dtEnd = $booking->end_time->copy()->setTimezone('UTC')->format('Ymd\THis\Z');

        $summary = $this->escapeIcsText($booking->title);
        $location = $this->buildLocation($booking);
        $description = $this->buildDescription($booking);
        $organizerName = $this->escapeIcsText($booking->user->name ?? 'MIMOS User');
        $organizerEmail = $booking->user->email ?? 'noreply@mimos.my';

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//MIMOS Academy//Training Room Booking System//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            "UID:{$uid}",
            "DTSTAMP:{$now}",
            "DTSTART:{$dtStart}",
            "DTEND:{$dtEnd}",
            "SUMMARY:{$summary}",
            "LOCATION:{$location}",
            $this->foldLine("DESCRIPTION:{$description}"),
            "ORGANIZER;CN={$organizerName}:mailto:{$organizerEmail}",
            'STATUS:CONFIRMED',
            'BEGIN:VALARM',
            'TRIGGER:-PT30M',
            'ACTION:DISPLAY',
            'DESCRIPTION:Reminder: Your training room booking starts in 30 minutes',
            'END:VALARM',
            'END:VEVENT',
            'END:VCALENDAR',
        ];

        return implode("\r\n", $lines) . "\r\n";
    }

    /**
     * Build the LOCATION string from room and location data.
     */
    private function buildLocation(Booking $booking): string
    {
        $parts = [];

        if ($booking->room) {
            $parts[] = $booking->room->name;

            if ($booking->room->location) {
                $parts[] = $booking->room->location->name;
                if ($booking->room->location->code) {
                    $parts[] = "({$booking->room->location->code})";
                }
            }
        }

        return $this->escapeIcsText(implode(' - ', $parts));
    }

    /**
     * Build the DESCRIPTION string with booking metadata.
     */
    private function buildDescription(Booking $booking): string
    {
        $tz = 'Asia/Kuala_Lumpur';
        $startLocal = $booking->start_time->copy()->setTimezone($tz)->format('d M Y, h:i A');
        $endLocal = $booking->end_time->copy()->setTimezone($tz)->format('h:i A');

        $lines = [
            "MIMOS Academy Training Room Booking",
            "",
            "Booking ID: #{$booking->id}",
            "Room: " . ($booking->room->name ?? 'N/A'),
            "Location: " . ($booking->room->location->name ?? 'N/A'),
            "Date/Time: {$startLocal} - {$endLocal} (MYT)",
            "Attendees: {$booking->attendees} pax",
        ];

        if ($booking->phone) {
            $lines[] = "Contact: {$booking->phone}";
        }

        if ($booking->description) {
            $lines[] = "";
            $lines[] = "Notes: {$booking->description}";
        }

        $lines[] = "";
        $lines[] = "Booked via MIMOS Academy Training Room Booking System";

        return $this->escapeIcsText(implode("\\n", $lines));
    }

    /**
     * Escape special characters per RFC 5545.
     * Backslash, semicolon, and comma must be escaped.
     * Newlines are represented as literal \n in the value.
     */
    private function escapeIcsText(string $text): string
    {
        // Replace actual newlines with the ICS newline literal
        $text = str_replace(["\r\n", "\r", "\n"], '\\n', $text);

        // Escape backslashes (must be first), then semicolons and commas
        $text = str_replace('\\n', '%%NEWLINE%%', $text);
        $text = str_replace('\\', '\\\\', $text);
        $text = str_replace('%%NEWLINE%%', '\\n', $text);
        $text = str_replace(';', '\\;', $text);
        $text = str_replace(',', '\\,', $text);

        return $text;
    }

    /**
     * Fold long lines per RFC 5545 (max 75 octets per line).
     * Continuation lines start with a single space.
     */
    private function foldLine(string $line, int $maxLength = 75): string
    {
        if (strlen($line) <= $maxLength) {
            return $line;
        }

        $folded = substr($line, 0, $maxLength);
        $remaining = substr($line, $maxLength);

        // Continuation lines have a leading space and max 74 chars of content
        while (strlen($remaining) > 0) {
            $chunk = substr($remaining, 0, $maxLength - 1);
            $folded .= "\r\n " . $chunk;
            $remaining = substr($remaining, $maxLength - 1);
        }

        return $folded;
    }
}
