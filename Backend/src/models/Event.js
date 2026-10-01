import mongoose from 'mongoose';

const hostSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    initials: {
      type: String,
      required: true,
      trim: true
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },
    venueName: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const eventDescriptionSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

const eventMemberLimitSchema = new mongoose.Schema(
  {
    limit: {
      type: Number
    }
  },
  { timestamps: true }
);

const eventBoostSchema = new mongoose.Schema(
  {
    eventBoostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventBoost',
      default: null
    },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'expired', 'cancelled'],
      default: null
    },
    active: { type: Boolean, default: false }
  },
  { _id: false }
);


const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    descriptions: {
      type: [eventDescriptionSchema],
      default: []
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: Date,
      required: true
    },
    datetime: {
      type: Date
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    locationName: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: locationSchema,
      default: undefined
    },
    format: {
      type: String,
      enum: ['Online', 'Onsite'],
      default: 'Onsite'
    },
    status: {
      type: String,
      enum: ['Planned', 'Happened', 'Cancelled'],
      default: 'Planned'
    },
    price: {
      type: Number,
      required: true
    },
    capacity: {
      type: Number,
      required: true
    },
    memberLimits: {
      type: [eventMemberLimitSchema],
      default: []
    },
    imageUrl: {
      type: String,
      required: true
    },
    image: {
      type: String
    },
    host: {
      type: hostSchema,
      required: true
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account'
    },
    boost: {
      type: eventBoostSchema,
      default: () => ({})
    }
  },
  { timestamps: true }
);

export default mongoose.model('Event', eventSchema);
