/**
 * Product-related type definitions for PIM entities.
 *
 * Maps to backend DocTypes:
 * - Product Master (Virtual DocType → ERPNext Item)
 * - Product Variant
 * - PIM Product Type
 * - Product Family (NestedSet)
 * - PIM Attribute / PIM Attribute Type / PIM Attribute Group
 * - PIM Category (NestedSet)
 * - Product Attribute Value (EAV child table)
 * - Product Media (child table)
 */

import type { FrappeEntity } from './index'

// ============================================================================
// Configuration Entities (Type/Bundle Pattern)
// ============================================================================

/** PIM Product Type - defines HOW a product is classified/merchandised */
export interface PIMProductType extends FrappeEntity {
  type_name: string
  type_code: string
  description?: string
  is_active: boolean
  /** Child table: Product Type Field */
  type_fields?: ProductTypeField[]
  /** Table MultiSelect: Allowed families */
  allowed_families?: ProductTypeAllowedFamily[]
  variant_enabled?: boolean
  max_variant_levels?: number
}

/** Product Type Field - child table defining custom fields for a product type */
export interface ProductTypeField {
  name?: string
  fieldname: string
  label: string
  fieldtype: string
  options?: string
  reqd?: boolean
  default_value?: string
  sort_order: number
}

/** Allowed family link in Product Type MultiSelect */
export interface ProductTypeAllowedFamily {
  name?: string
  product_family: string
}

/** PIM Attribute Type - defines base data types for attributes */
export interface PIMAttributeType extends FrappeEntity {
  type_name: string
  type_code: string
  base_type: AttributeBaseType
  has_options: boolean
  supports_unit: boolean
  description?: string
  validation_regex?: string
  min_value?: number
  max_value?: number
  max_length?: number
}

/** Valid base types for attributes */
export type AttributeBaseType =
  | 'String'
  | 'Integer'
  | 'Float'
  | 'Boolean'
  | 'Date'
  | 'Datetime'
  | 'JSON'

/** PIM Attribute Group - logical grouping of attributes */
export interface PIMAttributeGroup extends FrappeEntity {
  group_name: string
  group_code: string
  description?: string
  sort_order: number
  parent_group?: string
  is_active: boolean
}

/** PIM Attribute Template - reusable attribute sets */
export interface PIMAttributeTemplate extends FrappeEntity {
  template_name: string
  template_code: string
  description?: string
  is_active: boolean
  /** Child table: PIM Template Attribute */
  attributes?: TemplateAttribute[]
}

/** PIM Template Attribute - child row in an attribute template */
export interface TemplateAttribute {
  name?: string
  attribute: string
  is_required: boolean
  sort_order: number
  default_value?: string
  is_variant_axis: boolean
  is_inherited: boolean
  group?: string
}

// ============================================================================
// Content Entities
// ============================================================================

/** PIM Attribute - dynamic product attribute definition */
export interface PIMAttribute extends FrappeEntity {
  attribute_name: string
  attribute_code: string
  attribute_type: string
  attribute_group?: string
  data_type?: string
  is_required: boolean
  is_filterable: boolean
  is_searchable: boolean
  is_variant_axis: boolean
  is_localizable: boolean
  sort_order: number
  description?: string
  /** Options child table (for Select/MultiSelect attributes) */
  options?: PIMAttributeOption[]
  /** Validation constraints */
  validation_regex?: string
  min_value?: number
  max_value?: number
  max_length?: number
  /** Unit configuration */
  unit?: string
  linked_doctype?: string
}

/** PIM Attribute Option - predefined value for select attributes */
export interface PIMAttributeOption {
  name?: string
  option_code: string
  label: string
  color_hex?: string
  image?: string
  external_code?: string
  sort_order: number
  is_active: boolean
}

/** Product Family - tree structure for attribute inheritance (NestedSet) */
export interface ProductFamily extends FrappeEntity {
  family_name: string
  family_code: string
  parent_family?: string
  is_group: boolean
  description?: string
  lft: number
  rgt: number
  full_path?: string
  /** Child table: Family Attribute Template */
  attributes?: FamilyAttribute[]
  /** Child table: Family Variant Attribute */
  variant_attributes?: FamilyVariantAttribute[]
}

/** Family Attribute Template - child row specifying required attributes */
export interface FamilyAttribute {
  name?: string
  attribute: string
  is_required_in_family: boolean
  default_value?: string
  sort_order: number
}

/** Family Variant Attribute - child row for variant axes */
export interface FamilyVariantAttribute {
  name?: string
  attribute: string
  is_required?: boolean
  level?: number
  sort_order: number
}

/** PIM Category - NestedSet navigation taxonomy */
export interface PIMCategory extends FrappeEntity {
  category_name: string
  category_code: string
  parent_category?: string
  is_group: boolean
  description?: string
  lft: number
  rgt: number
  is_active?: boolean
  image?: string
}

/** PIM Brand */
export interface PIMBrand extends FrappeEntity {
  brand_name: string
  brand_code?: string
  description?: string
  logo?: string
  website?: string
  is_active: boolean
}

// ============================================================================
// Product Master & Variants
// ============================================================================

/** Product status values */
export type ProductStatus = 'Draft' | 'Active' | 'Discontinued' | 'Archived'

/** Variant status values */
export type VariantStatus = 'Draft' | 'Active' | 'Discontinued'

/** Product Master - virtual DocType mapped to ERPNext Item */
export interface ProductMaster extends FrappeEntity {
  product_name: string
  product_code: string
  product_type?: string
  product_family?: string
  category?: string
  brand?: string
  status: ProductStatus
  short_description?: string
  long_description?: string
  /** ERPNext sync */
  erp_item?: string
  sync_status?: SyncStatusValue
  last_synced?: string
  /** Completeness */
  completeness_score: number
  /** EAV attribute values */
  attribute_values?: ProductAttributeValue[]
  /** Media */
  media?: ProductMedia[]
  /** Variant configuration */
  has_variants?: boolean
  variant_based_on?: string
}

/** Product Variant - child of Product Master */
export interface ProductVariant extends FrappeEntity {
  variant_code: string
  variant_name: string
  parent_product: string
  parent_variant?: string
  variant_level: number
  sku?: string
  status: VariantStatus
  erp_item?: string
  sync_status?: SyncStatusValue
  /** Variant axis values */
  axis_values?: ProductVariantAxisValue[]
  /** EAV attribute values (inherited or overridden) */
  attribute_values?: ProductAttributeValue[]
  /** Media */
  media?: ProductMedia[]
  completeness_score?: number
}

/** Product Attribute Value - EAV storage (child table) */
export interface ProductAttributeValue {
  name?: string
  attribute: string
  value_type: string
  value_text?: string
  value_long_text?: string
  value_int?: number
  value_float?: number
  value_boolean?: boolean
  value_date?: string
  value_datetime?: string
  value_link?: string
  value_json?: string
  display_value?: string
  unit?: string
  source?: string
  locale?: string
}

/** Product Variant Axis Value - defines which axis values a variant has */
export interface ProductVariantAxisValue {
  name?: string
  attribute: string
  attribute_value: string
  option?: string
  display_value?: string
}

/** Product Media - media attachments (child table) */
export interface ProductMedia {
  name?: string
  file: string
  media_type: MediaType
  title?: string
  alt_text?: string
  is_primary: boolean
  role?: string
  sort_order: number
}

/** Media type values */
export type MediaType = 'Image' | 'Video' | 'Document' | 'PDF' | 'Other'

// ============================================================================
// Sync Types
// ============================================================================

/** Sync status values */
export type SyncStatusValue = 'Not Synced' | 'Synced' | 'Pending' | 'Error' | 'Conflict'

/** Sync status information */
export interface SyncStatus {
  status: SyncStatusValue
  last_sync?: string
  erp_item?: string
  error_message?: string
  sync_direction?: 'PIM Master' | 'ERP Master' | 'Bidirectional'
}

// ============================================================================
// Completeness & Quality
// ============================================================================

/** Completeness score breakdown */
export interface CompletenessScore {
  total: number
  filled: number
  required: number
  score: number
  missing_attributes: string[]
}

/** Quality rule definition */
export interface QualityRule {
  rule_code: string
  description: string
  severity: 'error' | 'warning' | 'info'
  weight: number
  passed: boolean
}

/** Quality score result */
export interface QualityScoreResult {
  completeness: CompletenessScore
  rules: QualityRule[]
  overall_score: number
}

// ============================================================================
// API Response Types
// ============================================================================

/** Paginated product list response from get_products API */
export interface ProductListResponse {
  products: ProductMaster[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/** Product list query parameters */
export interface ProductListParams {
  product_family?: string
  status?: ProductStatus
  search?: string
  completeness_min?: number
  completeness_max?: number
  page?: number
  page_size?: number
  order_by?: string
  order_dir?: 'asc' | 'desc'
  fields?: string[]
}

/** Category tree node (from taxonomy API) */
export interface CategoryTreeNode {
  name: string
  category_name: string
  category_code: string
  parent_category?: string
  is_group: boolean
  lft: number
  rgt: number
  children?: CategoryTreeNode[]
}

/** Family tree node (from taxonomy API) */
export interface FamilyTreeNode {
  name: string
  family_name: string
  family_code: string
  parent_family?: string
  is_group: boolean
  lft: number
  rgt: number
  children?: FamilyTreeNode[]
}

/** Variant generation request */
export interface VariantGenerationRequest {
  parent_product: string
  axes: VariantAxisDefinition[]
}

/** Variant axis definition for generation */
export interface VariantAxisDefinition {
  attribute: string
  values: string[]
}

/** Variant generation result */
export interface VariantGenerationResult {
  created: number
  skipped: number
  errors: string[]
  variants: ProductVariant[]
}
