import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: ProfileInsert; Update: ProfileUpdate }
      works: { Row: Work; Insert: WorkInsert; Update: WorkUpdate }
      vehicles: { Row: Vehicle; Insert: VehicleInsert; Update: VehicleUpdate }
      tools: { Row: Tool; Insert: ToolInsert; Update: ToolUpdate }
      workers: { Row: Worker; Insert: WorkerInsert; Update: WorkerUpdate }
      approvals: { Row: Approval; Insert: ApprovalInsert; Update: ApprovalUpdate }
      documents: { Row: Document; Insert: DocumentInsert; Update: DocumentUpdate }
      custody: { Row: Custody; Insert: CustodyInsert; Update: CustodyUpdate }
      inventory: { Row: Inventory; Insert: InventoryInsert; Update: InventoryUpdate }
      inventory_movements: { Row: InventoryMovement; Insert: InventoryMovementInsert; Update: never }
      attachments: { Row: Attachment; Insert: AttachmentInsert; Update: never }
      activity_log: { Row: ActivityLog; Insert: ActivityLogInsert; Update: never }
    }
  }
}

export interface Profile {
  id: string; full_name: string; role: 'admin' | 'viewer'; created_at: string
}
export interface ProfileInsert { id: string; full_name: string; role: 'admin' | 'viewer' }
export interface ProfileUpdate { full_name?: string; role?: 'admin' | 'viewer' }

export interface Work {
  id: string; item_no?: string; description?: string; location?: string
  quantity?: number; unit?: string; progress?: number
  status?: 'لم يبدأ' | 'جاري التنفيذ' | 'منجز' | 'متوقف'
  start_date?: string; end_date?: string; responsible?: string; notes?: string
  created_by?: string; updated_by?: string; created_at: string; updated_at: string
}
export type WorkInsert = Omit<Work, 'id' | 'created_at' | 'updated_at'>
export type WorkUpdate = Partial<WorkInsert>

export interface Vehicle {
  id: string; vehicle_no?: string; vehicle_type?: string; plate_no?: string
  driver_name?: string; status?: string; last_maintenance?: string
  registration_expiry?: string; insurance_expiry?: string; notes?: string
  created_by?: string; updated_by?: string; created_at: string; updated_at: string
}
export type VehicleInsert = Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>
export type VehicleUpdate = Partial<VehicleInsert>

export interface Tool {
  id: string; tool_name: string; tool_type?: string; total_qty?: number
  available_qty?: number; used_qty?: number; status?: string; storage_location?: string
  received_by?: string; handover_date?: string; return_date?: string; notes?: string
  created_by?: string; updated_by?: string; created_at: string; updated_at: string
}
export type ToolInsert = Omit<Tool, 'id' | 'created_at' | 'updated_at'>
export type ToolUpdate = Partial<ToolInsert>

export interface Worker {
  id: string; worker_name: string; iqama_no?: string; job_title?: string
  mobile?: string; nationality?: string; iqama_expiry?: string
  work_permit_expiry?: string; status?: string; current_location?: string; notes?: string
  created_by?: string; updated_by?: string; created_at: string; updated_at: string
}
export type WorkerInsert = Omit<Worker, 'id' | 'created_at' | 'updated_at'>
export type WorkerUpdate = Partial<WorkerInsert>

export interface Approval {
  id: string; approval_no?: string; material_name: string; material_code?: string
  manufacturer?: string; supplier?: string; submitted_date?: string; status?: string
  revision_no?: string; file_url?: string; notes?: string
  created_by?: string; updated_by?: string; created_at: string; updated_at: string
}
export type ApprovalInsert = Omit<Approval, 'id' | 'created_at' | 'updated_at'>
export type ApprovalUpdate = Partial<ApprovalInsert>

export interface Document {
  id: string; document_name: string; document_type?: string; document_no?: string
  issue_date?: string; expiry_date?: string; issuer?: string; status?: string
  file_url?: string; notes?: string
  created_by?: string; updated_by?: string; created_at: string; updated_at: string
}
export type DocumentInsert = Omit<Document, 'id' | 'created_at' | 'updated_at'>
export type DocumentUpdate = Partial<DocumentInsert>

export interface Custody {
  id: string; custody_no?: string; item_name: string; quantity?: number
  received_by?: string; job_title?: string; handover_date?: string; status?: string
  return_date?: string; notes?: string
  created_by?: string; updated_by?: string; created_at: string; updated_at: string
}
export type CustodyInsert = Omit<Custody, 'id' | 'created_at' | 'updated_at'>
export type CustodyUpdate = Partial<CustodyInsert>

export interface Inventory {
  id: string; item_code?: string; item_name: string; category?: string; unit?: string
  current_qty?: number; min_qty?: number; received_qty?: number; issued_qty?: number
  storage_location?: string; supplier?: string; last_update?: string; notes?: string
  created_by?: string; updated_by?: string; created_at: string; updated_at: string
}
export type InventoryInsert = Omit<Inventory, 'id' | 'created_at' | 'updated_at'>
export type InventoryUpdate = Partial<InventoryInsert>

export interface InventoryMovement {
  id: string; inventory_id: string; movement_type: 'وارد' | 'منصرف' | 'مرتجع' | 'تالف'
  quantity: number; movement_date?: string; notes?: string; created_by?: string; created_at: string
}
export type InventoryMovementInsert = Omit<InventoryMovement, 'id' | 'created_at'>

export interface Attachment {
  id: string; section_name: string; record_id: string; file_name: string
  file_url: string; uploaded_by?: string; created_at: string
}
export type AttachmentInsert = Omit<Attachment, 'id' | 'created_at'>

export interface ActivityLog {
  id: string; user_id?: string; user_name?: string; action_type: string
  section_name?: string; record_id?: string; old_data?: any; new_data?: any; created_at: string
}
export type ActivityLogInsert = Omit<ActivityLog, 'id' | 'created_at'>
