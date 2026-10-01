export const getRatingEventName = (event) => event?.name || event?.title || 'Selected event';

const getParticipantName = (item) => item.participant?.username || item.participant?.email || '';

export function sortParticipants(participants) {
    return [...participants].sort((a, b) => {
        if (a.hasRated !== b.hasRated) {
            return a.hasRated ? -1 : 1;
        }

        return getParticipantName(a).localeCompare(getParticipantName(b), undefined, {
            sensitivity: 'base'
        });
    });
}

export function getSelectedParticipant({ participants, registrationId, stateData }) {
    if (registrationId) {
        const participantFromList = participants.find((item) => item.registration._id === registrationId);

        if (participantFromList) {
            return participantFromList;
        }

    }

    if (stateData.registration && stateData.participant) {
        return {
            registration: stateData.registration,
            participant: stateData.participant,
            rating: stateData.rating || null
        };
    }

    return null;
}
