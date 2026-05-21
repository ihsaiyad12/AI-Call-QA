require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not set in environment variables.');
  process.exit(1);
}

// Minimalist User Schema to avoid Next.js environment typescript compilation issues
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true }
}, {
  timestamps: true,
  collection: 'Users'
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seedAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    const username = 'admin';
    const rawPassword = 'admin@523523';

    // Check if user already exists
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      console.log(`User "${username}" already exists with role: "${existingUser.role}".`);
      
      // Update role to super-admin and update password just in case
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(rawPassword, salt);
      
      existingUser.role = 'super-admin';
      existingUser.password = hashedPassword;
      await existingUser.save();
      
      console.log(`User "${username}" successfully updated to "super-admin" role and password reset.`);
    } else {
      console.log(`Creating default super-admin user "${username}"...`);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(rawPassword, salt);

      const adminUser = await User.create({
        username,
        password: hashedPassword,
        role: 'super-admin'
      });

      console.log(`Default super-admin user "${username}" successfully created! ID: ${adminUser._id}`);
    }

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

seedAdmin();
