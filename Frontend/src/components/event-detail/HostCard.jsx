import React from 'react';
import { formatRating } from '../../utils/ratingDisplay.js';
import { getFirstWordInitial } from '../../utils/avatarUpload.js';
import CreateEventIcon from '../create-event/CreateEventIcon.jsx';

function HostCard({host}) {

    const hostName = host?.name || 'Event host';
    const initials = host?.initials || getFirstWordInitial(hostName);

    

    return (
        <section className="event-card host-card">
            <h2 className="event-card__title">Hosted by</h2>

            <div className="host-card__content">
                <div className="host-card__avatar">
                    {host?.profilePicture ? (
                        <img src={host.profilePicture} alt={`${hostName}'s profile`} className="host-card__avatar-image" />
                    ) : initials}
                </div>

                <div className="host-card__info">
                    <div className="host-card__name-row">
                        <h3 className="host-card__name">{hostName}</h3>

                        {host?.verified && (
                            <span className="host-card__verified" aria-label="Verified Host">
                                <CreateEventIcon name="check" />
                            </span>
                        )}
                    </div>

                    <div className="host-card__meta">
                        <span>
                            <span className="host-card__rating-star">
                                <CreateEventIcon name="star" />
                            </span>
                            {formatRating(host.rating)}
                        </span>
                        <span>{host.eventsHosted} events hosted</span>
                    </div>

                    {host?.description && <p className="host-card__description">{host.description}</p>}

                    
                </div>
            </div>
        </section>
    );
}

export default HostCard;
