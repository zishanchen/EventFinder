import Boost from '../models/Boost.js';

// GET /api/boosts — get all active boosts
const getBoosts = async (req, res) => {
    try {
        const boosts = await Boost.find({ active: true, deletedAt: null }).sort({ priceCents: 1, length: 1 });
        res.json(boosts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/boosts/:id — get single boost
const getBoostById = async (req, res) => {
    try {
        const boost = await Boost.findOne({
            _id: req.params.id,
            active: true,
            deletedAt: null
        });
        if (!boost) return res.status(404).json({ message: 'Boost not found' });
        res.json(boost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export { getBoosts, getBoostById };
