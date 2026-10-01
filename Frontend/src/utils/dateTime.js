export const toIsoFromLocalInput = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error('Please choose a valid date and time');
    }

    return date.toISOString();
};

export const toDateTimeLocalValue = (date = new Date()) => {
    const local = new Date(
        date.getTime() - date.getTimezoneOffset() * 60_000
    );

    return local.toISOString().slice(0, 16);
};

export const toIsoFromDateAndTime = (date, time) => {
    if (!date || !time) {
        throw new Error('Please choose a valid date and time');
    }

    return toIsoFromLocalInput(`${date}T${time}:00`);
};
