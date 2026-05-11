import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import * as api from '../../../services/api';

/**
 * Custom hook that encapsulates all booking form state and logic.
 * Shared between wizard step components.
 */
export default function useBookingForm() {
    const [searchParams] = useSearchParams();
    const { user, isAuthenticated, login, register } = useAuth();

    // Room info from URL params
    const roomInfo = useMemo(() => ({
        roomId: searchParams.get('room_id'),
        roomName: searchParams.get('room_name') || '',
        location: searchParams.get('location') || '',
        capacity: searchParams.get('capacity') || '',
        startTime: searchParams.get('start_time') || '',
        endTime: searchParams.get('end_time') || '',
        date: searchParams.get('date') || '',
    }), [searchParams]);

    // Step state
    const [step, setStep] = useState(0);

    // Booking form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [attendees, setAttendees] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [bookingResult, setBookingResult] = useState(null);

    // Auth form state
    const [authMode, setAuthMode] = useState('login');
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authName, setAuthName] = useState('');
    const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');

    // Pre-fill phone from user profile
    useEffect(() => {
        if (user?.phone && !phone) {
            setPhone(user.phone);
        }
    }, [user]);

    const canProceedToReview = title.trim() && attendees && parseInt(attendees) > 0 && phone.trim();

    const handleSubmit = useCallback(async () => {
        setSubmitting(true);
        setError('');

        try {
            const result = await api.createBooking({
                room_id: parseInt(roomInfo.roomId),
                title,
                description: description || null,
                start_time: roomInfo.startTime,
                end_time: roomInfo.endTime,
                attendees: parseInt(attendees),
                phone,
            });
            setBookingResult(result);
            setStep(3);
        } catch (err) {
            const errors = err.response?.data?.errors;
            if (errors) {
                setError(Object.values(errors).flat().join(' '));
            } else {
                setError(err.response?.data?.message || 'Failed to create booking.');
            }
            setStep(1);
        } finally {
            setSubmitting(false);
        }
    }, [roomInfo, title, description, attendees, phone]);

    const handleNext = useCallback(() => {
        if (step === 0 && !canProceedToReview) return;
        if (step === 1) {
            if (isAuthenticated) {
                handleSubmit();
                return;
            }
        }
        setStep(s => Math.min(s + 1, 3));
    }, [step, canProceedToReview, isAuthenticated, handleSubmit]);

    const handleAuth = useCallback(async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthLoading(true);

        try {
            if (authMode === 'login') {
                await login(authEmail, authPassword);
            } else {
                await register({
                    name: authName,
                    email: authEmail,
                    password: authPassword,
                    password_confirmation: authPasswordConfirm,
                    phone: phone,
                });
            }
            handleSubmit();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Authentication failed.';
            setAuthError(msg);
        } finally {
            setAuthLoading(false);
        }
    }, [authMode, authEmail, authPassword, authName, authPasswordConfirm, phone, login, register, handleSubmit]);

    // Helpers
    const formatTime = (dt) => {
        if (!dt) return '';
        return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dt) => {
        if (!dt) return roomInfo.date;
        return new Date(dt).toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    return {
        // Room info
        roomInfo,
        // Step
        step, setStep,
        // Booking form
        title, setTitle,
        description, setDescription,
        attendees, setAttendees,
        phone, setPhone,
        error, setError,
        submitting,
        bookingResult,
        canProceedToReview,
        // Auth
        isAuthenticated,
        authMode, setAuthMode,
        authEmail, setAuthEmail,
        authPassword, setAuthPassword,
        authName, setAuthName,
        authPasswordConfirm, setAuthPasswordConfirm,
        authLoading,
        authError, setAuthError,
        // Actions
        handleNext,
        handleAuth,
        handleSubmit,
        // Helpers
        formatTime,
        formatDate,
    };
}
