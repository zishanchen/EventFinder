import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import RateParticipantsContent from '../components/rating/RateParticipantsContent.jsx';
import RateParticipantsHeader from '../components/rating/RateParticipantsHeader.jsx';
import RateParticipantsSidebar from '../components/rating/RateParticipantsSidebar.jsx';
import useParticipantRatings from '../hooks/useParticipantRatings.js';
import { getRatingEventName } from '../utils/ratingParticipants.js';
import '../styles/rating.css';
import '../styles/participant-rating.css';

export default function RateParticipantsList() {
    const location = useLocation();
    const { eventId } = useParams();
    const {
        event,
        participants,
        loading,
        actionLoading,
        error,
        message,
        unratedCount,
        applyDefaultRatings,
        deleteParticipantReview
    } = useParticipantRatings(eventId, location.state?.message || '');

    const eventName = getRatingEventName(event);

    return (
        <div className="rate-page rate-page--list">
            <Navbar />
            <div className="rate-layout">
                <RateParticipantsSidebar
                    eventName={eventName}
                    participantCount={participants.length}
                    unratedCount={unratedCount}
                    actionLoading={actionLoading}
                    onApplyDefaultRatings={applyDefaultRatings}
                />

                <main className="rate-main">
                    <RateParticipantsHeader
                        loading={loading}
                        participantCount={participants.length}
                    />
                    <RateParticipantsContent
                        event={event}
                        eventId={eventId}
                        participants={participants}
                        loading={loading}
                        actionLoading={actionLoading}
                        error={error}
                        message={message}
                        onDeleteParticipantReview={deleteParticipantReview}
                    />
                </main>
            </div>
        </div>
    );
}
