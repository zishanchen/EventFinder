import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreateEventIcon from '../create-event/CreateEventIcon.jsx';

export default function RateParticipantSidebar({ eventId, eventName, isEditing }) {
    const navigate = useNavigate();


    return (
        <aside className="rate-sidebar">
            

            <div className="rate-sidebar__block">
                <p className="rate-sidebar__eyebrow">Participant Rating</p>
                <h1>{isEditing ? 'Edit Participant Rating' : 'Rate Participant'}</h1>
                <p>Share specific feedback for this attendee from {eventName}.</p>
            </div>
        </aside>
    );
}
