import prisma from "./prisma";
import { hashPassword } from "../services/auth/password";

async function createAdminUser() {
  try {
    const email = "dipendrak299@gmail.com";
    const password = "Admin@123"; // Default password - CHANGE THIS AFTER FIRST LOGIN!
    const name = "Dipendra Kumar";

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Update existing user to admin if not already
      if (existingUser.role !== 'admin') {
        await prisma.user.update({
          where: { email },
          data: { 
            role: 'admin',
            isEmailVerified: true,
            plan: 'annual' // Give admin annual plan
          }
        });
        console.log(`✅ User ${email} updated to admin role!`);
      } else {
        console.log(`ℹ️  User ${email} is already an admin.`);
      }
    } else {
      // Create new admin user
      const hashedPassword = await hashPassword(password);
      
      await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: hashedPassword,
          role: 'admin',
          plan: 'annual',
          isEmailVerified: true,
          scansUsedThisMonth: 0
        }
      });
      
      console.log(`✅ Admin user created successfully!`);
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Password: ${password}`);
      console.log(`⚠️  IMPORTANT: Change this password after first login!`);
    }

    // Show current admin users
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        createdAt: true
      }
    });

    console.log('\n📋 Current Admin Users:');
    console.table(admins);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run immediately
createAdminUser()
  .then(() => {
    console.log('\n✨ Admin creation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Admin creation failed:', error);
    process.exit(1);
  });

export default createAdminUser;
