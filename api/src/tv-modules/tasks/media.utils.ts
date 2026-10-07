import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';

export const MEDIA_UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(MEDIA_UPLOAD_DIR)) {
    fs.mkdirSync(MEDIA_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        if (!fs.existsSync(MEDIA_UPLOAD_DIR)) {
            fs.mkdirSync(MEDIA_UPLOAD_DIR, { recursive: true });
        }
        cb(null, MEDIA_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const rawExt = path.extname(file.originalname).toLowerCase();
        const safeExt = rawExt && /^\.[a-z0-9]+$/i.test(rawExt) ? rawExt : '.bin';
        const uniqueName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${safeExt}`;
        cb(null, uniqueName);
    },
});

export const mediaUpload = multer({
    storage,
    limits: {
        fileSize: 40 * 1024 * 1024, // 40MB max
    },
    fileFilter: (_req, file, cb) => {
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');
        if (isImage || isVideo) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and videos are supported.'));
        }
    },
});
