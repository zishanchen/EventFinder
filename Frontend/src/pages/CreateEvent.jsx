import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import CreateEventIcon from '../components/create-event/CreateEventIcon.jsx';
import ImageUploadField from '../components/create-event/ImageUploadField.jsx';
import LocationPreviewField from '../components/create-event/LocationPreviewField.jsx';
import TagSelector from '../components/create-event/TagSelector.jsx';
import { createEvent, fetchTags } from '../api/eventApi.js';
import { fetchPaymentProfile } from '../api/paymentApi.js';
import { useAuthContext } from '../context/AuthContext.jsx';
import { resizeImageToDataURL } from '../utils/imageResize.js';
import { toIsoFromDateAndTime } from '../utils/dateTime.js';
import '../styles/create-event.css';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 120;
const DESCRIPTION_MIN_LENGTH = 20;
const DESCRIPTION_MAX_LENGTH = 2000;
const LOCATION_MIN_LENGTH = 3;
const MAX_CAPACITY = 10000;
const MAX_PRICE = 10000;

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));

        reader.readAsDataURL(file);
    });
}
const INITIAL_FORM = {
    title: '',
    description: '',
    date: '',
    time: '',
    locationName: '',
    capacity: '',
    price: '',
    tags: []
};

const addHoursToTime = (time, hoursToAdd = 2) => {
    if (!time) {
        return '';
    }

    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(2000, 0, 1, hours + hoursToAdd, minutes);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

const isValidTime = (time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

const isValidDateOnly = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day;
};

const validateCreateEventForm = (form, tagStatus, payoutStatus) => {
    const errors = {};
    const title = form.title.trim();
    const description = form.description.trim();
    const locationName = form.locationName.trim();
    const capacity = Number(form.capacity);
    const price = Number(form.price);

    if (!title) {
        errors.title = 'Event title is required.';
    } else if (title.length < TITLE_MIN_LENGTH) {
        errors.title = `Event title must be at least ${TITLE_MIN_LENGTH} characters.`;
    } else if (title.length > TITLE_MAX_LENGTH) {
        errors.title = `Event title must be ${TITLE_MAX_LENGTH} characters or fewer.`;
    }

    if (!description) {
        errors.description = 'Description is required.';
    } else if (description.length < DESCRIPTION_MIN_LENGTH) {
        errors.description = `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters.`;
    } else if (description.length > DESCRIPTION_MAX_LENGTH) {
        errors.description = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
    }

    if (!form.date) {
        errors.date = 'Date is required.';
    } else if (!isValidDateOnly(form.date)) {
        errors.date = 'Choose a valid date.';
    } else if (form.date < getTodayDate()) {
        errors.date = 'Event date cannot be in the past.';
    }

    if (!form.time) {
        errors.time = 'Time is required.';
    } else if (!isValidTime(form.time)) {
        errors.time = 'Time must use HH:mm format.';
    } else if (form.date && !errors.date) {
        const startDate = new Date(`${form.date}T${form.time}:00`);
        if (Number.isNaN(startDate.getTime())) {
            errors.time = 'Choose a valid start time.';
        } else if (startDate <= new Date()) {
            errors.time = 'Event start time must be in the future.';
        }
    }

    if (!locationName) {
        errors.locationName = 'Location is required.';
    } else if (locationName.length < LOCATION_MIN_LENGTH) {
        errors.locationName = `Location must be at least ${LOCATION_MIN_LENGTH} characters.`;
    }

    if (form.capacity === '') {
        errors.capacity = 'Capacity is required.';
    } else if (!Number.isFinite(capacity)) {
        errors.capacity = 'Capacity must be a number.';
    } else if (!Number.isInteger(capacity)) {
        errors.capacity = 'Capacity must be a whole number.';
    } else if (capacity < 1) {
        errors.capacity = 'Capacity must be at least 1.';
    } else if (capacity > MAX_CAPACITY) {
        errors.capacity = `Capacity must be ${MAX_CAPACITY} or fewer.`;
    }

    if (form.price === '') {
        errors.price = 'Price is required. Use 0 for free events.';
    } else if (!Number.isFinite(price)) {
        errors.price = 'Price must be a number.';
    } else if (price < 0) {
        errors.price = 'Price cannot be negative.';
    } else if (price > MAX_PRICE) {
        errors.price = `Price must be ${MAX_PRICE} euros or less.`;
    } else if (price > 0) {
        if (payoutStatus === 'loading') {
            errors.price = 'Checking your payout destination before publishing a paid event.';
        } else if (payoutStatus === 'error') {
            errors.price = 'Could not verify your payout destination. Please refresh and try again.';
        } else if (payoutStatus === 'missing') {
            errors.price = 'Add a payout destination in your dashboard before publishing paid events. EventFinder keeps 5% and pays you the remaining 95% after monthly billing.';
        }
    }

    if (tagStatus === 'loading') {
        errors.tags = 'Wait until tags have loaded.';
    } else if (tagStatus === 'error') {
        errors.tags = 'Tags could not be loaded.';
    } else if (form.tags.length === 0) {
        errors.tags = 'Select at least one tag.';
    }

    return errors;
};

function CreateEvent() {
    const navigate = useNavigate();
    const { token } = useAuthContext();
    const [form, setForm] = useState(INITIAL_FORM);
    const [imagePreview, setImagePreview] = useState('');
    const [imageName, setImageName] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tagOptions, setTagOptions] = useState([]);
    const [tagStatus, setTagStatus] = useState('loading');
    const [payoutStatus, setPayoutStatus] = useState('loading');
    const [platformFeePercent, setPlatformFeePercent] = useState(5);
    const [resolvedLocation, setResolvedLocation] = useState(null);
    const [touchedFields, setTouchedFields] = useState({});
    const [submitAttempted, setSubmitAttempted] = useState(false);

    const fieldErrors = validateCreateEventForm(form, tagStatus, payoutStatus);
    const validationMessages = Object.values(fieldErrors);
    const hasValidationErrors = validationMessages.length > 0;
    const isPublishBlocked = hasValidationErrors || isSubmitting;

    useEffect(() => {
        let isMounted = true;

        const loadTags = async () => {
            try {
                const tags = await fetchTags();
                if (!isMounted) {
                    return;
                }

                setTagOptions(tags.filter((tag) => tag.name));
                setTagStatus('ready');
            } catch {
                if (isMounted) {
                    setTagStatus('error');
                }
            }
        };

        loadTags();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadPayoutProfile = async () => {
            try {
                const data = await fetchPaymentProfile(token);
                if (!isMounted) {
                    return;
                }

                setPlatformFeePercent(Number(data.platformFeePercent ?? 5));
                setPayoutStatus(data.paymentMethod ? 'ready' : 'missing');
            } catch {
                if (isMounted) {
                    setPayoutStatus('error');
                }
            }
        };

        if (token) {
            loadPayoutProfile();
        }

        return () => {
            isMounted = false;
        };
    }, [token]);

    const updateField = (event) => {
        const { name, value } = event.target;
        setTouchedFields((current) => ({ ...current, [name]: true }));
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handleFieldBlur = (event) => {
        const { name } = event.target;
        setTouchedFields((current) => ({ ...current, [name]: true }));
    };

    const toggleTag = (tag) => {
        setTouchedFields((current) => ({ ...current, tags: true }));
        setForm((current) => {
            const hasTag = current.tags.includes(tag);
            return {
                ...current,
                tags: hasTag
                    ? current.tags.filter((selectedTag) => selectedTag !== tag)
                    : [...current.tags, tag]
            };
        });
    };

    const handleImageChange = async(event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        if(!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                    setStatus({ type: 'error', message: 'Failed to create event. Please choose a PNG, JPEG, or WebP image.' });
                    return;
                }

        if(file.size > MAX_IMAGE_SIZE) {
            setStatus({ type: 'error', message: 'Failed to create event. Please choose an image under 5 MB.' });
            return;
        }

       
        try {
            const imageDataUrl = await resizeImageToDataURL(file);


            setImageName(file.name);
            setImagePreview(imageDataUrl);
            setStatus({ type: '', message: '' });
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to read image file.' });
        }
    };

    const buildPayload = () => {
        const startTime = form.time;
        const endTime = addHoursToTime(startTime);
        const datetime = toIsoFromDateAndTime(form.date, form.time);

        return {
            title: form.title.trim(),
            name: form.title.trim(),
            description: form.description.trim(),
            date: form.date,
            datetime,
            startTime,
            endTime,
            locationName: form.locationName.trim(),
            address: resolvedLocation?.address || form.locationName.trim(),
            ...(resolvedLocation ? { location: resolvedLocation } : {}),
            price: Number(form.price || 0),
            capacity: Number(form.capacity),
            imageUrl: imagePreview || '/Tech-Meetup.png',
            tags: form.tags
        };
    };

    const shouldShowError = (fieldName) => {
        return Boolean((submitAttempted || touchedFields[fieldName]) && fieldErrors[fieldName]);
    };

    const getInputClassName = (fieldName) => (
        shouldShowError(fieldName) ? 'create-event__input--invalid' : undefined
    );

    const getDescribedBy = (fieldName) => (
        shouldShowError(fieldName) ? `event-${fieldName}-error` : undefined
    );

    const renderFieldError = (fieldName) => {
        if (!shouldShowError(fieldName)) {
            return null;
        }

        return (
            <p id={`event-${fieldName}-error`} className="create-event__field-error" role="alert">
                {fieldErrors[fieldName]}
            </p>
        );
    };

    const showValidationReminder = () => {
        setSubmitAttempted(true);
        setTouchedFields((current) => ({
            ...current,
            title: true,
            description: true,
            date: true,
            time: true,
            locationName: true,
            capacity: true,
            price: true,
            tags: true
        }));

        if (validationMessages.length > 0) {
            setStatus({
                type: 'error',
                message: `Please fix before publishing: ${validationMessages.join(' ')}`
            });
            window.requestAnimationFrame(() => {
                const firstInvalidField = document.querySelector('.create-event__input--invalid, [aria-invalid="true"]');
                firstInvalidField?.focus?.();
            });
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitAttempted(true);

        if (hasValidationErrors) {
            showValidationReminder();
            return;
        }

        if (isSubmitting) {
            return;
        }

        setStatus({ type: '', message: '' });
        setIsSubmitting(true);

        try {
            const createdEvent = await createEvent(buildPayload(), token);
            const eventId = createdEvent?._id || createdEvent?.id;

            if (!eventId) {
                throw new Error(
                    'The server did not return the created event id'
                );
            }

            navigate(
                `/boost-details?eventId=${encodeURIComponent(eventId)}`,
                { replace: true }
            );
        } catch (error) {
            const payoutMessage = error.code === 'PAYOUT_METHOD_REQUIRED'
                ? `Add a payout destination in your dashboard before publishing paid events. EventFinder keeps ${platformFeePercent}% and pays you the remaining ${100 - platformFeePercent}% after monthly billing.`
                : error.message;

            setStatus({
                type: 'error',
                message: payoutMessage
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="create-event-page">
            <Navbar />
            <main className="create-event">
                <div className="create-event__shell">


                    <header className="create-event__header">
                        <h1>Create New Event</h1>
                        <p>Share your event with the student community</p>
                    </header>

                    <form className="create-event__card" onSubmit={handleSubmit}>
                        <ImageUploadField
                            imagePreview={imagePreview}
                            imageName={imageName}
                            onImageChange={handleImageChange}
                        />

                        <div className="create-event__field">
                            <label htmlFor="event-title">Event Title</label>
                            <input
                                id="event-title"
                                name="title"
                                value={form.title}
                                onChange={updateField}
                                onBlur={handleFieldBlur}
                                className={getInputClassName('title')}
                                aria-invalid={shouldShowError('title')}
                                aria-describedby={getDescribedBy('title')}
                                placeholder="e.g., Tech Meetup: AI & Machine Learning"
                                required
                            />
                            {renderFieldError('title')}
                        </div>

                        <div className="create-event__field">
                            <label htmlFor="event-description">Description</label>
                            <textarea
                                id="event-description"
                                name="description"
                                value={form.description}
                                onChange={updateField}
                                onBlur={handleFieldBlur}
                                className={getInputClassName('description')}
                                aria-invalid={shouldShowError('description')}
                                aria-describedby={getDescribedBy('description')}
                                placeholder="Describe your event, what attendees can expect, and any special highlights..."
                                rows="6"
                                required
                            />
                            {renderFieldError('description')}
                        </div>

                        <div className="create-event__grid">
                            <div className="create-event__field">
                                <label htmlFor="event-date" className="create-event__icon-label">
                                    <CreateEventIcon name="calendar" />
                                    <span>Date</span>
                                </label>
                                <input
                                    id="event-date"
                                    type="date"
                                    name="date"
                                    value={form.date}
                                    min={getTodayDate()}
                                    onChange={updateField}
                                    onBlur={handleFieldBlur}
                                    className={getInputClassName('date')}
                                    aria-invalid={shouldShowError('date')}
                                    aria-describedby={getDescribedBy('date')}
                                    required
                                />
                                {renderFieldError('date')}
                            </div>

                            <div className="create-event__field">
                                <label htmlFor="event-time" className="create-event__icon-label">
                                    <CreateEventIcon name="clock" />
                                    <span>Time</span>
                                </label>
                                <input
                                    id="event-time"
                                    type="time"
                                    name="time"
                                    value={form.time}
                                    onChange={updateField}
                                    onBlur={handleFieldBlur}
                                    className={getInputClassName('time')}
                                    aria-invalid={shouldShowError('time')}
                                    aria-describedby={getDescribedBy('time')}
                                    required
                                />
                                {renderFieldError('time')}
                            </div>
                        </div>

                        <LocationPreviewField
                            value={form.locationName}
                            onChange={updateField}
                            onBlur={handleFieldBlur}
                            onResolvedLocationChange={setResolvedLocation}
                            error={fieldErrors.locationName}
                            showError={shouldShowError('locationName')}
                        />

                        <div className="create-event__grid">
                            <div className="create-event__field">
                                <label htmlFor="event-capacity" className="create-event__icon-label">
                                    <CreateEventIcon name="users" />
                                    <span>Capacity</span>
                                </label>
                                <input
                                    id="event-capacity"
                                    type="number"
                                    min="1"
                                    name="capacity"
                                    value={form.capacity}
                                    onChange={updateField}
                                    onBlur={handleFieldBlur}
                                    className={getInputClassName('capacity')}
                                    aria-invalid={shouldShowError('capacity')}
                                    aria-describedby={getDescribedBy('capacity')}
                                    placeholder="e.g., 50"
                                    required
                                />
                                {renderFieldError('capacity')}
                            </div>

                            <div className="create-event__field">
                                <label htmlFor="event-price" className="create-event__icon-label">
                                    <CreateEventIcon name="price" />
                                    <span>Price (&euro;)</span>
                                </label>
                                <input
                                    id="event-price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    name="price"
                                    value={form.price}
                                    onChange={updateField}
                                    onBlur={handleFieldBlur}
                                    className={getInputClassName('price')}
                                    aria-invalid={shouldShowError('price')}
                                    aria-describedby={getDescribedBy('price')}
                                    placeholder="0 for free events"
                                    required
                                />
                                {Number(form.price) > 0 && (
                                    <p className="create-event__field-hint">
                                        Paid events require a saved payout destination. EventFinder keeps {platformFeePercent}% and pays hosts {100 - platformFeePercent}% after monthly billing.
                                    </p>
                                )}
                                {renderFieldError('price')}
                            </div>
                        </div>

                        <TagSelector
                            status={tagStatus}
                            tags={tagOptions}
                            selectedTags={form.tags}
                            onToggle={toggleTag}
                            error={fieldErrors.tags}
                            showError={shouldShowError('tags')}
                        />

                        {status.message && (
                            <p className={`create-event__status create-event__status--${status.type}`} role="status">
                                {status.message}
                            </p>
                        )}

                        <div className="create-event__actions">
                            <div className="create-event__button-row create-event__button-row--single">
                                <button
                                    type="submit"
                                    className={`create-event__primary ${hasValidationErrors ? 'create-event__primary--blocked' : ''}`}
                                    disabled={isSubmitting}
                                    aria-disabled={isPublishBlocked}
                                    title={hasValidationErrors ? 'Fix the highlighted fields before publishing.' : undefined}
                                    onClick={(clickEvent) => {
                                        if (hasValidationErrors) {
                                            clickEvent.preventDefault();
                                            showValidationReminder();
                                        }
                                    }}
                                >
                                    {isSubmitting ? 'Publishing...' : 'Publish Event'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}

export default CreateEvent;
