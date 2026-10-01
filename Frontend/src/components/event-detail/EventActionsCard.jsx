import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSavedEventIds, saveEvent, unsaveEvent } from '../../api/eventApi.js';
import { useAuthContext } from '../../context/AuthContext.jsx';
import CreateEventIcon from '../create-event/CreateEventIcon.jsx';

const copyEventLink = async () => {
    const url = window.location.href;

    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
};

function EventActionsCard({ event }) {
    const navigate = useNavigate();
    const { token, isAuthenticated } = useAuthContext();
    const [isSaved, setIsSaved] = useState(false);
    const [isShared, setIsShared] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingSavedState, setLoadingSavedState] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        let cancelled = false;

        const loadSavedState = async () => {
            if (!token) {
                setIsSaved(false);
                setLoadingSavedState(false);
                return;
            }

            try {
                setLoadingSavedState(true);
                const savedEventIds = await fetchSavedEventIds(token);
                if (!cancelled) {
                    setIsSaved(savedEventIds.includes(event._id));
                }
            } catch {
                if (!cancelled) {
                    setIsSaved(false);
                }
            } finally {
                if (!cancelled) {
                    setLoadingSavedState(false);
                }
            }
        };

        loadSavedState();

        return () => {
            cancelled = true;
        };
    }, [event._id, token]);

    const handleSave = async () => {
        setMessage('');
        setSaveError('');

        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        const previousSavedState = isSaved;
        const nextSavedState = !isSaved;

        try {
            setSaving(true);
            setIsSaved(nextSavedState);

            if (previousSavedState) {
                await unsaveEvent(event._id, token);
                setMessage('Removed from saved events.');
            } else {
                await saveEvent(event._id, token);
                setMessage('Event saved.');
            }
        } catch (error) {
            setIsSaved(previousSavedState);
            setSaveError(error.message || 'Could not update saved events.');
        } finally {
            setSaving(false);
        }
    };

    const handleShare = async () => {
        setMessage('');

        try {
            const shareData = {
                title: event.title,
                text: `Check out ${event.title} on EventFinder.`,
                url: window.location.href
            };

            if (navigator.share) {
                await navigator.share(shareData);
                setIsShared(true);
                setMessage('Share sheet opened.');
                return;
            }

            await copyEventLink();
            setIsShared(true);
            setMessage('Event link copied.');
        } catch (error) {
            if (error.name !== 'AbortError') {
                setMessage('Could not share this event.');
            }
        }
    };

    const saveButtonLabel = saving
        ? isSaved ? 'Saving...' : 'Removing...'
        : isSaved ? 'Saved' : 'Save';
    const saveButtonIcon = isSaved ? 'check' : 'bookmark';
    const saveButtonClassName = [
        isSaved ? 'event-actions-card__button--completed' : '',
        saving ? 'event-actions-card__button--loading' : ''
    ].filter(Boolean).join(' ');

    return (
        <section className="event-card event-actions-card">
            <h2 className="event-actions-card__title">Event actions</h2>
            <div className="event-actions-card__buttons">
                <button 
                    type="button" 
                    onClick={handleSave} 
                    disabled={saving || loadingSavedState}
                    className={saveButtonClassName}
                    aria-busy={saving}
                    aria-pressed={isSaved}>
                    <CreateEventIcon name={saveButtonIcon} />
                    {loadingSavedState ? 'Checking...' : saveButtonLabel}
                </button>
                <button 
                    type="button" 
                    onClick={handleShare} 
                    className={isShared? 'event-actions-card__button--completed' : ''}
                    aria-pressed={isShared}>
                    <CreateEventIcon name={isShared ? 'check' : 'share'} />
                    Share
                </button>
            </div>
            {message && <p className="event-actions-card__message" role="status">{message}</p>}
            {saveError && <p className="event-actions-card__message event-actions-card__message--error" role="alert">{saveError}</p>}
        </section>
    );
}

export default EventActionsCard;
