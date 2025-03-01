import express from 'express';
import { 
  createCalendarSlot, 
} from '../controllers/vapiTools.js';
import { validateScheduleCalendarSlot ,} from '../middleware/validateVapiTools.js';
import { vapiApiKeyMiddleware } from '../middleware/vapiToolAuth.js';

const router = express.Router();

router.post('/schedule-calendar-slot', vapiApiKeyMiddleware, validateScheduleCalendarSlot, createCalendarSlot);


export default router;
