const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  next();
};

const schemas = {
  login: Joi.object({
    // For student
    rollNo: Joi.string(),
    // For teacher
    email: Joi.string().email(),
    password: Joi.string().required()
  }).xor('rollNo', 'email'), // Must have either rollNo OR email

  adminLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  studentCreate: Joi.object({
    name: Joi.string().required(),
    rollNo: Joi.string().required(),
    email: Joi.string().email(),
    year: Joi.number().integer().min(1),
    classSectionId: Joi.string()
  }),

  teacherCreate: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required()
  }),

  classSectionCreate: Joi.object({
    name: Joi.string().required(),
    year: Joi.number().integer(),
    description: Joi.string(),
    homeTeacherId: Joi.string()
  }),

  createClass: Joi.object({
    className: Joi.string().required(),
    subjectCode: Joi.string().required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  })
};

module.exports = { validate, schemas };

