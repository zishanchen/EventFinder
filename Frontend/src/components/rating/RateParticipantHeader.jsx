import React from 'react';

export default function RateParticipantHeader({ eventName }) {
    return (
        <header className="rate-header">
            <div>
                <h2>Rating Form</h2>
                <p>{eventName}</p>
            </div>
        </header>
    );
}
