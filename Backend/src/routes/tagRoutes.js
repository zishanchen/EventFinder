import express from 'express';
import { getTags } from '../controllers/tagController.js';

const router = express.Router();

router.get('/', getTags);

export default router;
