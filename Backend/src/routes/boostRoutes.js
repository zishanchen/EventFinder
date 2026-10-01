import express from 'express';
import { getBoosts, getBoostById } from '../controllers/boostController.js';

const router = express.Router();

// Public — anyone can see available boosts
router.get('/', getBoosts);
router.get('/:id', getBoostById);

export default router;
