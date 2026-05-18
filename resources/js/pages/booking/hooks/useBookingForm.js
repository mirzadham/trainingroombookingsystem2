import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import * as api from '../../../services/api';

const SESSION_KEY = 'booking_draft';

/**
 * Custom hook that encapsulates all booking form state and logic.
 * Incorporates robust sessionStorage persistence so users don't lose
 * their draft if they accidentally refresh or navigate back.
 */
export default function useBookingForm() {
    const [searchParams] = useSearchParams();
    const { user, isAuthenticated, login, register } = useAuth();

    // 1. Room info (from URL, then persisted)
    // Try to read from URL first. If present, it's a fresh navigation, so we overwrite session storage.
    // Otherwise, we read from session storage (e.g. after a page refresh).
    const urlRoomId = searchParams.get('room_id');
    const roomInfo = useMemo(() => {
        let info = null;
        if (urlRoomId) {
            info = {
                roomId: urlRoomId,
                roomName: searchParams.get('room_name') || '',
                location: searchParams.get('location') || '',
                capacity: searchParams.get('capacity') || '',
                startTime: searchParams.get('start_time') || '',
                endTime: searchParams.get('end_time') || '',
                date: searchParams.get('date') || '',
            };
            sessionStorage.setItem(`${SESSION_KEY}_room`, JSON.stringify(info));
        } else {
            const stored = sessionStorage.getItem(`${SESSION_KEY}_room`);
            if (stored) info = JSON.parse(stored);
        }
        return info || {};
    }, [urlRoomId, searchParams]);

    // 2. Form state (Persisted)
    const getStoredState = (key, defaultVal) => {
        const stored = sessionStorage.getItem(`${SESSION_KEY}_${key}`);
        return stored !== null ? stored : defaultVal;
    };

    const [step, setStep] = useState(() => parseInt(getStoredState('step', '0')));
    
    // Details step
    const [title, setTitle] = useState(() => getStoredState('title', ''));
    const [description, setDescription] = useState(() => getStoredState('description', ''));
    const [attendees, setAttendees] = useState(() => getStoredState('attendees', ''));
    const [endDate, setEndDate] = useState(() => getStoredState('endDate', ''));
    
    // Account step
    const [guestName, setGuestName] = useState(() => getStoredState('guestName', ''));
    const [guestEmail, setGuestEmail] = useState(() => getStoredState('guestEmail', ''));
    const [phone, setPhone] = useState(() => getStoredState('phone', ''));

    // Persist form changes
    useEffect(() => sessionStorage.setItem(`${SESSION_KEY}_step`, step.toString()), [step]);
    useEffect(() => sessionStorage.setItem(`${SESSION_KEY}_title`, title), [title]);
    useEffect(() => sessionStorage.setItem(`${SESSION_KEY}_description`, description), [description]);
    useEffect(() => sessionStorage.setItem(`${SESSION_KEY}_attendees`, attendees), [attendees]);
    useEffect(() => sessionStorage.setItem(`${SESSION_KEY}_endDate`, endDate), [endDate]);
    useEffect(() => sessionStorage.setItem(`${SESSION_KEY}_guestName`, guestName), [guestName]);
    useEffect(() => sessionStorage.setItem(`${SESSION_KEY}_guestEmail`, guestEmail), [guestEmail]);
    useEffect(() => sessionStorage.setItem(`${SESSION_KEY}_phone`, phone), [phone]);

    // 3. Status state (Not persisted)
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [bookingResult, setBookingResult] = useState(null);

    // Auth form state (Not persisted)
    const [authMode, setAuthMode] = useState('login');
    const [authPassword, setAuthPassword] = useState('');
    const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');

    // Pre-fill user details if logged in
    useEffect(() => {
        if (isAuthenticated && user) {
            setGuestName(user.name || '');
            setGuestEmail(user.email || '');
            if (user.phone && !phone) setPhone(user.phone);
        }
    }, [isAuthenticated, user]);

    // Validations
    const canProceedToAccount = title.trim() && attendees && parseInt(attendees) > 0 && parseInt(attendees) <= parseInt(roomInfo.capacity || 9999)
        && (!endDate || endDate >= (roomInfo.date || ''));
    const canProceedToAuthOrSubmit = guestName.trim() && guestEmail.trim() && phone.trim();

    const handleSubmit = useCallback(async () => {
        setSubmitting(true);
        setError('');

        try {
            const result = await api.createBooking({
                room_id: parseInt(roomInfo.roomId),
                title,
                description: description || null,
                start_date: roomInfo.date,
                end_date: endDate || roomInfo.date,
                start_time: `${roomInfo.date} ${roomInfo.startTime}:00`,
                end_time: `${roomInfo.date} ${roomInfo.endTime}:00`,
                attendees: parseInt(attendees),
                phone,
            });
            setBookingResult(result);
            setStep(3); // Move to confirmation
            
            // Clear session storage on success using explicit keys for cross-browser reliability
            const keysToRemove = ['room', 'step', 'title', 'description', 'attendees', 'endDate', 'guestName', 'guestEmail', 'phone'];
            keysToRemove.forEach(k => sessionStorage.removeItem(`${SESSION_KEY}_${k}`));
        } catch (err) {
            const errors = err.response?.data?.errors;
            if (errors) {
                setError(Object.values(errors).flat().join(' '));
            } else {
                setError(err.response?.data?.message || 'Failed to create booking.');
            }
        } finally {
            setSubmitting(false);
        }
    }, [roomInfo, title, description, attendees, endDate, phone]);

    const handleNext = useCallback(() => {
        if (step === 0 && canProceedToAccount) {
            setStep(1);
        } else if (step === 1 && canProceedToAuthOrSubmit) {
            if (isAuthenticated) {
                handleSubmit();
            } else {
                setStep(2);
            }
        } else if (step === 2 && isAuthenticated) {
             handleSubmit();
        }
    }, [step, canProceedToAccount, canProceedToAuthOrSubmit, isAuthenticated, handleSubmit]);

    const handleAuth = useCallback(async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthLoading(true);

        try {
            if (authMode === 'login') {
                await login(guestEmail, authPassword);
            } else {
                await register({
                    name: guestName,
                    email: guestEmail,
                    password: authPassword,
                    password_confirmation: authPasswordConfirm,
                    phone: phone,
                });
            }
            // Auto login/submit happens immediately
            await handleSubmit();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Authentication failed.';
            setAuthError(msg);
        } finally {
            setAuthLoading(false);
        }
    }, [authMode, guestEmail, authPassword, guestName, authPasswordConfirm, phone, login, register, handleSubmit]);

    // Helpers
    const formatTime = (timeStr) => {
        if (!timeStr || !roomInfo.date) return timeStr;
        try {
            // Append seconds if missing to make it valid for Date parsing in some browsers, though T09:00 should be fine.
            const dateObj = new Date(`${roomInfo.date}T${timeStr}`);
            if (isNaN(dateObj.getTime())) return timeStr;
            return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return timeStr;
        }
    };

    const formatDate = (dateStr) => {
        // We usually just pass roomInfo.date directly here, or we use roomInfo.date if not provided
        const d = dateStr || roomInfo.date;
        if (!d) return '';
        try {
            const dateObj = new Date(d);
            if (isNaN(dateObj.getTime())) return d;
            return dateObj.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) {
            return d;
        }
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
        endDate, setEndDate,
        guestName, setGuestName,
        guestEmail, setGuestEmail,
        phone, setPhone,
        error, setError,
        submitting,
        bookingResult,
        canProceedToAccount,
        canProceedToAuthOrSubmit,
        // Auth
        isAuthenticated,
        authMode, setAuthMode,
        authPassword, setAuthPassword,
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
