import React from 'react';

export default function AdminRecommendations({ className, items, onSelect }) {
    if (!items.length) return null;

    return (
        <div className={className}>
            {items.map((item) => (
                <button
                    key={item}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSelect(item)}
                >
                    {item}
                </button>
            ))}
        </div>
    );
}
