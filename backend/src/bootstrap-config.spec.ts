import { SwaggerModule } from '@nestjs/swagger';
import { configureSwagger, logStartup } from './bootstrap-config';

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
});
