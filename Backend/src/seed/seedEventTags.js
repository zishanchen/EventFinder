import EventTag from '../models/EventTag.js';

const seedEventTags = async ({ eventSeeds, eventsByTitle, tags }) => {
  const tagsByName = tags.reduce((acc, tag) => {
    acc[tag.name] = tag;
    return acc;
  }, {});
  const eventTagsToCreate = eventSeeds.flatMap((eventSeed) => {
    const event = eventsByTitle[eventSeed.title];
    const missingTagNames = eventSeed.tags.filter((tagName) => !tagsByName[tagName]);

    if (missingTagNames.length > 0) {
      throw new Error(`Seed event "${eventSeed.title}" uses unknown tags: ${missingTagNames.join(', ')}`);
    }

    return eventSeed.tags.map((tagName) => ({
      event: event._id,
      tag: tagsByName[tagName]._id
    }));
  });

  const eventTags = await EventTag.insertMany(eventTagsToCreate);

  return {
    eventTagCount: eventTags.length
  };
};

export { seedEventTags };
