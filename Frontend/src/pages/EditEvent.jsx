import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import CreateEventIcon from "../components/create-event/CreateEventIcon.jsx";
import LocationPreviewField from "../components/create-event/LocationPreviewField.jsx";
import { resizeImageToDataURL } from "../utils/imageResize.js";
import {
    fetchEventById,
    fetchHostEventRegistrations,
    fetchTags,
    removeEventParticipant,
    updateEvent
} from "../api/eventApi.js";
import { useAuthContext } from "../context/AuthContext.jsx";
import { formatRating } from "../utils/ratingDisplay.js";
import { getTagName, tagStyle } from "../utils/tagPresentation.js";
import "../styles/create-event.css";
import "../styles/edit-event.css";


const REMOVABLE_STATUSES = new Set(["Registered"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 120;
const DESCRIPTION_MIN_LENGTH = 20;
const DESCRIPTION_MAX_LENGTH = 2000;
const LOCATION_MIN_LENGTH = 3;
const MAX_CAPACITY = 10000;
const INITIAL_FORM = {
    title: "",
    description: "",
    locationName: "",
    address: "",
    capacity: "",
    imageUrl: "",
    tags: []
};

const formatMoney = (value) => {
    return new Intl.NumberFormat("en-DE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
};

const formatDate = (dateValue) => {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Date pending";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
};

const getParticipantRating = (participant) => ({
    average: formatRating(participant?.rating?.average)
});

const eventToForm = (event) => ({
    title: event?.title || "",
    description: event?.description || "",
    locationName: event?.locationName || "",
    address: event?.address || event?.location?.address || "",
    capacity: event?.capacity ? String(event.capacity) : "",
    imageUrl: event?.imageUrl || event?.image || "",
    tags: Array.isArray(event?.tags) ? event.tags : []
});

const isValidImageValue = (value) => {
    if (!value) {
        return false;
    }

    return !value.startsWith("data:image/") || /^data:image\/(png|jpe?g|webp);base64,/i.test(value);
};

const getEventStartDate = (event) => {
    const date = new Date(event?.datetime || event?.date);
    return Number.isNaN(date.getTime()) ? null : date;
};

const hasEventStarted = (event) => {
    const startDate = getEventStartDate(event);
    return Boolean(startDate && startDate <= new Date());
};

const validateEditEventForm = (form, { activeRegistrationCount, tagStatus }) => {
    const errors = {};
    const title = form.title.trim();
    const description = form.description.trim();
    const locationName = form.locationName.trim();
    const capacity = Number(form.capacity);
    const imageUrl = form.imageUrl.trim();

    if (!title) {
        errors.title = "Event title is required.";
    } else if (title.length < TITLE_MIN_LENGTH) {
        errors.title = `Event title must be at least ${TITLE_MIN_LENGTH} characters.`;
    } else if (title.length > TITLE_MAX_LENGTH) {
        errors.title = `Event title must be ${TITLE_MAX_LENGTH} characters or fewer.`;
    }

    if (!description) {
        errors.description = "Description is required.";
    } else if (description.length < DESCRIPTION_MIN_LENGTH) {
        errors.description = `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters.`;
    } else if (description.length > DESCRIPTION_MAX_LENGTH) {
        errors.description = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
    }

    if (!locationName) {
        errors.locationName = "Location is required.";
    } else if (locationName.length < LOCATION_MIN_LENGTH) {
        errors.locationName = `Location must be at least ${LOCATION_MIN_LENGTH} characters.`;
    }

    if (form.capacity === "") {
        errors.capacity = "Capacity is required.";
    } else if (!Number.isFinite(capacity)) {
        errors.capacity = "Capacity must be a number.";
    } else if (!Number.isInteger(capacity)) {
        errors.capacity = "Capacity must be a whole number.";
    } else if (capacity < Math.max(1, activeRegistrationCount)) {
        errors.capacity = `Capacity cannot be below ${Math.max(1, activeRegistrationCount)}.`;
    } else if (capacity > MAX_CAPACITY) {
        errors.capacity = `Capacity must be ${MAX_CAPACITY} or fewer.`;
    }

    if (!imageUrl) {
        errors.imageUrl = "Image is required.";
    } else if (!isValidImageValue(imageUrl)) {
        errors.imageUrl = "Image must be a PNG, JPEG, or WebP image.";
    }

    if (tagStatus === "loading") {
        errors.tags = "Wait until tags have loaded.";
    } else if (tagStatus === "error") {
        errors.tags = "Tags could not be loaded.";
    } else if (form.tags.length === 0) {
        errors.tags = "Select at least one tag.";
    }

    return errors;
};

function EditEvent() {
    const { id } = useParams();
    const { token } = useAuthContext();
    const [event, setEvent] = useState(null);
    const [form, setForm] = useState(INITIAL_FORM);
    const [resolvedLocation, setResolvedLocation] = useState(null);
    const [tagOptions, setTagOptions] = useState([]);
    const [tagStatus, setTagStatus] = useState("loading");
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [removingId, setRemovingId] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [touchedFields, setTouchedFields] = useState({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const imageInputRef = useRef(null);

    useEffect(() => {
        const loadEditData = async () => {
            try {
                setLoading(true);
                setError("");

                const [eventData, registrationData] = await Promise.all([
                    fetchEventById(id),
                    fetchHostEventRegistrations(id, token)
                ]);

                setEvent(eventData);
                setForm(eventToForm(eventData));
                setResolvedLocation(null);
                setRegistrations(registrationData.registrations || []);
            } catch (err) {
                setError(err.message || "Failed to load event editor");
            } finally {
                setLoading(false);
            }
        };

        if (id && token) {
            loadEditData();
        }
    }, [id, token]);

    useEffect(() => {
        let isMounted = true;

        const loadTags = async () => {
            try {
                const tags = await fetchTags();
                if (!isMounted) {
                    return;
                }

                setTagOptions(tags.filter((tag) => getTagName(tag)));
                setTagStatus("ready");
            } catch {
                if (isMounted) {
                    setTagStatus("error");
                }
            }
        };

        loadTags();

        return () => {
            isMounted = false;
        };
    }, []);

    const activeRegistrations = useMemo(() => {
        return registrations.filter((registration) => REMOVABLE_STATUSES.has(registration.status));
    }, [registrations]);

    const removedRegistrations = useMemo(() => {
        return registrations.filter((registration) => registration.status === "Removed");
    }, [registrations]);

    const activeRegistrationCount = activeRegistrations.length;
    const isPastEvent = hasEventStarted(event);
    const fieldErrors = validateEditEventForm(form, { activeRegistrationCount, tagStatus });
    const validationMessages = Object.values(fieldErrors);
    const hasValidationErrors = validationMessages.length > 0;
    const isSaveBlocked = hasValidationErrors || saving || isPastEvent || event?.status === "Cancelled";
    const initialLocation = useMemo(() => {
        if (!event) {
            return null;
        }

        return {
            latitude: event.location?.latitude,
            longitude: event.location?.longitude,
            venueName: event.locationName,
            address: event.address || event.location?.address
        };
    }, [event]);

    const updateField = (field, value) => {
        setTouchedFields((currentFields) => ({ ...currentFields, [field]: true }));
        setForm((currentForm) => ({ ...currentForm, [field]: value }));
    };

    const markFieldTouched = (field) => {
        setTouchedFields((currentFields) => ({ ...currentFields, [field]: true }));
    };

    const handleImageChange = (changeEvent) => {
        const file = changeEvent.target.files?.[0];
        changeEvent.target.value = "";

        if (!file) {
            return;
        }

        markFieldTouched("imageUrl");

        if(!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            setError("Please choose a PNG, JPG, or WEBP image.");
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            setError("Please choose an image under 5 MB.");
            return;
        }

        setError("");

        resizeImageToDataURL(file)
            .then((dataUrl) => {
                updateField("imageUrl", dataUrl);
            })

            .catch(() => {
                setError("Failed to process image. Please try again.");
            });
    };

    const updateLocationName = (changeEvent) => {
        markFieldTouched("locationName");
        setResolvedLocation(null);
        setForm((currentForm) => ({
            ...currentForm,
            locationName: changeEvent.target.value,
            address: ""
        }));
    };

    const toggleTag = (tag) => {
        markFieldTouched("tags");
        setForm((currentForm) => {
            const hasTag = currentForm.tags.includes(tag);
            return {
                ...currentForm,
                tags: hasTag
                    ? currentForm.tags.filter((selectedTag) => selectedTag !== tag)
                    : [...currentForm.tags, tag]
            };
        });
    };

    const shouldShowError = (fieldName) => {
        return Boolean((submitAttempted || touchedFields[fieldName]) && fieldErrors[fieldName]);
    };

    const getInputClassName = (fieldName) => (
        shouldShowError(fieldName) ? "edit-event__input--invalid" : undefined
    );

    const getDescribedBy = (fieldName) => (
        shouldShowError(fieldName) ? `edit-event-${fieldName}-error` : undefined
    );

    const renderFieldError = (fieldName) => {
        if (!shouldShowError(fieldName)) {
            return null;
        }

        return (
            <p id={`edit-event-${fieldName}-error`} className="edit-event__field-error" role="alert">
                {fieldErrors[fieldName]}
            </p>
        );
    };

    const showValidationReminder = () => {
        setSubmitAttempted(true);
        setTouchedFields((currentFields) => ({
            ...currentFields,
            title: true,
            description: true,
            locationName: true,
            capacity: true,
            imageUrl: true,
            tags: true
        }));

        const messageText = isPastEvent
            ? "Past events can no longer be edited."
            : event?.status === "Cancelled"
                ? "Cancelled events can no longer be edited."
                : `Please fix before saving: ${validationMessages.join(" ")}`;

        setError(messageText);
        window.requestAnimationFrame(() => {
            const firstInvalidField = document.querySelector(".edit-event__input--invalid, .create-event__input--invalid, [aria-invalid='true']");
            firstInvalidField?.focus?.();
        });
    };

    const buildPayload = () => {
        const locationName = form.locationName.trim();
        const savedLocationName = (event?.locationName || "").trim();
        const locationNameChanged = locationName !== savedLocationName;
        const address = resolvedLocation?.address || (locationNameChanged ? locationName : form.address.trim() || locationName);
        const location = resolvedLocation || {
            latitude: locationNameChanged ? null : event?.location?.latitude,
            longitude: locationNameChanged ? null : event?.location?.longitude,
            venueName: locationName,
            address
        };
        const payload = {
            title: form.title.trim(),
            name: form.title.trim(),
            description: form.description.trim(),
            locationName,
            address,
            location,
            capacity: Number(form.capacity),
            imageUrl: form.imageUrl.trim(),
            tags: form.tags
        };

        return payload;
    };

    const handleSubmit = async (submitEvent) => {
        submitEvent.preventDefault();
        setSubmitAttempted(true);
        setError("");
        setMessage("");

        if (isSaveBlocked) {
            showValidationReminder();
            return;
        }

        try {
            setSaving(true);
            const updatedEvent = await updateEvent(id, buildPayload(), token);
            setEvent(updatedEvent);
            setForm(eventToForm(updatedEvent));
            setMessage("Event details updated.");
        } catch (err) {
            setError(err.message || "Failed to update event");
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEvent = async () => {
        if (!event) {
            return;
        }

        const confirmed = window.confirm(`Cancel "${event.title}"? All registrations will also be cancelled.`);
        if (!confirmed) {
            return;
        }

        setError("");
        setMessage("");

        try {
            setCancelling(true);
            const updatedEvent = await updateEvent(id, { status: "Cancelled" }, token);
            setEvent(updatedEvent);
            setForm(eventToForm(updatedEvent));
            setMessage("Event cancelled. Registrations were updated.");
        } catch (err) {
            setError(err.message || "Failed to cancel event");
        } finally {
            setCancelling(false);
        }
    };

    const handleRemove = async (registrationId) => {
        setError("");
        setMessage("");

        try {
            setRemovingId(registrationId);
            const data = await removeEventParticipant(id, registrationId, token);
            setRegistrations((currentRegistrations) =>
                currentRegistrations.map((registration) =>
                    registration._id === data.registration._id ? data.registration : registration
                )
            );
            setEvent((currentEvent) => {
                if (!currentEvent) {
                    return currentEvent;
                }

                return {
                    ...currentEvent,
                    attendeesCount: Math.max(0, (Number(currentEvent.attendeesCount) || 0) - 1)
                };
            });
            setMessage(data.message);
        } catch (err) {
            setError(err.message || "Failed to remove participant");
        } finally {
            setRemovingId("");
        }
    };

    return (
        <div className="edit-event-page">
            <Navbar />
            <main className="edit-event">
                <div className="edit-event__topline">
                    
                    {event && (
                        <Link to={`/events/${event._id}`} className="edit-event__preview">
                            Preview public page
                        </Link>
                    )}
                </div>

                {loading ? (
                    <section className="edit-event__panel">
                        <p className="edit-event__empty">Loading event editor...</p>
                    </section>
                ) : error && !event ? (
                    <section className="edit-event__panel edit-event__notice edit-event__notice--error">
                        {error}
                    </section>
                ) : (
                    <>
                        <section className="edit-event__hero">
                            <div>
                                <h1>Edit Event</h1>
                                <p>
                                    {event.title} - {formatDate(event.datetime || event.date)} at {event.startTime} - {event.locationName}
                                </p>
                            </div>
                            <div className="edit-event__summary">
                                <strong>{activeRegistrationCount}/{event.capacity}</strong>
                                <span>active registrations</span>
                            </div>
                        </section>

                        {message && <section className="edit-event__notice edit-event__notice--success">{message}</section>}
                        {error && <section className="edit-event__notice edit-event__notice--error">{error}</section>}

                        <section className="edit-event__panel">
                            <div className="edit-event__section-heading">
                                <div>
                                    <p className="edit-event__eyebrow">Event Details</p>
                                    <h2>Public Event Information</h2>
                                </div>
                            </div>

                            {isPastEvent && (
                                <p className="edit-event__inline-notice">
                                    This event has already started and can no longer be edited.
                                </p>
                            )}
                            {event.status === "Cancelled" && (
                                <p className="edit-event__inline-notice">
                                    This event is cancelled and can no longer be edited.
                                </p>
                            )}

                            <div className="edit-event__locked-grid" aria-label="Locked event values">
                                <article>
                                    <span>Date and time</span>
                                    <strong>{formatDate(event.datetime || event.date)} at {event.startTime}</strong>
                                </article>
                                <article>
                                    <span>Price</span>
                                    <strong>{formatMoney(event.price)}</strong>
                                </article>
                            </div>

                            <form className="edit-event__form" onSubmit={handleSubmit}>
                                <div className="edit-event__field">
                                    <label htmlFor="edit-event-title" className="create-event__icon-label">
                                        <CreateEventIcon name="tag" />
                                        <span>Event title</span>
                                    </label>
                                    <input
                                        id="edit-event-title"
                                        value={form.title}
                                        onChange={(changeEvent) => updateField("title", changeEvent.target.value)}
                                        onBlur={() => markFieldTouched("title")}
                                        className={getInputClassName("title")}
                                        aria-invalid={shouldShowError("title")}
                                        aria-describedby={getDescribedBy("title")}
                                        required
                                    />
                                    {renderFieldError("title")}
                                </div>

                                <div className="edit-event__field">
                                    <label htmlFor="edit-event-description">Description</label>
                                    <textarea
                                        id="edit-event-description"
                                        value={form.description}
                                        onChange={(changeEvent) => updateField("description", changeEvent.target.value)}
                                        onBlur={() => markFieldTouched("description")}
                                        className={getInputClassName("description")}
                                        aria-invalid={shouldShowError("description")}
                                        aria-describedby={getDescribedBy("description")}
                                        rows="6"
                                        required
                                    />
                                    {renderFieldError("description")}
                                </div>

                                <div className="edit-event__form-grid edit-event__form-grid--controls">
                                    <div className="edit-event__field edit-event__field--capacity">
                                        <label htmlFor="edit-event-capacity" className="create-event__icon-label">
                                            <CreateEventIcon name="users" />
                                            <span>Capacity</span>
                                        </label>
                                        <input
                                            id="edit-event-capacity"
                                            type="number"
                                            min={Math.max(1, activeRegistrationCount)}
                                            value={form.capacity}
                                            onChange={(changeEvent) => updateField("capacity", changeEvent.target.value)}
                                            onBlur={() => markFieldTouched("capacity")}
                                            className={getInputClassName("capacity")}
                                            aria-invalid={shouldShowError("capacity")}
                                            aria-describedby={getDescribedBy("capacity")}
                                            required
                                        />
                                        {renderFieldError("capacity")}
                                    </div>
                                </div>

                                <div className="edit-event__location-preview">
                                    <LocationPreviewField
                                        value={form.locationName}
                                        onChange={updateLocationName}
                                        onBlur={() => markFieldTouched("locationName")}
                                        onResolvedLocationChange={setResolvedLocation}
                                        initialLocation={initialLocation}
                                        error={fieldErrors.locationName}
                                        showError={shouldShowError("locationName")}
                                    />
                                </div>

                                <div className="edit-event__field">
                                    <div className="edit-event__image-label">
                                        <button type="button"
                                            className="edit-event__image-upload-button"
                                            onClick={() => imageInputRef.current?.click()}
                                            aria-label="Upload event image"
                                            title="Upload event image"
                                        >
                                            <CreateEventIcon name="upload" />
                                            
                                        </button>


                                            <label htmlFor="edit-event-image">
                                                Image URL
                                            </label>
                                    </div>
                                   
                                    <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handleImageChange}
                                    hidden
                                    />

                                   
                                    
                                    {renderFieldError("imageUrl")}
                                </div>

                                <fieldset
                                    className={`edit-event__field edit-event__fieldset ${shouldShowError("tags") ? "edit-event__fieldset--invalid" : ""}`}
                                    aria-invalid={shouldShowError("tags")}
                                    aria-describedby={shouldShowError("tags") ? "edit-event-tags-error" : undefined}
                                >
                                    <legend className="create-event__icon-label">
                                        <CreateEventIcon name="tag" />
                                        <span>Tags</span>
                                    </legend>
                                    <div className="edit-event__tags">
                                        {tagStatus === "loading" && <p className="edit-event__empty">Loading tags...</p>}
                                        {tagStatus === "error" && <p className="edit-event__empty">Tags could not be loaded.</p>}
                                        {tagStatus === "ready" && tagOptions.map((tag) => {
                                            const tagName = getTagName(tag);

                                            return (
                                                <button
                                                    type="button"
                                                    key={tagName}
                                                    className={`edit-event__tag ${form.tags.includes(tagName) ? "edit-event__tag--active" : ""}`}
                                                    style={tagStyle(tag)}
                                                    onClick={() => toggleTag(tagName)}
                                                >
                                                    <CreateEventIcon name="plus" />
                                                    <span>{tagName}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {shouldShowError("tags") && (
                                        <p id="edit-event-tags-error" className="edit-event__field-error" role="alert">
                                            {fieldErrors.tags}
                                        </p>
                                    )}
                                </fieldset>

                                <div className="edit-event__actions">
                                    {event.status === "Planned" && !isPastEvent && (
                                        <button
                                            type="button"
                                            className="edit-event__cancel"
                                            onClick={handleCancelEvent}
                                            disabled={cancelling || saving}
                                        >
                                            {cancelling ? "Cancelling..." : "Cancel event"}
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className={`edit-event__save ${hasValidationErrors || isPastEvent || event.status === "Cancelled" ? "edit-event__save--blocked" : ""}`}
                                        disabled={saving || cancelling}
                                        aria-disabled={isSaveBlocked}
                                        onClick={(clickEvent) => {
                                            if (hasValidationErrors || isPastEvent || event.status === "Cancelled") {
                                                clickEvent.preventDefault();
                                                showValidationReminder();
                                            }
                                        }}
                                    >
                                        {saving ? "Saving..." : "Save changes"}
                                    </button>
                                </div>
                            </form>
                        </section>

                        <section className="edit-event__panel">
                            <div className="edit-event__section-heading">
                                <div>
                                    <p className="edit-event__eyebrow">Participant Management</p>
                                    <h2>Registered Participants</h2>
                                </div>
                                <span>{activeRegistrationCount} active</span>
                            </div>

                            {activeRegistrations.length === 0 ? (
                                <p className="edit-event__empty">No active registrations yet.</p>
                            ) : (
                                <div className="edit-event__registrations">
                                    {activeRegistrations.map((registration) => {
                                        const participant = registration.participant;
                                        const participantRating = getParticipantRating(participant);

                                        return (
                                            <article className="edit-event-registration" key={registration._id}>
                                                <div>
                                                    <h3>{participant?.username || "Deleted participant"}</h3>
                                                    <p>{participant?.email || "No email available"}</p>
                                                </div>
                                                <div className="edit-event-registration__rating" aria-label={`Participant rating ${participantRating.average} out of 5`}>
                                                    <strong>{participantRating.average}</strong>
                                                </div>
                                                <span className={`edit-event-registration__status edit-event-registration__status--${registration.status.toLowerCase()}`}>
                                                    {registration.status}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="edit-event-registration__remove"
                                                    onClick={() => handleRemove(registration._id)}
                                                    disabled={removingId === registration._id}
                                                >
                                                    {removingId === registration._id ? "Removing..." : "Remove"}
                                                </button>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {removedRegistrations.length > 0 && (
                            <section className="edit-event__panel edit-event__panel--muted">
                                <div className="edit-event__section-heading">
                                    <div>
                                        <p className="edit-event__eyebrow">Participant Management</p>
                                        <h2>Blocked from Re-registering</h2>
                                    </div>
                                    <span>{removedRegistrations.length} blocked</span>
                                </div>
                                <div className="edit-event__registrations edit-event__registrations--blocked">
                                    {removedRegistrations.map((registration) => {
                                        const participant = registration.participant;
                                        const participantRating = getParticipantRating(participant);

                                        return (
                                            <article className="edit-event-registration edit-event-registration--blocked" key={registration._id}>
                                                <div>
                                                    <h3>{participant?.username || "Deleted participant"}</h3>
                                                    <p>{participant?.email || "No email available"}</p>
                                                </div>
                                                <div className="edit-event-registration__rating" aria-label={`Participant rating ${participantRating.average} out of 5`}>
                                                    <strong>{participantRating.average}</strong>
                                                </div>
                                                <span className="edit-event-registration__status edit-event-registration__status--removed">
                                                    Removed
                                                </span>
                                                <span className="edit-event-registration__blocked-note">Blocked</span>
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

export default EditEvent;
