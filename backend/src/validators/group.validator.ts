
import Joi from "joi";

const createGroupSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      "string.empty": "Group name is required",
      "string.min": "Group name must be at least 2 characters",
      "string.max": "Group name cannot exceed 50 characters",
      "any.required": "Group name is required",
    }),
});

const addMemberSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email()
    .optional(),

  studentId: Joi.string()
    .trim()
    .min(1)
    .optional(),
})
  .or("email", "studentId")
  .messages({
    "object.missing": "Provide either an email or student ID",
  });


const groupIdParamSchema = Joi.object({
  groupId: Joi.string()
    .uuid()
    .required()
    .messages({
      "string.guid": "Invalid group ID",
      "any.required": "Group ID is required",
    }),
});


export {createGroupSchema, addMemberSchema, groupIdParamSchema}