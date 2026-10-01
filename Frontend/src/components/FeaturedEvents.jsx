import React from "react";
import EventCard from "./EventCard.jsx";
import { fetchFeaturedEvents } from "../api/eventApi";
import { useEffect, useState } from "react";

function FeaturedEvents() {

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadFeaturedEvents = async ({ showLoading = false } = {}) => {
            if (showLoading && isMounted) {
                setLoading(true);
            }

            try {
                const data = await fetchFeaturedEvents();

                if (isMounted) {
                    setEvents(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadFeaturedEvents({ showLoading: true });

        const refreshInterval = window.setInterval(
            () => loadFeaturedEvents(),
            60_000
        );

        const refreshWhenVisible = () => {
            if (document.visibilityState === 'visible') {
                loadFeaturedEvents();
            }
        };

        document.addEventListener('visibilitychange', refreshWhenVisible);

        return () => {
            isMounted = false;
            window.clearInterval(refreshInterval);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, []);

    return (
        <section className = "featured">
            <div className = "section-heading">
                <div>
                    <h2>Featured Events</h2>
                    <p>Popular events happing near you</p>
                </div>
                
                <a href = "/discover" className = "section-heading__link">
                    View all →
                </a>
            </div>

            {loading ? (
                <p> Loading featured events...</p>
            ): (
                <div className="featured__grid">
                    {events.map(event => (
                        <EventCard key={event._id} event={event} />
                    ))}
                </div>
            )}
                                      
            
        </section>
    );
}

export default FeaturedEvents;
