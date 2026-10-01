import React, { useState } from 'react';

const buildInitials = (name = '') => {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || '?';
};

const getLastNameSortKey = (name = '') => {
    const nameParts = name.trim().split(/\s+/).filter(Boolean);
    return (nameParts.at(-1) || name).toLocaleLowerCase();
};

function AttendeeAvatar({ attendee, className = '' }) {
    const initials = buildInitials(attendee.username);

    return (
        <div className={`attendees-card__avatar ${className}`} title={attendee.username}>
            {attendee.profilePicture ? (
                <img src={attendee.profilePicture} alt="" className="attendees-card__avatar-image" />
            ) : (
                initials
            )}
        </div>
    );
}

function AttendeesCard({ event }) {
    const [expanded, setExpanded] = useState(false);
    const attendees = Array.isArray(event.attendees)
        ? [...event.attendees].sort((left, right) => {
            const lastNameComparison = getLastNameSortKey(left.username)
                .localeCompare(getLastNameSortKey(right.username));

            if (lastNameComparison !== 0) {
                return lastNameComparison;
            }

            return (left.username || '').localeCompare(right.username || '');
        })
        : [];
    const totalAttendees = Number(event.attendeesCount) || attendees.length;
    const previewAttendees = attendees.slice(0, 5);
    const hiddenPreviewCount = Math.max(0, totalAttendees - previewAttendees.length);

    return (
        <section className="event-card attendees-card">
            <div className="attendees-card__header">
                <h2 className="event-card__title">
                    Who&apos;s Going ({totalAttendees})
                </h2>
                {attendees.length > 0 && (
                    <button
                        type="button"
                        className="attendees-card__toggle"
                        onClick={() => setExpanded((current) => !current)}
                        aria-expanded={expanded}
                    >
                        {expanded ? 'Show less' : 'See all'}
                    </button>
                )}
            </div>

            {attendees.length === 0 ? (
                <p className="attendees-card__empty">No registered attendees yet.</p>
            ) : (
                <>
                    {!expanded && (
                        <div className="attendees-card__avatars">
                            {previewAttendees.map((attendee) => (
                                <AttendeeAvatar attendee={attendee} key={attendee.id} />
                            ))}

                            {hiddenPreviewCount > 0 && (
                                <div className="attendees-card__avatar attendees-card__avatar--more">
                                    +{hiddenPreviewCount}
                                </div>
                            )}
                        </div>
                    )}

                    {expanded && (
                        <div className="attendees-card__list">
                            {attendees.map((attendee) => (
                                <div className="attendees-card__person" key={attendee.id}>
                                    <AttendeeAvatar attendee={attendee} className="attendees-card__avatar--small" />
                                    <span>{attendee.username || 'EventFinder member'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

export default AttendeesCard;
