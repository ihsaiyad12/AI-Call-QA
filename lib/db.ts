import dbConnect from './mongodb';
import Lead from './models/Lead';

/**
 * Database client — migrated to use MongoDB Atlas (via Mongoose).
 * This bridge maintains the exact same API surface as the previous 
 * local server, so no changes are needed in API routes.
 */

export const db = {
  lead: {
    /**
     * Create a new lead in MongoDB
     */
    async create(data: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      category: string;
      employeeCount: string;
      jobTitle?: string;
      transcript?: string;
      verdict?: string;
      score?: number;
      reasoning?: string;
      intent?: number;
      authority?: number;
      demo_commitment?: number;
      timeline?: number;
      industry_fit?: number;
      risk_level?: string;
      status?: string;
      addedBy?: string;
      aiProvider?: string;
      disqualificationComment?: string;
      createdAtEST?: string;
    }) {
      await dbConnect();
      const lead = await Lead.create(data);
      const obj = lead.toObject();
      return { ...obj, id: obj._id.toString() };
    },

    /**
     * Update an existing lead
     */
    async update(id: string, data: Partial<{
      firstName:      string;
      lastName:       string;
      email:          string;
      phone:          string;
      category:       string;
      employeeCount:  string;
      jobTitle:       string;
      transcript:     string;
      verdict:        string;
      score:          number;
      reasoning:      string;
      intent:         number;
      authority:      number;
      demo_commitment:number;
      timeline:       number;
      industry_fit:   number;
      risk_level:     string;
      status:         string;
      emailStatus:    string;
      emailStatusRaw: string;
      aiProvider:     string;
      addedBy:        string;
      disqualificationComment: string;
    }>) {
      await dbConnect();
      
      const updateData = { ...data };
      
      const lead = await Lead.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
      if (!lead) return null;
      
      const obj = lead.toObject();
      return { ...obj, id: obj._id.toString() };
    },

    /**
     * Find a single lead by its ID
     */
    async findUnique(id: string) {
      if (!id || id === 'undefined' || id === 'null') return null;
      await dbConnect();
      try {
        let lead = await Lead.findById(id);
        
        if (!lead) {
          lead = await Lead.findOne({ $or: [{ _id: id }, { id: id }] });
        }

        if (!lead) return null;
        
        const obj = lead.toObject();
        return { ...obj, id: obj._id.toString() };
      } catch (err) {
        return null;
      }
    },

    async findOne(filter: any) {
      await dbConnect();
      const lead = await Lead.findOne(filter);
      if (!lead) return null;
      const obj = lead.toObject();
      return { ...obj, id: obj._id.toString() };
    },

    /**
     * Delete a lead by its ID
     */
    async delete(id: string) {
      await dbConnect();
      try {
        const lead = await Lead.findByIdAndDelete(id);
        if (!lead) return null;
        const obj = lead.toObject();
        return { ...obj, id: obj._id.toString() };
      } catch (err) {
        return null;
      }
    },

    /**
     * Get all leads sorted by newest first, with optional filters
     */
    async findMany(filter: any = {}) {
      await dbConnect();
      const leads = await Lead.find(filter).sort({ createdAt: -1 });
      return leads.map(l => {
        const obj = l.toObject();
        return { ...obj, id: obj._id.toString() };
      });
    },

    /**
     * Search leads by email, name, or phone (case-insensitive partial match).
     * Returns up to 10 results with PENDING status prioritized.
     */
    async search(query: string, filter: any = {}) {
      await dbConnect();
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');

      const leads = await Lead.find({
        $or: [
          { email: regex },
          { firstName: regex },
          { lastName: regex },
          { phone: regex },
        ],
        ...filter
      })
      .sort({ status: 1, createdAt: -1 }) // PENDING first, then newest
      .limit(10);

      return leads.map(l => {
        const obj = l.toObject();
        return { ...obj, id: obj._id.toString() };
      });
    },
  },
};

export default db;
