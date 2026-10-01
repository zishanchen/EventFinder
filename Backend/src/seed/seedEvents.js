import Event from '../models/Event.js';
import geocodeAddress from '../utils/geocodeAddress.js';

const PRIMARY_PARTICIPANT_EVENT_TITLES = new Set([
  'Tech Meetup: AI & Machine Learning',
  'Startup Networking Night',
  'Study Workshop: Data Science',
  'Board Game Night at Garching',
  'Career Breakfast: Consulting Cases',
  'Language Exchange: German Basics',
  'Isar Running Club: Beginner 5K'
]);

const PRIMARY_HOST_EVENT_TITLES = new Set([
  'Tech Meetup: AI & Machine Learning',
  'Startup Networking Night',
  'Study Workshop: Data Science',
  'Board Game Night at Garching',
  'Career Breakfast: Consulting Cases',
  'UX Portfolio Review',
  'Language Exchange: German Basics',
  'Isar Running Club: Beginner 5K',
  'Coffee & Code Morning',
  'Student Founder Office Hours',
  'AI Ethics Reading Circle',
  'Data Viz Mini Hackathon'
]);

const DEFAULT_EVENT_IMAGE_PATH = '/Tech-Meetup.png';

const EVENT_IMAGE_BY_TITLE = {
  'Tech Meetup: AI & Machine Learning': '/Tech-Meetup.png',
  'Startup Networking Night': '/startup-networking-night.png',
  'Study Workshop: Data Science': '/data-science-workshop.png',
  'Board Game Night at Garching': '/game-night.png',
  'Career Breakfast: Consulting Cases': '/career-breakfast-consulting.png',
  'Women in Tech Picnic': '/picnic.png',
  'UX Portfolio Review': '/ux-portfolio-review.png',
  'Language Exchange: German Basics': '/language-exchange.png',
  'FinTech Product Sprint': '/fintech-product-sprint.png',
  'Isar Running Club: Beginner 5K': '/running.png',
  'Music Jam: Open Stage': '/open-stage-music.png',
  'Sustainability Volunteer Day': '/sustainability-volunteer-day.png',
  'Exam Calm Yoga Session': '/yoga.png',
  'Culture Walk: Munich Courtyards': '/culture-walk-munich-courtyards.png',
  'Hack Night: Campus Tools': '/hack-night.png',
  'Coffee & Code Morning': '/coffee-code-morning.png',
  'Campus Photography Walk': '/campus-photography-walk.png',
  'Student Founder Office Hours': '/student-founder-office-hours.png',
  'Rooftop Board Games Social': '/rooftop-board-games-social.png',
  'Public Speaking Lab': '/public-speaking-lab.png',
  'Plant-Based Cooking Meetup': '/plant-based-cooking-meetup.png',
  'AI Ethics Reading Circle': '/ai-ethics-reading-circle.png',
  'Night Run Around Olympiapark': '/night-run-olympiapark.png',
  'Indie Music Listening Club': '/indie-music-listening-club.png',
  'Volunteer Onboarding: Food Rescue': '/volunteer-food-rescue.png',
  'Product Design Jam': '/product-design-jam.png',
  'International Potluck Stories': '/international-potluck-stories.png',
  'Chess Ladder Kickoff': '/chess-ladder-kickoff.png',
  'Green Campus Ideas Forum': '/green-campus-ideas-forum.png',
  'Data Viz Mini Hackathon': '/data-viz-mini-hackathon.png',
  'Mindful Study Sprint': '/mindful-study-sprint.png',
  'Munich Museum Sketch Evening': '/munich-museum-sketch-evening.png',
  'Career Q&A: Working Student Roles': '/career-qa-working-student-roles.png',
  'Salsa Basics Social': '/salsa-basics-social.png',
  'Startup Pitch Rehearsal': '/startup-pitch-rehearsal.png'
};

const clampDayToMonth = (year, month, preferredDay) => {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(preferredDay, lastDayOfMonth);
};

const startOfLocalDay = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const dateFromMonthAnchor = (baseDate, monthOffset, preferredDay) => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth() + monthOffset;
  return new Date(year, month, clampDayToMonth(year, month, preferredDay));
};

const dateFromDayOffset = (baseDate, dayOffset) => {
  const date = startOfLocalDay(baseDate);
  date.setDate(date.getDate() + dayOffset);
  return date;
};

const combineDateAndTime = (date, time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
};

const resolveSeedDate = (baseDate, seed) => {
  if (seed.monthAnchor) {
    return dateFromMonthAnchor(baseDate, seed.monthAnchor.monthOffset, seed.monthAnchor.day);
  }

  return dateFromDayOffset(baseDate, seed.daysFromNow);
};

const EVENT_SEEDS = [
  {
    title: 'Tech Meetup: AI & Machine Learning',
    description: 'An evening for students to explore applied AI, compare project ideas, and meet researchers and founders working with machine learning in Munich.',
    tags: ['Tech', 'Free Food', 'Networking', 'Workshop'],
    category: 'Tech',
    monthAnchor: { monthOffset: -1, day: 12 },
    startTime: '18:00',
    endTime: '21:00',
    locationName: 'TUM Main Campus, Building N5, Room 101',
    address: 'Arcisstrasse 21, 80333 Munich, Germany',
    price: 15,
    capacity: 60,
    registrationCount: 45,
    status: 'Happened'
  },
  {
    title: 'Startup Networking Night',
    description: 'A low-pressure networking night connecting students, early-stage founders, and startup teams looking for collaborators.',
    tags: ['Networking', 'Entrepreneurship', 'Career'],
    category: 'Networking',
    monthAnchor: { monthOffset: -1, day: 18 },
    startTime: '19:00',
    endTime: '22:00',
    locationName: 'UnternehmerTUM MakerSpace Lounge',
    address: 'Lichtenbergstrasse 6, 85748 Garching, Germany',
    price: 0,
    capacity: 80,
    registrationCount: 67,
    status: 'Happened'
  },
  {
    title: 'Study Workshop: Data Science',
    description: 'Hands-on study session for Python, pandas, visualization, and exam-style data science questions.',
    tags: ['Study Group', 'Workshop', 'Tech'],
    category: 'Workshop',
    monthAnchor: { monthOffset: -1, day: 20 },
    startTime: '17:30',
    endTime: '20:00',
    locationName: 'HM Campus Pasing, Study Room 2',
    address: 'Am Stadtpark 20, 81243 Munich, Germany',
    price: 5,
    capacity: 30,
    registrationCount: 28,
    status: 'Happened'
  },
  {
    title: 'Board Game Night at Garching',
    description: 'Casual board game night with strategy games, quick party games, and beginner tables for anyone joining alone.',
    tags: ['Games', 'Culture', 'Free Food'],
    category: 'Social',
    daysFromNow: -5,
    startTime: '18:30',
    endTime: '22:30',
    locationName: 'TUM Garching Student Hub',
    address: 'Boltzmannstrasse 15, 85748 Garching, Germany',
    price: 0,
    capacity: 48,
    registrationCount: 43,
    status: 'Happened'
  },
  {
    title: 'Career Breakfast: Consulting Cases',
    description: 'Morning practice for consulting case interviews with peer feedback, coffee, and short mentor rounds.',
    tags: ['Career', 'Networking', 'Workshop'],
    category: 'Career',
    monthAnchor: { monthOffset: -1, day: 9 },
    startTime: '08:30',
    endTime: '10:30',
    locationName: 'Munich Urban Colab',
    address: 'Freddie-Mercury-Strasse 5, 80797 Munich, Germany',
    price: 8,
    capacity: 36,
    registrationCount: 31,
    status: 'Happened'
  },
  {
    title: 'Women in Tech Picnic',
    description: 'Outdoor meetup for women and allies in tech with lightning talks, snacks, and small mentoring circles.',
    tags: ['Tech', 'Outdoor', 'Networking', 'Free Food'],
    category: 'Networking',
    daysFromNow: 16,
    startTime: '15:00',
    endTime: '18:00',
    locationName: 'Westpark, Rosengarten Lawn',
    address: 'Westendstrasse 305, 81377 Munich, Germany',
    price: 0,
    capacity: 70,
    registrationCount: 52,
    status: 'Planned'
  },
  {
    title: 'UX Portfolio Review',
    description: 'Small-group critique session for student portfolios, case studies, and internship applications.',
    tags: ['Arts', 'Career', 'Workshop'],
    category: 'Workshop',
    daysFromNow: 2,
    startTime: '17:00',
    endTime: '19:30',
    locationName: 'Design Campus Pasing',
    address: 'Am Stadtpark 20, 81243 Munich, Germany',
    price: 6,
    capacity: 24,
    registrationCount: 18,
    status: 'Planned'
  },
  {
    title: 'Language Exchange: German Basics',
    description: 'Beginner-friendly language exchange for international students practicing German in everyday campus situations.',
    tags: ['Language Exchange', 'Culture', 'Networking'],
    category: 'Culture',
    daysFromNow: 14,
    startTime: '18:00',
    endTime: '20:00',
    locationName: 'Kulturzentrum Trudering, Seminar Room',
    address: 'Wasserburger Landstrasse 32, 81825 Munich, Germany',
    price: 0,
    capacity: 50,
    registrationCount: 34,
    status: 'Planned'
  },
  {
    title: 'FinTech Product Sprint',
    description: 'A weekend sprint where student teams sketch, prototype, and pitch FinTech ideas with mentor feedback.',
    tags: ['Tech', 'Entrepreneurship', 'Workshop'],
    category: 'Tech',
    daysFromNow: 23,
    startTime: '10:00',
    endTime: '18:00',
    locationName: 'Campus Martinsried Innovation Room',
    address: 'Grosshaderner Strasse 9, 82152 Planegg, Germany',
    price: 12,
    capacity: 40,
    registrationCount: 26,
    status: 'Planned'
  },
  {
    title: 'Isar Running Club: Beginner 5K',
    description: 'Relaxed beginner run along the Isar with warm-up guidance and a coffee stop after the route.',
    tags: ['Sports', 'Outdoor', 'Wellness'],
    category: 'Sports',
    daysFromNow: 34,
    startTime: '07:30',
    endTime: '09:00',
    locationName: 'Deutsches Museum Bridge',
    address: 'Museumsinsel 1, 80538 Munich, Germany',
    price: 0,
    capacity: 35,
    registrationCount: 21,
    status: 'Planned'
  },
  {
    title: 'Music Jam: Open Stage',
    description: 'Open-stage jam for student musicians, singers, and listeners. Bring an instrument or just join the audience.',
    tags: ['Music', 'Arts', 'Culture'],
    category: 'Music',
    daysFromNow: 28,
    startTime: '19:30',
    endTime: '23:00',
    locationName: 'Kulturzentrum Giesing',
    address: 'Giesinger Bahnhofplatz 1, 81539 Munich, Germany',
    price: 4,
    capacity: 90,
    registrationCount: 63,
    status: 'Planned'
  },
  {
    title: 'Sustainability Volunteer Day',
    description: 'A hands-on volunteer afternoon supporting local sustainability projects with small student teams.',
    tags: ['Volunteering', 'Outdoor', 'Culture'],
    category: 'Volunteering',
    daysFromNow: 33,
    startTime: '13:00',
    endTime: '17:00',
    locationName: 'Oekologisches Bildungszentrum Munich',
    address: 'Englschalkinger Strasse 166, 81927 Munich, Germany',
    price: 0,
    capacity: 45,
    registrationCount: 29,
    status: 'Planned'
  },
  {
    title: 'Exam Calm Yoga Session',
    description: 'Gentle yoga and breathing session for students in exam season. Mats are available on-site.',
    tags: ['Wellness', 'Sports'],
    category: 'Wellness',
    daysFromNow: 37,
    startTime: '18:00',
    endTime: '19:15',
    locationName: 'ZHS Campus Studio 2',
    address: 'Connollystrasse 32, 80809 Munich, Germany',
    price: 3,
    capacity: 28,
    registrationCount: 24,
    status: 'Planned'
  },
  {
    title: 'Culture Walk: Munich Courtyards',
    description: 'Guided student walk through hidden courtyards, small galleries, and cultural spots near the city center.',
    tags: ['Culture', 'Outdoor', 'Arts'],
    category: 'Culture',
    daysFromNow: 61,
    startTime: '16:30',
    endTime: '19:00',
    locationName: 'Nymphenburg Palace Main Gate',
    address: 'Schloss Nymphenburg 1, 80638 Munich, Germany',
    price: 2,
    capacity: 32,
    registrationCount: 19,
    status: 'Planned'
  },
  {
    title: 'Hack Night: Campus Tools',
    description: 'Evening hack session for small tools that make student life easier, from timetable helpers to event bots.',
    tags: ['Tech', 'Games', 'Workshop'],
    category: 'Tech',
    daysFromNow: 18,
    startTime: '18:00',
    endTime: '23:00',
    locationName: 'TUM Informatics Lab',
    address: 'Boltzmannstrasse 3, 85748 Garching, Germany',
    price: 0,
    capacity: 55,
    registrationCount: 37,
    status: 'Planned'
  },
  {
    title: 'Coffee & Code Morning',
    description: 'Quiet morning coding session with coffee, peer debugging, and small tables for project work before lectures.',
    tags: ['Tech', 'Study Group', 'Free Food'],
    category: 'Tech',
    daysFromNow: 7,
    startTime: '09:00',
    endTime: '11:00',
    locationName: 'Munich Public Library Sendling',
    address: 'Albert-Rosshaupter-Strasse 8, 81369 Munich, Germany',
    price: 0,
    capacity: 42,
    registrationCount: 30,
    status: 'Planned'
  },
  {
    title: 'Campus Photography Walk',
    description: 'Beginner-friendly photo walk around campus architecture, portraits, and small editing tips after the route.',
    tags: ['Arts', 'Outdoor', 'Culture'],
    category: 'Arts',
    daysFromNow: 11,
    startTime: '16:00',
    endTime: '18:30',
    locationName: 'Botanical Garden Munich-Nymphenburg',
    address: 'Menzinger Strasse 65, 80638 Munich, Germany',
    price: 3,
    capacity: 25,
    registrationCount: 17,
    status: 'Planned'
  },
  {
    title: 'Student Founder Office Hours',
    description: 'Short mentor sessions for students testing startup ideas, finding co-founders, or preparing first customer interviews.',
    tags: ['Entrepreneurship', 'Career', 'Networking'],
    category: 'Entrepreneurship',
    daysFromNow: 18,
    startTime: '14:00',
    endTime: '17:00',
    locationName: 'Freiham Startup Corner',
    address: 'Hans-Stuetzle-Strasse 20, 81249 Munich, Germany',
    price: 0,
    capacity: 30,
    registrationCount: 22,
    status: 'Planned'
  },
  {
    title: 'Rooftop Board Games Social',
    description: 'Small-group board games, snacks, and quick team rounds for students who want an easy social evening.',
    tags: ['Games', 'Free Food', 'Culture'],
    category: 'Social',
    daysFromNow: 21,
    startTime: '19:00',
    endTime: '22:00',
    locationName: 'Kreativquartier Community Loft',
    address: 'Dachauer Strasse 112d, 80636 Munich, Germany',
    price: 4,
    capacity: 44,
    registrationCount: 33,
    status: 'Planned'
  },
  {
    title: 'Public Speaking Lab',
    description: 'Practice short talks in a supportive group and get actionable feedback on structure, voice, and confidence.',
    tags: ['Career', 'Workshop', 'Study Group'],
    category: 'Workshop',
    daysFromNow: 25,
    startTime: '18:00',
    endTime: '20:00',
    locationName: 'Kultur-Etage Messestadt',
    address: 'Erika-Cremer-Strasse 8, 81829 Munich, Germany',
    price: 5,
    capacity: 26,
    registrationCount: 20,
    status: 'Planned'
  },
  {
    title: 'Plant-Based Cooking Meetup',
    description: 'Shared cooking evening with easy plant-based recipes, affordable shopping tips, and dinner together.',
    tags: ['Wellness', 'Culture', 'Free Food'],
    category: 'Wellness',
    daysFromNow: 31,
    startTime: '17:30',
    endTime: '21:00',
    locationName: 'Feierwerk Community Kitchen',
    address: 'Hansastrasse 39, 81373 Munich, Germany',
    price: 8,
    capacity: 28,
    registrationCount: 24,
    status: 'Planned'
  },
  {
    title: 'AI Ethics Reading Circle',
    description: 'Discussion group on practical AI ethics cases with short readings, guided questions, and time for debate.',
    tags: ['Tech', 'Study Group', 'Culture'],
    category: 'Tech',
    daysFromNow: 35,
    startTime: '18:30',
    endTime: '20:30',
    locationName: 'Stadtbibliothek Riem, Reading Room',
    address: 'Elisabeth-Castonier-Platz 19, 81829 Munich, Germany',
    price: 0,
    capacity: 36,
    registrationCount: 27,
    status: 'Planned'
  },
  {
    title: 'Night Run Around Olympiapark',
    description: 'Social evening run around Olympiapark with beginner and steady pace groups plus stretching at the end.',
    tags: ['Sports', 'Outdoor', 'Wellness'],
    category: 'Sports',
    daysFromNow: 40,
    startTime: '20:00',
    endTime: '21:30',
    locationName: 'Olympiapark, Coubertinplatz',
    address: 'Spiridon-Louis-Ring 21, 80809 Munich, Germany',
    price: 0,
    capacity: 50,
    registrationCount: 38,
    status: 'Planned'
  },
  {
    title: 'Indie Music Listening Club',
    description: 'Bring a favorite track, discover student playlists, and discuss production, lyrics, and live shows.',
    tags: ['Music', 'Arts', 'Culture'],
    category: 'Music',
    daysFromNow: 44,
    startTime: '19:00',
    endTime: '21:30',
    locationName: 'Import Export Munich',
    address: 'Schwere-Reiter-Strasse 2h, 80636 Munich, Germany',
    price: 4,
    capacity: 55,
    registrationCount: 41,
    status: 'Planned'
  },
  {
    title: 'Volunteer Onboarding: Food Rescue',
    description: 'Intro session for students who want to support local food rescue shifts and reduce campus food waste.',
    tags: ['Volunteering', 'Free Food', 'Outdoor'],
    category: 'Volunteering',
    daysFromNow: 49,
    startTime: '15:00',
    endTime: '17:30',
    locationName: 'Stadtteilzentrum Hasenbergl',
    address: 'Wintersteinstrasse 35, 80933 Munich, Germany',
    price: 0,
    capacity: 40,
    registrationCount: 31,
    status: 'Planned'
  },
  {
    title: 'Product Design Jam',
    description: 'Fast-paced design session where small teams sketch, test, and improve an event discovery flow.',
    tags: ['Workshop', 'Arts', 'Tech'],
    category: 'Workshop',
    daysFromNow: 53,
    startTime: '13:00',
    endTime: '17:30',
    locationName: 'Werksviertel-Mitte Design Studio',
    address: 'Atelierstrasse 1, 81671 Munich, Germany',
    price: 10,
    capacity: 32,
    registrationCount: 25,
    status: 'Planned'
  },
  {
    title: 'International Potluck Stories',
    description: 'A potluck evening for sharing food, language practice, and short stories about studying in Munich.',
    tags: ['Language Exchange', 'Culture', 'Free Food'],
    category: 'Culture',
    daysFromNow: 58,
    startTime: '18:00',
    endTime: '21:00',
    locationName: 'Studentenstadt Freimann Community Room',
    address: 'Christoph-Probst-Strasse 10, 80805 Munich, Germany',
    price: 0,
    capacity: 60,
    registrationCount: 48,
    status: 'Planned'
  },
  {
    title: 'Chess Ladder Kickoff',
    description: 'Casual chess ladder for beginners and regular players, with quick pairings and optional puzzle tables.',
    tags: ['Games', 'Study Group'],
    category: 'Games',
    daysFromNow: 63,
    startTime: '18:30',
    endTime: '21:30',
    locationName: 'Kulturhaus Milbertshofen',
    address: 'Curt-Mezger-Platz 1, 80809 Munich, Germany',
    price: 2,
    capacity: 36,
    registrationCount: 29,
    status: 'Planned'
  },
  {
    title: 'Green Campus Ideas Forum',
    description: 'Open forum for sustainability ideas with small working groups and a chance to pitch feasible campus changes.',
    tags: ['Outdoor', 'Volunteering', 'Entrepreneurship'],
    category: 'Volunteering',
    daysFromNow: 67,
    startTime: '16:00',
    endTime: '18:30',
    locationName: 'Riemer Park, Lakeside Meadow',
    address: 'De-Gasperi-Bogen 8, 81829 Munich, Germany',
    price: 0,
    capacity: 45,
    registrationCount: 32,
    status: 'Planned'
  },
  {
    title: 'Data Viz Mini Hackathon',
    description: 'Mini hackathon for turning messy datasets into clear charts, dashboards, and quick presentation stories.',
    tags: ['Tech', 'Workshop', 'Career'],
    category: 'Tech',
    daysFromNow: 72,
    startTime: '10:00',
    endTime: '16:00',
    locationName: 'Garching Research Campus Lab',
    address: 'Walther-von-Dyck-Strasse 10, 85748 Garching, Germany',
    price: 7,
    capacity: 38,
    registrationCount: 28,
    status: 'Planned'
  },
  {
    title: 'Mindful Study Sprint',
    description: 'Structured study blocks with quiet focus, short breaks, and simple mindfulness exercises between sessions.',
    tags: ['Wellness', 'Study Group'],
    category: 'Wellness',
    daysFromNow: 77,
    startTime: '10:00',
    endTime: '13:00',
    locationName: 'Stadtbibliothek Neuhausen',
    address: 'Nymphenburger Strasse 171b, 80634 Munich, Germany',
    price: 0,
    capacity: 34,
    registrationCount: 26,
    status: 'Planned'
  },
  {
    title: 'Munich Museum Sketch Evening',
    description: 'Relaxed museum sketch meetup for all skill levels, followed by a short sharing round over coffee.',
    tags: ['Arts', 'Culture', 'Outdoor'],
    category: 'Arts',
    daysFromNow: 81,
    startTime: '17:00',
    endTime: '19:30',
    locationName: 'Museum Mensch und Natur',
    address: 'Schloss Nymphenburg, 80638 Munich, Germany',
    price: 6,
    capacity: 24,
    registrationCount: 18,
    status: 'Planned'
  },
  {
    title: 'Career Q&A: Working Student Roles',
    description: 'Panel and Q&A on finding working student roles, balancing hours, and writing applications that feel concrete.',
    tags: ['Career', 'Networking'],
    category: 'Career',
    daysFromNow: 86,
    startTime: '18:00',
    endTime: '20:00',
    locationName: 'Gasteig HP8 Seminar Room',
    address: 'Hans-Preissinger-Strasse 8, 81379 Munich, Germany',
    price: 0,
    capacity: 70,
    registrationCount: 56,
    status: 'Planned'
  },
  {
    title: 'Salsa Basics Social',
    description: 'Beginner salsa class with simple partner changes, music breaks, and a social dance hour afterward.',
    tags: ['Music', 'Culture', 'Sports'],
    category: 'Social',
    daysFromNow: 91,
    startTime: '19:00',
    endTime: '22:00',
    locationName: 'Shaere Neuperlach Dance Studio',
    address: 'Fritz-Schaeffer-Strasse 9, 81737 Munich, Germany',
    price: 9,
    capacity: 46,
    registrationCount: 35,
    status: 'Planned'
  },
  {
    title: 'Startup Pitch Rehearsal',
    description: 'Practice pitch night for student founders with timed rounds, feedback cards, and mentor questions.',
    tags: ['Entrepreneurship', 'Workshop', 'Networking'],
    category: 'Entrepreneurship',
    daysFromNow: 96,
    startTime: '17:30',
    endTime: '20:30',
    locationName: 'Buergerhaus Unterfoehring Pitch Room',
    address: 'Muenchner Strasse 65, 85774 Unterfoehring, Germany',
    price: 5,
    capacity: 40,
    registrationCount: 30,
    status: 'Planned'
  }
];

const buildRelativeEventSeeds = (baseDate = new Date()) => {
  const seedBaseDate = startOfLocalDay(baseDate);

  return EVENT_SEEDS.map((eventSeed) => {
    const date = resolveSeedDate(seedBaseDate, eventSeed);
    const { daysFromNow, monthAnchor, ...seed } = eventSeed;

    return {
      ...seed,
      date,
      datetime: combineDateAndTime(date, eventSeed.startTime),
      primaryParticipantRegistered: PRIMARY_PARTICIPANT_EVENT_TITLES.has(eventSeed.title)
    };
  });
};

const initialsFromName = (name) => {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
};

const seedEvents = async ({ primaryHost, secondaryHost }) => {
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const eventsToCreate = [];
  const eventSeeds = buildRelativeEventSeeds();

  for (const { tags, registrationCount, primaryParticipantRegistered, ...event } of eventSeeds) {
    const host = PRIMARY_HOST_EVENT_TITLES.has(event.title) ? primaryHost : secondaryHost;
    const coordinates = await geocodeAddress(event.address);
    const imagePath = EVENT_IMAGE_BY_TITLE[event.title] || DEFAULT_EVENT_IMAGE_PATH;

    eventsToCreate.push({
      ...event,
      location: coordinates
        ? {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          venueName: event.locationName,
          address: event.address
        }
        : undefined,
      imageUrl: imagePath,
      image: imagePath,
      name: event.title,
      descriptions: [{ description: event.description }],
      memberLimits: [{ limit: event.capacity }],
      creator: host._id,
      host: {
        name: host.username,
        initials: initialsFromName(host.username),
        verified: host.verified
      }
    });
    await delay(1000);
  }

  const events = await Event.insertMany(eventsToCreate);
  const eventsByTitle = events.reduce((acc, event) => {
    acc[event.title] = event;
    return acc;
  }, {});

  return {
    eventSeeds,
    events,
    eventsByTitle
  };

};
export { EVENT_SEEDS, PRIMARY_HOST_EVENT_TITLES, buildRelativeEventSeeds, seedEvents };
