export type AppEnv = 'development' | 'stage' | 'production';

export function getEnvFilePath(): string {
  const env = process.env.NODE_ENV as AppEnv | undefined;

  switch (env) {
    case 'production':
      return '.env.production';
    case 'stage':
      return '.env.stage';
    case 'development':
    default:
      return '.env.development';
  }
}
