import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { supabase } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, enhancedAuthMiddleware, requirePermission } from '../middleware/enhanced-auth';
import { uploadRateLimit } from '../middleware/rate-limiter';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import sharp from 'sharp';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Validation schemas
const uploadSchema = z.object({
  folder: z.enum(['products', 'categories', 'users', 'branding', 'system']).optional().default('products'),
  resize: z.boolean().optional().default(true),
  width: z.number().optional().default(800),
  height: z.number().optional().default(600)
});

// Upload single image - Rate limited for uploads
router.post('/image', uploadRateLimit, enhancedAuthMiddleware, requirePermission('uploads', 'create'), upload.single('image'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  if (!req.file) {
    throw createError('No image file provided', 400);
  }

  const { folder, resize, width, height } = uploadSchema.parse(req.body);
  
  try {
    let imageBuffer = req.file.buffer;
    let contentType = req.file.mimetype;
    
    // Resize image if requested
    if (resize) {
      imageBuffer = await sharp(req.file.buffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer();
      contentType = 'image/jpeg';
    }
    
    // Generate unique filename
    const fileExtension = contentType === 'image/jpeg' ? '.jpg' : path.extname(req.file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = `${folder}/${fileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, imageBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Supabase upload error:', error);
      throw createError('Failed to upload image', 500);
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);
    
    res.json({
      success: true,
      data: {
        path: filePath,
        publicUrl: publicUrlData.publicUrl,
        fileName,
        size: imageBuffer.length,
        contentType
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    throw createError('Failed to process and upload image', 500);
  }
}));

// Upload multiple images - Rate limited for uploads
router.post('/images', uploadRateLimit, enhancedAuthMiddleware, requirePermission('uploads', 'create'), upload.array('images', 5), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    throw createError('No image files provided', 400);
  }

  const { folder, resize, width, height } = uploadSchema.parse(req.body);
  
  const uploadPromises = files.map(async (file) => {
    try {
      let imageBuffer = file.buffer;
      let contentType = file.mimetype;
      
      // Resize image if requested
      if (resize) {
        imageBuffer = await sharp(file.buffer)
          .resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85 })
          .toBuffer();
        contentType = 'image/jpeg';
      }
      
      // Generate unique filename
      const fileExtension = contentType === 'image/jpeg' ? '.jpg' : path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = `${folder}/${fileName}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, imageBuffer, {
          contentType,
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        throw error;
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
      
      return {
        success: true,
        path: filePath,
        publicUrl: publicUrlData.publicUrl,
        fileName,
        size: imageBuffer.length,
        contentType,
        originalName: file.originalname
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to upload image',
        originalName: file.originalname
      };
    }
  });
  
  const results = await Promise.all(uploadPromises);
  
  const successful = results.filter(result => result.success);
  const failed = results.filter(result => !result.success);
  
  res.json({
    success: failed.length === 0,
    uploaded: successful.length,
    failed: failed.length,
    results: {
      successful,
      failed
    }
  });
}));

// Delete image
router.delete('/image', enhancedAuthMiddleware, requirePermission('uploads', 'delete'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { path: imagePath } = req.body;
  
  if (!imagePath) {
    throw createError('Image path is required', 400);
  }
  
  try {
    const { error } = await supabase.storage
      .from('product-images')
      .remove([imagePath]);
    
    if (error) {
      console.error('Supabase delete error:', error);
      throw createError('Failed to delete image', 500);
    }
    
    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    throw createError('Failed to delete image', 500);
  }
}));

// Get signed URL for private access
router.post('/signed-url', enhancedAuthMiddleware, requirePermission('uploads', 'create'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { path: imagePath, expiresIn = 3600 } = req.body;
  
  if (!imagePath) {
    throw createError('Image path is required', 400);
  }
  
  try {
    const { data, error } = await supabase.storage
      .from('product-images')
      .createSignedUrl(imagePath, expiresIn);
    
    if (error) {
      console.error('Supabase signed URL error:', error);
      throw createError('Failed to generate signed URL', 500);
    }
    
    res.json({
      success: true,
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
    });
  } catch (error) {
    console.error('Signed URL error:', error);
    throw createError('Failed to generate signed URL', 500);
  }
}));

// List images in a folder
router.get('/images/:folder', enhancedAuthMiddleware, requirePermission('uploads', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { folder } = req.params;
  const { limit = '50', offset = '0' } = req.query;
  
  try {
    const { data, error } = await supabase.storage
      .from('product-images')
      .list(folder, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) {
      console.error('Supabase list error:', error);
      throw createError('Failed to list images', 500);
    }
    
    // Get public URLs for all images
    const imagesWithUrls = data.map(file => {
      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(`${folder}/${file.name}`);
      
      return {
        ...file,
        publicUrl: publicUrlData.publicUrl,
        path: `${folder}/${file.name}`
      };
    });
    
    res.json({
      success: true,
      images: imagesWithUrls,
      count: data.length
    });
  } catch (error) {
    console.error('List images error:', error);
    throw createError('Failed to list images', 500);
  }
}));

// Get image metadata
router.get('/image/info/:folder/:filename', enhancedAuthMiddleware, requirePermission('uploads', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { folder, filename } = req.params;
  const filePath = `${folder}/${filename}`;
  
  try {
    const { data, error } = await supabase.storage
      .from('product-images')
      .list(folder, {
        search: filename
      });
    
    if (error) {
      console.error('Supabase info error:', error);
      throw createError('Failed to get image info', 500);
    }
    
    const file = data.find(f => f.name === filename);
    
    if (!file) {
      throw createError('Image not found', 404);
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);
    
    res.json({
      success: true,
      image: {
        ...file,
        publicUrl: publicUrlData.publicUrl,
        path: filePath
      }
    });
  } catch (error) {
    console.error('Image info error:', error);
    throw createError('Failed to get image info', 500);
  }
}));

// Bulk delete images
router.delete('/images', enhancedAuthMiddleware, requirePermission('uploads', 'delete'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { paths } = req.body;
  
  if (!paths || !Array.isArray(paths) || paths.length === 0) {
    throw createError('Image paths array is required', 400);
  }
  
  try {
    const { data, error } = await supabase.storage
      .from('product-images')
      .remove(paths);
    
    if (error) {
      console.error('Supabase bulk delete error:', error);
      throw createError('Failed to delete images', 500);
    }
    
    res.json({
      success: true,
      deleted: data.length,
      message: `${data.length} images deleted successfully`
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    throw createError('Failed to delete images', 500);
  }
}));

// Error handler for multer
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum is 5 files.'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      error: 'Only image files are allowed'
    });
  }
  
  next(error);
});

export default router;