import { getEnvFilePath } from './env-path.config';

describe('getEnvFilePath', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('returns development env file by default', () => {
    delete process.env.NODE_ENV;

    expect(getEnvFilePath()).toBe('.env.development');
  });

  it('returns stage env file for stage environment', () => {
    process.env.NODE_ENV = 'stage';

    expect(getEnvFilePath()).toBe('.env.stage');
  });

  it('returns production env file for production environment', () => {
    process.env.NODE_ENV = 'production';

    expect(getEnvFilePath()).toBe('.env.production');
  });
});
