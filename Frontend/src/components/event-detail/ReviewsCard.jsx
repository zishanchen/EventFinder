import React from 'react';

function ReviewsCard({ event }) {
    const reviews = event?.reviews || [];

    const formatReviewDate = (dateValue) => {
        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Recently";
        }

        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
    };

    return (
        <section className="event-card reviews-card">
            <h2 className="event-card__title">Reviews</h2>

            <div className="reviews-card__list">
                {reviews.length === 0 ? (
                    <p className="reviews-card__text">No Reviews yet.</p>
                ) : reviews.map((review) => (
                    <div className="review-card__item" key={review._id || `${review.userName}-${review.createdAt}`}>
                        <div className="review-card__header">
                            <h3 className="review-card__name">{review.userName}</h3>
                            <div className="review-card__stars">
                                {"★".repeat(review.rating) || 0}
                            </div>
                        </div>
                        {review.comment && (
                            <p className="review-card__text">{review.comment}</p>
                        )}
                        {review.photo && (
                            <img
                                src = {review.photo}
                                alt = "Review upload"
                                className='review-card__photo'
                            />
                        )}
                        <p className="review-card__date">{formatReviewDate(review.createdAt)}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default ReviewsCard;
