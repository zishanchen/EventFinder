import Tag from '../models/Tag.js';
import { getTagColors } from '../utils/tagColors.js';

const FIXED_TAG_NAMES = [
  'Free Food',
  'Sports',
  'Networking',
  'Tech',
  'Party',
  'Study Group',
  'Workshop',
  'Career',
  'Arts',
  'Music',
  'Games',
  'Culture',
  'Outdoor',
  'Volunteering',
  'Entrepreneurship',
  'Language Exchange',
  'Wellness'
];

const seedFixedTags = async () => {
  await Tag.deleteMany();
  return Tag.insertMany(FIXED_TAG_NAMES.map((name) => ({
    name,
    active: true,
    colors: getTagColors(name)
  })));
};

export { FIXED_TAG_NAMES, seedFixedTags };
