import React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StarRating from './StarRating.jsx';
import { rateEventAndHost } from '../../api/ratingApi.js';
import { useAuthContext } from '../../context/AuthContext.jsx';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

export default function RateEventForm({ registration, event, eventId, existingReview }) {
    const navigate = useNavigate();
    const { token } = useAuthContext();

    const isEditing = Boolean(existingReview);
    const [hostRating, setHostRating] = useState(existingReview?.rating || 0);
    const [comment, setComment] = useState(existingReview?.comment || '');
    const [photo, setPhoto] = useState(existingReview?.photo || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        setHostRating(existingReview?.rating || 0);
        setComment(existingReview?.comment || '');
        setPhoto(existingReview?.photo || null);
    }, [existingReview]);

    const handlePhotoChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > MAX_PHOTO_SIZE) {
            setError('Please choose an image under 5 MB.');
            return;
        }

        const acceptedTypes = ['image/png', 'image/jpeg', 'image/gif'];
        if (!acceptedTypes.includes(file.type)) {
            setError('Please choose a PNG, JPG, or GIF image.');
            return;
        }

        setError(null);
        
        const reader = new FileReader();
        reader.onloadend = () => setPhoto(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (submitEvent) => {
        submitEvent.preventDefault();
        setError(null);

        if (hostRating === 0) {
            setError('Please rate the host');
            return;
        }

        setLoading(true);
        try {
            await rateEventAndHost(token, {
                registrationId: registration._id,
                eventId: event?._id || event?.id || eventId,
                hostRating,
                comment: comment || null,
                photo: photo || null
            });
            navigate('/profile', {
                state: { message: isEditing ? 'Review updated successfully!' : 'Thank you for your feedback!' }
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rate-page__form">
            {error && <p className="rate-page__error">{error}</p>}

            <div className="rate-page__section">
                <label className="rate-page__label">How would you rate the host?</label>
                <StarRating value={hostRating} onChange={setHostRating} />
            </div>

            <div className="rate-page__section">
                <label className="rate-page__label">
                    Write a Review <span className="rate-page__optional">(Optional)</span>
                </label>
                <textarea
                    className="rate-page__textarea"
                    placeholder="Share your experience with other students. What did you like? What could be improved?"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    maxLength={500}
                />
                <p className="rate-page__char-count">{comment.length}/500 characters</p>
            </div>

            <div className="rate-page__section">
                <label className="rate-page__label">
                    Add Photos <span className="rate-page__optional">(Optional)</span>
                </label>
                <label className="rate-page__photo-upload">
                    <input
                        type="file"
                        accept="image/png, image/jpeg, image/gif"
                        onChange={handlePhotoChange}
                        className="rate-page__photo-input"
                    />
                    {photo ? (
                        <img src={photo} alt="Preview" className="rate-page__photo-preview" />
                    ) : (
                        <div className="rate-page__photo-placeholder">
                            <span className="rate-page__photo-icon">Upload</span>
                            <p className="rate-page__photo-text">Click to upload photos</p>
                            <p className="rate-page__photo-hint">PNG, JPG or GIF (max. 5MB each)</p>
                        </div>
                    )}
                </label>
            </div>

            <div className="rate-page__actions">
                <button
                    type="button"
                    className="rate-page__skip"
                    onClick={() => navigate('/profile')}
                >
                    Skip for Now
                </button>
                <button
                    type="submit"
                    className="rate-page__submit"
                    disabled={loading || hostRating === 0}
                >
                    {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Submit Review'}
                </button>
            </div>
        </form>
    );
}
