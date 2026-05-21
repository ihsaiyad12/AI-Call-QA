import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password: string;
  role: 'agent' | 'analyst' | 'super-admin';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['agent', 'analyst', 'super-admin'], default: 'analyst' },
}, { 
  timestamps: true,
  collection: 'Users'
});

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
