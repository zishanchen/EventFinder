import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext.jsx';
import { getEventNavigationPath } from '../utils/eventNavigation.js';
import { formatRating } from '../utils/ratingDisplay.js';
import { getTagName, normalizeTag, tagStyle } from '../utils/tagPresentation.js';
import CreateEventIcon from './create-event/CreateEventIcon.jsx';
import '../styles/eventCard.css';

const TITLE_LIMIT = 72;
const LOCATION_LIMIT = 44;
const TAG_LIMIT = 4;

const truncateText = (value, maxLength) => {
    const text = String(value || '').trim();

    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
};

const getDisplayTags = (event, selectedTags) => {
    const selectedTagSet = new Set(selectedTags);
    const tags = (event.tagDetails?.length ? event.tagDetails : event.tags || [])
        .map(normalizeTag)
        .filter((tag) => tag.name);

    return [...tags].sort((first, second) => {
        const firstSelected = selectedTagSet.has(first.name);
        const secondSelected = selectedTagSet.has(second.name);

        if (firstSelected === secondSelected) {
            return 0;
        }

        return firstSelected ? 1 : -1;
    });
};

export default function EventCard({ event, selected = false, selectedTags = [] }) {
    const navigate = useNavigate();
    const { user } = useAuthContext();

    const isBoosted = Boolean(event?.isBoostedNow);
    const selectedTagSet = new Set(selectedTags);
    const displayTags = getDisplayTags(event, selectedTags);
    const visibleTags = displayTags.slice(0, TAG_LIMIT);
    const hiddenTagCount = Math.max(0, displayTags.length - visibleTags.length);
    const title = truncateText(event.title, TITLE_LIMIT);
    const locationName = truncateText(event.locationName, LOCATION_LIMIT);

    const eventDate = event?.datetime || event?.date;
    const formattedDate = eventDate
        ? new Date(eventDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
        : 'Date TBA';

    return (
        <div
            className={`event-card ${selected ? 'event-card--selected' : ''}`}
            onClick={() => navigate(getEventNavigationPath(event, user))}
        >
            <div className="event-card__image-wrapper">
                <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="event-card__image"
                />

                <span
                    className={`event-card__price-badge ${
                        event.price === 0 ? 'event-card__price-badge--free' : ''
                    }`}
                >
                    {event.price === 0 ? 'Free' : `€${event.price}`}
                </span>

                {event.isSaved && (
                    <span
                        className="event-card__saved"
                        aria-label="Saved event"
                        title="Saved event"
                    >
                        <CreateEventIcon name="bookmark" />
                    </span>
                )}
            </div>

            <div className="event-card__info">
                <div className="event-card__title-row">
                    <h3 className="event-card__title" title={event.title}>{title}</h3>

                    {isBoosted && (
                        <span className="event-card__boost-badge">
                            Boosted
                        </span>
                    )}
                </div>

                <p className="event-card__detail">
                    <CreateEventIcon name="calendar" />
                    {formattedDate}
                </p>

                <div className="event-card__meta">
                    <span className="event-card__rating">
                        <CreateEventIcon name="star" />
                        {formatRating(event.rating, 'N/A')}
                    </span>

                    <span className="event-card__attendees">
                        <CreateEventIcon name="users" />
                        {event.attendeesCount}
                    </span>
                </div>

                <p className="event-card__detail">
                    <CreateEventIcon name="pin" />
                    {event.distanceLabel && (
                        <span className="event-card__distance-pill">
                            {event.distanceLabel}
                        </span>
                    )}
                    <span className="event-card__location" title={event.locationName}>
                        {locationName}
                    </span>
                </p>

                <div className="event-card__tags">
                    {visibleTags.map((tag) => (
                        <span
                            key={tag.name}
                            className={`event-card__tag ${selectedTagSet.has(getTagName(tag)) ? 'event-card__tag--selected' : ''}`}
                            style={tagStyle(tag)}
                        >
                            {tag.name}
                        </span>
                    ))}
                    {hiddenTagCount > 0 && (
                        <span className="event-card__tag event-card__tag--more">
                            +{hiddenTagCount}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
