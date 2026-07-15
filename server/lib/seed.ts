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
          plan: 'annual',
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
          plan: 'annual'
        }
      });
      console.log(`✅ User ${adminEmail} upgraded to admin role!`);
    } else {
      console.log(`ℹ️  Admin user ${adminEmail} already exists.`);
    }

    // 2. Ensure Plans exist
    const planCount = await prisma.plan.count();
    if (planCount === 0) {
      console.log("No plans found. Seeding default plans (free, pro, annual)...");
      
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

      const annualPlan = await prisma.plan.create({
        data: {
          name: "Annual",
          slug: "annual",
          description: "Ultimate yearly pass to our entire suite",
          monthlyPrice: 12,
          annualPrice: 144,
          currency: "usd",
          durationDays: 365,
          trialDays: 0,
          isActive: true,
          sortOrder: 2
        }
      });

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

        // Link to Annual (enabled)
        await prisma.planFeature.create({
          data: {
            planId: annualPlan.id,
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

  } catch (error: any) {
    console.error("Error seeding default plans and features:", error.message || error);
  }
}
