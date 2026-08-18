import { SwaggerModule } from '@nestjs/swagger';
import { configureSwagger, logStartup } from './bootstrap-config';
import { envValidationSchema } from './config/env.validation';

describe('bootstrap configuration', () => {
  const app = {} as any;

  beforeEach(() => jest.restoreAllMocks());

  it('does not publish or announce Swagger in production', () => {
    const createDocument = jest.spyOn(SwaggerModule, 'createDocument');
    const setup = jest.spyOn(SwaggerModule, 'setup');
    const logger = { log: jest.fn() };

    expect(configureSwagger(app, 'production')).toBe(false);
    logStartup(logger, 'production', 3000);

    expect(createDocument).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith('API iniciada em modo de produção');
    expect(logger.log.mock.calls.flat().join(' ')).not.toMatch(/swagger/i);
  });

  it('keeps Swagger available and announced in development', () => {
    jest.spyOn(SwaggerModule, 'createDocument').mockReturnValue({} as any);
    const setup = jest.spyOn(SwaggerModule, 'setup').mockImplementation(() => undefined);
    const logger = { log: jest.fn() };

    expect(configureSwagger(app, 'development')).toBe(true);
    logStartup(logger, 'development', 3000);

    expect(setup).toHaveBeenCalledWith('api', app, {});
    expect(logger.log).toHaveBeenCalledWith('Swagger em: http://localhost:3000/api');
  });

  describe('environment validation', () => {
    const production = {
      DATABASE_URL: 'postgresql://user:password@database.example/wg',
      JWT_SECRET: '12345678901234567890123456789012',
      PORT: 3000,
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://app.example.com',
      DOCUMENT_STORAGE_PATH: '/data/documents',
      DOCUMENT_MAX_SIZE_MB: 10,
      FINANCIAL_CYCLE_ENABLED: false,
    };

    it('accepts an explicit safe production configuration', () => {
      expect(envValidationSchema.validate(production).error).toBeUndefined();
    });

    it.each([
      'DATABASE_URL',
      'JWT_SECRET',
      'PORT',
      'NODE_ENV',
      'CORS_ORIGIN',
      'DOCUMENT_STORAGE_PATH',
      'DOCUMENT_MAX_SIZE_MB',
      'FINANCIAL_CYCLE_ENABLED',
    ])('requires %s in production', (key) => {
      const candidate = { ...production } as Record<string, unknown>;
      delete candidate[key];
      expect(envValidationSchema.validate(candidate).error).toBeDefined();
    });

    it('rejects a wildcard CORS origin in production', () => {
      expect(envValidationSchema.validate({ ...production, CORS_ORIGIN: '*' }).error).toBeDefined();
    });

    it('preserves development defaults and local CORS configuration', () => {
      const result = envValidationSchema.validate({
        DATABASE_URL: production.DATABASE_URL,
        JWT_SECRET: production.JWT_SECRET,
        PORT: production.PORT,
        NODE_ENV: 'development',
      });
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(expect.objectContaining({
        DOCUMENT_STORAGE_PATH: './storage/documents',
        DOCUMENT_MAX_SIZE_MB: 10,
        FINANCIAL_CYCLE_ENABLED: false,
      }));
    });
  });
});
