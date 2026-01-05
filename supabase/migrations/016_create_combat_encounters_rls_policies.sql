-- RLS Policies for combat_encounters table
-- Encounters are universal - all campaign members can create and manage them

-- Allow campaign members to view encounters in their campaigns
CREATE POLICY "Campaign members can view encounters"
  ON combat_encounters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = combat_encounters.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- Allow campaign members to create encounters
CREATE POLICY "Campaign members can create encounters"
  ON combat_encounters
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = combat_encounters.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- Allow campaign members to update encounters
CREATE POLICY "Campaign members can update encounters"
  ON combat_encounters
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = combat_encounters.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = combat_encounters.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- Allow campaign members to delete encounters
CREATE POLICY "Campaign members can delete encounters"
  ON combat_encounters
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = combat_encounters.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );


