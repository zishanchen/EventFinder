import React from 'react';

export default function EventInfoCard({ event }) {
    const eventName = event?.name || event?.title || 'Selected event';
    const eventDate = event?.datetime || event?.date;
    const host = event?.host || event?.creator || {};
    const hostName = host?.username || host?.name || 'Unknown Host';
    const formattedDate = eventDate
        ? new Date(eventDate).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        })
        : 'Date not available';

    return (
        <div className="rate-page__event-card">
            <img
                src={event?.image || event?.imageUrl || 'https://placehold.co/80x80?text=Event'}
                alt={eventName}
                className="rate-page__event-image"
            />
            <div className="rate-page__event-info">
                <h3 className="rate-page__event-name">{eventName}</h3>
                <p className="rate-page__event-host">
                    Hosted by {hostName}
                </p>
                <p className="rate-page__event-date">
                    {formattedDate}
                </p>
            </div>
        </div>
    );
}
