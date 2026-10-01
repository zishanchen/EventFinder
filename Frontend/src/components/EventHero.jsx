import React from "react";
import { formatRating } from "../utils/ratingDisplay.js";
import { normalizeTag, tagStyle } from "../utils/tagPresentation.js";
import CreateEventIcon from "./create-event/CreateEventIcon.jsx";


function EventHero({event}) {
    const tags = (event.tagDetails?.length ? event.tagDetails : event.tags || [])
        .map(normalizeTag)
        .filter((tag) => tag.name);

    return (
        <section
            className="event-hero"
            style={{backgroundImage:  `url(${event.imageUrl})` }}
        >
            <div className="event-hero__overlay">
                <div className="event-hero__content">

                    <div className="event-hero__tags">
                        
                        {tags.map((tag) => (
                            <span
                                className="event-hero__tag"
                                key={tag.name}
                                style={tagStyle(tag)}
                            >
                                {tag.name}
                            </span>
                        ))}
                    </div>

                    <h1 className="event-hero__title">{event.title}</h1>

                    <div className="event-hero__meta">   
                        <span className="event-hero__rating">
                            <CreateEventIcon name="star" />
                            {formatRating(event.rating)}
                        </span>
                        <span>
                            <CreateEventIcon name="users" />
                            {event.attendeesCount}/{event.capacity} going
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default EventHero;
