-- Add audio_url column to media_items table to support sound files
-- This allows DMs to upload audio files (music, sound effects) to the media library

ALTER TABLE media_items 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN media_items.audio_url IS 'URL to the audio file stored in Supabase Storage. Used for sound type media items.';

-- Update the type column CHECK constraint to include 'sound' if it exists
-- Note: If there's no CHECK constraint on type, this will be a no-op
DO $$
DECLARE
    constraint_name TEXT;
    constraint_def TEXT;
BEGIN
    -- Find the constraint name for type column
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'media_items'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%type%';
    
    -- If constraint exists, check if it needs updating
    IF constraint_name IS NOT NULL THEN
        SELECT pg_get_constraintdef(oid) INTO constraint_def
        FROM pg_constraint
        WHERE conname = constraint_name;
        
        -- Only update if 'sound' is not already in the constraint
        IF constraint_def NOT LIKE '%sound%' THEN
            -- Drop the old constraint
            EXECUTE format('ALTER TABLE media_items DROP CONSTRAINT %I', constraint_name);
            
            -- Add new constraint with 'sound' included
            ALTER TABLE media_items ADD CONSTRAINT media_items_type_check 
              CHECK (type IS NULL OR type IN ('map', 'token', 'prop', 'sound'));
        END IF;
    END IF;
END $$;

-- Ensure RLS INSERT policy allows inserts with audio_url
-- Drop and recreate the INSERT policy to ensure it works with the new column
DO $$
BEGIN
    -- Drop existing INSERT policy if it exists
    DROP POLICY IF EXISTS "media_items_insert_policy" ON media_items;
    
    -- Recreate INSERT policy that allows campaign members and DMs to insert media items
    -- This policy works for both image_url and audio_url columns
    CREATE POLICY "media_items_insert_policy"
      ON media_items
      FOR INSERT
      WITH CHECK (
        campaign_id IS NULL OR
        EXISTS (
          SELECT 1
          FROM campaign_members
          WHERE campaign_members.campaign_id = media_items.campaign_id
          AND campaign_members.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1
          FROM campaigns
          WHERE campaigns.id = media_items.campaign_id
          AND campaigns.dm_user_id = auth.uid()
        )
      );
END $$;
