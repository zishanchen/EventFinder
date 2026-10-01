import React from 'react';
import CreateEventIcon from '../create-event/CreateEventIcon.jsx';

function EventDetailsCard({event}) {

    const formatDate = new Date(event.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })
    return (
        <section className="event-card event-details-card">
            <h2 className="event-card__title">Event Details</h2>

            <div className="event-details-card__list">
                <div className="event-details-card__item">
                    <span className="event-details-card__icon">
                        <CreateEventIcon name="calendar" />
                    </span>

                    <div>
                        <p className="event-details-card__primary">{formatDate}</p>
                        <p className="event-details-card__secondary">{event.startTime} - {event.endTime}</p>
                    </div>
                </div>

                <div className="event-details-card__item">
                    <span className="event-details-card__icon">
                        <CreateEventIcon name="pin" />
                    </span>

                    <div>
                        <p className="event-details-card__primary">{event.address}</p>
                    </div>
                </div>

                <div className="event-details-card__item">
                    <span className="event-details-card__icon">
                        <CreateEventIcon name="price" />
                    </span>

                    <div>
                        <p className="event-details-card__primary">
                             €{event.price.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="event-details-card__divider"/>

            <div>
                <h3 className="event-details-card__subtitle">About this event</h3>
                <p className="event-details-card__description">{event.description}</p>

            </div>
        </section>
    );
}

export default EventDetailsCard;
