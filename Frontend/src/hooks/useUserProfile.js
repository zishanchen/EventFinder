import { useCallback, useEffect, useState } from "react";
import { deregisterFromEvent, fetchSavedEvents, unsaveEvent } from "../api/eventApi.js";
import { getUserProfile, updateProfileAvatar } from "../api/profileApi.js";
import { deleteEventRating } from "../api/ratingApi.js";
import { useAuthContext } from "../context/AuthContext.jsx";
import { mapSavedEventToProfileCard, sortProfileEventsByDate } from "../utils/profileMappers.js";

const formatMoney = (price) => {
    return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR"
    }).format(Number(price) || 0);
};

export function useUserProfile() {
    const { token, updateUser } = useAuthContext();
    const [profile, setProfile] = useState(null);
    const [savedEvents, setSavedEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    const loadProfile = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const data = await getUserProfile(token);
            const savedEventsData = await fetchSavedEvents(token);
            const sortedProfile = {
                ...data,
                events: {
                    ...data.events,
                    upcoming: sortProfileEventsByDate(data.events?.upcoming),
                    attended: sortProfileEventsByDate(data.events?.attended).reverse()
                }
            };
            const normalizedSavedEvents = sortProfileEventsByDate(
                savedEventsData.map(mapSavedEventToProfileCard)
            );

            setProfile(sortedProfile);
            setSavedEvents(normalizedSavedEvents);
        } catch (err) {
            setError(err.message || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            loadProfile();
        }
    }, [token, loadProfile]);

    const handleAvatarUpload = async (profilePicture) => {
        const data = await updateProfileAvatar(token, profilePicture);
        const updatedUser = data.user;

        setProfile((currentProfile) => {
            if (!currentProfile) return currentProfile;

            return {
                ...currentProfile,
                user: {
                    ...currentProfile.user,
                    profilePicture: updatedUser.profilePicture
                }
            };
        });
        updateUser({ profilePicture: updatedUser.profilePicture });
    };

    const handleDeleteReview = async (event) => {
        const shouldDelete = window.confirm("Delete this event review?");

        if (!shouldDelete) {
            return;
        }

        try {
            setActionLoading(true);
            setError("");
            await deleteEventRating(token, event.registrationId);
            await loadProfile();
        } catch (err) {
            setError(err.message || "Failed to delete review");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelRegistration = async (event) => {
        const cancelRegistration = async ({ confirmLateFee = false } = {}) => {
            await deregisterFromEvent(event.eventId, token, { confirmLateFee });
            await loadProfile();
        };

        try {
            setActionLoading(true);
            setError("");

            try {
                await cancelRegistration();
            } catch (err) {
                if (err.code !== "LATE_CANCELLATION_CONFIRMATION_REQUIRED") {
                    throw err;
                }

                const fee = formatMoney(err.cancellationFeeAmount);
                const shouldConfirmLateFee = window.confirm(
                    `${err.message} Fee amount: ${fee}.\n\nCancel anyway?`
                );

                if (!shouldConfirmLateFee) {
                    return;
                }

                await cancelRegistration({ confirmLateFee: true });
            }
        } catch (err) {
            setError(err.message || "Failed to cancel registration");
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleSavedEvent = async (event) => {
        try {
            setActionLoading(true);
            setError("");
            await unsaveEvent(event.eventId, token);
            await loadProfile();
        } catch (err) {
            setError(err.message || "Failed to update saved event");
        } finally {
            setActionLoading(false);
        }
    };

    return {
        profile,
        savedEvents,
        loading,
        error,
        actionLoading,
        refresh: loadProfile,
        uploadAvatar: handleAvatarUpload,
        deleteReview: handleDeleteReview,
        cancelRegistration: handleCancelRegistration,
        unsaveProfileEvent: handleToggleSavedEvent
    };
}
