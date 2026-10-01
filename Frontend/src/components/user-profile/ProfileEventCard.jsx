import React from "react";
import { Link } from "react-router-dom";
import { DeleteIcon, EditIcon } from "../icons/ActionIcons.jsx";

const formatDate = (value) => {
    if (!value) {
        return "Date pending";
    }

    return new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
};

const renderStars = (rating) => {
    const value = Math.max(0, Math.min(5, Number(rating) || 0));
    return `${"★".repeat(value)}${"☆".repeat(5 - value)}`;
};

function ProfileEventCard({
    event,
    type,
    actionLoading = false,
    onDeleteReview,
    onCancelRegistration,
    onToggleSavedEvent
}) {
    const isUpcoming = type === "upcoming";
    const isAttended = type === "attended";
    const isSaved = type === "saved";
    const canRate = isAttended && !event.hasReviewed;
    const canManageReview = isAttended && event.hasReviewed;
    const statusClass = canManageReview || isUpcoming || isSaved
        ? "profile-event-card__status profile-event-card__status--review-actions"
        : canRate
            ? "profile-event-card__status profile-event-card__status--action"
            : "profile-event-card__status";
    const rateState = {
        event: {
            _id: event.eventId,
            id: event.eventId,
            title: event.title,
            name: event.title,
            datetime: event.date,
            date: event.date,
            imageUrl: event.imageUrl,
            price: event.price
        },
        registration: {
            _id: event.registrationId,
            event: event.eventId
        },
        review: event.review
    };

    return (
        <div className="profile-event-card">
            <img
                className="profile-event-card__image"
                src={event.imageUrl || "/Tech-Meetup.png"}
                alt={event.title}
            />
            <div className="profile-event-card__info">
                <h3>
                    {event.eventId ? (
                        <Link className="profile-event-card__title-link" to={`/events/${event.eventId}`}>
                            {event.title}
                        </Link>
                    ) : (
                        event.title
                    )}
                </h3>
                <p>{formatDate(event.date)}</p>
                <p>{event.price === 0 ? "Free" : `EUR ${event.price.toFixed(2)}`}</p>
            </div>
            <div className={statusClass}>
                {canRate ? (
                    <Link
                        to={`/rate-event/${event.eventId}/${event.registrationId}`}
                        state={rateState}
                    >
                        Rate
                    </Link>
                ) : canManageReview ? (
                    <div className="profile-event-card__review-actions">
                        <span aria-label={`Rated ${event.rating} out of 5 stars`}>
                            {renderStars(event.rating)}
                        </span>
                        <div className="profile-event-card__button-stack">
                            <Link
                                className="profile-event-card__icon-button profile-event-card__icon-button--action"
                                to={`/rate-event/${event.eventId}/${event.registrationId}`}
                                state={rateState}
                                aria-label="Edit review"
                                title="Edit review"
                            >
                                <EditIcon />
                            </Link>
                            <button
                                type="button"
                                className="profile-event-card__icon-button profile-event-card__icon-button--danger"
                                onClick={() => onDeleteReview?.(event)}
                                disabled={actionLoading}
                                aria-label="Delete review"
                                title="Delete review"
                            >
                                <DeleteIcon />
                            </button>
                        </div>
                    </div>
                ) : isUpcoming ? (
                    <button
                        type="button"
                        className="profile-event-card__cancel-button"
                        onClick={() => onCancelRegistration?.(event)}
                        disabled={actionLoading}
                    >
                        Cancel registration
                    </button>
                ) : isSaved ? (
                    <button
                        type="button"
                        className="profile-event-card__heart-button"
                        onClick={() => onToggleSavedEvent?.(event)}
                        disabled={actionLoading}
                        aria-label="Unsave event"
                        title="Unsave event"
                    >
                        ♥
                    </button>
                ) : (
                    event.status
                )}
            </div>
        </div>
    );
}

export default ProfileEventCard;
