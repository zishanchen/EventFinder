import React, { useEffect, useRef, useState } from "react";

const ACHIEVEMENT_TRACKS = ["community", "events", "reviews", "discovery"];
const ACHIEVEMENT_TRACK_LABELS = {
    community: "Community",
    events: "Events",
    reviews: "Reviews",
    discovery: "Discovery"
};

const ACHIEVEMENT_ICONS = {
    member: (
        <path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z" />
    ),
    explorer: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
        </>
    ),
    reviewer: (
        <>
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H9l-5 4V5.5Z" />
            <path d="m8 9.8 2.1 2.1L15.5 7" />
        </>
    ),
    variety: (
        <>
            <rect x="4" y="4" width="6" height="6" rx="1.5" />
            <rect x="14" y="4" width="6" height="6" rx="1.5" />
            <rect x="4" y="14" width="6" height="6" rx="1.5" />
            <rect x="14" y="14" width="6" height="6" rx="1.5" />
        </>
    ),
    firstEvent: (
        <>
            <path d="M5 21V4" />
            <path d="M5 5h11l-2 3 2 3H5" />
        </>
    ),
    regular: (
        <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18m-12 5 2 2 4-4" />
        </>
    ),
    veteran: (
        <>
            <circle cx="12" cy="8" r="5" />
            <path d="m8.5 12-1 9 4.5-2 4.5 2-1-9M12 5v6M9 8h6" />
        </>
    ),
    firstReview: (
        <>
            <path d="M13.5 6.5 17.5 10.5M4 20l1.2-5L15.7 4.5a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8L9 18.8 4 20Z" />
            <path d="M12 20h8" />
        </>
    ),
    trustedVoice: (
        <>
            <path d="m4 13 11-5v9L4 13Z" />
            <path d="M15 10.5h2a3 3 0 0 1 0 6h-2M6 14l1.5 6h4L10 15.8" />
        </>
    ),
    curiousMind: (
        <>
            <path d="M9 18h6M10 22h4" />
            <path d="M8.2 14.5A7 7 0 1 1 15.8 14.5C14.7 15.2 14 16.4 14 18h-4c0-1.6-.7-2.8-1.8-3.5Z" />
        </>
    ),
    categoryExplorer: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
        </>
    ),
    communityStar: (
        <>
            <path d="M20.8 8.7c0 5.2-8.8 10.3-8.8 10.3S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.3Z" />
            <path d="m12 8 .9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3L12 8Z" />
        </>
    )
};

const ACHIEVEMENT_TONES = {
    member: "profile-achievements__icon--yellow",
    explorer: "profile-achievements__icon--purple",
    reviewer: "profile-achievements__icon--blue",
    variety: "profile-achievements__icon--green",
    firstEvent: "profile-achievements__icon--cyan",
    regular: "profile-achievements__icon--purple",
    veteran: "profile-achievements__icon--orange",
    firstReview: "profile-achievements__icon--green",
    trustedVoice: "profile-achievements__icon--pink",
    curiousMind: "profile-achievements__icon--yellow",
    categoryExplorer: "profile-achievements__icon--blue",
    communityStar: "profile-achievements__icon--pink"
};

function AchievementIcon({ achievement }) {
    const icon = ACHIEVEMENT_ICONS[achievement.key] || ACHIEVEMENT_ICONS.member;

    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {icon}
        </svg>
    );
}

const buildProfileAchievements = (achievements) => {
    const hasRankedAchievements = achievements.some((achievement) => {
        return ACHIEVEMENT_TRACKS.includes(achievement.track) && Number.isFinite(achievement.rank);
    });

    if (!hasRankedAchievements) {
        return achievements.slice(0, ACHIEVEMENT_TRACKS.length);
    }

    return ACHIEVEMENT_TRACKS.map((track) => {
        const trackAchievements = achievements
            .filter((achievement) => achievement.track === track)
            .sort((first, second) => first.rank - second.rank);
        const unlockedAchievements = trackAchievements.filter((achievement) => achievement.unlocked);

        return unlockedAchievements.at(-1) || trackAchievements[0];
    }).filter(Boolean);
};

function AchievementCard({ achievement, showStatus = false, showRank = false }) {
    const toneClass = ACHIEVEMENT_TONES[achievement.key] || ACHIEVEMENT_TONES.member;
    const trackLabel = ACHIEVEMENT_TRACK_LABELS[achievement.track];

    return (
        <article
            role="listitem"
            className={`profile-achievements__item ${achievement.unlocked ? '' : 'profile-achievements__item--locked'}`}
        >
            <div className={`profile-achievements__icon ${toneClass}`}>
                <AchievementIcon achievement={achievement} />
            </div>
            {showRank && trackLabel && Number.isFinite(achievement.rank) && (
                <span className="profile-achievements__rank">
                    {trackLabel} · Rank {achievement.rank}
                </span>
            )}
            <strong>{achievement.title}</strong>
            <span>{achievement.description}</span>
            {showStatus && (
                <span className={`profile-achievements__status ${achievement.unlocked ? 'profile-achievements__status--unlocked' : ''}`}>
                    {achievement.unlocked ? 'Unlocked' : 'Locked'}
                </span>
            )}
        </article>
    );
}

function Achievements({ achievements = [] }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const dialogRef = useRef(null);
    const exploreButtonRef = useRef(null);
    const previewAchievements = buildProfileAchievements(achievements);
    const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;

    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog) return undefined;

        if (isDialogOpen && !dialog.open) {
            dialog.showModal();
        } else if (!isDialogOpen && dialog.open) {
            dialog.close();
        }

        if (!isDialogOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const handleKeyDown = (event) => {
            if (event.key === "Escape" && dialog.open) {
                event.preventDefault();
                dialog.close();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [isDialogOpen]);

    const closeDialog = () => {
        dialogRef.current?.close();
    };

    const handleDialogClosed = () => {
        setIsDialogOpen(false);
        exploreButtonRef.current?.focus();
    };

    const handleBackdropClick = (event) => {
        if (event.target === event.currentTarget) {
            closeDialog();
        }
    };

    return (
        <section className="profile-card profile-achievements">
            <div className="profile-section-title profile-achievements__title-row">
                <h2>Achievements</h2>
                <button
                    ref={exploreButtonRef}
                    type="button"
                    className="profile-achievements__explore"
                    aria-haspopup="dialog"
                    aria-expanded={isDialogOpen}
                    onClick={() => setIsDialogOpen(true)}
                >
                    Explore more achievements
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                </button>
            </div>
            <div className="profile-achievements__grid" role="list">
                {previewAchievements.length > 0 ? (
                    previewAchievements.map((achievement) => (
                        <AchievementCard key={achievement.key} achievement={achievement} showRank />
                    ))
                ) : (
                    <p className="profile-empty profile-achievements__empty">
                        Attend events to unlock achievements.
                    </p>
                )}
            </div>

            <dialog
                ref={dialogRef}
                className="profile-achievements-dialog"
                aria-modal="true"
                aria-labelledby="all-achievements-title"
                onClose={handleDialogClosed}
                onClick={handleBackdropClick}
            >
                <div className="profile-achievements-dialog__panel">
                    <header className="profile-achievements-dialog__header">
                        <div>
                            <h2 id="all-achievements-title">All achievements</h2>
                            <p>
                                {unlockedCount} of {achievements.length} unlocked. Higher ranks automatically replace lower ones on your profile.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="profile-achievements-dialog__close"
                            aria-label="Close achievements dialog"
                            onClick={closeDialog}
                        >
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m6 6 12 12M18 6 6 18" />
                            </svg>
                        </button>
                    </header>
                    <div className="profile-achievements-dialog__body">
                        <div className="profile-achievements-dialog__grid" role="list">
                            {achievements.map((achievement) => (
                                <AchievementCard
                                    key={achievement.key}
                                    achievement={achievement}
                                    showRank
                                    showStatus
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </dialog>
        </section>
    );
}

export default Achievements;
