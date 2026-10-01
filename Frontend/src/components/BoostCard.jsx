import React from 'react';
import CreateEventIcon from './create-event/CreateEventIcon.jsx';

const money = (cents, currency = 'eur') =>
    new Intl.NumberFormat('en-DE', {
        style: 'currency',
        currency: currency.toUpperCase()
    }).format((cents || 0) / 100);

export default function BoostCard({
    boost,
    selected,
    disabled,
    onSelect
}) {
    return (
        <article
            className={`boost-card ${selected ? 'boost-card--selected' : ''
                }`}
        >
            <div className="boost-card__top">
                {boost.recommended ? (
                    <span className="boost-card__badge">
                        Recommended
                    </span>
                ) : (
                    <span />
                )}
                {boost.recommended && (
                    <span className="boost-card__star">
                        <CreateEventIcon name="star" />
                    </span>
                )}
            </div>

            <h2 className="boost-card__title">{boost.name}</h2>
            <p className="boost-card__price">
                <span className="boost-card__amount">
                    {money(boost.priceCents, boost.currency)}
                </span>
                <span className="boost-card__duration">
                    {' '}for {boost.length} hours
                </span>
            </p>

            <ul className="boost-card__features">
                <li>Higher in search results</li>
                <li>Eligible for Featured Events</li>
                <li>More visibility</li>
                <li>Active for {boost.length} hours</li>
            </ul>

            <button
                type="button"
                className="boost-card__btn"
                onClick={() => onSelect(boost)}
                disabled={disabled}
            >
                <CreateEventIcon name={selected ? 'check' : 'boost'} />
                {selected ? 'Selected' : `Select ${boost.name}`}
            </button>
        </article>
    );
}
