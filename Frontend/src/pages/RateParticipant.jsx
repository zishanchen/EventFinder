import React, { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import RateParticipantContent from '../components/rating/RateParticipantContent.jsx';
import RateParticipantHeader from '../components/rating/RateParticipantHeader.jsx';
import RateParticipantSidebar from '../components/rating/RateParticipantSidebar.jsx';
import useParticipantRatings from '../hooks/useParticipantRatings.js';
import { getRatingEventName, getSelectedParticipant } from '../utils/ratingParticipants.js';
import '../styles/rating.css';
import '../styles/participant-rating.css';

export default function RateParticipant() {
    const location = useLocation();
    const { eventId, registrationId } = useParams();
    const stateData = location.state || {};
    const {
        event,
        participants,
        loading,
        error
    } = useParticipantRatings(
        eventId || stateData.event?._id || stateData.event?.id,
        ''
    );

    const selectedParticipant = useMemo(() => getSelectedParticipant({
        participants,
        registrationId,
        stateData
    }), [participants, registrationId, stateData]);
    const pageEvent = event || stateData.event;
    const eventName = getRatingEventName(pageEvent);
    const isEditing = Boolean(selectedParticipant?.rating);

    return (
        <div className="rate-page">
            <Navbar />
            <div className="rate-layout rate-layout--single">
                <RateParticipantSidebar
                    eventId={eventId}
                    eventName={eventName}
                    isEditing={isEditing}
                />

                <main className="rate-main">
                    <RateParticipantHeader eventName={eventName} />
                    <RateParticipantContent
                        eventId={eventId}
                        selectedParticipant={selectedParticipant}
                        pageEvent={pageEvent}
                        isEditing={isEditing}
                        loading={selectedParticipant ? false : loading}
                        error={selectedParticipant ? null : error}
                    />
                </main>
            </div>
        </div>
    );
}
