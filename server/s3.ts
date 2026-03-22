import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.DO_SPACES_ENDPOINT || !process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET || !process.env.DO_SPACES_BUCKET || !process.env.DO_SPACES_REGION) {
  console.warn("DigitalOcean Spaces environment variables are not fully set. Media uploads may fail.");
}

export const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || "",
    secretAccessKey: process.env.DO_SPACES_SECRET || "",
  },
});

export const SPACES_BUCKET = process.env.DO_SPACES_BUCKET;
export const SPACES_REGION = process.env.DO_SPACES_REGION;
