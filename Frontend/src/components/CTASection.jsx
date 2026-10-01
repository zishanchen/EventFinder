import React from "react";
import CreateEventIcon from "./create-event/CreateEventIcon.jsx";

function CTASection() {
    return (
        <section className = "cta">
            <div className = "cta__content">
                <div className="cta__about">
                    <p className="cta__eyebrow">About EventFinder</p>
                    <h2>One place for everything happening around campus</h2>
                    <p>
                        EventFinder brings student events in Munich into one searchable,
                        trustworthy place with verified hosts, real-time capacity, real
                        reviews.
                    </p>
                    <p className="cta__built-by">
                        Built by four TUM students, who needed it just as much as you do
                    </p>
                </div>

                <div className="cta__panel">
                    <h2>Ready to Join the Community?</h2>

                    <p>Start discovering amazing events or host your own to connect with
            students across Munich</p>
                    <div className = "cta__actions">
                        <a href = "/discover" className = "cta__button cta__button--primary">
                            <CreateEventIcon name="search" />
                            Explore Events
                        </a>

                        <a href = "/dashboard" className = "cta__button cta__button--secondary">
                            <CreateEventIcon name="briefcase" />
                            Become a Host
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default CTASection;
