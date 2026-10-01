const geocodeAddress = async (address) => {
    if (!address) {
        return null;
    }

    const params = new URLSearchParams({
        q: address,
        format: 'json',
        limit: '1'
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: {
            'User-Agent': 'EventFinder/1.0'
        }
    });

    if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
    }

    const results = await response.json();

    if (!results.length) {
        return null;
    }

    return {
        latitude: Number(results[0].lat),
        longitude: Number(results[0].lon),
    };
};

export default geocodeAddress;