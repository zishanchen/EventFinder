import React, { useState } from 'react';

export default function StarRating({ value, onChange, readonly = false }) {
    const [hoverValue, setHoverValue] = useState(0);
    const displayValue = readonly ? value : hoverValue || value;

    return (
        <div className="star-rating" onMouseLeave={() => setHoverValue(0)}>
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    className={`star-rating__star ${star <= displayValue ? 'star-rating__star--filled' : ''} ${star <= hoverValue ? 'star-rating__star--hover' : ''} ${readonly ? 'star-rating__star--readonly' : ''}`}
                    onClick={() => !readonly && onChange(star)}
                    onMouseEnter={() => !readonly && setHoverValue(star)}
                >
                    ★
                </button>
            ))}
            <span className="star-rating__label">
                {value > 0 ? `${value}/5` : 'Not rated'}
            </span>
        </div>
    );
}
