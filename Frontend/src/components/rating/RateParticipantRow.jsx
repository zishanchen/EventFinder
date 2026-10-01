import React from 'react';
import { DeleteIcon, EditIcon } from '../icons/ActionIcons.jsx';
import StarRating from './StarRating.jsx';

function getAvatarLabel(participant) {
    return participant?.username?.charAt(0).toUpperCase() || '?';
}

export default function RateParticipantRow({ item, actionLoading, onOpen, onDelete }) {
    const { participant, registration, rating, hasRated } = item;

    return (
        <article className="rate-page__participant-row" key={registration._id}>
            <div className="rate-page__participant-avatar">
                {participant.profilePicture ? (
                    <img src={participant.profilePicture} alt="" />
                ) : (
                    getAvatarLabel(participant)
                )}
            </div>
            <div className="rate-page__participant-main">
                <h3>{participant.username}</h3>
                <p>{participant.email}</p>
                <span className={`rate-status ${hasRated ? 'rate-status--rated' : 'rate-status--pending'}`}>
                    {hasRated ? 'Rated' : 'To be Rated'}
                </span>
                {hasRated && (
                    <StarRating value={rating.rating} readonly />
                )}
            </div>
            <div className="rate-page__participant-actions">
                <button
                    type="button"
                    className={hasRated ? 'rate-page__icon-button rate-page__icon-button--edit' : 'rate-page__rate-button'}
                    onClick={() => onOpen(item)}
                    disabled={actionLoading}
                    aria-label={hasRated ? 'Edit rating' : undefined}
                    title={hasRated ? 'Edit rating' : undefined}
                >
                    {hasRated ? <EditIcon /> : 'Rate'}
                </button>
                {hasRated && (
                    <button
                        type="button"
                        className="rate-page__icon-button rate-page__icon-button--danger"
                        onClick={() => onDelete(item)}
                        disabled={actionLoading}
                        aria-label="Delete review"
                        title="Delete review"
                    >
                        <DeleteIcon />
                    </button>
                )}
            </div>
        </article>
    );
}
