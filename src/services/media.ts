import { pinata } from "../clients/pinata";
import { s3Client } from "../clients/s3";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type Media = {
    cid: string;
    key: string;
};

/**
 * Uploads a media file to Pinata and S3
 * @param file - The media file to upload
 * @returns The media file's CID and S3 key
 */
export const uploadMedia = async (file: Express.Multer.File): Promise<Media> => {
    const fileBlob = new File([new Uint8Array(file.buffer)], file.originalname, { type: file.mimetype });
    const response = await pinata.upload.public.file(fileBlob);
    const Key = `token-images/${response.cid}.${file.mimetype.split("/")[1]}`;
    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key,
        Body: file.buffer,
    }));
    return {
        cid: response.cid,
        key: Key,
    };
};

/**
 * Gets a presigned URL for a media file
 * @param key - The S3 key of the media file
 * @returns The presigned URL
 */
export const getPresignedUrl = async (key: string): Promise<string> => {
    const command = new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME, Key: key });
    return await getSignedUrl(s3Client, command, { expiresIn: 60 * 60 * 24 });
};
