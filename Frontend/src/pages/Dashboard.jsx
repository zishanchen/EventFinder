import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Payment from "../components/user-profile/Payment.jsx";
import { fetchHostDashboardEvents, updateEvent } from "../api/eventApi.js";
import { updateProfileAvatar } from "../api/profileApi.js";
import { useAuthContext } from "../context/AuthContext.jsx";
import {
  ACCEPTED_AVATAR_INPUT_TYPES,
  getFirstWordInitial,
  readFileAsDataUrl,
  validateAvatarFile
} from "../utils/avatarUpload.js";
import "../styles/dashboard.css";
import "../styles/user-profile.css";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

const moneyFormatter = new Intl.NumberFormat("en-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
});

const formatDate = (dateValue) => {
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "Date pending" : dateFormatter.format(date);
};

const formatMoney = (value) => moneyFormatter.format(Number(value) || 0);

const getEventDate = (event) => new Date(event.datetime || event.date);

const getBoostIndicatorLabel = (event) => {
  if (event.isBoostedNow) {
    return "Boost active";
  }

  const boostEnd = event.boost?.endTime
    ? new Date(event.boost.endTime)
    : null;

  if (
    event.boost?.status === "scheduled" &&
    boostEnd &&
    !Number.isNaN(boostEnd.getTime()) &&
    boostEnd > new Date()
  ) {
    return "Boost scheduled";
  }

  if (["pending", "processing"].includes(event.boostPurchaseStatus)) {
    return "Boost payment pending";
  }

  if (event.canPurchaseBoost === false) {
    return "Boost reserved";
  }

  return "";
};

const getEventRevenue = (event, participantField = "attendedParticipantsCount") => {
  return (Number(event.price) || 0) * (Number(event[participantField]) || 0);
};

const getHostNetRevenue = (event, participantField = "attendedParticipantsCount", platformFeePercent = 5) => {
  return getEventRevenue(event, participantField) * ((100 - Number(platformFeePercent || 5)) / 100);
};

const asNumberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatAverageRating = (value) => {
  const number = asNumberOrNull(value);
  return number === null ? "N/A" : number.toFixed(1);
};


const METRIC_ICONS = {
  events: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M4 10h16" />
    </>
  ),
  participants: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  revenue: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="6" />
      <path d="M8 12h8" />
    </>
  ),
  rating: (
    <>
      <path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z" />
    </>
  )
};

function DashboardMetricIcon({ name, className }) {
  return (
    <span className={`dashboard-metric__icon ${className}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {METRIC_ICONS[name]}
      </svg>
    </span>
  );
}

const getCapacityPercent = (event) => {
  if (!event.capacity) {
    return 0;
  }

  return Math.min(100, Math.round(((event.attendeesCount || 0) / event.capacity) * 100));
};

const buildReviewItems = (events) => {
  return events
    .flatMap((event) =>
      (event.reviews || [])
        .filter((review) => review.comment)
        .map((review) => ({
          id: `${event._id}-${review._id || review.userName}`,
          eventTitle: event.title,
          userName: review.userName || "EventFinder member",
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt || event.updatedAt || event.createdAt
        }))
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const buildRatingSummary = (events) => {
  const totals = events.reduce((acc, event) => {
    const count = Number(event.eventRatingCount) || 0;
    const average = Number(event.eventRatingAverage);

    if (!count || !Number.isFinite(average)) {
      return acc;
    }

    return {
      count: acc.count + count,
      sum: acc.sum + average * count
    };
  }, { count: 0, sum: 0 });

  return {
    total: totals.count,
    average: totals.count ? Math.round((totals.sum / totals.count) * 10) / 10 : null
  };
};



function Dashboard() {
  const { token, user, updateUser } = useAuthContext();
  const [events, setEvents] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [hostProfile, setHostProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarInputRef = useRef(null);
  // const [visibleUpcomingCount, setVisibleUpcomingCount] = useState(4);
  // const [visiblePastCount, setVisiblePastCount] = useState(4);

  const handleCancelEvent = async(event) => {
  const confirmed = window.confirm(`Cancel "${event.title}"? All registrations will also be cancelled.`);

  if (!confirmed) {
    return;
  }

  try {
    setCancellingId(event._id);
    setError(null);

    await updateEvent (
      event._id,
      { status: "Cancelled" },
      token
    );

    setEvents((currentEvents) =>
      currentEvents.filter(item => item._id !== event._id)
    );
  } catch (err) {
    setError(err.message || "Failed to cancel event");
  } finally {
    setCancellingId(null);
  }
};

  const handleAvatarUpload = async (profilePicture) => {
    const data = await updateProfileAvatar(token, profilePicture);
    const updatedUser = data.user;

    setHostProfile((currentProfile) => ({
      ...(currentProfile || {}),
      username: updatedUser.username || currentProfile?.username || user?.username,
      email: updatedUser.email || currentProfile?.email || user?.email,
      profilePicture: updatedUser.profilePicture,
      initials: updatedUser.initials || currentProfile?.initials
    }));
    updateUser({ profilePicture: updatedUser.profilePicture });
    setAvatarMenuOpen(false);
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationMessage = validateAvatarFile(file);
    if (validationMessage) {
      setAvatarError(validationMessage);
      return;
    }

    try {
      setAvatarSaving(true);
      setAvatarError("");
      const profilePicture = await readFileAsDataUrl(file);
      await handleAvatarUpload(profilePicture);
    } catch (err) {
      setAvatarError(err.message || "Failed to update profile picture.");
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setAvatarSaving(true);
      setAvatarError("");
      await handleAvatarUpload(null);
    } catch (err) {
      setAvatarError(err.message || "Failed to remove profile picture.");
    } finally {
      setAvatarSaving(false);
    }
  };

  const openAvatarFilePicker = () => {
    if (!avatarSaving) {
      avatarInputRef.current?.click();
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchHostDashboardEvents(token);
        setEvents(Array.isArray(data) ? data : data.events || []);
        setDashboardStats(Array.isArray(data) ? null : data.stats || null);
        setHostProfile(Array.isArray(data) ? null : data.host || null);
      } catch (err) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [token]);

  const dashboardData = useMemo(() => {
    const now = new Date();
    const plannedEvents = events.filter((event) => event.status === "Planned");
    const pastEvents = events.filter((event) => {
      const eventDate = getEventDate(event);
      return event.status === "Happened" || (!Number.isNaN(eventDate.getTime()) && eventDate <= now);
    });
    const upcomingEvents = plannedEvents
      .filter((event) => {
        const eventDate = getEventDate(event);
        return !Number.isNaN(eventDate.getTime()) && eventDate > now;
      })
      .sort((a, b) => getEventDate(a) - getEventDate(b));
    const reviews = buildReviewItems(events);
    const ratingSummary = buildRatingSummary(events);
    const totalAttendees = events.reduce((sum, event) => sum + (Number(event.attendeesCount) || 0), 0);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const previousMonthsRevenue = pastEvents.reduce((sum, event) => {
      const eventDate = getEventDate(event);

      if (Number.isNaN(eventDate.getTime()) || eventDate >= currentMonthStart) {
        return sum;
      }

      return sum + getEventRevenue(event);
    }, 0);
    const currentMonthPastRevenue = pastEvents.reduce((sum, event) => {
      const eventDate = getEventDate(event);

      if (
        Number.isNaN(eventDate.getTime()) ||
        eventDate < currentMonthStart ||
        eventDate >= nextMonthStart
      ) {
        return sum;
      }

      return sum + getEventRevenue(event);
    }, 0);
    const allTimeBookedRevenue = events.reduce(
      (sum, event) => sum + getEventRevenue(event, "attendeesCount"),
      0
    );
    const backendRatingCount = asNumberOrNull(dashboardStats?.ratingCount);
    const platformFeePercent = asNumberOrNull(dashboardStats?.hostPlatformFeePercent) ?? 5;

    return {
      plannedEvents,
      pastEvents,
      upcomingEvents,
      reviews,
      ratingCount: backendRatingCount ?? ratingSummary.total,
      totalAttendees: asNumberOrNull(dashboardStats?.registeredParticipants) ?? totalAttendees,
      attendedParticipants: asNumberOrNull(dashboardStats?.attendedParticipants),
      previousMonthsRevenue: asNumberOrNull(dashboardStats?.previousMonthsRevenue) ?? previousMonthsRevenue * ((100 - platformFeePercent) / 100),
      currentMonthPastRevenue: asNumberOrNull(dashboardStats?.currentMonthPastRevenue) ?? currentMonthPastRevenue * ((100 - platformFeePercent) / 100),
      allTimeBookedRevenue: asNumberOrNull(dashboardStats?.allTimeBookedRevenue) ?? allTimeBookedRevenue * ((100 - platformFeePercent) / 100),
      hostPlatformFeePercent: platformFeePercent,
      previousMonthsPlatformFee: asNumberOrNull(dashboardStats?.previousMonthsPlatformFee) ?? previousMonthsRevenue * (platformFeePercent / 100),
      currentMonthPlatformFee: asNumberOrNull(dashboardStats?.currentMonthPlatformFee) ?? currentMonthPastRevenue * (platformFeePercent / 100),
      allTimeBookedPlatformFee: asNumberOrNull(dashboardStats?.allTimeBookedPlatformFee) ?? allTimeBookedRevenue * (platformFeePercent / 100),
      averageRating: dashboardStats?.averageRating ?? ratingSummary.average
    };
  }, [dashboardStats, events]);

  const {
    averageRating,
    attendedParticipants,
    pastEvents,
    plannedEvents,
    ratingCount,
    reviews,
    totalAttendees,
    previousMonthsRevenue,
    currentMonthPastRevenue,
    allTimeBookedRevenue,
    hostPlatformFeePercent,
    previousMonthsPlatformFee,
    currentMonthPlatformFee,
    allTimeBookedPlatformFee,
    upcomingEvents
  } = dashboardData;
  // const visibleUpcomingEvents = upcomingEvents.slice(0, visibleUpcomingCount);
  // const visiblePastEvents = pastEvents.slice(0, visiblePastCount);
  // const canShowMoreUpcoming = visibleUpcomingCount < upcomingEvents.length;
  // const canShowMorePast = visiblePastCount < pastEvents.length;
  const displayHost = hostProfile || user || {};
  const hostName = displayHost.username || user?.username || "Host";
  const hostInitial = displayHost.initials || getFirstWordInitial(hostName);

  return (
    <div className="dashboard-page">
      <Navbar />
      <main className="dashboard">
        <section className="dashboard__header" aria-labelledby="dashboard-title">
          <div className="dashboard-host">
            <div className="dashboard-host__avatar-panel">
              <button
                type="button"
                className="dashboard-host__avatar"
                onClick={() => setAvatarMenuOpen((open) => !open)}
                disabled={avatarSaving}
                aria-haspopup="menu"
                aria-expanded={avatarMenuOpen}
                aria-label="Change host profile picture"
              >
                {displayHost.profilePicture ? (
                  <img src={displayHost.profilePicture} alt="" />
                ) : (
                  <span>{hostInitial}</span>
                )}
                {avatarSaving && <span className="dashboard-host__avatar-spinner" aria-hidden="true" />}
              </button>

              <input
                ref={avatarInputRef}
                className="dashboard-host__avatar-input"
                type="file"
                accept={ACCEPTED_AVATAR_INPUT_TYPES}
                onChange={handleAvatarChange}
                disabled={avatarSaving}
              />

              {avatarMenuOpen && (
                <div className="dashboard-host__avatar-menu" role="menu">
                  <button
                    type="button"
                    className="dashboard-host__avatar-menu-item"
                    onClick={openAvatarFilePicker}
                    disabled={avatarSaving}
                    role="menuitem"
                  >
                    {displayHost.profilePicture ? "Change photo" : "Upload photo"}
                  </button>

                  {displayHost.profilePicture && (
                    <button
                      type="button"
                      className="dashboard-host__avatar-menu-item dashboard-host__avatar-menu-item--danger"
                      onClick={handleRemoveAvatar}
                      disabled={avatarSaving}
                      role="menuitem"
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              )}

              {avatarError && (
                <p className="dashboard-host__avatar-error" role="alert">
                  {avatarError}
                </p>
              )}
            </div>
            <div>
              <h1 id="dashboard-title">
                {hostName ? `${hostName}'s events` : "Manage your events"}
              </h1>
              <p>Track capacity, revenue, and student feedback from one EventFinder workspace.</p>
            </div>
          </div>
          <Link to="/create-event" className="dashboard__primary-action">
            <span aria-hidden="true">+</span>
            Create Event
          </Link>
        </section>

        {error && <section className="dashboard__notice dashboard__notice--error">{error}</section>}

        <section className="dashboard__metrics" aria-label="Host metrics">
          <article className="dashboard-metric">
            <DashboardMetricIcon name="events" className="dashboard-metric__icon--violet" />
            <div className="dashboard-metric__copy">
              <strong>{events.length}</strong>
              <span>Total Events</span>
              <small>{plannedEvents.length} planned</small>
            </div>
          </article>
          <article className="dashboard-metric">
            <DashboardMetricIcon name="participants" className="dashboard-metric__icon--blue" />
            <div className="dashboard-metric__copy">
              <strong>{totalAttendees.toLocaleString("en-GB")}</strong>
              <span>Total Participants</span>
              <small>
                {attendedParticipants === null
                  ? `${pastEvents.length} completed events`
                  : `${attendedParticipants.toLocaleString("en-GB")} attended`}
              </small>
            </div>
          </article>
          <article className="dashboard-metric">
            <DashboardMetricIcon name="rating" className="dashboard-metric__icon--lime" />
            <div className="dashboard-metric__copy">
              <strong>{formatAverageRating(averageRating)}</strong>
              <span>Average Rating</span>
              <small>
                {ratingCount > 0
                  ? `${ratingCount} rating${ratingCount === 1 ? '' : 's'}`
                  : 'No ratings yet'}
              </small>
            </div>
          </article>
          <article className="dashboard-metric">
            <DashboardMetricIcon name="revenue" className="dashboard-metric__icon--green" />
            <div className="dashboard-metric__copy">
              <strong>{formatMoney(currentMonthPastRevenue)}</strong>
              <span>This Month Payout</span>
              <small>{formatMoney(currentMonthPlatformFee)} retained ({hostPlatformFeePercent}%)</small>
            </div>
          </article>
          <article className="dashboard-metric">
            <DashboardMetricIcon name="revenue" className="dashboard-metric__icon--green" />
            <div className="dashboard-metric__copy">
              <strong>{formatMoney(previousMonthsRevenue)}</strong>
              <span>Previous Payouts</span>
              <small>{formatMoney(previousMonthsPlatformFee)} retained ({hostPlatformFeePercent}%)</small>
            </div>
          </article>
          <article className="dashboard-metric">
            <DashboardMetricIcon name="revenue" className="dashboard-metric__icon--green" />
            <div className="dashboard-metric__copy">
              <strong>{formatMoney(allTimeBookedRevenue)}</strong>
              <span>All-Time Net</span>
              <small>{formatMoney(allTimeBookedPlatformFee)} retained ({hostPlatformFeePercent}%)</small>
            </div>
          </article>
        </section>

        <section className="dashboard__content">
          <div className="dashboard__main-column">
            <section className="dashboard-section" aria-labelledby="events-title">
              <div className="dashboard-section__heading">
                <div>
                  <p className="dashboard__eyebrow">Event Management</p>
                  <h2 id="events-title">Upcoming Events</h2>
                </div>
                <Link to="/create-event" className="dashboard-section__link">New event</Link>
              </div>

              {loading ? (
                <p className="dashboard__empty">Loading events...</p>
              ) : upcomingEvents.length === 0 ? (
                <p className="dashboard__empty">No upcoming events yet.</p>
              ) : (
                <>
                  <div className="dashboard-event-list dashboard-event-list--upcoming">
                    {upcomingEvents.map((event) => {
                      const boostIndicatorLabel = getBoostIndicatorLabel(event);

                      return (
                      <article className="dashboard-event" key={event._id}>
                        <img src={event.imageUrl} alt="" className="dashboard-event__image" />
                        <div className="dashboard-event__body">
                          <div>
                            <div className="dashboard-event__title-row">
                              <h3>{event.title}</h3>
                              {boostIndicatorLabel && (
                                <span
                                  className="dashboard-event__boost-indicator"
                                  aria-label={boostIndicatorLabel}
                                  title={boostIndicatorLabel}
                                >
                                  ⚡
                                </span>
                              )}
                            </div>
                            <p>{formatDate(event.datetime || event.date)} at {event.startTime}</p>
                          </div>
                          <div className="dashboard-event__meta">
                            <span>{formatMoney(event.price)} per participant</span>
                            <span>{event.attendeesCount || 0}/{event.capacity} attendees</span>
                          </div>
                          <div className="dashboard-event__capacity" aria-label={`${getCapacityPercent(event)}% capacity filled`}>
                            <span style={{ width: `${getCapacityPercent(event)}%` }} />
                          </div>
                        </div>
                        <div className="dashboard-event__actions">
                          {event.canPurchaseBoost !== false && (
                            <Link
                              to={`/boost-details?eventId=${encodeURIComponent(event._id)}`}
                              className="dashboard-event__boost-button"
                              aria-label={`Boost ${event.title}`}
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M5 19L19 5" />
                                <path d="M10 5h9v9" />
                              </svg>
                              Boost Event
                            </Link>
                          )}

                          {getEventDate(event) > new Date() && (
                            <Link
                              to={`/events/${event._id}/edit`}
                              className="dashboard-event__icon-button dashboard-event__icon-button--action"
                              aria-label={`Edit ${event.title}`}
                              title="Edit event"
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                              </svg>
                            </Link>
                          )}

                          <button type="button"
                                  className = "dashboard-event__icon-button dashboard-event__icon-button--cancel"
                                  onClick={() => handleCancelEvent(event)}
                                  disabled={cancellingId === event._id}
                                  aria-label ={`Cancel ${event.title}`}
                                  title="Cancel event">
                            <svg 
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="9" />
                              <path d="M9 9l6 6M15 9l-6 6" />
                            </svg>

                          </button>
                        </div>
                        
                      </article>
                      );
                    })}
                  </div>
                  {/* {canShowMoreUpcoming && (
                    <button
                      type="button"
                      className="dashboard__show-more"
                      onClick={() => setVisibleUpcomingCount((count) => count + 8)}
                    >
                      Show more
                    </button>
                  )} */}
                </>
              )}
            </section>

            <section className="dashboard-section" aria-labelledby="past-events-title">
              <div className="dashboard-section__heading">
                <div>
                  <p className="dashboard__eyebrow">Completed Events</p>
                  <h2 id="past-events-title">Past Events</h2>
                </div>
              </div>

              {loading ? (
                <p className="dashboard__empty">Loading past events...</p>
              ) : pastEvents.length === 0 ? (
                <p className="dashboard__empty">Past events will appear here after they are completed.</p>
              ) : (
                <>
                  <div className="dashboard-event-list">
                    {pastEvents.map((event) => {
                      const attendedCount = event.attendedParticipantsCount || 0;
                      const unratedCount = event.unratedParticipantsCount || 0;
                      const ratingActionLabel = unratedCount > 0 ? "Rate Participants" : "Edit Ratings";

                      return (
                        <article className="dashboard-event dashboard-event--past" key={event._id}>
                          <img src={event.imageUrl} alt="" className="dashboard-event__image" />
                          <div className="dashboard-event__body">
                            <div>
                              <h3>{event.title}</h3>
                              <p>{formatDate(event.datetime || event.date)} at {event.startTime}</p>
                            </div>
                            <div className="dashboard-event__meta">
                              <span>{attendedCount} attended</span>
                              <span>{formatMoney(getHostNetRevenue(event, "attendedParticipantsCount", hostPlatformFeePercent))} payout</span>
                              <span>{hostPlatformFeePercent}% platform fee</span>
                              <span>{event.eventRatingCount || 0} event ratings</span>
                            </div>
                          </div>
                          <div className="dashboard-event__actions">
                            {attendedCount > 0 && (
                              <Link
                                to={`/rate-participant/${event._id}`}
                                className={`dashboard-event__action ${
                                  unratedCount > 0
                                    ? 'dashboard-event__action--primary'
                                    : 'dashboard-event__action--secondary'
                                }`}
                                aria-label={`${ratingActionLabel} for ${event.title}`}
                              >
                                {ratingActionLabel}
                              </Link>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {/* {canShowMorePast && (
                    <button
                      type="button"
                      className="dashboard__show-more"
                      onClick={() => setVisiblePastCount((count) => count + 8)}
                    >
                      Show more
                    </button>
                  )} */}
                </>
              )}
            </section>
          </div>

          <aside className="dashboard__side-column" aria-label="Feedback and actions">
            <Payment />
            <section className="dashboard-section" aria-labelledby="ratings-title">
              <div className="dashboard-section__heading">
                <div>
                  <p className="dashboard__eyebrow">Feedback</p>
                  <h2 id="ratings-title">Recent Ratings</h2>
                </div>
              </div>

              <div className="dashboard-reviews">
                {reviews.map((review) => (
                  <article className="dashboard-review" key={review.id}>
                    <div className="dashboard-review__topline">
                      <strong>{review.userName}</strong>
                      <span>{review.rating}/5</span>
                    </div>
                    <p className="dashboard-review__event">{review.eventTitle}</p>
                    <p className="dashboard-review__text">{review.comment}</p>
                  </article>
                ))}
                {!loading && reviews.length === 0 && (
                  <p className="dashboard__empty">Text ratings will appear after students review your events.</p>
                )}
              </div>
            </section>

          </aside>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
