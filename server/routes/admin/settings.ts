import { Router } from 'express';
import multer from 'multer';
import prisma from '../../lib/prisma';
import cloudinary from '../../services/cloudinary';
import { logAdminAction } from '../../utils/auditLogger';

const settingsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Ensure at least one setting row exists
const getOrCreateSettings = async () => {
  let settings = await prisma.systemSetting.findFirst();
  if (!settings) {
    settings = await prisma.systemSetting.create({ data: {} });
  }
  return settings;
};

settingsRouter.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const uploadToCloudinary = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "careerforgeai_branding",
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file!.buffer);
      });
    };

    const cloudinaryResult = await uploadToCloudinary();
    
    await logAdminAction(req, 'Upload Branding Image', null, null, JSON.stringify({ url: cloudinaryResult.secure_url }));

    res.json({ url: cloudinaryResult.secure_url });
  } catch (error) {
    console.error("Cloudinary Upload Error", error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

settingsRouter.get('/limits', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

settingsRouter.put('/limits', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    
    // Prevent negative limits
    const updateData = { ...req.body };
    for (const key of ['guestScanLimit', 'freeScanLimit', 'proScanLimit', 'annualScanLimit', 'maxResumeUploadSize', 'maxResumeCharacters', 'maxJDCharacters', 'maxAIRequestsPerMinute', 'maxUploadsPerDay']) {
      if (updateData[key] !== undefined && updateData[key] < 0) {
        return res.status(400).json({ error: `${key} cannot be negative` });
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const key of ['supportEmail', 'salesEmail']) {
      if (updateData[key] && !emailRegex.test(updateData[key])) {
        return res.status(400).json({ error: `Invalid email format for ${key}` });
      }
    }

    // URL validation
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    for (const key of ['companyWebsite', 'logoUrl', 'faviconUrl', 'socialFacebook', 'socialTwitter', 'socialInstagram', 'socialLinkedin', 'socialGithub', 'socialYoutube', 'announcementButtonUrl']) {
      if (updateData[key] && !urlRegex.test(updateData[key])) {
        return res.status(400).json({ error: `Invalid URL format for ${key}` });
      }
    }

    // Phone validation (basic)
    if (updateData.supportPhone && !/^[\d\+\-\(\) ]+$/.test(updateData.supportPhone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    const updatedSettings = await prisma.systemSetting.update({
      where: { id: settings.id },
      data: {
        guestScanLimit: updateData.guestScanLimit,
        freeScanLimit: updateData.freeScanLimit,
        proScanLimit: updateData.proScanLimit,
        annualScanLimit: updateData.annualScanLimit,
        maxResumeUploadSize: updateData.maxResumeUploadSize,
        maxResumeCharacters: updateData.maxResumeCharacters,
        maxJDCharacters: updateData.maxJDCharacters,
        maxAIRequestsPerMinute: updateData.maxAIRequestsPerMinute,
        maxUploadsPerDay: updateData.maxUploadsPerDay,
        allowGuestScans: updateData.allowGuestScans,
        allowSignup: updateData.allowSignup,
        allowGoogleLogin: updateData.allowGoogleLogin,
        allowEmailLogin: updateData.allowEmailLogin,
        
        // Phase 3 Extensions (Company & Branding)
        companyName: updateData.companyName,
        companyTagline: updateData.companyTagline,
        companyDescription: updateData.companyDescription,
        supportEmail: updateData.supportEmail,
        salesEmail: updateData.salesEmail,
        supportPhone: updateData.supportPhone,
        companyWebsite: updateData.companyWebsite,
        companyAddress: updateData.companyAddress,
        
        // Branding
        logoUrl: updateData.logoUrl,
        faviconUrl: updateData.faviconUrl,
        primaryColor: updateData.primaryColor,
        secondaryColor: updateData.secondaryColor,
        footerText: updateData.footerText,
        footerCopyright: updateData.footerCopyright,

        // Contact
        businessHours: updateData.businessHours,
        contactPageEnabled: updateData.contactPageEnabled,

        // Social Links
        socialFacebook: updateData.socialFacebook,
        socialTwitter: updateData.socialTwitter,
        socialLinkedin: updateData.socialLinkedin,
        socialGithub: updateData.socialGithub,
        socialYoutube: updateData.socialYoutube,
        socialInstagram: updateData.socialInstagram,

        // Localization
        defaultCurrency: updateData.defaultCurrency,
        timezone: updateData.timezone,
        defaultLanguage: updateData.defaultLanguage,
        dateFormat: updateData.dateFormat,

        // System
        maintenanceMode: updateData.maintenanceMode,
        maintenanceMessage: updateData.maintenanceMessage,
        announcementBanner: updateData.announcementBanner,
        announcementIsActive: updateData.announcementIsActive,
        announcementColor: updateData.announcementColor,
        announcementButtonText: updateData.announcementButtonText,
        announcementButtonUrl: updateData.announcementButtonUrl,
        auditLogRetentionDays: updateData.auditLogRetentionDays
      }
    });

    await logAdminAction(req, 'Update System Settings', null, JSON.stringify(settings), JSON.stringify(updatedSettings));

    res.json({ settings: updatedSettings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default settingsRouter;
