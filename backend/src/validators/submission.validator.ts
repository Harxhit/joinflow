import Joi from "joi";

export const confirmSubmissionSchema = Joi.object({
  assignmentId: Joi.string()
    .guid({ version: ["uuidv4"] })
    .required()
    .messages({
      "string.guid": "Invalid assignment ID",
      "any.required": "Assignment ID is required",
    }),
});