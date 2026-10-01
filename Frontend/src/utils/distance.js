const EARTH_RADIUS_KM = 6371;

const hasCoordinates = (location) => {
    return Number.isFinite(Number(location?.latitude)) && Number.isFinite(Number(location?.longitude));
};

const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
};

const calculateDistanceKm = (origin, destination) => {
    if (!hasCoordinates(origin) || !hasCoordinates(destination)) {
        return null;
    }

    const originLat = Number(origin.latitude);
    const originLng = Number(origin.longitude);
    const destinationLat = Number(destination.latitude);
    const destinationLng = Number(destination.longitude);

    const latDelta = toRadians(destinationLat - originLat);
    const lngDelta = toRadians(destinationLng - originLng);
    const a = Math.sin(latDelta / 2) ** 2
        + Math.cos(toRadians(originLat))
        * Math.cos(toRadians(destinationLat))
        * Math.sin(lngDelta / 2) ** 2;

    return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistanceKm = (distanceKm) => {
    if (!Number.isFinite(distanceKm)) {
        return '';
    }

    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }

    return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
};

const getDistanceLimitKm = (maxDistance, unrestrictedDistance = null) => {
    if (maxDistance === undefined || maxDistance === null || maxDistance === '') {
        return null;
    }

    const limit = Number(maxDistance);

    if (!Number.isFinite(limit)) {
        return null;
    }

    if (
        unrestrictedDistance !== null
        && Number.isFinite(Number(unrestrictedDistance))
        && limit >= Number(unrestrictedDistance)
    ) {
        return null;
    }

    return limit >= 0 ? limit : null;
};

export {
    calculateDistanceKm,
    formatDistanceKm,
    getDistanceLimitKm,
    hasCoordinates
};
