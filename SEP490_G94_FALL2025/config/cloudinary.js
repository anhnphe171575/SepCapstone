const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
});

// Storage config
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const isImage = (file.mimetype || '').startsWith('image/');
        const base = {
            folder: process.env.CLOUDINARY_FOLDER || 'sep_uploads',
            allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp', 'avif','pdf','doc','docx','xls','xlsx','ppt','pptx'],
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
        };
        if (isImage) {
            return {
                ...base,
                resource_type: 'image',
                transformation: [
                    { width: 800, height: 800, crop: 'limit' },
                    { quality: 'auto' }
                ],
            };
        }
        // Non-image files (PDF/Office) should be uploaded as raw without transformations
        return {
            ...base,
            resource_type: 'raw',
        };
    }
});

// Multer upload config
const upload = multer({ 
    storage,
    limits: {
        fileSize: 20 * 1024 * 1024,
        files: 5
    },
    fileFilter: (req, file, cb) => {
        // Allow common images and office/pdf docs
        const allowed = [
            'image/jpeg','image/png','image/gif','image/webp','image/avif',
            'application/pdf',
            'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only images and office/pdf documents are allowed.'));
        }
        cb(null, true);
    }
});

module.exports = { cloudinary, upload };
