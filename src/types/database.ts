export type Role = 'owner'|'project_manager'|'site_lead'|'supplier'|'viewer';
export type ProjectStatus = 'planning'|'permitting'|'active'|'paused'|'complete';
export type MaterialStatus = 'specified'|'ordered'|'delivered'|'installed'|'reused'|'recycled';
export type TaskStatus = 'todo'|'in_progress'|'blocked'|'done';
export interface Profile { id:string; full_name:string; role:Role; company?:string; avatar_url?:string; }
export interface Project { id:string; name:string; code:string; status:ProjectStatus; address:string; budget:number; start_date:string; target_date:string; diversion_goal:number; created_at:string; }
export interface Material { id:string; project_id:string; name:string; category:string; status:MaterialStatus; quantity:number; unit:string; embodied_carbon_kg:number; circularity_score:number; supplier:string; }
export interface Task { id:string; project_id:string; title:string; status:TaskStatus; assignee_id?:string; due_date:string; priority:'low'|'medium'|'high'|'critical'; }
export interface DocumentRecord { id:string; project_id:string; name:string; path:string; type:string; uploaded_by:string; created_at:string; }
