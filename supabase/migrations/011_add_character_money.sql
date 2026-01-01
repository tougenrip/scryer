-- Migration: Add money JSONB column to characters table
-- Stores character currency: {cp: 0, sp: 0, ep: 0, gp: 0, pp: 0}

-- Add money JSONB column
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS money JSONB DEFAULT '{"cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0}'::jsonb;

-- Add comment
COMMENT ON COLUMN characters.money IS 'Character currency: {"cp": number, "sp": number, "ep": number, "gp": number, "pp": number}';

-- Create index for money queries
CREATE INDEX IF NOT EXISTS idx_characters_money_gin ON characters USING GIN (money);
