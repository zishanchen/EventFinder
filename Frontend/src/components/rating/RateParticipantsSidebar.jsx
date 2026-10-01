import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreateEventIcon from '../create-event/CreateEventIcon.jsx';

export default function RateParticipantsSidebar({
    eventName,
    participantCount,
    unratedCount,
    actionLoading,
    onApplyDefaultRatings
}) {
    const navigate = useNavigate();
    const ratedCount = participantCount - unratedCount;

    return (
        <aside className="rate-sidebar">
            

            <div className="rate-sidebar__block">
                <p className="rate-sidebar__eyebrow">Participant Ratings</p>
                <h1>{eventName}</h1>
                <p>Rate attended participants individually or finish the remaining list with a default 5-star rating.</p>
            </div>

            <div className="rate-sidebar__stats">
                <div className="rate-stat rate-stat--blue">
                    <span>{participantCount}</span>
                    <p>Attended</p>
                </div>
                <div className="rate-stat rate-stat--amber">
                    <span>{unratedCount}</span>
                    <p>To be Rated</p>
                </div>
                <div className="rate-stat rate-stat--green">
                    <span>{ratedCount}</span>
                    <p>Rated</p>
                </div>
            </div>

            <button
                type="button"
                className="rate-page__default-button"
                onClick={onApplyDefaultRatings}
                disabled={actionLoading || unratedCount === 0}
            >
                {actionLoading ? 'Saving...' : 'Give remaining 5 stars'}
            </button>

            <button
                type="button"
                className="rate-page__dashboard-button"
                onClick={() => navigate('/dashboard')}
            >
                Back to dashboard
            </button>
        </aside>
    );
}
