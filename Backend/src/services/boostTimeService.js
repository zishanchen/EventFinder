const HOUR_MS = 60 * 60 * 1000;

const createHttpError = (statusCode, message, code = null) => {
    const error = new Error(message);
    error.statusCode = statusCode;

    if (code) {
        error.code = code;
    }

    return error;
};

const asValidDate = (value, fieldName) => {
    if (value === undefined || value === null || value === '') {
        throw createHttpError(400, `${fieldName} must be a valid date`);
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw createHttpError(400, `${fieldName} must be a valid date`);
    }

    return date;
};

const getEventStartTime = (event) => {
    const value = event?.datetime || event?.date;

    if (!value) {
        throw createHttpError(
            409,
            'The event does not have a valid start datetime'
        );
    }

    return asValidDate(value, 'event datetime');
};

const calculateScheduledWindow = ({
    startTime,
    lengthHours,
    eventStart,
    now = new Date()
}) => {
    const start = asValidDate(startTime, 'startTime');
    const eventStartsAt = asValidDate(eventStart, 'eventStart');
    const durationHours = Number(lengthHours);

    if (!Number.isFinite(durationHours) || durationHours <= 0) {
        throw createHttpError(400, 'lengthHours must be positive');
    }

    if (start < now) {
        throw createHttpError(
            400,
            'The scheduled boost start time cannot be in the past'
        );
    }

    const end = new Date(
        start.getTime() + durationHours * HOUR_MS
    );

    if (end > eventStartsAt) {
        throw createHttpError(
            409,
            'The boost must end no later than the event start time'
        );
    }

    return {
        startTime: start,
        endTime: end
    };
};

const assertImmediateWindowFits = ({
    lengthHours,
    eventStart,
    now = new Date()
}) => {
    const eventStartsAt = asValidDate(eventStart, 'eventStart');
    const durationHours = Number(lengthHours);

    if (!Number.isFinite(durationHours) || durationHours <= 0) {
        throw createHttpError(400, 'lengthHours must be positive');
    }

    const provisionalEnd = new Date(
        now.getTime() + durationHours * HOUR_MS
    );

    if (provisionalEnd > eventStartsAt) {
        throw createHttpError(
            409,
            'There is not enough time before the event for this boost package'
        );
    }
};

const calculatePaidWindow = ({
    purchase,
    eventStart,
    paidAt = new Date()
}) => {
    const eventStartsAt = asValidDate(eventStart, 'eventStart');
    const paidTime = asValidDate(paidAt, 'paidAt');

    const lengthHours = Number(purchase?.boostSnapshot?.lengthHours);

    if (!Number.isFinite(lengthHours) || lengthHours <= 0) {
        throw createHttpError(400, 'lengthHours must be positive');
    }

    if (purchase.startMode === 'now') {
        const startTime = paidTime;

        const endTime = new Date(
            startTime.getTime() + lengthHours * HOUR_MS
        );

        if (endTime > eventStartsAt) {
            throw createHttpError(
                409,
                'The paid boost no longer fits before the event starts',
                'BOOST_WINDOW_NO_LONGER_VALID'
            );
        }

        return {
            startTime,
            endTime
        };
    }

    const requestedStart = asValidDate(
        purchase.requestedStartTime,
        'requestedStartTime'
    );

    if (requestedStart < paidTime) {
        throw createHttpError(
            409,
            'The scheduled start time passed before payment completed',
            'BOOST_SCHEDULE_PASSED'
        );
    }

    return calculateScheduledWindow({
        startTime: requestedStart,
        lengthHours,
        eventStart: eventStartsAt,
        now: paidTime
    });
};

const isBoostEffectiveAt = (
    boost,
    now = new Date()
) => {
    if (!boost?.startTime || !boost?.endTime) {
        return false;
    }

    const start = new Date(boost.startTime);
    const end = new Date(boost.endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return false;
    }

    return (
        ['scheduled', 'active'].includes(boost.status) &&
        start <= now &&
        end > now
    );
};

export {
    HOUR_MS,
    assertImmediateWindowFits,
    calculatePaidWindow,
    calculateScheduledWindow,
    getEventStartTime,
    isBoostEffectiveAt
};