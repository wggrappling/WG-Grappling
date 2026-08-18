import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required().messages({
    'string.uri': 'DATABASE_URL deve ser uma URL válida.',
    'any.required': 'A variável de ambiente DATABASE_URL é obrigatória.',
  }),
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET deve ter no mínimo 32 caracteres.',
    'any.required': 'A variável de ambiente JWT_SECRET é obrigatória.',
  }),
  PORT: Joi.number().port().required().messages({
    'number.base': 'PORT deve ser um número válido.',
    'number.port': 'PORT deve ser uma porta válida.',
    'any.required': 'A variável de ambiente PORT é obrigatória.',
  }),
  REDIS_URL: Joi.string().uri().optional().messages({
    'string.uri': 'REDIS_URL deve ser uma URL válida quando configurada.',
  }),
  NODE_ENV: Joi.string().valid('development', 'production', 'test', 'local').required(),
  DOCUMENT_STORAGE_PATH: Joi.string().min(1).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.string().default('./storage/documents'),
  }),
  DOCUMENT_MAX_SIZE_MB: Joi.number().positive().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.number().default(10),
  }),
  FINANCIAL_CYCLE_ENABLED: Joi.boolean().truthy('true').falsy('false').when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.boolean().truthy('true').falsy('false').default(false),
  }),
  FINANCIAL_CYCLE_CRON: Joi.string().min(1).default('0 5 * * *'),
  FINANCIAL_CYCLE_TIME_ZONE: Joi.string().min(1).default('America/Sao_Paulo'),
  CORS_ORIGIN: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().trim().disallow('*').required(),
    otherwise: Joi.optional(),
  }),
}).unknown(true).required();
