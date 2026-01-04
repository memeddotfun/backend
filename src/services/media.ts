import { pinata } from "../clients/pinata";
import { s3Client } from "../clients/s3";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type Media = {
    cid: string;
    url: string;
};

type Metadata = {
    name: string;
    description: string;
    image: string | null;
};

/**
 * Uploads a media file to Pinata and S3
 * @param file - The media file to upload
 * @param metadata - The metadata for the media file
 * @returns The media file's CID and S3 key
 */
export const uploadMedia = async (file: Express.Multer.File, metadata: Metadata): Promise<Media> => {
    const fileBlob = new File([new Uint8Array(file.buffer)], file.originalname, { type: file.mimetype });
    const imageResponse = await pinata.upload.public.file(fileBlob);
    const Key = `token-images/${imageResponse.cid}.${file.mimetype.split("/")[1]}`;
    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key,
        Body: file.buffer,
    }));
    metadata.image = `ipfs://${imageResponse.cid}`;
    const metadataResponse = await pinata.upload.public.json(metadata);
    return {
        cid: metadataResponse.cid,
        url: `${process.env.AWS_CLOUDFRONT_URL}/${Key}`,
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
