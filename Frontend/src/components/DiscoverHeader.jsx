import React from 'react';
import CreateEventIcon from './create-event/CreateEventIcon.jsx';

export default function DiscoverHeader({
    mapVisible,
    onToggleMap,
    filtersVisible,
    onToggleFilters
}) {
    return (
        <div className="discover-header">
            <div className="discover-header__info">
                <h2 className="discover-header__title">Discover Events</h2>
            </div>
            <div className="discover-header__actions">
                <button className="discover-header__btn discover-header__btn--filters" onClick={onToggleFilters}>
                    <CreateEventIcon name="settings" />
                    {filtersVisible ? 'Hide Filters' : 'Show Filters'}
                </button>
                <button className="discover-header__btn" onClick={onToggleMap}>
                    <CreateEventIcon name="pin" />
                    {mapVisible ? "Hide Map" : "Show Map"}
                </button>
            </div>
        </div>
    );
}
