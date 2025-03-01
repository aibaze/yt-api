import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';



export const createCalendarSlot = async (req, res) => {
 const body = req.body.message
 const {tool_calls} = body
 const toolCallId = tool_calls[0].id
 const payload = tool_calls[0].function.arguments


 // Your custom logic here

  res.status(200).json(
   {   "toolCallId": body.tool_calls[0].id,
      "result": "the calendar slot has been created"
    }
  );
}
