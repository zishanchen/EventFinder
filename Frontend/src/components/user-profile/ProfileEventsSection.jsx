import React from "react";
import ProfileEventColumn from "./ProfileEventColumn.jsx";

function ProfileEventsSection({
    attendedEvents = [],
    upcomingEvents = [],
    savedEvents = [],
    variant = "all",
    actionLoading = false,
    onDeleteReview,
    onCancelRegistration,
    onToggleSavedEvent
}) {
    const showUpcoming = variant !== "history";
    const showHistory = variant !== "upcoming";
    const eventActions = {
        actionLoading,
        onDeleteReview,
        onCancelRegistration,
        onToggleSavedEvent
    };

    return (
        <section className={`profile-events profile-events--${variant}`}>
            {showUpcoming && (
                <ProfileEventColumn
                    title="Upcoming Events"
                    emptyMessage="No active registrations yet."
                    events={upcomingEvents}
                    type="upcoming"
                    className="profile-events__column--upcoming"
                    {...eventActions}
                />
            )}

            {showHistory && (
                <>
                    <ProfileEventColumn
                        title="Attended Events"
                        emptyMessage="No attended events yet."
                        events={attendedEvents}
                        type="attended"
                        {...eventActions}
                    />

                    <ProfileEventColumn
                        title="Saved Events"
                        emptyMessage="No saved events yet."
                        events={savedEvents}
                        type="saved"
                        {...eventActions}
                    />
                </>
            )}
        </section>
    );
}

export default ProfileEventsSection;
