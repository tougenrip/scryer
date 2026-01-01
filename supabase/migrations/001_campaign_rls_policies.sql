-- Enable RLS on campaigns table
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Enable RLS on campaign_members table
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;

-- Enable RLS on campaign_state table
ALTER TABLE campaign_state ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CAMPAIGNS TABLE POLICIES
-- ============================================

-- Allow users to create campaigns where they are the DM
CREATE POLICY "Users can create campaigns as DM"
  ON campaigns
  FOR INSERT
  WITH CHECK (auth.uid() = dm_user_id);

-- Allow users to view campaigns where they are members
CREATE POLICY "Users can view campaigns they are members of"
  ON campaigns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = campaigns.id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- Allow DMs to update their own campaigns
CREATE POLICY "DMs can update their campaigns"
  ON campaigns
  FOR UPDATE
  USING (auth.uid() = dm_user_id)
  WITH CHECK (auth.uid() = dm_user_id);

-- Allow DMs to delete their own campaigns
CREATE POLICY "DMs can delete their campaigns"
  ON campaigns
  FOR DELETE
  USING (auth.uid() = dm_user_id);

-- ============================================
-- CAMPAIGN_MEMBERS TABLE POLICIES
-- ============================================

-- Allow users to view members of campaigns they belong to
-- Uses user_campaigns() SECURITY DEFINER function to avoid recursion
CREATE POLICY "Users can view members of their campaigns"
  ON campaign_members
  FOR SELECT
  USING (
    campaign_id IN (SELECT user_campaigns())
  );

-- Allow DMs to add members to their campaigns
CREATE POLICY "DMs can add members to their campaigns"
  ON campaign_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = campaign_members.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Allow users to add themselves as members (for join functionality)
CREATE POLICY "Users can join campaigns"
  ON campaign_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow DMs to update members of their campaigns
CREATE POLICY "DMs can update members of their campaigns"
  ON campaign_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = campaign_members.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Allow DMs to remove members from their campaigns
CREATE POLICY "DMs can remove members from their campaigns"
  ON campaign_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = campaign_members.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Allow users to remove themselves from campaigns
CREATE POLICY "Users can leave campaigns"
  ON campaign_members
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- CAMPAIGN_STATE TABLE POLICIES
-- ============================================

-- Allow users to view campaign state for campaigns they belong to
CREATE POLICY "Users can view campaign state of their campaigns"
  ON campaign_state
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = campaign_state.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- Allow DMs to create campaign state for their campaigns
CREATE POLICY "DMs can create campaign state"
  ON campaign_state
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = campaign_state.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Allow DMs to update campaign state for their campaigns
CREATE POLICY "DMs can update campaign state"
  ON campaign_state
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = campaign_state.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

