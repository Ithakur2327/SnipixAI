import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import { env } from "./env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key:    env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export const validateCloudinaryConfig = async (): Promise<void> => {
  try {
    // Test the config by listing resources (should not fail if credentials are valid)
    await cloudinary.api.resources({ max_results: 1 });
  } catch (err: any) {
    if (err.http_code === 401) {
      throw new Error("Invalid Cloudinary credentials. Please check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.");
    }
    throw new Error(`Cloudinary configuration error: ${err.message}`);
  }
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "snipixai",
    resource_type:   "auto",
    type:            "upload",    // Public upload (not private)
    allowed_formats: ["pdf", "docx", "pptx", "txt", "png", "jpg", "jpeg"],
  } as any,
});

export const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "image/png",
      "image/jpeg",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("File type not allowed"), false);
  },
});

export { cloudinary };