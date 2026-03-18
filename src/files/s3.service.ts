import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type PresignArgs = {
  key: string;
  contentType: string;
  sizeBytes: number;
  expiresInSec?: number;
};

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly region: string;
  private readonly bucket: string;
  private readonly endpoint?: string;
  private readonly forcePathStyle: boolean;
  private readonly cloudfrontBaseUrl?: string;
  private readonly defaultExpiresInSec: number;

  constructor(private readonly configService: ConfigService) {
    this.region =
      this.configService.get<string>('AWS_REGION') ?? 'eu-central-1';
    this.bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET');
    this.forcePathStyle =
      (
        this.configService.get<string>('AWS_S3_FORCE_PATH_STYLE') ?? ''
      ).toLowerCase() === 'true';
    this.cloudfrontBaseUrl = this.trimTrailingSlash(
      this.configService.get<string>('AWS_CLOUDFRONT_URL'),
    );
    this.defaultExpiresInSec = Number(
      this.configService.get<string>('FILES_PRESIGN_EXPIRES_IN_SEC') ?? 900,
    );

    if (
      !Number.isFinite(this.defaultExpiresInSec) ||
      this.defaultExpiresInSec <= 0
    ) {
      this.defaultExpiresInSec = 900;
    }

    this.endpoint = this.trimTrailingSlash(
      this.configService.get<string>('AWS_S3_ENDPOINT'),
    );

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    const clientConfig: S3ClientConfig = {
      region: this.region,
      forcePathStyle: this.forcePathStyle,
    };

    if (this.endpoint) {
      clientConfig.endpoint = this.endpoint;
    }

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = { accessKeyId, secretAccessKey };
    }

    this.client = new S3Client(clientConfig);
  }

  getBucketName(): string {
    return this.bucket;
  }

  async presignPutObject(
    args: PresignArgs,
  ): Promise<{ uploadUrl: string; expiresInSec: number }> {
    const requestedExpires = args.expiresInSec ?? this.defaultExpiresInSec;
    const expiresInSec =
      Number.isFinite(requestedExpires) && requestedExpires > 0
        ? requestedExpires
        : this.defaultExpiresInSec;

    const safeExpiresInSec = Math.min(expiresInSec, 604800);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: args.key,
      ContentType: args.contentType,
      ContentLength: args.sizeBytes,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: safeExpiresInSec,
    });

    return { uploadUrl, expiresInSec: safeExpiresInSec };
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (error: any) {
      const code = error?.$metadata?.httpStatusCode ?? error?.statusCode;
      if (code === 404) {
        return false;
      }
      throw error;
    }
  }

  buildPublicUrl(key: string): string {
    const encodedKey = this.encodeObjectKey(key);

    if (this.cloudfrontBaseUrl) {
      return `${this.cloudfrontBaseUrl}/${encodedKey}`;
    }

    if (this.endpoint) {
      const endpoint = this.trimTrailingSlash(this.endpoint) ?? this.endpoint;

      if (this.forcePathStyle) {
        return `${endpoint}/${this.bucket}/${encodedKey}`;
      }

      const endpointUrl = new URL(endpoint);
      endpointUrl.hostname = `${this.bucket}.${endpointUrl.hostname}`;
      return `${this.trimTrailingSlash(endpointUrl.toString())}/${encodedKey}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encodedKey}`;
  }

  private trimTrailingSlash(input?: string): string | undefined {
    if (!input) {
      return input;
    }

    return input.replace(/\/+$/, '');
  }

  private encodeObjectKey(key: string): string {
    return key.split('/').map(encodeURIComponent).join('/');
  }
}
