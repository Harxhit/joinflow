
import Joi from "joi";

const groupIdsSchema = Joi.alternatives()
  .try(
    Joi.string().valid("all"),
    Joi.array()
      .items(
        Joi.string().guid({ version: ["uuidv4"] }).required().messages({
          "string.guid": "Each group ID must be a valid UUID",
          "any.required": "Group ID is required",
        })
      )
      .min(1)
      .unique()
      .messages({
        "array.min": "Select at least one group",
        "array.unique": "Duplicate group IDs are not allowed",
      })
  )
  .required()
  .messages({
    "alternatives.match":
      "Group IDs must be 'all' or an array of valid group IDs",
    "any.required": "Assignment target groups are required",
  });

export const createAssignmentSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(150)
    .required()
    .messages({
      "string.empty": "Assignment title is required",
      "string.min": "Assignment title must be at least 3 characters",
      "string.max": "Assignment title cannot exceed 150 characters",
      "any.required": "Assignment title is required",
    }),

  description: Joi.string()
    .trim()
    .min(5)
    .max(2000)
    .required()
    .messages({
      "string.empty": "Assignment description is required",
      "string.min": "Description must be at least 5 characters",
      "string.max": "Description cannot exceed 2000 characters",
      "any.required": "Assignment description is required",
    }),

  dueDate: Joi.date()
    .iso()
    .required()
    .messages({
      "date.base": "Please provide a valid due date",
      "date.format": "Due date must be in ISO format",
      "any.required": "Due date is required",
    }),

  oneDriveUrl: Joi.string()
    .trim()
    .uri()
    .required()
    .messages({
      "string.empty": "OneDrive URL is required",
      "string.uri": "Please provide a valid OneDrive URL",
      "any.required": "OneDrive URL is required",
    }),

  groupIds: groupIdsSchema,
});

export const assignmentIdSchema = Joi.object({
  assignmentId: Joi.string()
    .guid({ version: ["uuidv4"] })
    .required()
    .messages({
      "string.guid": "Invalid assignment ID",
      "any.required": "Assignment ID is required",
    }),
});

export const updateAssignmentSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(150)
    .messages({
      "string.empty": "Assignment title cannot be empty",
      "string.min": "Assignment title must be at least 3 characters",
      "string.max": "Assignment title cannot exceed 150 characters",
    }),

  description: Joi.string()
    .trim()
    .min(5)
    .max(2000)
    .messages({
      "string.empty": "Description cannot be empty",
      "string.min": "Description must be at least 5 characters",
      "string.max": "Description cannot exceed 2000 characters",
    }),

  dueDate: Joi.date()
    .iso()
    .messages({
      "date.base": "Please provide a valid due date",
      "date.format": "Due date must be in ISO format",
    }),

  oneDriveUrl: Joi.string()
    .trim()
    .uri()
    .messages({
      "string.empty": "OneDrive URL cannot be empty",
      "string.uri": "Please provide a valid OneDrive URL",
    }),

  groupIds: groupIdsSchema.optional(),
})
  .min(1)
  .required()
  .messages({
    "object.min": "At least one field must be provided for update",
  });
