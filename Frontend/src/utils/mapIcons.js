import L from 'leaflet';

const createMapPinIcon = (variant = 'event') => L.divIcon({
    html: '<span class="eventfinder-map__pin"></span>',
    className: `eventfinder-map__marker eventfinder-map__marker--${variant}`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
});

const eventPinIcon = createMapPinIcon('event');
const userPinIcon = createMapPinIcon('user');

export {
    createMapPinIcon,
    eventPinIcon,
    userPinIcon
};
