import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Service } from './s3.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

jest.mock('@aws-sdk/client-s3', () => {
  class MockS3Client {
    send = jest.fn();

    constructor(public readonly config: Record<string, unknown>) {}
  }

  class MockPutObjectCommand {
    constructor(public readonly input: Record<string, unknown>) {}
  }

  class MockHeadObjectCommand {
    constructor(public readonly input: Record<string, unknown>) {}
  }

  return {
    S3Client: MockS3Client,
    PutObjectCommand: MockPutObjectCommand,
    HeadObjectCommand: MockHeadObjectCommand,
  };
});

describe('S3Service', () => {
  const getSignedUrlMock = getSignedUrl as jest.MockedFunction<
    typeof getSignedUrl
  >;

  const createService = async (
    configValues?: Partial<Record<string, string | undefined>>,
  ) => {
    const defaults: Record<string, string | undefined> = {
      AWS_REGION: 'eu-central-1',
      AWS_S3_BUCKET: 'test-bucket',
      AWS_S3_FORCE_PATH_STYLE: 'true',
      FILES_PRESIGN_EXPIRES_IN_SEC: '900',
      AWS_S3_ENDPOINT: undefined,
      AWS_CLOUDFRONT_URL: undefined,
      AWS_ACCESS_KEY_ID: 'test-key',
      AWS_SECRET_ACCESS_KEY: 'test-secret',
    };

    const values = {
      ...defaults,
      ...configValues,
    };

    const configServiceMock = {
      get: jest.fn((key: string) => values[key]),
      getOrThrow: jest.fn((key: string) => {
        const value = values[key];
        if (value === undefined) {
          throw new Error(`Missing config key: ${key}`);
        }
        return value;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    const service = module.get<S3Service>(S3Service);
    const client = (
      service as unknown as { client: InstanceType<typeof S3Client> }
    ).client;

    return { service, configServiceMock, client };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', async () => {
    const { service } = await createService();

    expect(service).toBeDefined();
  });

  it('returns configured bucket name', async () => {
    const { service } = await createService({
      AWS_S3_BUCKET: 'uploads-bucket',
    });

    expect(service.getBucketName()).toBe('uploads-bucket');
  });

  it('presigns put object using safe expiry and expected command payload', async () => {
    const { service, client } = await createService({
      FILES_PRESIGN_EXPIRES_IN_SEC: '1200',
    });

    getSignedUrlMock.mockResolvedValue('https://signed.example.com/upload');

    const result = await service.presignPutObject({
      key: 'users/user-1/avatars/photo.png',
      contentType: 'image/png',
      sizeBytes: 512,
      expiresInSec: 999999,
    });

    expect(getSignedUrlMock).toHaveBeenCalledWith(
      client,
      expect.any(PutObjectCommand),
      {
        expiresIn: 604800,
      },
    );

    const command = getSignedUrlMock.mock.calls[0][1] as PutObjectCommand & {
      input: Record<string, unknown>;
    };

    expect(command.input).toEqual({
      Bucket: 'test-bucket',
      Key: 'users/user-1/avatars/photo.png',
      ContentType: 'image/png',
      ContentLength: 512,
    });
    expect(result).toEqual({
      uploadUrl: 'https://signed.example.com/upload',
      expiresInSec: 604800,
    });
  });

  it('falls back to default expiry when requested value is invalid', async () => {
    const { service } = await createService({
      FILES_PRESIGN_EXPIRES_IN_SEC: '900',
    });

    getSignedUrlMock.mockResolvedValue('https://signed.example.com/default');

    const result = await service.presignPutObject({
      key: 'docs/report.pdf',
      contentType: 'application/pdf',
      sizeBytes: 10,
      expiresInSec: 0,
    });

    expect(getSignedUrlMock).toHaveBeenCalledWith(
      expect.any(S3Client),
      expect.any(PutObjectCommand),
      {
        expiresIn: 900,
      },
    );
    expect(result.expiresInSec).toBe(900);
  });

  it('uses fallback default when configured expiry is not a positive number', async () => {
    const { service } = await createService({
      FILES_PRESIGN_EXPIRES_IN_SEC: '-5',
    });

    getSignedUrlMock.mockResolvedValue('https://signed.example.com/fallback');

    const result = await service.presignPutObject({
      key: 'docs/readme.txt',
      contentType: 'text/plain',
      sizeBytes: 3,
    });

    expect(result.expiresInSec).toBe(900);
  });

  it('returns true when object exists', async () => {
    const { service, client } = await createService();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const sendMock = client.send as jest.Mock;

    sendMock.mockResolvedValue({});

    await expect(service.objectExists('files/existing.txt')).resolves.toBe(
      true,
    );

    expect(sendMock).toHaveBeenCalledWith(expect.any(HeadObjectCommand));

    const command = sendMock.mock.calls[0][0] as HeadObjectCommand & {
      input: Record<string, unknown>;
    };

    expect(command.input).toEqual({
      Bucket: 'test-bucket',
      Key: 'files/existing.txt',
    });
  });

  it('returns false when object lookup returns 404 in metadata', async () => {
    const { service, client } = await createService();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const sendMock = client.send as jest.Mock;

    sendMock.mockRejectedValue({
      $metadata: {
        httpStatusCode: 404,
      },
    });

    await expect(service.objectExists('files/missing.txt')).resolves.toBe(
      false,
    );
  });

  it('returns false when object lookup returns 404 in statusCode', async () => {
    const { service, client } = await createService();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const sendMock = client.send as jest.Mock;

    sendMock.mockRejectedValue({
      statusCode: 404,
    });

    await expect(service.objectExists('files/missing.txt')).resolves.toBe(
      false,
    );
  });

  it('rethrows unexpected object lookup errors', async () => {
    const { service, client } = await createService();
    const error = new Error('network down');

    client.send.mockRejectedValue(error);

    await expect(service.objectExists('files/error.txt')).rejects.toThrow(
      'network down',
    );
  });

  it('builds public url using cloudfront base url when configured', async () => {
    const { service } = await createService({
      AWS_CLOUDFRONT_URL: 'https://cdn.example.com/',
      AWS_S3_ENDPOINT: 'http://minio:9000',
    });

    expect(service.buildPublicUrl('users/user 1/avatar.png')).toBe(
      'https://cdn.example.com/users/user%201/avatar.png',
    );
  });

  it('builds path-style endpoint public url when configured', async () => {
    const { service } = await createService({
      AWS_S3_ENDPOINT: 'http://minio:9000/',
      AWS_S3_FORCE_PATH_STYLE: 'true',
      AWS_CLOUDFRONT_URL: undefined,
    });

    expect(service.buildPublicUrl('folder/my file.pdf')).toBe(
      'http://minio:9000/test-bucket/folder/my%20file.pdf',
    );
  });

  it('builds virtual-hosted endpoint public url when path style is disabled', async () => {
    const { service } = await createService({
      AWS_S3_ENDPOINT: 'https://storage.example.com/',
      AWS_S3_FORCE_PATH_STYLE: 'false',
      AWS_CLOUDFRONT_URL: undefined,
    });

    expect(service.buildPublicUrl('folder/image one.png')).toBe(
      'https://test-bucket.storage.example.com/folder/image%20one.png',
    );
  });

  it('builds standard aws public url when endpoint is not configured', async () => {
    const { service } = await createService({
      AWS_REGION: 'us-east-1',
      AWS_S3_ENDPOINT: undefined,
      AWS_CLOUDFRONT_URL: undefined,
    });

    expect(service.buildPublicUrl('reports/annual summary.csv')).toBe(
      'https://test-bucket.s3.us-east-1.amazonaws.com/reports/annual%20summary.csv',
    );
  });
});
