-- Share Links & User Search RPCs
-- Adds token-based share links for projects and email-based user search

-- =============================================================================
-- SHARE LINKS TABLE
-- =============================================================================

CREATE TABLE project_share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    permission share_permission DEFAULT 'view',
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_links_token ON project_share_links(token);
CREATE INDEX idx_share_links_project ON project_share_links(project_id);

-- =============================================================================
-- RLS FOR SHARE LINKS
-- =============================================================================

ALTER TABLE project_share_links ENABLE ROW LEVEL SECURITY;

-- Project owners can do everything with their links
CREATE POLICY "Project owners can manage share links"
    ON project_share_links FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_share_links.project_id
            AND projects.owner_id = auth.uid()
        )
    );

-- Project admins can manage share links
CREATE POLICY "Project admins can manage share links"
    ON project_share_links FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM project_shares
            WHERE project_shares.project_id = project_share_links.project_id
            AND project_shares.shared_with_user_id = auth.uid()
            AND project_shares.permission = 'admin'
        )
    );

-- =============================================================================
-- RPC: Accept a share link
-- =============================================================================

CREATE OR REPLACE FUNCTION accept_share_link(token_input TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    link_record RECORD;
    result_project_id UUID;
BEGIN
    -- Find the link
    SELECT * INTO link_record
    FROM project_share_links
    WHERE token = token_input
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW());

    IF link_record IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired share link';
    END IF;

    -- Don't let the project owner accept their own link
    IF EXISTS (
        SELECT 1 FROM projects
        WHERE id = link_record.project_id
        AND owner_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'You already own this project';
    END IF;

    -- Insert the share (ignore if already shared)
    INSERT INTO project_shares (project_id, shared_with_user_id, permission)
    VALUES (link_record.project_id, auth.uid(), link_record.permission)
    ON CONFLICT (project_id, shared_with_user_id) DO NOTHING;

    RETURN link_record.project_id;
END;
$$;

