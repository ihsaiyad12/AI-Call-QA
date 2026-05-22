export const CATEGORIES = [
  'Accounting', 'Construction Management', 'CRM', 'HR', 'Insurance',
  'Legal Practice Management', 'LMS', 'Manufacturing Software',
  'Marketing Automation', 'Marketing Software', 'Medical', 'Other',
  'Payroll for Nannies/Caregivers', 'Project Management', 'Property Management',
  'Software Development', 'ERP', 'CMMS', 'Service Software', 'Management Software',
  'Analytics Tools & Software', 'Artificial Intelligence', 'Auto Repair',
  'Call Center', 'Collaboration & Productivity', 'Content Management',
  'Customer Service', 'Cyber Security', 'E-Commerce', 'EMR',
  'Enterprise Resource Planning', 'Event Management', 'Field Service',
  'Fleet Management', 'Non-Profit', 'Retail POS Systems', 'Sales Tools',
  'Supply Chain Management', 'Corporate Insurance And Risk Management',
  'Ecosystem Service Providers', 'Search Result', 'Ecommerce Software',
  'Best Background Check', 'Agile Project Management Tools', 'ATS',
  'Design Software', 'For Marketers', 'Finance', 'Compliance',
  'Email Marketing Software', 'Moving Company Software',
] as const;

export type Category = typeof CATEGORIES[number];
