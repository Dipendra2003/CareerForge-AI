import prisma from "./prisma";

export async function seedDefaultData() {
  try {
    console.log("Checking database for default plans and features...");

    // 1. Seed SystemSetting
    const settingsCount = await prisma.systemSetting.count();
    if (settingsCount === 0) {
      console.log("Seeding default system settings...");
      await prisma.systemSetting.create({
        data: {
          guestScanLimit: 1,
          freeScanLimit: 3,
          proScanLimit: 999999,
          annualScanLimit: 999999,
          maxResumeUploadSize: 5242880,
          maxResumeCharacters: 20000,
          maxJDCharacters: 10000,
          maxAIRequestsPerMinute: 20,
          maxUploadsPerDay: 50,
          allowGuestScans: true,
          allowSignup: true,
          allowGoogleLogin: true,
          allowEmailLogin: true,
          companyName: "CareerForge AI",
          companyTagline: "AI-Powered Resume Builder & Analyzer",
          companyDescription: "Analyze and optimize your resume against any job description using advanced AI.",
          supportEmail: "support@example.com",
          primaryColor: "#4f46e5",
          secondaryColor: "#ec4899",
          defaultCurrency: "USD",
          timezone: "UTC",
          defaultLanguage: "en",
          dateFormat: "MM/DD/YYYY",
          maintenanceMode: false,
          announcementIsActive: false,
        }
      });
    }

    // 1.5 Create Admin User if not exists
    console.log("Checking for admin user...");
    const adminEmail = "dipendrak299@gmail.com";
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      console.log("Creating admin user...");
      const { hashPassword } = await import("../services/auth/password");
      const hashedPassword = await hashPassword("Admin@123");
      
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: "Dipendra Kumar",
          passwordHash: hashedPassword,
          role: 'admin',
          plan: 'pro',
          isEmailVerified: true,
          scansUsedThisMonth: 0
        }
      });
      
      console.log("✅ Admin user created!");
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: Admin@123`);
      console.log(`⚠️  IMPORTANT: Change this password after first login!`);
    } else if (existingAdmin.role !== 'admin') {
      // Upgrade existing user to admin
      await prisma.user.update({
        where: { email: adminEmail },
        data: { 
          role: 'admin',
          isEmailVerified: true,
          plan: 'pro'
        }
      });
      console.log(`✅ User ${adminEmail} upgraded to admin role!`);
    } else {
      console.log(`ℹ️  Admin user ${adminEmail} already exists.`);
    }

    // 2. Ensure Plans exist
    const planCount = await prisma.plan.count();
    if (planCount === 0) {
      console.log("No plans found. Seeding default plans (free, pro)...");
      
      const freePlan = await prisma.plan.create({
        data: {
          name: "Free",
          slug: "free",
          description: "Basic features for simple analysis",
          monthlyPrice: 0,
          annualPrice: 0,
          currency: "usd",
          durationDays: 30,
          trialDays: 0,
          isActive: true,
          sortOrder: 0
        }
      });

      const proPlan = await prisma.plan.create({
        data: {
          name: "Pro",
          slug: "pro",
          description: "Full AI powers for active job seekers",
          monthlyPrice: 19,
          annualPrice: 149,
          currency: "usd",
          durationDays: 30,
          trialDays: 0,
          isActive: true,
          sortOrder: 1
        }
      });

      // Removed 'Annual' plan as it conflicts with the billing toggle

      // 3. Ensure Features exist
      console.log("Seeding default features...");
      const featuresData = [
        { key: "rewriter", name: "Bullet Points Rewriter", description: "AI rewrite for high impact resume bullets", category: "AI Tools" },
        { key: "cover letter", name: "Cover Letter Generator", description: "Job description tailored cover letters", category: "AI Tools" },
        { key: "linkedin", name: "LinkedIn Profile Optimizer", description: "Turn profiles into recruiter magnets", category: "AI Tools" },
        { key: "interview", name: "Interview Prep Guide", description: "Predictive Q&A mapping your specific gaps", category: "AI Tools" }
      ];

      for (const feat of featuresData) {
        const feature = await prisma.feature.create({
          data: {
            key: feat.key,
            name: feat.name,
            description: feat.description,
            category: feat.category,
            isActive: true
          }
        });

        // Link to Free (disabled)
        await prisma.planFeature.create({
          data: {
            planId: freePlan.id,
            featureId: feature.id,
            enabled: false
          }
        });

        // Link to Pro (enabled)
        await prisma.planFeature.create({
          data: {
            planId: proPlan.id,
            featureId: feature.id,
            enabled: true
          }
        });

      }
      console.log("Database seeded successfully with plans and features!");
    } else {
      console.log("Plans already exist in the database.");
    }

    // 4. Seed Email Templates
    console.log("Checking and seeding default email templates...");
    const { initTemplates } = await import("../routes/admin/emails");
    await initTemplates();
    console.log("Email templates successfully initialized/upgraded!");

    // 5. Seed FAQ Content
    console.log('Seeding FAQ Content...');
    const faqCategoryCount = await prisma.fAQCategory.count();
    if (faqCategoryCount === 0) {
      // Categories
      const generalCategory = await prisma.fAQCategory.upsert({
        where: { slug: 'general' },
        update: {},
        create: {
          name: 'General Questions',
          slug: 'general',
          description: 'General information about CareerForge AI',
          displayOrder: 1,
        }
      });

      const technicalCategory = await prisma.fAQCategory.upsert({
        where: { slug: 'technical' },
        update: {},
        create: {
          name: 'Technical & ATS',
          slug: 'technical',
          description: 'How the ATS scanner works',
          displayOrder: 2,
        }
      });

      const billingCategory = await prisma.fAQCategory.upsert({
        where: { slug: 'billing' },
        update: {},
        create: {
          name: 'Billing & Account',
          slug: 'billing',
          description: 'Subscription and billing details',
          displayOrder: 3,
        }
      });

      // FAQs
      const faqs = [
        {
          question: "What is CareerForge AI?",
          answer: "CareerForge AI is an advanced AI-powered platform designed to optimize your resume, analyze ATS compatibility, and help you land more interviews by perfectly matching your skills with job descriptions.",
          slug: "what-is-careerforge-ai",
          categoryId: generalCategory.id,
          isPublished: true,
          isFeatured: true,
          displayOrder: 1
        },
        {
          question: "Is CareerForge AI free to use?",
          answer: "We offer a generous free tier that includes basic resume scanning and keyword analysis. For advanced features like unlimited cover letter generation, deep ATS insights, and AI rewriting, we offer a Pro plan.",
          slug: "is-it-free",
          categoryId: generalCategory.id,
          isPublished: true,
          isFeatured: true,
          displayOrder: 2
        },
        {
          question: "How does the ATS Checker work?",
          answer: "Our ATS Checker simulates exactly how applicant tracking systems parse your resume. It identifies missing keywords, formatting errors, and readability issues that might prevent human recruiters from seeing your application.",
          slug: "how-ats-checker-works",
          categoryId: technicalCategory.id,
          isPublished: true,
          isFeatured: true,
          displayOrder: 3
        },
        {
          question: "Which file formats do you support?",
          answer: "Currently, our analyzer supports PDF (.pdf) and Microsoft Word (.docx) files. PDF is highly recommended to preserve formatting during the parsing process.",
          slug: "supported-file-formats",
          categoryId: technicalCategory.id,
          isPublished: true,
          isFeatured: false,
          displayOrder: 4
        },
        {
          question: "Does the AI rewrite my entire resume?",
          answer: "Our AI provides targeted suggestions for specific bullet points and summaries based on the job description you provide. You always have full control over what changes to apply, ensuring your resume remains authentic to your experience.",
          slug: "ai-rewrite-resume",
          categoryId: technicalCategory.id,
          isPublished: true,
          isFeatured: true,
          displayOrder: 5
        },
        {
          question: "Can I cancel my Pro subscription at any time?",
          answer: "Yes! You can easily cancel your subscription at any time from your Account Settings page. You will retain access to Pro features until the end of your current billing cycle.",
          slug: "cancel-pro-subscription",
          categoryId: billingCategory.id,
          isPublished: true,
          isFeatured: false,
          displayOrder: 6
        },
        {
          question: "Do you offer refunds?",
          answer: "Yes, we offer a 14-day money-back guarantee. If you're not completely satisfied with your Pro subscription, contact our support team within 14 days of purchase for a full refund.",
          slug: "refund-policy",
          categoryId: billingCategory.id,
          isPublished: true,
          isFeatured: false,
          displayOrder: 7
        }
      ];

      for (const faq of faqs) {
        await prisma.fAQ.upsert({
          where: { slug: faq.slug },
          update: {
            question: faq.question,
            answer: faq.answer,
            categoryId: faq.categoryId,
            isPublished: faq.isPublished,
            isFeatured: faq.isFeatured,
            displayOrder: faq.displayOrder,
          },
          create: faq
        });
      }
      console.log('FAQ Content Seeded successfully!');
    } else {
      console.log('FAQ Categories already exist in the database.');
    }

  } catch (error: any) {
    console.error("Error seeding default plans and features:", error.message || error);
  }
}
