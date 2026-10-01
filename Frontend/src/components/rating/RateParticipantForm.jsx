import React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StarRating from './StarRating.jsx';
import { rateParticipant } from '../../api/ratingApi.js';
import { useAuthContext } from '../../context/AuthContext.jsx';

export default function RateParticipantForm({ registration, existingRating, onRated, onCancel }) {
    const navigate = useNavigate();
    const { token } = useAuthContext();

    const isEditing = Boolean(existingRating);
    const [rating, setRating] = useState(existingRating?.rating || 0);
    const [comment, setComment] = useState(existingRating?.comment || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        setRating(existingRating?.rating || 0);
        setComment(existingRating?.comment || '');
    }, [existingRating]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (rating === 0) { setError('Please give a rating'); return; }

        setLoading(true);
        try {
            const result = await rateParticipant(token, {
                registrationId: registration._id,
                rating,
                comment: comment || null
            });
            if (onRated) {
                onRated(result);
            } else {
                navigate(-1);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rate-page__form">

            {error && <p className="rate-page__error">{error}</p>}

            {/* Participant rating */}
            <div className="rate-page__section">
                <label className="rate-page__label">
                    How would you rate this participant?
                </label>
                <StarRating value={rating} onChange={setRating} />
            </div>

            {/* Comment */}
            <div className="rate-page__section">
                <label className="rate-page__label">
                    Write a Review <span className="rate-page__optional">(Optional)</span>
                </label>
                <textarea
                    className="rate-page__textarea"
                    placeholder="How was this participant? Were they engaged and respectful?"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    maxLength={500}
                />
                <p className="rate-page__char-count">{comment.length}/500 characters</p>
            </div>

            {/* Actions */}
            <div className="rate-page__actions">
                <button
                    type="button"
                    className="rate-page__skip"
                    onClick={onCancel || (() => navigate(-1))}
                >
                    Back to List
                </button>
                <button
                    type="submit"
                    className="rate-page__submit"
                    disabled={loading || rating === 0}
                >
                    {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Submit Rating'}
                </button>
            </div>

        </form>
    );
}
