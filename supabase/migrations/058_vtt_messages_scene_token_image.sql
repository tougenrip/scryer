-- VTT chat, active scene on campaign, token portrait URL

-- Token image from media library (optional; character image still used when null)
ALTER TABLE tokens
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN tokens.image_url IS 'Optional portrait URL (e.g. from media_items). Overrides character image for display when set.';

-- DM-pushed scene for all players in VTT
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS active_vtt_map_id UUID REFERENCES media_items(id) ON DELETE SET NULL;

COMMENT ON COLUMN campaigns.active_vtt_map_id IS 'When set, clients in VTT sync to this media_items map (scene handout).';

CREATE INDEX IF NOT EXISTS idx_campaigns_active_vtt_map_id ON campaigns(active_vtt_map_id);

-- Session chat / roll log
CREATE TABLE IF NOT EXISTS vtt_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  map_id UUID REFERENCES media_items(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vtt_messages_campaign_created ON vtt_messages(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vtt_messages_map ON vtt_messages(map_id);

ALTER TABLE vtt_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: campaign members or DM
CREATE POLICY "vtt_messages_select"
  ON vtt_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = vtt_messages.campaign_id
        AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = vtt_messages.campaign_id
        AND c.dm_user_id = auth.uid()
    )
  );

-- INSERT: campaign members or DM
CREATE POLICY "vtt_messages_insert"
  ON vtt_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM campaign_members cm
        WHERE cm.campaign_id = vtt_messages.campaign_id
          AND cm.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM campaigns c
        WHERE c.id = vtt_messages.campaign_id
          AND c.dm_user_id = auth.uid()
      )
    )
  );

-- DELETE: author or DM
CREATE POLICY "vtt_messages_delete"
  ON vtt_messages
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = vtt_messages.campaign_id
        AND c.dm_user_id = auth.uid()
    )
  );

-- UPDATE campaigns.active_vtt_map_id: DM only (reuse existing campaign update policies if any)
-- If no broad policy exists, add DM-only update for this column via existing campaign policies.
