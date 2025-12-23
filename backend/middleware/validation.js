const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  next();
};

const schemas = {
  studentRegister: Joi.object({
    name: Joi.string().required(),
    rollNo: Joi.string().required(),
    password: Joi.string().min(6).required(),
    year: Joi.number().integer().min(1),
    branch: Joi.string()
  }),

  teacherRegister: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  login: Joi.object({
    // For student
    rollNo: Joi.string(),
    // For teacher
    email: Joi.string().email(),
    password: Joi.string().required()
  }).xor('rollNo', 'email'), // Must have either rollNo OR email

  createClass: Joi.object({
    className: Joi.string().required(),
    subjectCode: Joi.string().required()
  })
};

module.exports = { validate, schemas };
