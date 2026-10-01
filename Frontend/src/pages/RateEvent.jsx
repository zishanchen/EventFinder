import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import EventInfoCard from '../components/rating/EventInfoCard.jsx';
import RateEventForm from '../components/rating/RateEventForm.jsx';
import { fetchEventById } from '../api/eventApi.js';
import '../styles/rating.css';

export default function RateEvent() {
    const location = useLocation();
    const { eventId, registrationId } = useParams();
    const stateData = location.state || {};
    const [event, setEvent] = useState(stateData.event || null);
    const [loading, setLoading] = useState(!stateData.event && Boolean(eventId));
    const [error, setError] = useState(null);

    useEffect(() => {
        let isActive = true;

        const loadEvent = async () => {
            if (!stateData.event && eventId) {
                setLoading(true);
                setError(null);

                try {
                    const data = await fetchEventById(eventId);
                    if (isActive) {
                        setEvent(data);
                    }
                } catch (err) {
                    if (isActive) {
                        setError(err.message);
                    }
                } finally {
                    if (isActive) {
                        setLoading(false);
                    }
                }

                return;
            }

            setLoading(false);
        };

        loadEvent();

        return () => {
            isActive = false;
        };
    }, [eventId, stateData.event]);

    const registration = stateData.registration || (
        registrationId
            ? { _id: registrationId, event: eventId }
            : null
    );

    const eventName = event?.name || event?.title || 'Selected event';
    const isEditing = Boolean(stateData.review);

    return (
        <div className="rate-page">
            <Navbar />
            <div className="rate-layout rate-layout--single">
                <aside className="rate-sidebar">
                    

                    <div className="rate-sidebar__block">
                        <p className="rate-sidebar__eyebrow">Event Rating</p>
                        <h1>{isEditing ? 'Edit Your Review' : 'Rate Your Experience'}</h1>
                        <p>Your feedback helps us improve and helps other students find great events.</p>
                    </div>
                </aside>

                <main className="rate-main">
                    <header className="rate-header">
                        <div>
                            <h2>Rating Form</h2>
                            <p>{eventName}</p>
                        </div>
                    </header>

                    <div className="rate-content rate-content--form">
                        {error && <p className="rate-page__error">{error}</p>}

                        {!registration ? (
                            <div className="rate-page__card rate-page__empty">
                                This rating link is missing registration details.
                            </div>
                        ) : loading ? (
                            <div className="rate-page__card rate-page__empty">Loading event...</div>
                        ) : (
                            <div className="rate-page__card">
                                <EventInfoCard event={event} />
                                <RateEventForm
                                    registration={registration}
                                    event={event}
                                    eventId={eventId}
                                    existingReview={stateData.review}
                                />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );

}
