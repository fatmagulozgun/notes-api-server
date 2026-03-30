import Joi from 'joi';

const createNoteSchema = Joi.object({
  title: Joi.string().allow('').max(200).default(''),
  content: Joi.string().allow('').max(20000).default(''),
  tags: Joi.array().items(Joi.string().max(30)).default([]),
  color: Joi.string().max(30).default('slate'),
  pinned: Joi.boolean().default(false),
});

const updateNoteSchema = Joi.object({
  title: Joi.string().allow('').max(200),
  content: Joi.string().allow('').max(20000),
  tags: Joi.array().items(Joi.string().max(30)),
  color: Joi.string().max(30),
  pinned: Joi.boolean(),
  isDeleted: Joi.boolean(),
});

export { createNoteSchema, updateNoteSchema };
