-- Add quest steps and objectives tables
-- This allows quests to have multiple steps, each with objectives that can be marked as success or failure

-- Create quest_steps table
CREATE TABLE IF NOT EXISTS quest_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(quest_id, step_order)
);

-- Create quest_objectives table
CREATE TABLE IF NOT EXISTS quest_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES quest_steps(id) ON DELETE CASCADE,
  objective_order INTEGER NOT NULL,
  goal TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failure')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(step_id, objective_order)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quest_steps_quest_id ON quest_steps(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_steps_order ON quest_steps(quest_id, step_order);
CREATE INDEX IF NOT EXISTS idx_quest_objectives_step_id ON quest_objectives(step_id);
CREATE INDEX IF NOT EXISTS idx_quest_objectives_order ON quest_objectives(step_id, objective_order);
CREATE INDEX IF NOT EXISTS idx_quest_objectives_status ON quest_objectives(status);

-- Add comments
COMMENT ON TABLE quest_steps IS 'Steps within a quest, each with a description';
COMMENT ON TABLE quest_objectives IS 'Objectives within a quest step that can be marked as success or failure';
COMMENT ON COLUMN quest_steps.step_order IS 'Order of the step within the quest';
COMMENT ON COLUMN quest_objectives.objective_order IS 'Order of the objective within the step';
COMMENT ON COLUMN quest_objectives.status IS 'Status of the objective: pending, success, or failure';

-- Enable RLS
ALTER TABLE quest_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_objectives ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quest_steps
CREATE POLICY "Campaign members can view quest steps"
  ON quest_steps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quests
      JOIN campaign_members ON campaign_members.campaign_id = quests.campaign_id
      WHERE quests.id = quest_steps.quest_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can create quest steps"
  ON quest_steps
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quests
      JOIN campaigns ON campaigns.id = quests.campaign_id
      WHERE quests.id = quest_steps.quest_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can update quest steps"
  ON quest_steps
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quests
      JOIN campaigns ON campaigns.id = quests.campaign_id
      WHERE quests.id = quest_steps.quest_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quests
      JOIN campaigns ON campaigns.id = quests.campaign_id
      WHERE quests.id = quest_steps.quest_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can delete quest steps"
  ON quest_steps
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM quests
      JOIN campaigns ON campaigns.id = quests.campaign_id
      WHERE quests.id = quest_steps.quest_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- RLS Policies for quest_objectives
CREATE POLICY "Campaign members can view quest objectives"
  ON quest_objectives
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quest_steps
      JOIN quests ON quests.id = quest_steps.quest_id
      JOIN campaign_members ON campaign_members.campaign_id = quests.campaign_id
      WHERE quest_steps.id = quest_objectives.step_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can create quest objectives"
  ON quest_objectives
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quest_steps
      JOIN quests ON quests.id = quest_steps.quest_id
      JOIN campaigns ON campaigns.id = quests.campaign_id
      WHERE quest_steps.id = quest_objectives.step_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can update quest objectives"
  ON quest_objectives
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quest_steps
      JOIN quests ON quests.id = quest_steps.quest_id
      JOIN campaigns ON campaigns.id = quests.campaign_id
      WHERE quest_steps.id = quest_objectives.step_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quest_steps
      JOIN quests ON quests.id = quest_steps.quest_id
      JOIN campaigns ON campaigns.id = quests.campaign_id
      WHERE quest_steps.id = quest_objectives.step_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can delete quest objectives"
  ON quest_objectives
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM quest_steps
      JOIN quests ON quests.id = quest_steps.quest_id
      JOIN campaigns ON campaigns.id = quests.campaign_id
      WHERE quest_steps.id = quest_objectives.step_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp for quest_steps
CREATE OR REPLACE FUNCTION update_quest_steps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for quest_steps
CREATE TRIGGER update_quest_steps_updated_at
  BEFORE UPDATE ON quest_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_quest_steps_updated_at();

-- Create function to update updated_at timestamp for quest_objectives
CREATE OR REPLACE FUNCTION update_quest_objectives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for quest_objectives
CREATE TRIGGER update_quest_objectives_updated_at
  BEFORE UPDATE ON quest_objectives
  FOR EACH ROW
  EXECUTE FUNCTION update_quest_objectives_updated_at();

