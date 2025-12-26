import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { NextFunction, Response } from "express";
import {
  AWS_ACCESS_KEY_ID,
  AWS_REGION,
  AWS_SECRET_ACCESS_KEY,
  AWS_BUCKET_NAME,
} from "../config/environment";

dotenv.config();

// ✅ Initialize S3 client
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: String(AWS_ACCESS_KEY_ID),
    secretAccessKey: String(AWS_SECRET_ACCESS_KEY),
  },
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

const generateFileName = (originalName: string) => {
  const fileExt = path.extname(originalName);
  const randomName = crypto.randomBytes(16).toString("hex");
  return `${Date.now()}-${randomName}${fileExt}`;
};

/**
 * @param fields - [{ name: "profilePicture", maxCount: 1 }, { name: "certificationMedia", maxCount: 5 }]
 * @param options - { optional?: boolean } // if true, skips error when no files are uploaded
 */
export const handleMediaFilesS3 = (
  fields: any = [],
  options: { optional?: boolean } = {}
) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const uploader = upload.fields(fields);

      uploader(req, res, async (multerErr) => {
        if (multerErr) {
          console.error("Multer error:", multerErr);
          return res.status(400).json({
            success: false,
            message:
              "Invalid file upload. Please check your files and try again.",
          });
        }

        // If no files and optional is false -> return error
        if (
          (!req.files || Object.keys(req.files).length === 0) &&
          !options.optional
        ) {
          return res.status(400).json({
            success: false,
            message: "No file uploaded. File is required for this request.",
          });
        }

        // If optional and no file → continue
        if (
          (!req.files || Object.keys(req.files).length === 0) &&
          options.optional
        ) {
          req.filesInfo = {};
          return next();
        }

        req.filesInfo = {};

        try {
          for (const fieldName in req.files) {
            const fieldFiles = req.files[fieldName];
            req.filesInfo[fieldName] = [];

            for (const file of fieldFiles) {
              const fileName = generateFileName(file.originalname);
              const s3Key = `media/${fileName}`;

              const params = {
                Bucket: AWS_BUCKET_NAME,
                Key: s3Key,
                Body: file.buffer,
                ContentType: file.mimetype,
                acl: "public-read",
              };

              try {
                await s3.send(new PutObjectCommand(params));

                const fileUrl =
                  AWS_REGION === "us-east-1"
                    ? `https://${AWS_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`
                    : `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;

                req.filesInfo[fieldName].push({
                  url: fileUrl,
                  key: s3Key,
                  contentType: file.mimetype,
                });
              } catch (uploadErr) {
                console.error(
                  `S3 Upload failed for ${file.originalname}:`,
                  uploadErr
                );
                return res.status(500).json({
                  success: false,
                  message: `Failed to upload ${file.originalname} to S3.`,
                });
              }
            }
          }

          // ✅ All good — continue
          return next();
        } catch (processingErr) {
          console.error("Error processing uploaded files:", processingErr);
          return res.status(500).json({
            success: false,
            message: "Unexpected error while processing uploaded files.",
          });
        }
      });
    } catch (outerErr) {
      console.error("Unexpected S3 middleware error:", outerErr);
      res.status(500).json({
        success: false,
        message: "Unexpected server error during file upload.",
      });
    }
  };
};
