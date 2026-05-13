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
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error(
      "Missing Cloudinary credentials. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env"
    );
  }
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req: any, file: any) => {
    const isImage = ["image/png", "image/jpeg", "image/jpg"].includes(file.mimetype);
    return {
      folder:        "snipixai",
      resource_type: isImage ? "image" : "raw",
      type:          "upload",
      access_mode:   "public",
      // ✅ FIX: allowed_formats raw type ke saath kaam nahi karta —
      // Cloudinary "raw" resources ke liye format restriction ignore hoti hai
      // lekin kabhi kabhi conflict karta hai. Remove karo, multer fileFilter
      // already extension check kar raha hai.
    };
  },
} as any);

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