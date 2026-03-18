export interface IS3Config {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  forcePathStyle: boolean;
  cdnUrl: string;
  presignExpiresInSec: number;
}
