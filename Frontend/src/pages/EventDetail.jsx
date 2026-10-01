import { useParams } from 'react-router-dom';

import React from 'react';
import Navbar from '../components/Navbar.jsx';
import EventHero from '../components/EventHero.jsx';
import { Link } from 'react-router-dom';
import EventDetailsCard from "../components/event-detail/EventDetailsCard.jsx";
import RegistrationCard from "../components/event-detail/RegistrationCard.jsx";
import LocationCard from "../components/event-detail/LocationCard.jsx";
import HostCard from '../components/event-detail/HostCard.jsx';
import ReviewsCard from '../components/event-detail/ReviewsCard.jsx';
import AttendeesCard from '../components/event-detail/AttendeesCard.jsx';
import EventActionsCard from '../components/event-detail/EventActionsCard.jsx';
import CreateEventIcon from '../components/create-event/CreateEventIcon.jsx';
import { useEffect, useState } from "react";
import { fetchEventById } from "../api/eventApi.js";
import { useAuthContext } from '../context/AuthContext.jsx';
import "../styles/eventDetail.css";

const readId = (value) => {
  if (!value) return null;
  return typeof value === 'string' ? value : value._id || value.id || null;
};

function EventDetail() {
  const { id } = useParams();
  const { isHost, user } = useAuthContext();

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEventData = async ({ showLoading = false } = {}) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError("");
      const data = await fetchEventById(id);
      setEventData(data);
    } catch (error) {
      setError(error.message);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadEventData({ showLoading: true });
  }, [id]);

  if (loading) {
    return <p>Loading event...</p>
  }
  if (error) {
    return <p>Error: {error}</p>
  }

  const handleRegistered = () => {
    loadEventData();
  };

  const handleDeregistered = () => {
    loadEventData();
  };

  const isOwnHostedEvent = isHost && readId(eventData?.creator) === readId(user);

  return (
    <>
      <Navbar />
      
      <EventHero event={eventData} />


      <div className="event-detail">
        <div className="event-detail__layout">
          <div className="event-detail__main">
            <EventDetailsCard event={eventData} />
            <AttendeesCard event={eventData} />
            <HostCard host={eventData.host} />
            <ReviewsCard event={eventData} />
          </div>
          <aside className="event-detail__sidebar">
            {!isHost && (
              <RegistrationCard
                event={eventData}
                onRegistered={handleRegistered}
                onDeregistered={handleDeregistered}
              />
            )}
            <EventActionsCard event={eventData} />
            {isOwnHostedEvent && (
              <section className="event-card host-preview-card">
                <p>Previewing your event</p>
                <Link to={`/events/${eventData._id}/edit`}>
                  <CreateEventIcon name="edit" />
                  Edit event
                </Link>
              </section>
            )}
            <LocationCard event={eventData} />

          </aside>
        </div>
      </div>

    </>

  );

}

export default EventDetail;
