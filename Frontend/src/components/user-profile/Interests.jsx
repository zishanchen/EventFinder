import React from "react";
import { getTagName, tagStyle } from "../../utils/tagPresentation.js";

const normalizeInterest = (interest) => {
    const name = getTagName(interest);
    const percentage = Number(interest?.percentage);

    return {
        tag: interest,
        name,
        percentage: Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : null
    };
};

function Interests({ interests = [] }) {
    const normalizedInterests = interests
        .map(normalizeInterest)
        .filter((interest) => interest.name);
    const hasInterests = normalizedInterests.length > 0;

    return (
        <section className="profile-card profile-interests">
            <div className="profile-section-title">
                <h2>Interests</h2>
            </div>
            <div className="profile-interests__list">
                {hasInterests ? (
                    normalizedInterests.map((interest) => (
                        <div
                            key={interest.name}
                            className="profile-interests__item"
                            style={{
                                ...tagStyle(interest.tag),
                                "--interest-percent": `${interest.percentage ?? 0}%`
                            }}
                        >
                            <div className="profile-interests__bar" aria-hidden="true" />
                            <span className="profile-interests__name">{interest.name}</span>
                            {interest.percentage !== null && (
                                <span className="profile-interests__score">{interest.percentage}%</span>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="profile-empty">Join events to build your interest profile.</p>
                )}
            </div>

            <span></span>
        </section>
    );

}
export default Interests;
