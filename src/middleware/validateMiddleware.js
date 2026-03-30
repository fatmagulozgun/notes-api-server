const validate = (schema, source = 'body') => (req, _res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    error.statusCode = 400;
    error.message = error.details.map((item) => item.message).join(', ');
    return next(error);
  }

  req[source] = value;
  return next();
};

export default validate;
