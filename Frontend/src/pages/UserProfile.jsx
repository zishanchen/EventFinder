import React from "react";
import Navbar from "../components/Navbar";
import ProfileHeader from "../components/user-profile/ProfileHeader";
import Interests from "../components/user-profile/Interests"
import Achievements from "../components/user-profile/Achievements";
import Payment from "../components/user-profile/Payment";
import Events from "../components/user-profile/Events";
import MonthlyInfo from "../components/user-profile/MonthlyInfo";
import { useUserProfile } from "../hooks/useUserProfile.js";
import "../styles/user-profile.css";

function UserProfile() {
    const {
        profile,
        savedEvents,
        loading,
        error,
        actionLoading,
        uploadAvatar,
        deleteReview,
        cancelRegistration,
        unsaveProfileEvent
    } = useUserProfile();

    return (
        <>
            <Navbar />

            <main className="profile-page">
                {loading && (
                    <section className="profile-card profile-page__state">
                        <span className="modal__spinner" />
                    </section>
                )}

                {!loading && error && (
                    <section className="profile-card profile-page__state profile-page__state--error">
                        {error}
                    </section>
                )}

                {!loading && !error && profile && (
                    <>
                        <ProfileHeader user={profile.user} onAvatarUpload={uploadAvatar} />
                        <Events
                            variant="upcoming"
                            upcomingEvents={profile.events.upcoming}
                            actionLoading={actionLoading}
                            onCancelRegistration={cancelRegistration}
                        />
                        <Achievements achievements={profile.user.achievements} />
                        <Interests interests={profile.user.interests} />
                        <Events
                            variant="history"
                            attendedEvents={profile.events.attended}
                            savedEvents={savedEvents}
                            actionLoading={actionLoading}
                            onDeleteReview={deleteReview}
                            onCancelRegistration={cancelRegistration}
                            onToggleSavedEvent={unsaveProfileEvent}
                        />
                        <Payment />
                        <MonthlyInfo />
                    </>
                )}
            </main>
        </>

    );
}

export default UserProfile;
