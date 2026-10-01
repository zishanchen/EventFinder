import React, { useState } from 'react';
import useDiscover from '../hooks/useDiscover.js';
import FilterSidebar from '../components/FilterSidebar.jsx';
import DiscoverHeader from '../components/DiscoverHeader.jsx';
import EventList from '../components/EventList.jsx';
import MapPanel from '../components/MapPanel.jsx';
import Navbar from '../components/Navbar.jsx';
import '../styles/discover.css';

export default function Discover() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filtersVisible, setFiltersVisible] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.matchMedia('(min-width: 901px)').matches;
  });
  const {
    mapVisible,
    filters,
    events,
    tags,
    tagStatus,
    userLocation,
    locationStatus,
    locationError,
    hasActiveFilters,
    priceMax,
    activeTagFilters,
    loading,
    error,
    toggleFilter,
    updateFilter,
    updateSearch,
    clearAll,
    toggleMap,
    requestUserLocation
  } = useDiscover();

  return (
    <div className="discover">
      <Navbar />
      <div className="discover__layout">

        <FilterSidebar
          className={filtersVisible ? '' : 'filter-sidebar--hidden'}
          filters={filters}
          onToggleFilter={toggleFilter}
          onUpdateFilter={updateFilter}
          onSearchChange={updateSearch}
          onClearAll={clearAll}
          onUseLocation={requestUserLocation}
          userLocation={userLocation}
          locationStatus={locationStatus}
          locationError={locationError}
          tags={tags}
          tagStatus={tagStatus}
          priceMax={priceMax}
        />

        <div className="discover__main">
          <DiscoverHeader
            mapVisible={mapVisible}
            onToggleMap={toggleMap}
            filtersVisible={filtersVisible}
            onToggleFilters={() => setFiltersVisible((visible) => !visible)}
          />

          <div className="discover__content">
            {mapVisible && (
              <MapPanel
                events={events}
                userLocation={userLocation}
                onSelectEvent={(id) => setSelectedEvent({ id, token: Date.now() })}
              />
            )}
            <EventList
              events={events}
              loading={loading}
              error={error}
              selectedEventId={selectedEvent?.id}
              selectedEventToken={selectedEvent?.token}
              hasActiveFilters={hasActiveFilters}
              activeTagFilters={activeTagFilters}
              onClearAll={clearAll}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
