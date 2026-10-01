import React from 'react';

export default function RateParticipantsHeader({ loading, participantCount }) {
    return (
        <header className="rate-header">
            <div>
                <h2>Attended Participants</h2>
                <p>
                    {loading
                        ? 'Loading participants...'
                        : `${participantCount} participant${participantCount === 1 ? '' : 's'} found`}
                </p>
            </div>
        </header>
    );
}
