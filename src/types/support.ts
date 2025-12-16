// src/types/support.ts
export interface HelpArticle {
  id: string
  title: string
  description: string
  category: string
  content: string
  relatedArticles?: string[]
}

export const HELP_ARTICLES: Record<string, HelpArticle[]> = {
  getting_started: [
    {
      id: 'gs-1',
      title: 'How to Set Up Your Farm Profile',
      description: 'Learn how to create and configure your farm information',
      category: 'getting_started',
      content: `
1. Click on Settings in the navigation menu
2. Select "Farm Information"
3. Fill in your farm name, location, and contact details
4. Upload your farm logo (optional)
5. Click "Save Changes"

Your farm profile helps you manage your dairy operation efficiently and keeps all your farm data organized in one place.
      `,
    },
    {
      id: 'gs-2',
      title: 'Getting Started with Herd Management',
      description: 'Quick guide to adding and managing your first animals',
      category: 'getting_started',
      content: `
1. Navigate to "Herd Management" from the dashboard
2. Click "Add New Animal"
3. Enter the animal's ID, name, breed, and birth date
4. Assign the animal to a group (optional)
5. Click "Save"

You can now start tracking this animal's health, breeding, and production records. Regular updates help you make better management decisions.
      `,
    },
  ],
  health: [
    {
      id: 'h-1',
      title: 'Recording Health Events',
      description: 'How to log health issues and treatments',
      category: 'health',
      content: `
1. Go to "Health" tab from dashboard
2. Select an animal from your herd
3. Click "Add Health Record"
4. Choose the type of event (illness, treatment, vaccination)
5. Fill in the date, symptoms/details, and treatment applied
6. Attach any relevant notes or photos
7. Save the record

Keep detailed records for better herd health management and veterinary consultations. This helps prevent disease spread and track treatment effectiveness.
      `,
    },
    {
      id: 'h-2',
      title: 'Understanding Health Alerts',
      description: 'What the color indicators mean in health records',
      category: 'health',
      content: `
RED - Critical health issue requiring immediate attention
YELLOW - Warning signs, monitor closely
GREEN - Healthy, no concerns

The system automatically generates alerts based on patterns in your records. Check alerts regularly to catch issues early.
      `,
    },
  ],
  production: [
    {
      id: 'p-1',
      title: 'Tracking Milk Production',
      description: 'How to record daily milk yield',
      category: 'production',
      content: `
1. Navigate to "Production" tab
2. Select the date and animals
3. Enter milk yield in liters (or your preferred unit)
4. Add any notes about feed, health, or conditions
5. Save

Regular production tracking helps identify trends and optimize your dairy operation. Look for patterns to improve yields.
      `,
    },
    {
      id: 'p-2',
      title: 'Production Reports',
      description: 'How to view and analyze production data',
      category: 'production',
      content: `
1. Go to "Reports" from the dashboard
2. Select "Production Analysis"
3. Choose your date range
4. View trends and statistics
5. Export reports as needed

Use production reports to identify high and low-performing animals and make informed decisions about your herd.
      `,
    },
  ],
  technical: [
    {
      id: 't-1',
      title: 'App Not Loading on Mobile',
      description: 'Troubleshooting tips for mobile access',
      category: 'technical',
      content: `
1. Clear your browser cache and cookies
2. Ensure you have a stable internet connection
3. Try refreshing the page (swipe down to refresh)
4. Disable browser extensions
5. Try in incognito/private mode
6. Try a different browser if available

If issues persist, note your device type and browser, then contact support with these details.
      `,
    },
    {
      id: 't-2',
      title: 'Syncing Issues',
      description: 'How to resolve data synchronization problems',
      category: 'technical',
      content: `
1. Check your internet connection (at least 3G or WiFi)
2. Log out completely and log back in
3. Wait 5 minutes for automatic sync to complete
4. If data still missing, try on a different device
5. Contact support with your ticket number if it persists

Always ensure your internet connection is stable when adding critical data like health records or production numbers.
      `,
    },
  ],
  billing: [
    {
      id: 'b-1',
      title: 'How to Update Payment Method',
      description: 'Managing your subscription payment',
      category: 'billing',
      content: `
1. Go to Settings > Billing
2. Click "Payment Methods"
3. Select "Update Payment"
4. Enter your new card details
5. Click "Save"

Your payment information is secure and encrypted. You can update anytime without disrupting your service.
      `,
    },
    {
      id: 'b-2',
      title: 'Understanding Your Invoice',
      description: 'How to read and download invoices',
      category: 'billing',
      content: `
1. Go to Settings > Billing > Invoices
2. View your invoice history
3. Click on any invoice to view details
4. Download as PDF for your records

Keep invoices for your accounting records. Contact support if you notice any discrepancies.
      `,
    },
  ],
}

export const SUPPORT_CATEGORIES = [
  { id: 'getting_started', label: 'Getting Started', icon: 'Rocket' },
  { id: 'health', label: 'Health & Wellness', icon: 'Heart' },
  { id: 'production', label: 'Production', icon: 'TrendingUp' },
  { id: 'technical', label: 'Technical Issues', icon: 'Zap' },
  { id: 'billing', label: 'Billing & Account', icon: 'CreditCard' },
  { id: 'other', label: 'Other', icon: 'MessageSquare' },
]