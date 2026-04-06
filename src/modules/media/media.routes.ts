import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/auth.middleware.js';
import { AppError, Errors } from '../../shared/errors.js';
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

function getS3Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw Errors.INTERNAL('R2 storage is not configured');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

const MAX_FILES_PER_REQUEST = 5;
const PRESIGNED_URL_EXPIRY_SECONDS = 300; // 5 minutes

export async function mediaRoutes(app: FastifyInstance) {
  // POST /media/upload
  // Body: { files: Array<{ content_type: string; filename?: string }> }
  // Returns presigned R2 PUT URLs
  app.post(
    '/media/upload',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const body = request.body as {
        files?: Array<{ content_type?: string; filename?: string }>;
      };

      if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'files array is required' },
        });
      }

      if (body.files.length > MAX_FILES_PER_REQUEST) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Maximum ${MAX_FILES_PER_REQUEST} files per request`,
          },
        });
      }

      for (const file of body.files) {
        if (!file.content_type || !ALLOWED_CONTENT_TYPES.includes(file.content_type)) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: `content_type must be one of: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
            },
          });
        }
      }

      try {
        const s3 = getS3Client();
        const bucketName = process.env.R2_BUCKET_NAME;
        const r2PublicUrl = process.env.R2_PUBLIC_URL;

        if (!bucketName || !r2PublicUrl) {
          throw Errors.INTERNAL('R2 storage is not fully configured');
        }

        const results = await Promise.all(
          body.files.map(async (file) => {
            const ext = (file.content_type ?? 'image/jpeg').split('/')[1] ?? 'jpg';
            const key = `uploads/${request.user!.id}/${crypto.randomUUID()}.${ext}`;

            const command = new PutObjectCommand({
              Bucket: bucketName,
              Key: key,
              ContentType: file.content_type,
            });

            const uploadUrl = await getSignedUrl(s3, command, {
              expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
            });

            const publicUrl = `${r2PublicUrl.replace(/\/$/, '')}/${key}`;

            return {
              upload_url: uploadUrl,
              public_url: publicUrl,
              key,
              expires_in: PRESIGNED_URL_EXPIRY_SECONDS,
            };
          })
        );

        return reply.status(200).send({ data: { files: results } });
      } catch (err) {
        if (err instanceof AppError) {
          return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    }
  );
}
