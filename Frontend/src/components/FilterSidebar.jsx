import React from 'react';
import CreateEventIcon from './create-event/CreateEventIcon.jsx';
import { getTagName, tagStyle } from '../utils/tagPresentation.js';

const DATE_OPTIONS = ["Today", "This Week", "This Month"];
const DISTANCE_SLIDER_MAX = 50;
const PRICE_PRESETS = [
    { label: 'Free', value: '0' },
    { label: '< EUR 10', value: '10' },
    { label: 'Any', value: '' }
];
const DISTANCE_PRESETS = [
    { label: '< 5 km', value: '5' },
    { label: '< 10 km', value: '10' },
    { label: 'Any', value: '50' }
];

export default function FilterSidebar({
    className = '',
    filters,
    onToggleFilter,
    onUpdateFilter,
    onSearchChange,
    onClearAll,
    onUseLocation,
    userLocation,
    locationStatus = 'idle',
    locationError = '',
    tags = [],
    tagStatus = 'loading',
    priceMax = 0
}) {
    const eventTypeOptions = tags;
    const sliderMax = Math.max(0, Number(priceMax) || 0);
    const priceSliderValue = filters.maxPrice === ''
        ? sliderMax
        : Math.min(Number(filters.maxPrice || sliderMax), sliderMax);
    const distanceSliderValue = Number(filters.maxDistance || DISTANCE_SLIDER_MAX);
    const distanceLabel = distanceSliderValue >= DISTANCE_SLIDER_MAX
        ? 'Any'
        : `< ${distanceSliderValue} km`;
    const priceLabel = filters.maxPrice === ''
        ? 'Any price'
        : priceSliderValue === 0
            ? 'Free'
            : `< EUR ${priceSliderValue}`;

    const handlePriceChange = (event) => {
        const value = Number(event.target.value);
        onUpdateFilter('maxPrice', value >= sliderMax ? '' : String(value));
    };

    const handleDistanceChange = (event) => {
        const value = Number(event.target.value);
        onUpdateFilter('maxDistance', String(value));
    };

    const renderCheckboxGroup = (title, options, category) => (
        <div className="filter__group">
            <strong className="filter__group-title">{title}</strong>
            {options.map(option => (
                <label key={option} className="filter__checkbox-label">
                    <input
                        type="checkbox"
                        className="filter__checkbox"
                        checked={filters[category].includes(option)}
                        onChange={() => onToggleFilter(category, option)}
                    />
                    {option}
                </label>
            ))}
        </div>
    );

    return (
        <aside className={`filter-sidebar ${className}`.trim()}>
            <div className="filter__header">
                <strong className="filter__title">
                    <CreateEventIcon name="settings" />
                    Filters
                </strong>
                <button type="button" className="filter__clear" onClick={onClearAll}>
                    Clear all
                </button>
            </div>

            <input
                type="text"
                placeholder="Search events..."
                value={filters.search}
                onChange={e => onSearchChange(e.target.value)}
                className="filter__search"
            />

            {renderCheckboxGroup("Date", DATE_OPTIONS, "date")}

            <div className="filter__group">
                <div className="filter__range-heading">
                    <strong className="filter__group-title">Price</strong>
                    <span>{priceLabel}</span>
                </div>
                <input
                    type="range"
                    className="filter__range"
                    min="0"
                    max={sliderMax}
                    step="1"
                    value={priceSliderValue}
                    onChange={handlePriceChange}
                    aria-label="Maximum event price"
                />
                <div className="filter__preset-row">
                    {PRICE_PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            type="button"
                            className={`filter__preset ${filters.maxPrice === preset.value ? 'filter__preset--active' : ''}`}
                            onClick={() => onUpdateFilter('maxPrice', preset.value)}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="filter__group">
                <div className="filter__range-heading">
                    <strong className="filter__group-title">Distance</strong>
                    <span>{distanceLabel}</span>
                </div>
                <button
                    type="button"
                    className="filter__location-button"
                    onClick={onUseLocation}
                    disabled={locationStatus === 'loading'}
                >
                    {locationStatus === 'loading'
                        ? 'Finding location...'
                        : userLocation
                            ? 'Update my location'
                            : 'Use my location'}
                </button>
                {locationStatus === 'error' && locationError && (
                    <p className="filter__location-status filter__location-status--error">{locationError}</p>
                )}
                <input
                    type="range"
                    className="filter__range"
                    min="0"
                    max={DISTANCE_SLIDER_MAX}
                    step="1"
                    value={distanceSliderValue}
                    onChange={handleDistanceChange}
                    aria-label="Maximum distance from your location"
                />
                <div className="filter__preset-row">
                    {DISTANCE_PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            type="button"
                            className={`filter__preset ${filters.maxDistance === preset.value ? 'filter__preset--active' : ''}`}
                            onClick={() => onUpdateFilter('maxDistance', preset.value)}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="filter__group">
                <strong className="filter__group-title">Event Type</strong>
                {tagStatus === 'loading' ? (
                    <p className="filter__loading">Loading tags...</p>
                ) : tagStatus === 'error' ? (
                    <p className="filter__loading">Failed to load tags.</p>
                ) : eventTypeOptions.length === 0 ? (
                    <p className="filter__loading">No tags available.</p>
                ) : (
                    <div className="filter__event-types">
                        {eventTypeOptions.map(type => {
                            const tagName = getTagName(type);

                            return (
                            <button
                                key={tagName}
                                type="button"
                                className={`filter__event-type ${filters.eventType.includes(tagName) ? 'filter__event-type--active' : ''}`}
                                style={tagStyle(type)}
                                onClick={() => onToggleFilter('eventType', tagName)}
                            >
                                <CreateEventIcon name="plus" />
                                <span>{tagName}</span>
                            </button>
                        );
                        })}
                    </div>
                )}
            </div>

        </aside>
    );
}
