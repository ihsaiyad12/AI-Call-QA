import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILead extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  category: string;
  employeeCount: string;
  jobTitle?: string;
  transcript?: string;
  verdict?: 'Good to Go (SQL)' | 'Borderline' | 'Not Qualified' | null;
  score?: number;
  reasoning?: string;
  intent?: number;
  authority?: number;
  demo_commitment?: number;
  timeline?: number;
  industry_fit?: number;
  risk_level?: 'Low' | 'Medium' | 'High';
  status: 'PENDING' | 'ANALYZED' | 'PUSHED_TO_CRM';
  disqualificationComment?: string;
  emailStatus?: string;
  emailStatusRaw?: string;
  addedBy?: string;
  aiProvider?: string;
  createdAtEST?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  category: { type: String, required: true },
  employeeCount: { type: String, required: true },
  jobTitle: { type: String },
  transcript: { type: String, default: '' },
  verdict: { type: String, enum: ['Good to Go (SQL)', 'Borderline', 'Not Qualified', null], default: null },
  score: { type: Number, default: 0 },
  reasoning: { type: String, default: '' },
  intent: { type: Number },
  authority: { type: Number },
  demo_commitment: { type: Number },
  timeline: { type: Number },
  industry_fit: { type: Number },
  risk_level: { type: String, enum: ['Low', 'Medium', 'High', null], default: null },
  status: { 
    type: String, 
    enum: ['PENDING', 'ANALYZED', 'PUSHED_TO_CRM'], 
    default: 'PENDING' 
  },
  disqualificationComment: { type: String, default: null },
  emailStatus: { type: String, default: null },
  emailStatusRaw: { type: String, default: null },
  addedBy: { type: String, default: null },
  aiProvider: { type: String, default: null },
  createdAtEST: { type: String, default: null },
}, { 
  timestamps: true,
  collection: 'Leads'
});

// Index for efficient lead search by email, name, and phone
LeadSchema.index({ email: 1 });
LeadSchema.index({ phone: 1 });
LeadSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

// For Next.js hot reloading: Prevents re-defining the model if it exists
const Lead: Model<ILead> = mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);

export default Lead;
