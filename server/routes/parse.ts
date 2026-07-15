import { Router } from "express";
import multer from "multer";
import mammoth from "mammoth";
import * as Sentry from "@sentry/node";
import { logger } from "../services/logger";
import cloudinary from "../services/cloudinary";
import { PDFParse } from "pdf-parse";
import fs from "fs";
import os from "os";

const parseRouter = Router();

// Configure multer to use disk storage to avoid high memory footprint
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB absolute max
  },
});

import prisma from "../lib/prisma";

parseRouter.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const { mimetype, path: filePath, originalname, size } = req.file;
    
    console.log("[Parse] Received file:", {
      originalname,
      size,
      mimetype
    });

    const settings = await prisma.systemSetting.findFirst();
    const maxUploadSize = settings?.maxResumeUploadSize || 5242880; // default 5MB
    const maxResumeCharacters = settings?.maxResumeCharacters || 20000;

    if (size > maxUploadSize) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: `File size exceeds the limit of ${Math.round(maxUploadSize / 1024 / 1024)}MB.` });
    }

    let extractedText = "";
    
    // Validate MIME types
    const validMimes = [
      "application/pdf", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    
    if (!validMimes.includes(mimetype) && !originalname.endsWith(".pdf") && !originalname.endsWith(".docx")) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: "Unsupported file type. Only PDF and DOCX are allowed." });
    }

    if (mimetype === "application/pdf" || originalname.endsWith(".pdf")) {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const pdfData = await parser.getText({ parseHyperlinks: true });
      extractedText = pdfData.text;
    } else if (
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      originalname.endsWith(".docx")
    ) {
      const docxData = await mammoth.extractRawText({ path: filePath });
      extractedText = docxData.value;
    }

    // Clean text (remove excessive whitespace)
    const cleanText = extractedText.replace(/\s+/g, " ").trim();
    
    console.log("[Parse] Extracted text length:", cleanText.length);

    if (cleanText.length > maxResumeCharacters) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: `Resume text exceeds ${maxResumeCharacters} characters limit.` });
    }
    
    // Upload original file to Cloudinary
    const uploadToCloudinary = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
          filePath,
          {
            resource_type: "raw", // use "raw" for non-image files like pdf/docx
            type: "upload", // public access but with secure URLs
            format: originalname.split('.').pop()
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
      });
    };

    let cloudinaryResult;
    try {
        cloudinaryResult = await uploadToCloudinary();
        console.log("[Parse] Cloudinary upload successful:", {
          url: cloudinaryResult.secure_url,
          public_id: cloudinaryResult.public_id
        });
    } catch (uploadError) {
        logger.error("Cloudinary Upload Error", uploadError);
        return res.status(500).json({ error: "Failed to securely store resume file." });
    } finally {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    res.json({ 
        text: cleanText,
        fileInfo: {
            url: cloudinaryResult.secure_url,
            public_id: cloudinaryResult.public_id,
            filename: originalname,
            size: size,
            mimetype: mimetype
        }
    });

  } catch (err) {
    logger.error("Parse Error", err);
    Sentry.captureException(err);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
       fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Failed to parse document" });
  }
});

export default parseRouter;
