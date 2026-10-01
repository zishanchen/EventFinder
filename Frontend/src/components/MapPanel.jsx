import React, { useEffect, useMemo } from 'react';
import '../styles/map.css';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import { hasCoordinates } from '../utils/distance.js';
import { eventPinIcon, userPinIcon } from '../utils/mapIcons.js';

const DEFAULT_CENTER = [48.137154, 11.576124];

function MapBounds({ positions }) {
    const map = useMap();

    useEffect(() => {
        if (positions.length === 0) {
            return;
        }

        if (positions.length === 1) {
            map.setView(positions[0], 14, { animate: true });
            return;
        }

        map.fitBounds(positions, {
            padding: [40, 40],
            maxZoom: 14,
            animate: true
        });
    }, [map, positions]);

    return null;
}

function MapPanel({ events = [], userLocation = null, onSelectEvent }) {
    const eventsWithLocation = useMemo(
        () => events.filter((item) => hasCoordinates(item.location)),
        [events]
    );
    const userPosition = hasCoordinates(userLocation)
        ? [Number(userLocation.latitude), Number(userLocation.longitude)]
        : null;
    const markerPositions = useMemo(() => [
            ...(userPosition ? [userPosition] : []),
            ...eventsWithLocation.map((item) => [
                Number(item.location.latitude),
                Number(item.location.longitude)
            ])
        ],
        [eventsWithLocation, userPosition?.[0], userPosition?.[1]]
    );
    const mappedEventCount = eventsWithLocation.length;
    const totalEventCount = events.length;
    const mapSummary = mappedEventCount === totalEventCount
        ? `${mappedEventCount} matching ${mappedEventCount === 1 ? 'event' : 'events'}`
        : `${mappedEventCount} of ${totalEventCount} matching ${totalEventCount === 1 ? 'event' : 'events'}`;

    return (
        <aside className="map-panel">
            <div className="map-panel__header">
                <strong className="map-panel__title">Map</strong>
                <span className="map-panel__count">{mapSummary}</span>
            </div>
            <MapContainer
                className="map-panel__leaflet"
                center={userPosition || DEFAULT_CENTER}
                zoom={12}
                scrollWheelZoom={true}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {eventsWithLocation.map(event=> (
                    <Marker
                        key={event._id}
                        position={[Number(event.location.latitude), Number(event.location.longitude)]}
                        icon={eventPinIcon}
                        eventHandlers={{
                            click: () => onSelectEvent?.(event._id)
                        }}
                    >
                        <Tooltip direction="top" offset={[0, -14]} opacity={1}>
                            {event.title}
                        </Tooltip>
                    </Marker>
                ))}
                {userPosition && (
                    <Marker
                        position={userPosition}
                        icon={userPinIcon}
                    />
                )}
                <MapBounds positions={markerPositions} />
            </MapContainer>
            {mappedEventCount === 0 && (
                <div className="map-panel__empty">
                    <strong>No matching locations</strong>
                    <p>Matching events will appear here when their location includes map coordinates.</p>
                </div>
            )}
        </aside>
    );
}

export default MapPanel;
