# Homework 09 (Files Module / Presigned Upload)

## Integrated domain(s)

Both domains are integrated:

- `Users`
  - file is created with `ownerType = user` and `ownerId = User.id`
  - after `complete`, the file is bound as avatar via `users.avatar_file_id`
- `Products`
  - file is created with `ownerType = product` and `ownerId = Product.id`
  - after `complete`, a record is created in `product_images` (product gallery)

## How the `presign -> upload -> complete` flow works

1. `POST /api/v1/files/presign`
   - backend validates access and owner existence (`user/product/order/payment`)
   - creates a `files` record with `pending` status
   - returns `fileId`, `key`, and `uploadUrl`

2. `PUT uploadUrl` directly to S3/MinIO
   - client uploads file bytes directly to object storage
   - backend does not proxy file bytes

3. `POST /api/v1/files/complete`
   - validates access to the file
   - checks object existence in S3/MinIO (`HeadObject`)
   - updates status from `pending` to `ready`
   - performs domain binding:
     - `User.avatarFileId`
     - `ProductImage` (for product images)

## How access checks are implemented

- `FilesController` uses:
  - `JwtAuthGuard`
  - `AccessGuard`
  - `@Roles(...)`
  - `@Scopes(...)`

- Service-level domain access checks:
  - regular user can work only with their own `USER` files
  - `ADMIN` / `SUPPORT` can work with files for other owner types

- `GET /files/:id` uses `READ` scopes.

## How file view URL is generated

The API returns `publicUrl` (in `complete` response and `GET /files/:id`).

URL generation logic:

- if `AWS_CLOUDFRONT_URL` is configured -> `CLOUDFRONT_BASE_URL + key`
- otherwise -> direct S3 / MinIO endpoint URL

Implemented in `S3Service.buildPublicUrl(key)`.

## Assignment coverage (short)

- `2.2` Direct upload (presigned flow): completed
- `2.3` `POST /files/complete` + ownership + `pending -> ready` + domain binding: completed
- `3.1` File view URL (S3 dev / CloudFront ideal): completed
