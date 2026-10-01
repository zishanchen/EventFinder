import React, { useEffect, useRef, useState } from "react";
import {
    ACCEPTED_AVATAR_INPUT_TYPES,
    readFileAsDataUrl,
    validateAvatarFile
} from "../../utils/avatarUpload.js";
import { formatRating } from "../../utils/ratingDisplay.js";

const STAT_ICONS = {
    events: (
        <>
            <rect x="4" y="5" width="16" height="15" rx="2" />
            <path d="M8 3v4" />
            <path d="M16 3v4" />
            <path d="M4 10h16" />
        </>
    ),
    rating: (
        <>
            <path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z" />
        </>
    ),
    reviews: (
        <>
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H9l-5 4V5.5Z" />
            <path d="m8 9.8 2.1 2.1L15.5 7" />
        </>
    )
};

function ProfileStatIcon({ name }) {
    return (
        <span className={`profile-header__stat-icon profile-header__stat-icon--${name}`}>
            <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {STAT_ICONS[name]}
            </svg>
        </span>
    );
}

const formatRatingDate = (value) => {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(date);
};

function RatingStars({ value }) {
    return (
        <span className="profile-ratings__stars" aria-label={`${value} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, index) => (
                <span
                    key={index}
                    className={index < value ? "profile-ratings__star--filled" : ""}
                    aria-hidden="true"
                >
                    ★
                </span>
            ))}
        </span>
    );
}

function ProfileHeader({ user, onAvatarUpload }) {
    const [avatarError, setAvatarError] = useState("");
    const [avatarSaving, setAvatarSaving] = useState(false);
    const [ratingsOpen, setRatingsOpen] = useState(false);
    const avatarInputRef = useRef(null);
    const ratingsDialogRef = useRef(null);
    const ratingsButtonRef = useRef(null);
    const latestRatings = user.latestRatingsReceived || [];

    useEffect(() => {
        const dialog = ratingsDialogRef.current;

        if (!dialog) return;

        if (ratingsOpen && !dialog.open) {
            dialog.showModal();
        } else if (!ratingsOpen && dialog.open) {
            dialog.close();
        }
    }, [ratingsOpen]);

    const openAvatarPicker = () => {
        if (!avatarSaving) {
            avatarInputRef.current?.click();
        }
    };

    const handleAvatarChange = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        const validationMessage = validateAvatarFile(file);
        if (validationMessage) {
            setAvatarError(validationMessage);
            return;
        }

        try {
            setAvatarSaving(true);
            setAvatarError("");
            const profilePicture = await readFileAsDataUrl(file);
            await onAvatarUpload(profilePicture);
        } catch (error) {
            setAvatarError(error.message || "Failed to update avatar.");
        } finally {
            setAvatarSaving(false);
        }
    };

    const handleRemoveAvatar = async () => {
        try {
            setAvatarSaving(true);
            setAvatarError("");
            await onAvatarUpload(null);
        } catch (error) {
            setAvatarError(error.message || "Failed to remove avatar.");
        } finally {
            setAvatarSaving(false);
        }
    };

    const closeRatings = () => {
        ratingsDialogRef.current?.close();
    };

    const handleRatingsClosed = () => {
        setRatingsOpen(false);
        ratingsButtonRef.current?.focus();
    };

    return (
        <section className="profile-card profile-header">
            <div className="profile-header__top">
                <div className="profile-header__avatar-panel">
                    <button
                        type="button"
                        className="profile-header__avatar"
                        onClick={openAvatarPicker}
                        disabled={avatarSaving}
                        aria-label={user.profilePicture ? "Change profile photo" : "Upload profile photo"}
                    >
                        {user.profilePicture ? (
                            <img src={user.profilePicture} alt="" className="profile-header__avatar-image" />
                        ) : (
                            user.initials || user.avatar || "EF"
                        )}
                        {!avatarSaving && (
                            <span className="profile-header__avatar-overlay" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14.5 5 13 3h-2L9.5 5H6a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3h-3.5Z" />
                                    <circle cx="12" cy="13" r="3.5" />
                                </svg>
                                <span>{user.profilePicture ? "Change" : "Upload"}</span>
                            </span>
                        )}
                        {avatarSaving && <span className="profile-header__avatar-spinner" aria-hidden="true" />}
                    </button>

                    <input
                        ref={avatarInputRef}
                        className="profile-header__avatar-input"
                        type="file"
                        accept={ACCEPTED_AVATAR_INPUT_TYPES}
                        onChange={handleAvatarChange}
                        disabled={avatarSaving}
                    />

                    <div className="profile-header__avatar-actions">
                        {user.profilePicture && (
                            <button
                                type="button"
                                className="profile-header__avatar-button profile-header__avatar-button--secondary"
                                onClick={handleRemoveAvatar}
                                disabled={avatarSaving}
                            >
                                Remove
                            </button>
                        )}
                    </div>

                    {avatarError && (
                        <p className="profile-header__avatar-error" role="alert">
                            {avatarError}
                        </p>
                    )}
                </div>

                <div className="profile-header__info">
                    <div className="profile-header__name">
                        <h1>{user.username}</h1>
                    </div>

                    <p className="profile-header__email">{user.email}</p>
                    <p className="profile-header__meta">{user.university}</p>
                    <p className="profile-header__meta">Member since {user.memberSince}</p>
                </div>
            </div>

            <div className="profile-header__stats">
                <div className="profile-header__stat profile-header__stat--events">
                    <ProfileStatIcon name="events" />
                    <div className="profile-header__stat-copy">
                        <strong>{user.eventsAttended}</strong>
                        <span>Events Attended</span>
                    </div>
                </div>
                <button
                    ref={ratingsButtonRef}
                    type="button"
                    className="profile-header__stat profile-header__stat--rating profile-header__stat--interactive"
                    aria-haspopup="dialog"
                    aria-expanded={ratingsOpen}
                    onClick={() => setRatingsOpen(true)}
                >
                    <ProfileStatIcon name="rating" />
                    <div className="profile-header__stat-copy">
                        <strong>{formatRating(user.averageRating)}</strong>
                        <span>Average Rating</span>
                    </div>
                    <svg className="profile-header__stat-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </button>
                <div className="profile-header__stat profile-header__stat--reviews">
                    <ProfileStatIcon name="reviews" />
                    <div className="profile-header__stat-copy">
                        <strong>{user.reviewsGiven}</strong>
                        <span>Reviews Given</span>
                    </div>
                </div>
            </div>

            <dialog
                ref={ratingsDialogRef}
                className="profile-ratings-dialog"
                aria-modal="true"
                aria-labelledby="ratings-dialog-title"
                onClose={handleRatingsClosed}
                onClick={(event) => {
                    if (event.target === event.currentTarget) closeRatings();
                }}
            >
                <div className="profile-ratings-dialog__panel">
                    <header className="profile-ratings-dialog__header">
                        <div>
                            <span className="profile-ratings-dialog__eyebrow">Received from hosts</span>
                            <h2 id="ratings-dialog-title">Your latest ratings</h2>
                            <p>{user.ratingsReceivedCount || 0} ratings received across attended events.</p>
                        </div>
                        <button
                            type="button"
                            className="profile-ratings-dialog__close"
                            aria-label="Close ratings dialog"
                            onClick={closeRatings}
                        >
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m6 6 12 12M18 6 6 18" />
                            </svg>
                        </button>
                    </header>

                    <div className="profile-ratings-dialog__body">
                        {latestRatings.length > 0 ? (
                            <div className="profile-ratings__list">
                                {latestRatings.map((rating) => (
                                    <article key={rating._id} className="profile-ratings__item">
                                        <div className="profile-ratings__host">
                                            <span className="profile-ratings__avatar">
                                                {rating.host?.profilePicture ? (
                                                    <img src={rating.host.profilePicture} alt="" />
                                                ) : (
                                                    rating.host?.initials || "H"
                                                )}
                                            </span>
                                            <div>
                                                <strong>{rating.host?.username || "Event host"}</strong>
                                                <span>{formatRatingDate(rating.createdAt)}</span>
                                            </div>
                                            <RatingStars value={rating.rating} />
                                        </div>

                                        <div className="profile-ratings__event">
                                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="4" y="5" width="16" height="15" rx="2" />
                                                <path d="M8 3v4M16 3v4M4 10h16" />
                                            </svg>
                                            <span>{rating.event?.title || "Untitled event"}</span>
                                        </div>

                                        <p className={rating.comment ? "" : "profile-ratings__comment--empty"}>
                                            {rating.comment || "The host did not leave a written comment."}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="profile-ratings__empty">
                                <ProfileStatIcon name="rating" />
                                <h3>No ratings received yet</h3>
                                <p>Ratings from event hosts will appear here after they review your attendance.</p>
                            </div>
                        )}
                    </div>
                </div>
            </dialog>
        </section>
    );
}
export default ProfileHeader;
