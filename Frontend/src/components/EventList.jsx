import React, { useEffect, useRef } from 'react';
import EventCard from './EventCard.jsx';
import CreateEventIcon from './create-event/CreateEventIcon.jsx';

export default function EventList({
    events,
    loading,
    error,
    selectedEventId,
    selectedEventToken,
    hasActiveFilters = false,
    activeTagFilters = [],
    onClearAll
}) {
    const eventRefs = useRef({});

    useEffect(() => {
        if (!selectedEventId) {
            return;
        }

        eventRefs.current[selectedEventId]?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }, [selectedEventId, selectedEventToken]);

    if (loading) {
        return (
            <main className="event-list">
                <p className="event-list__loading">Loading events...</p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="event-list">
                <p className="event-list__error">Failed to load events: {error}</p>
            </main>
        );
    }

    return (
        <main className="event-list">
            {events.length === 0 ? (
                <section className="event-list__empty" aria-live="polite">
                    <span className="event-list__empty-icon">
                        <CreateEventIcon name="search" />
                    </span>
                    <h3>No events match this view</h3>
                    <p>
                        {hasActiveFilters
                            ? 'Your search, date, price, distance, or tag filters may be narrowing the list.'
                            : 'Hosts may not have published upcoming events yet, or the available events may have ended.'}
                    </p>
                    <button
                        type="button"
                        className="event-list__empty-action"
                        onClick={onClearAll}
                    >
                        Reset filters
                    </button>
                </section>
            ) : (
                events.map(event => (
                    <div
                        key={event._id}
                        ref={(node) => {
                            if (node) {
                                eventRefs.current[event._id] = node;
                            } else {
                                delete eventRefs.current[event._id];
                            }
                        }}
                    >
                        <EventCard
                            event={event}
                            selected={event._id === selectedEventId}
                            selectedTags={activeTagFilters}
                        />
                    </div>
                ))
            )}
        </main>
    );
}
