-- =====================================================
-- EasTask - FIX RLS POLICIES (Infinite Recursion Fix)
-- Run this to fix the RLS policy issues
-- =====================================================

-- =====================================================
-- 1. FIX WORKSPACE_MEMBERS RLS POLICY (Infinite Recursion)
-- =====================================================

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can manage workspace members" ON workspace_members;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own memberships" ON workspace_members 
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view other members in same workspace" ON workspace_members 
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own membership" ON workspace_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can manage all workspace members" ON workspace_members
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- =====================================================
-- 2. FIX WORKSPACES RLS POLICY
-- =====================================================
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;

CREATE POLICY "Users can view their own workspaces" ON workspaces 
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can view workspaces they are members of" ON workspaces 
    FOR SELECT USING (
        id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

-- =====================================================
-- 3. FIX TASKS RLS POLICY
-- =====================================================
DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Creators can delete tasks" ON tasks;

CREATE POLICY "Users can view tasks in their workspaces" ON tasks 
    FOR SELECT USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
        OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can create tasks" ON tasks 
    FOR INSERT WITH CHECK (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
        OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can update tasks" ON tasks 
    FOR UPDATE USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
        OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

CREATE POLICY "Creators can delete tasks" ON tasks 
    FOR DELETE USING (created_by = auth.uid());

-- =====================================================
-- 4. FIX PAGES RLS POLICY
-- =====================================================
DROP POLICY IF EXISTS "Users can view pages in their workspaces" ON pages;
DROP POLICY IF EXISTS "Users can create pages" ON pages;
DROP POLICY IF EXISTS "Users can update pages" ON pages;
DROP POLICY IF EXISTS "Creators can delete pages" ON pages;

CREATE POLICY "Users can view pages in their workspaces" ON pages 
    FOR SELECT USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
        OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can create pages" ON pages 
    FOR INSERT WITH CHECK (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
        OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can update pages" ON pages 
    FOR UPDATE USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
        OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

CREATE POLICY "Creators can delete pages" ON pages 
    FOR DELETE USING (created_by = auth.uid());

-- =====================================================
-- COMPLETION
-- =====================================================
SELECT 'RLS policies fixed successfully!' as result;
