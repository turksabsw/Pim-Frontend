/**
 * PIM navigation structure – mirrors Frappe workspace pim/pim.json.
 * Used by sidebar to show all PIM doctypes grouped by card.
 */

export interface PimNavLink {
  label: string
  doctype: string
  /** Path: /products for Product Master (custom list), else /list/{doctype} */
  path: string
}

export interface PimNavGroup {
  label: string
  icon?: string
  items: PimNavLink[]
}

/** Product Master uses the custom /products list; other doctypes use generic /list/:doctype */
function docPath(doctype: string): string {
  return doctype === 'Product Master' ? '/products' : `/list/${encodeURIComponent(doctype)}`
}

export const PIM_NAV_GROUPS: PimNavGroup[] = [
  {
    label: 'Products',
    icon: 'products',
    items: [
      { label: 'Product Master', doctype: 'Product Master', path: docPath('Product Master') },
      { label: 'Product Variant', doctype: 'Product Variant', path: docPath('Product Variant') },
      { label: 'Product Family', doctype: 'Product Family', path: docPath('Product Family') },
      { label: 'Product Series', doctype: 'Product Series', path: docPath('Product Series') },
      { label: 'Product Collection', doctype: 'Product Collection', path: docPath('Product Collection') },
      { label: 'Brand', doctype: 'Brand', path: docPath('Brand') },
      { label: 'Manufacturer', doctype: 'Manufacturer', path: docPath('Manufacturer') },
      { label: 'Digital Asset', doctype: 'Digital Asset', path: docPath('Digital Asset') },
    ],
  },
  {
    label: 'Attributes',
    icon: 'attributes',
    items: [
      { label: 'PIM Attribute', doctype: 'PIM Attribute', path: docPath('PIM Attribute') },
      { label: 'PIM Attribute Group', doctype: 'PIM Attribute Group', path: docPath('PIM Attribute Group') },
      { label: 'PIM Attribute Option', doctype: 'PIM Attribute Option', path: docPath('PIM Attribute Option') },
      { label: 'PIM Attribute Template', doctype: 'PIM Attribute Template', path: docPath('PIM Attribute Template') },
      { label: 'PIM Attribute Type', doctype: 'PIM Attribute Type', path: docPath('PIM Attribute Type') },
      { label: 'PIM Product Type', doctype: 'PIM Product Type', path: docPath('PIM Product Type') },
    ],
  },
  {
    label: 'Classification',
    icon: 'categories',
    items: [
      { label: 'Channel', doctype: 'Channel', path: docPath('Channel') },
      { label: 'Category', doctype: 'Category', path: docPath('Category') },
      { label: 'Product Category', doctype: 'Product Category', path: docPath('Product Category') },
      { label: 'Target Segment', doctype: 'Target Segment', path: docPath('Target Segment') },
      { label: 'Taxonomy', doctype: 'Taxonomy', path: docPath('Taxonomy') },
      { label: 'Taxonomy Node', doctype: 'Taxonomy Node', path: docPath('Taxonomy Node') },
    ],
  },
  {
    label: 'Pricing & Packaging',
    icon: 'pricing',
    items: [
      { label: 'Price Rule', doctype: 'Price Rule', path: docPath('Price Rule') },
      { label: 'PIM Contract Price', doctype: 'PIM Contract Price', path: docPath('PIM Contract Price') },
      { label: 'PIM Bundle', doctype: 'PIM Bundle', path: docPath('PIM Bundle') },
      { label: 'Package Variant', doctype: 'Package Variant', path: docPath('Package Variant') },
      { label: 'GS1 Packaging Hierarchy', doctype: 'GS1 Packaging Hierarchy', path: docPath('GS1 Packaging Hierarchy') },
      { label: 'Nutrition Facts', doctype: 'Nutrition Facts', path: docPath('Nutrition Facts') },
    ],
  },
  {
    label: 'Templates & Export',
    icon: 'templates',
    items: [
      { label: 'Display Template', doctype: 'Display Template', path: docPath('Display Template') },
      { label: 'Export Profile', doctype: 'Export Profile', path: docPath('Export Profile') },
      { label: 'Datasheet Template', doctype: 'Datasheet Template', path: docPath('Datasheet Template') },
      { label: 'Import Configuration', doctype: 'Import Configuration', path: docPath('Import Configuration') },
    ],
  },
  {
    label: 'Quality & Feedback',
    icon: 'quality',
    items: [
      { label: 'Data Quality Policy', doctype: 'Data Quality Policy', path: docPath('Data Quality Policy') },
      { label: 'Product Feedback', doctype: 'Product Feedback', path: docPath('Product Feedback') },
      { label: 'Product Score', doctype: 'Product Score', path: docPath('Product Score') },
      { label: 'QA Note', doctype: 'QA Note', path: docPath('QA Note') },
    ],
  },
  {
    label: 'Market Intelligence',
    icon: 'market',
    items: [
      { label: 'Competitor Analysis', doctype: 'Competitor Analysis', path: docPath('Competitor Analysis') },
      { label: 'Market Insight', doctype: 'Market Insight', path: docPath('Market Insight') },
      { label: 'PIM Customer Segment', doctype: 'PIM Customer Segment', path: docPath('PIM Customer Segment') },
      { label: 'PIM Marketplace Listing', doctype: 'PIM Marketplace Listing', path: docPath('PIM Marketplace Listing') },
    ],
  },
  {
    label: 'Data Management (MDM)',
    icon: 'mdm',
    items: [
      { label: 'Golden Record', doctype: 'Golden Record', path: docPath('Golden Record') },
      { label: 'Source System', doctype: 'Source System', path: docPath('Source System') },
      { label: 'Survivorship Rule', doctype: 'Survivorship Rule', path: docPath('Survivorship Rule') },
      { label: 'Data Steward', doctype: 'Data Steward', path: docPath('Data Steward') },
      { label: 'PIM Sync Queue', doctype: 'PIM Sync Queue', path: docPath('PIM Sync Queue') },
      { label: 'PIM Sync Conflict Rule', doctype: 'PIM Sync Conflict Rule', path: docPath('PIM Sync Conflict Rule') },
    ],
  },
  {
    label: 'AI & Automation',
    icon: 'ai',
    items: [
      { label: 'AI Approval Queue', doctype: 'AI Approval Queue', path: docPath('AI Approval Queue') },
      { label: 'AI Enrichment Job', doctype: 'AI Enrichment Job', path: docPath('AI Enrichment Job') },
      { label: 'AI Prompt Template', doctype: 'AI Prompt Template', path: docPath('AI Prompt Template') },
      { label: 'Webhook Configuration', doctype: 'Webhook Configuration', path: docPath('Webhook Configuration') },
      { label: 'PIM Event', doctype: 'PIM Event', path: docPath('PIM Event') },
      { label: 'PIM Notification Rule', doctype: 'PIM Notification Rule', path: docPath('PIM Notification Rule') },
    ],
  },
  {
    label: 'Localization',
    icon: 'locale',
    items: [
      { label: 'PIM Locale', doctype: 'PIM Locale', path: docPath('PIM Locale') },
      { label: 'PIM Translation Status', doctype: 'PIM Translation Status', path: docPath('PIM Translation Status') },
      { label: 'PIM Sales Channel', doctype: 'PIM Sales Channel', path: docPath('PIM Sales Channel') },
    ],
  },
  {
    label: 'Portal & Permissions',
    icon: 'portal',
    items: [
      { label: 'Brand Portal User', doctype: 'Brand Portal User', path: docPath('Brand Portal User') },
      { label: 'Partner Submission', doctype: 'Partner Submission', path: docPath('Partner Submission') },
      { label: 'PIM Category Permission', doctype: 'PIM Category Permission', path: docPath('PIM Category Permission') },
    ],
  },
  {
    label: 'Settings',
    icon: 'settings',
    items: [
      { label: 'PIM Settings', doctype: 'PIM Settings', path: '/settings' },
      { label: 'Chemical Usage Instruction', doctype: 'Chemical Usage Instruction', path: docPath('Chemical Usage Instruction') },
      { label: 'Social Media Link', doctype: 'Social Media Link', path: docPath('Social Media Link') },
    ],
  },
]
