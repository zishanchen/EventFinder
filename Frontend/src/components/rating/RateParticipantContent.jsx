import React from 'react';
import { useNavigate } from 'react-router-dom';
import ParticipantInfoCard from './ParticipantInfoCard.jsx';
import RateParticipantForm from './RateParticipantForm.jsx';

export default function RateParticipantContent({
    eventId,
    selectedParticipant,
    pageEvent,
    isEditing,
    loading,
    error
}) {
    const navigate = useNavigate();

    const goBack = () => {
        if (eventId) {
            navigate(`/rate-participant/${eventId}`);
            return;
        }

        navigate(-1);
    };

    const handleRated = () => {
        if (eventId) {
            navigate(`/rate-participant/${eventId}`, {
                state: { message: isEditing ? 'Participant rating updated successfully!' : 'Participant rated successfully!' }
            });
            return;
        }

        navigate(-1);
    };

    return (
        <div className="rate-content rate-content--form">
            {error && <p className="rate-page__error">{error}</p>}

            {loading ? (
                <div className="rate-page__card rate-page__empty">Loading participant...</div>
            ) : selectedParticipant ? (
                <div className="rate-page__card">
                    <ParticipantInfoCard participant={selectedParticipant.participant} event={pageEvent} />
                    <RateParticipantForm
                        registration={selectedParticipant.registration}
                        participant={selectedParticipant.participant}
                        event={pageEvent}
                        existingRating={selectedParticipant.rating}
                        onRated={handleRated}
                        onCancel={goBack}
                    />
                </div>
            ) : (
                <div className="rate-page__card rate-page__empty">
                    This participant is not available for rating.
                </div>
            )}
        </div>
    );
}
