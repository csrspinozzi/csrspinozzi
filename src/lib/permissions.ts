import type { Role } from '@/types/database';
const matrix: Record<Role, string[]> = {
  owner: ['*'], project_manager: ['project:read','project:write','material:write','task:write','document:write','analytics:read'],
  site_lead: ['project:read','material:write','task:write','document:write'], supplier: ['project:read','material:write','document:write'], viewer: ['project:read','analytics:read']
};
export function can(role: Role, permission: string) { return matrix[role]?.includes('*') || matrix[role]?.includes(permission); }
export const roles = Object.keys(matrix) as Role[];
