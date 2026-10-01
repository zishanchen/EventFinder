import React from 'react';
import { useNavigate } from 'react-router-dom';
import RateParticipantRow from './RateParticipantRow.jsx';
import { sortParticipants } from '../../utils/ratingParticipants.js';

export default function RateParticipantsContent({
    event,
    eventId,
    participants,
    loading,
    actionLoading,
    error,
    message,
    onDeleteParticipantReview
}) {
    const navigate = useNavigate();
    const sortedParticipants = sortParticipants(participants);

    const openParticipant = (item) => {
        navigate(`/rate-participant/${eventId}/${item.registration._id}`, {
            state: {
                event,
                registration: item.registration,
                participant: item.participant,
                rating: item.rating
            }
        });
    };

    const handleDeleteReview = (item) => {
        const shouldDelete = window.confirm('Delete this participant review?');

        if (!shouldDelete) {
            return;
        }

        onDeleteParticipantReview(item.registration._id);
    };

    return (
        <div className="rate-content">
            {error && <p className="rate-page__error">{error}</p>}
            {message && <p className="rate-page__success">{message}</p>}

            {loading ? (
                <div className="rate-page__card rate-page__empty">Loading participants...</div>
            ) : participants.length === 0 ? (
                <div className="rate-page__card rate-page__empty">
                    No attended participants found for this event.
                </div>
            ) : (
                <section className="rate-page__participant-list">
                    {sortedParticipants.map((item) => (
                        <RateParticipantRow
                            key={item.registration._id}
                            item={item}
                            actionLoading={actionLoading}
                            onOpen={openParticipant}
                            onDelete={handleDeleteReview}
                        />
                    ))}
                </section>
            )}
        </div>
    );
}
