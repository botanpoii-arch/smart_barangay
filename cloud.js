// cloud.js
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config(); // Ensure your .env file is loaded

// Configure Cloudinary with your credentials
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads a base64 image string to Cloudinary.
 * @param {string} fileString - The base64 image data (data:image/jpeg;base64,...)
 * @param {string} folderName - The Cloudinary folder to store the image in
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
export const uploadImage = async (fileString, folderName = 'barangay_announcements') => {
    try {
        // If there's no image, or it's already a standard URL (from an edit), return it as is
        if (!fileString || fileString.startsWith('http')) {
            return fileString;
        }

        const uploadedResponse = await cloudinary.uploader.upload(fileString, {
            folder: folderName,
            resource_type: 'image',
        });

        return uploadedResponse.secure_url;
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        throw new Error("Failed to upload image to cloud storage.");
    }
};

export default cloudinary;