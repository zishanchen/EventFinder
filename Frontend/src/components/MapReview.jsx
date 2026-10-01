import React from "react";
import "../styles/map.css";
import {MapContainer, TileLayer} from "react-leaflet";
import { Marker } from 'react-leaflet';
import { useState, useEffect } from "react";
import {useNavigate} from "react-router-dom";
import { fetchFeaturedEvents } from "../api/eventApi";
import { useAuthContext } from "../context/AuthContext.jsx";
import { getEventNavigationPath } from "../utils/eventNavigation.js";
import { hasCoordinates } from "../utils/distance.js";
import { eventPinIcon } from "../utils/mapIcons.js";

function MapPreview() {

    const[events, setEvents] = useState([]);
    const navigate = useNavigate();
    const { user } = useAuthContext();

    useEffect(() => {
        const loadEvents = async () => {
            const data = await fetchFeaturedEvents();
            setEvents(data);
        }
        loadEvents();
    }, []);

    const eventsWithLocation = events.filter(event =>
        hasCoordinates(event.location)
    );

    return (
        <section className = "map-preview">
            <div className = "map-preview__heading">
                <h2>Explore Events in Munich</h2>
                <p>See what is happing around your campus</p>
            </div> 

            <div className = "map-preview__card">
                
               
                {/* <div className = "map-preview__pin" aria-hidden = "true">
                    📍
                </div>
            
                <p> Interactive Map Preview</p>

                <button type = "button" className = "map-preview__button">
                    Open Full Map →
                </button> */}

                <MapContainer
                    className = "map-preview__leaflet"
                    center={[48.137154, 11.576124]}
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
                                click: () => navigate(getEventNavigationPath(event, user))
                            }}
                        />
                    ))}
                </MapContainer>    
            </div>
        
        </section>
    )
}

export default MapPreview;
