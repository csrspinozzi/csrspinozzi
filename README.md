# Circular House Construction Management Platform

A Next.js 15, TypeScript, Tailwind CSS, shadcn/ui-inspired platform for managing circular residential construction projects.

## Stack

- Next.js 15 App Router and React 19
- TypeScript
- Tailwind CSS with shadcn/ui-style primitives
- Supabase database, Auth, Storage, RLS, and Realtime
- React Hook Form and Zod for validated CRUD forms
- TanStack Table for material passports
- Recharts for embodied-carbon analytics
- Lucide Icons

## Modules

- Landing page and authenticated dashboard shell
- Project CRUD foundation with validated React Hook Form forms
- Materials passport table with circularity, supplier, and embodied-carbon fields
- Task board organized by status and priority
- Document storage module targeting the `project-documents` Supabase bucket
- Role permission helpers for owner, project manager, site lead, supplier, and viewer roles
- Supabase SQL migration with RLS policies, storage policies, realtime publication, and seed data

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase setup

Apply the migration and seed data in order:

```bash
supabase db push
supabase db reset --seed supabase/seed/seed.sql
```

The migration creates `profiles`, `projects`, `project_members`, `materials`, `tasks`, and `documents`, enables RLS, creates role-aware policies, creates the private `project-documents` bucket, and adds project tables to Supabase Realtime.

## Permissions

Permissions are enforced in two layers:

1. PostgreSQL RLS policies in `supabase/migrations/001_initial_schema.sql`.
2. UI permission helpers in `src/lib/permissions.ts`.

## Notes

This repository was converted from a static Astro/WordPress export into a Next.js product application. Existing public media assets are retained for future marketing content reuse.
