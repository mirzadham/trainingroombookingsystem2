<?php

namespace Tests\Unit;

use App\Enums\BookingStatus;
use PHPUnit\Framework\TestCase;

class BookingStatusTest extends TestCase
{
    /**
     * Test allowed transitions from Pending.
     */
    public function test_pending_transitions(): void
    {
        $this->assertTrue(BookingStatus::Pending->canTransitionTo(BookingStatus::Approved));
        $this->assertTrue(BookingStatus::Pending->canTransitionTo(BookingStatus::Rejected));
        $this->assertTrue(BookingStatus::Pending->canTransitionTo(BookingStatus::Cancelled));
        $this->assertFalse(BookingStatus::Pending->canTransitionTo(BookingStatus::Pending));
    }

    /**
     * Test allowed transitions from Approved.
     */
    public function test_approved_transitions(): void
    {
        $this->assertTrue(BookingStatus::Approved->canTransitionTo(BookingStatus::Cancelled));
        $this->assertFalse(BookingStatus::Approved->canTransitionTo(BookingStatus::Pending));
        $this->assertFalse(BookingStatus::Approved->canTransitionTo(BookingStatus::Approved));
        $this->assertFalse(BookingStatus::Approved->canTransitionTo(BookingStatus::Rejected));
    }

    /**
     * Test that Rejected is a terminal state.
     */
    public function test_rejected_is_terminal(): void
    {
        foreach (BookingStatus::cases() as $status) {
            $this->assertFalse(BookingStatus::Rejected->canTransitionTo($status));
        }
    }

    /**
     * Test that Cancelled is a terminal state.
     */
    public function test_cancelled_is_terminal(): void
    {
        foreach (BookingStatus::cases() as $status) {
            $this->assertFalse(BookingStatus::Cancelled->canTransitionTo($status));
        }
    }

    /**
     * Test human-readable labels.
     */
    public function test_labels(): void
    {
        $this->assertEquals('Pending', BookingStatus::Pending->label());
        $this->assertEquals('Approved', BookingStatus::Approved->label());
        $this->assertEquals('Rejected', BookingStatus::Rejected->label());
        $this->assertEquals('Cancelled', BookingStatus::Cancelled->label());
    }
}
