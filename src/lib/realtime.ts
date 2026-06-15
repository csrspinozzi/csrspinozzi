'use client';
import { createClient } from '@/lib/supabase';
export function subscribeToProject(projectId: string, onChange: () => void) { const supabase=createClient(); const channel=supabase.channel(`project:${projectId}`).on('postgres_changes',{event:'*',schema:'public',table:'tasks',filter:`project_id=eq.${projectId}`},onChange).on('postgres_changes',{event:'*',schema:'public',table:'materials',filter:`project_id=eq.${projectId}`},onChange).subscribe(); return () => { supabase.removeChannel(channel); }; }
