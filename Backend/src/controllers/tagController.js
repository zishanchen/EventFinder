import Tag from '../models/Tag.js';
import { FIXED_TAG_NAMES } from '../seed/seedTags.js';
import { tagDto } from '../utils/tagColors.js';

const getTags = async (req, res) => {
  try {
    const fixedOrder = new Map(FIXED_TAG_NAMES.map((name, index) => [name.toLowerCase(), index]));
    const tags = await Tag.find({
      active: { $ne: false },
      deletedAt: null
    }).lean();

    tags.sort((first, second) => {
      const firstOrder = fixedOrder.get(first.name.toLowerCase());
      const secondOrder = fixedOrder.get(second.name.toLowerCase());

      if (firstOrder !== undefined && secondOrder !== undefined) {
        return firstOrder - secondOrder;
      }

      if (firstOrder !== undefined) return -1;
      if (secondOrder !== undefined) return 1;
      return first.name.localeCompare(second.name);
    });

    res.json(tags.map((tag) => tagDto(tag)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { getTags };
