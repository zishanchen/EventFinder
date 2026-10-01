const eventData = {
    id: "1",
    title: "Tech Meetup: AI & Machine Learning",
    tags: ["Tech", "Free Food", "Machine Learning", "AI", "Networking"],
    rating: 4.8,
    attendeeCount: 45,
    capacity: 60,
    spotsLeft: 15,
    price: 15,
    date: "May 12, 2026",
    time: "18:00 - 21:00",
    location: "TUM Main Campus, Building N5, Room 101",
    image: "/Tech-Meetup.png",
    description:"Join us for an exciting evening exploring the latest trends in AI and Machine Learning! This event brings together students, researchers, and industry professionals to discuss cutting-edge developments in artificial intelligence. We'll have keynote speakers from leading tech companies, interactive workshops, and plenty of networking opportunities. Whether you're a beginner or an expert, there's something for everyone. Free pizza and drinks will be provided!",
    
    host: {
        name: "Tech Society Munich",
        initials: "TS",
        rating: 4.8,
        eventsHosted: 42,
        verified: true
    },

    attendees: [
    { id: 1, name: "Sarah Miller", initials: "SM" },
    { id: 2, name: "Jonas Diaz", initials: "JD" },
    { id: 3, name: "Lina Keller", initials: "LK" },
    { id: 4, name: "Maria Rossi", initials: "MR" },
    { id: 5, name: "Emma Weber", initials: "EW" }
       ],

    
    
};

export default eventData;