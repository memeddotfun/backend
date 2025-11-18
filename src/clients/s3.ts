import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.AWS_REGION || !process.env.AWS_S3_BUCKET_NAME) {
    throw new Error("AWS_REGION and AWS_S3_BUCKET_NAME must be set");
}

export const s3Client = new S3Client({
    region: process.env.AWS_REGION,
});