import { AppShell } from '@/components/layout/app-shell'; import { MaterialsTable } from '@/components/tables/materials-table'; import { materials } from '@/lib/mock-data';
export default function Materials(){return <AppShell><h1 className="mb-6 text-3xl font-bold">Materials Passport</h1><MaterialsTable data={materials}/></AppShell>}
