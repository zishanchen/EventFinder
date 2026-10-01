import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import '../../styles/map.css';
import { hasCoordinates } from '../../utils/distance.js';
import { eventPinIcon } from '../../utils/mapIcons.js';

function LocationCard({event}) {

    const hasLocation = hasCoordinates(event.location);
    const position = hasLocation
        ? [Number(event.location.latitude), Number(event.location.longitude)]
        : [48.137154, 11.576124];


    return (
        <section id="location" className="event-card location-card">
            <h2 className="event-card__title">Location</h2>
            <div className="location-card__map">
                
                <MapContainer
                className="location-card__leaflet"
                center={position}
                zoom={12}
                scrollWheelZoom={true}>
                    <TileLayer
                     
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />   
                    {hasLocation && (<Marker position={position} icon={eventPinIcon} />)}

                </MapContainer>
                
                    
            </div>

            <p className="location-card__address">{event.address}</p>
        </section>
    );
}

export default LocationCard;
