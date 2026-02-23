import { registerAs } from '@nestjs/config';
import { IS3Config } from './s3.config.types';

export const s3Config = registerAs(
  's3',
  (): IS3Config => ({
    region: process.env.AWS_REGION ?? 'eu-central-1',
    bucket: process.env.AWS_S3_BUCKET ?? 'ecommerce-files-private',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'minioadmin',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'minioadmin',
    endpoint: process.env.AWS_S3_ENDPOINT ?? 'http://localhost:9000',
    forcePathStyle: (process.env.AWS_S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    cdnUrl: process.env.AWS_CLOUDFRONT_URL ?? '',
    presignExpiresInSec: parseInt(
      process.env.FILES_PRESIGN_EXPIRES_IN_SEC ?? '900',
      10,
    ),
  }),
);
