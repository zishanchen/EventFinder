import React from 'react';

export default function ParticipantInfoCard({ participant, event }) {
    const participantName = participant?.username || participant?.email || 'Participant';
    const avatarLabel = participantName.charAt(0).toUpperCase();

    return (
        <div className="rate-page__event-card">
            <div className="rate-page__account-avatar">
                {participant?.profilePicture ? (
                    <img src={participant.profilePicture} alt={`${participantName}'s profile`} />
                ) : (
                    avatarLabel
                )}
            </div>
            <div className="rate-page__event-info">
                <h3 className="rate-page__event-name">{participantName}</h3>
                <p className="rate-page__event-host">Attended: {event?.name}</p>
                <p className="rate-page__event-date">
                    {new Date(event?.datetime).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'long', year: 'numeric'
                    })}
                </p>
            </div>
        </div>
    );
}
