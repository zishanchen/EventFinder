import React from "react";
import ProfileEventCard from "./ProfileEventCard.jsx";

function ProfileEventColumn({
    title,
    emptyMessage,
    events = [],
    type,
    className = "",
    actionLoading = false,
    onDeleteReview,
    onCancelRegistration,
    onToggleSavedEvent
}) {
    const columnClassName = ["profile-events__column", className].filter(Boolean).join(" ");

    return (
        <div className={columnClassName}>
            <h2>{title}</h2>
            {events.length > 0 ? (
                <div className="profile-events__list">
                    {events.map((event) => (
                        <ProfileEventCard
                            key={`${type}-${event.registrationId || event.eventId}`}
                            event={event}
                            type={type}
                            actionLoading={actionLoading}
                            onDeleteReview={onDeleteReview}
                            onCancelRegistration={onCancelRegistration}
                            onToggleSavedEvent={onToggleSavedEvent}
                        />
                    ))}
                </div>
            ) : (
                <p className="profile-empty">{emptyMessage}</p>
            )}
        </div>
    );
}

export default ProfileEventColumn;
