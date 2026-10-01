export const mapSavedEventToProfileCard = (event) => ({
    eventId: event._id,
    title: event.title || event.name || "Untitled Event",
    date: event.datetime || event.date,
    imageUrl: event.imageUrl || event.image,
    price: Number(event.price) || 0,
    status: "Saved"
});

const getEventTime = (event) => {
    const timestamp = new Date(event?.date || event?.datetime).getTime();

    return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
};

export const sortProfileEventsByDate = (events = []) => {
    return [...events].sort((firstEvent, secondEvent) => {
        const timeDifference = getEventTime(firstEvent) - getEventTime(secondEvent);

        if (timeDifference !== 0) {
            return timeDifference;
        }

        return (firstEvent.title || "").localeCompare(secondEvent.title || "");
    });
};
