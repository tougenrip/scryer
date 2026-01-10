export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audio_tracks: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          duration: number | null
          id: string
          name: string
          type: string
          url: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          name: string
          type: string
          url: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          name?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_tracks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          campaign_id: string
          color: string | null
          created_at: string | null
          created_by: string
          description: string | null
          event_day: number
          event_month: number
          event_year: number
          id: string
          is_repeatable: boolean | null
          repeat_end_day: number | null
          repeat_end_month: number | null
          repeat_end_year: number | null
          repeat_interval: number | null
          repeat_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          color?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          event_day: number
          event_month: number
          event_year: number
          id?: string
          is_repeatable?: boolean | null
          repeat_end_day?: number | null
          repeat_end_month?: number | null
          repeat_end_year?: number | null
          repeat_interval?: number | null
          repeat_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          color?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          event_day?: number
          event_month?: number
          event_year?: number
          id?: string
          is_repeatable?: boolean | null
          repeat_end_day?: number | null
          repeat_end_month?: number | null
          repeat_end_year?: number | null
          repeat_interval?: number | null
          repeat_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_calendar: {
        Row: {
          campaign_id: string
          current_day: number | null
          current_month: number | null
          current_year: number | null
          custom_month_names: string[] | null
          custom_season_months: Json | null
          custom_weekday_names: string[] | null
          day_of_week: number | null
          id: string
          moon_phase: string | null
          moon_phase_day: number | null
          season: string | null
          time_speed_multiplier: number | null
          updated_at: string | null
          weather: Json | null
        }
        Insert: {
          campaign_id: string
          current_day?: number | null
          current_month?: number | null
          current_year?: number | null
          custom_month_names?: string[] | null
          custom_season_months?: Json | null
          custom_weekday_names?: string[] | null
          day_of_week?: number | null
          id?: string
          moon_phase?: string | null
          moon_phase_day?: number | null
          season?: string | null
          time_speed_multiplier?: number | null
          updated_at?: string | null
          weather?: Json | null
        }
        Update: {
          campaign_id?: string
          current_day?: number | null
          current_month?: number | null
          current_year?: number | null
          custom_month_names?: string[] | null
          custom_season_months?: Json | null
          custom_weekday_names?: string[] | null
          day_of_week?: number | null
          id?: string
          moon_phase?: string | null
          moon_phase_day?: number | null
          season?: string | null
          time_speed_multiplier?: number | null
          updated_at?: string | null
          weather?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_calendar_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_members: {
        Row: {
          campaign_id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_members_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_rolls: {
        Row: {
          advantage: boolean | null
          campaign_id: string
          character_name: string | null
          created_at: string | null
          dice_results: Json
          disadvantage: boolean | null
          id: string
          is_critical: boolean | null
          is_fumble: boolean | null
          modifier: number | null
          roll_label: string | null
          roll_notation: string
          roll_type: string | null
          total: number
          user_id: string
        }
        Insert: {
          advantage?: boolean | null
          campaign_id: string
          character_name?: string | null
          created_at?: string | null
          dice_results: Json
          disadvantage?: boolean | null
          id?: string
          is_critical?: boolean | null
          is_fumble?: boolean | null
          modifier?: number | null
          roll_label?: string | null
          roll_notation: string
          roll_type?: string | null
          total: number
          user_id: string
        }
        Update: {
          advantage?: boolean | null
          campaign_id?: string
          character_name?: string | null
          created_at?: string | null
          dice_results?: Json
          disadvantage?: boolean | null
          id?: string
          is_critical?: boolean | null
          is_fumble?: boolean | null
          modifier?: number | null
          roll_label?: string | null
          roll_notation?: string
          roll_type?: string | null
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_rolls_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_state: {
        Row: {
          active_encounter_id: string | null
          active_map_id: string | null
          campaign_id: string
          updated_at: string | null
        }
        Insert: {
          active_encounter_id?: string | null
          active_map_id?: string | null
          campaign_id: string
          updated_at?: string | null
        }
        Update: {
          active_encounter_id?: string | null
          active_map_id?: string | null
          campaign_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_state_active_encounter_id_fkey"
            columns: ["active_encounter_id"]
            isOneToOne: false
            referencedRelation: "combat_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_state_active_map_id_fkey"
            columns: ["active_map_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_state_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_timeline: {
        Row: {
          actual_date: string | null
          associated_location_ids: string[] | null
          associated_quest_ids: string[] | null
          branch_path_index: number | null
          campaign_id: string
          created_at: string | null
          description: string | null
          hidden_from_players: boolean
          id: string
          image_url: string | null
          notes: string | null
          order_index: number
          parent_entry_id: string | null
          planned_date: string | null
          session_type: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_date?: string | null
          associated_location_ids?: string[] | null
          associated_quest_ids?: string[] | null
          branch_path_index?: number | null
          campaign_id: string
          created_at?: string | null
          description?: string | null
          hidden_from_players?: boolean
          id?: string
          image_url?: string | null
          notes?: string | null
          order_index: number
          parent_entry_id?: string | null
          planned_date?: string | null
          session_type?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_date?: string | null
          associated_location_ids?: string[] | null
          associated_quest_ids?: string[] | null
          branch_path_index?: number | null
          campaign_id?: string
          created_at?: string | null
          description?: string | null
          hidden_from_players?: boolean
          id?: string
          image_url?: string | null
          notes?: string | null
          order_index?: number
          parent_entry_id?: string | null
          planned_date?: string | null
          session_type?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_timeline_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_timeline_parent_entry_id_fkey"
            columns: ["parent_entry_id"]
            isOneToOne: false
            referencedRelation: "campaign_timeline"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          active_playlist_id: string | null
          active_weather_id: string | null
          created_at: string | null
          description: string | null
          dm_user_id: string
          id: string
          name: string
          private_notes: string | null
          public_notes: string | null
          updated_at: string | null
        }
        Insert: {
          active_playlist_id?: string | null
          active_weather_id?: string | null
          created_at?: string | null
          description?: string | null
          dm_user_id: string
          id?: string
          name: string
          private_notes?: string | null
          public_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          active_playlist_id?: string | null
          active_weather_id?: string | null
          created_at?: string | null
          description?: string | null
          dm_user_id?: string
          id?: string
          name?: string
          private_notes?: string | null
          public_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_active_playlist_id_fkey"
            columns: ["active_playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_active_weather_id_fkey"
            columns: ["active_weather_id"]
            isOneToOne: false
            referencedRelation: "weather_states"
            referencedColumns: ["id"]
          },
        ]
      }
      character_class_features: {
        Row: {
          acquired_at_character_level: number | null
          character_id: string
          class_index: string
          class_level: number
          class_source: string
          created_at: string | null
          feature_description: string | null
          feature_index: string | null
          feature_name: string
          feature_specific: Json | null
          id: string
        }
        Insert: {
          acquired_at_character_level?: number | null
          character_id: string
          class_index: string
          class_level: number
          class_source: string
          created_at?: string | null
          feature_description?: string | null
          feature_index?: string | null
          feature_name: string
          feature_specific?: Json | null
          id?: string
        }
        Update: {
          acquired_at_character_level?: number | null
          character_id?: string
          class_index?: string
          class_level?: number
          class_source?: string
          created_at?: string | null
          feature_description?: string | null
          feature_index?: string | null
          feature_name?: string
          feature_specific?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_class_features_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_class_features_class"
            columns: ["character_id", "class_source", "class_index"]
            isOneToOne: false
            referencedRelation: "character_classes"
            referencedColumns: ["character_id", "class_source", "class_index"]
          },
        ]
      }
      character_classes: {
        Row: {
          character_id: string
          class_index: string
          class_source: string
          created_at: string | null
          id: string
          is_primary_class: boolean | null
          level: number
          level_acquired_at: number | null
          subclass_index: string | null
          subclass_source: string | null
          updated_at: string | null
        }
        Insert: {
          character_id: string
          class_index: string
          class_source?: string
          created_at?: string | null
          id?: string
          is_primary_class?: boolean | null
          level?: number
          level_acquired_at?: number | null
          subclass_index?: string | null
          subclass_source?: string | null
          updated_at?: string | null
        }
        Update: {
          character_id?: string
          class_index?: string
          class_source?: string
          created_at?: string | null
          id?: string
          is_primary_class?: boolean | null
          level?: number
          level_acquired_at?: number | null
          subclass_index?: string | null
          subclass_source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_classes_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_inventory: {
        Row: {
          attuned: boolean | null
          character_id: string | null
          created_at: string | null
          equipped: boolean | null
          id: string
          item_index: string | null
          item_source: string | null
          notes: string | null
          quantity: number | null
        }
        Insert: {
          attuned?: boolean | null
          character_id?: string | null
          created_at?: string | null
          equipped?: boolean | null
          id?: string
          item_index?: string | null
          item_source?: string | null
          notes?: string | null
          quantity?: number | null
        }
        Update: {
          attuned?: boolean | null
          character_id?: string | null
          created_at?: string | null
          equipped?: boolean | null
          id?: string
          item_index?: string | null
          item_source?: string | null
          notes?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "character_inventory_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_proficiencies_training: {
        Row: {
          character_id: string
          proficiency_index: string
          proficiency_source: string
          source_type: string
        }
        Insert: {
          character_id: string
          proficiency_index: string
          proficiency_source: string
          source_type: string
        }
        Update: {
          character_id?: string
          proficiency_index?: string
          proficiency_source?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_proficiencies_training_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_skills: {
        Row: {
          character_id: string
          expertise: boolean | null
          proficient: boolean | null
          skill_name: string
        }
        Insert: {
          character_id: string
          expertise?: boolean | null
          proficient?: boolean | null
          skill_name: string
        }
        Update: {
          character_id?: string
          expertise?: boolean | null
          proficient?: boolean | null
          skill_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_skills_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_spell_slots: {
        Row: {
          character_id: string
          slots_total: number | null
          slots_used: number | null
          spell_level: number
        }
        Insert: {
          character_id: string
          slots_total?: number | null
          slots_used?: number | null
          spell_level: number
        }
        Update: {
          character_id?: string
          slots_total?: number | null
          slots_used?: number | null
          spell_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "character_spell_slots_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_spells: {
        Row: {
          always_prepared: boolean | null
          character_id: string
          prepared: boolean | null
          spell_index: string
          spell_source: string
        }
        Insert: {
          always_prepared?: boolean | null
          character_id: string
          prepared?: boolean | null
          spell_index: string
          spell_source?: string
        }
        Update: {
          always_prepared?: boolean | null
          character_id?: string
          prepared?: boolean | null
          spell_index?: string
          spell_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_spells_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          alignment: string | null
          armor_class: number | null
          background: string | null
          background_details: Json | null
          campaign_id: string | null
          charisma: number | null
          charisma_save_prof: boolean | null
          class_features: Json | null
          class_index: string | null
          class_source: string | null
          conditions: string[] | null
          constitution: number | null
          constitution_save_prof: boolean | null
          created_at: string | null
          dexterity: number | null
          dexterity_save_prof: boolean | null
          experience_points: number | null
          extras: Json | null
          hit_dice_current: string | null
          hit_dice_total: string | null
          hp_current: number | null
          hp_max: number | null
          hp_temp: number | null
          id: string
          image_url: string | null
          initiative: number | null
          inspiration: boolean | null
          intelligence: number | null
          intelligence_save_prof: boolean | null
          inventory: Json | null
          level: number | null
          name: string
          notes: string | null
          proficiency_bonus: number | null
          race_index: string | null
          race_source: string | null
          senses: Json | null
          speed: number | null
          spells: Json | null
          strength: number | null
          strength_save_prof: boolean | null
          subclass_index: string | null
          subclass_source: string | null
          updated_at: string | null
          user_id: string
          uses_multiclass: boolean | null
          wisdom: number | null
          wisdom_save_prof: boolean | null
        }
        Insert: {
          alignment?: string | null
          armor_class?: number | null
          background?: string | null
          background_details?: Json | null
          campaign_id?: string | null
          charisma?: number | null
          charisma_save_prof?: boolean | null
          class_features?: Json | null
          class_index?: string | null
          class_source?: string | null
          conditions?: string[] | null
          constitution?: number | null
          constitution_save_prof?: boolean | null
          created_at?: string | null
          dexterity?: number | null
          dexterity_save_prof?: boolean | null
          experience_points?: number | null
          extras?: Json | null
          hit_dice_current?: string | null
          hit_dice_total?: string | null
          hp_current?: number | null
          hp_max?: number | null
          hp_temp?: number | null
          id?: string
          image_url?: string | null
          initiative?: number | null
          inspiration?: boolean | null
          intelligence?: number | null
          intelligence_save_prof?: boolean | null
          inventory?: Json | null
          level?: number | null
          name: string
          notes?: string | null
          proficiency_bonus?: number | null
          race_index?: string | null
          race_source?: string | null
          senses?: Json | null
          speed?: number | null
          spells?: Json | null
          strength?: number | null
          strength_save_prof?: boolean | null
          subclass_index?: string | null
          subclass_source?: string | null
          updated_at?: string | null
          user_id: string
          uses_multiclass?: boolean | null
          wisdom?: number | null
          wisdom_save_prof?: boolean | null
        }
        Update: {
          alignment?: string | null
          armor_class?: number | null
          background?: string | null
          background_details?: Json | null
          campaign_id?: string | null
          charisma?: number | null
          charisma_save_prof?: boolean | null
          class_features?: Json | null
          class_index?: string | null
          class_source?: string | null
          conditions?: string[] | null
          constitution?: number | null
          constitution_save_prof?: boolean | null
          created_at?: string | null
          dexterity?: number | null
          dexterity_save_prof?: boolean | null
          experience_points?: number | null
          extras?: Json | null
          hit_dice_current?: string | null
          hit_dice_total?: string | null
          hp_current?: number | null
          hp_max?: number | null
          hp_temp?: number | null
          id?: string
          image_url?: string | null
          initiative?: number | null
          inspiration?: boolean | null
          intelligence?: number | null
          intelligence_save_prof?: boolean | null
          inventory?: Json | null
          level?: number | null
          name?: string
          notes?: string | null
          proficiency_bonus?: number | null
          race_index?: string | null
          race_source?: string | null
          senses?: Json | null
          speed?: number | null
          spells?: Json | null
          strength?: number | null
          strength_save_prof?: boolean | null
          subclass_index?: string | null
          subclass_source?: string | null
          updated_at?: string | null
          user_id?: string
          uses_multiclass?: boolean | null
          wisdom?: number | null
          wisdom_save_prof?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "characters_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      combat_encounters: {
        Row: {
          active: boolean | null
          campaign_id: string | null
          created_at: string | null
          current_turn_index: number | null
          id: string
          map_id: string | null
          monsters: Json | null
          name: string | null
          round_number: number | null
        }
        Insert: {
          active?: boolean | null
          campaign_id?: string | null
          created_at?: string | null
          current_turn_index?: number | null
          id?: string
          map_id?: string | null
          monsters?: Json | null
          name?: string | null
          round_number?: number | null
        }
        Update: {
          active?: boolean | null
          campaign_id?: string | null
          created_at?: string | null
          current_turn_index?: number | null
          id?: string
          map_id?: string | null
          monsters?: Json | null
          name?: string | null
          round_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "combat_encounters_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combat_encounters_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
        ]
      }
      combat_participants: {
        Row: {
          conditions: string[] | null
          encounter_id: string | null
          id: string
          initiative_roll: number
          notes: string | null
          token_id: string | null
          turn_order: number
        }
        Insert: {
          conditions?: string[] | null
          encounter_id?: string | null
          id?: string
          initiative_roll: number
          notes?: string | null
          token_id?: string | null
          turn_order: number
        }
        Update: {
          conditions?: string[] | null
          encounter_id?: string | null
          id?: string
          initiative_roll?: number
          notes?: string | null
          token_id?: string | null
          turn_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "combat_participants_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "combat_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combat_participants_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      faction_relationships: {
        Row: {
          campaign_id: string
          created_at: string | null
          faction_a_id: string
          faction_b_id: string
          id: string
          public: boolean | null
          relationship_type: string | null
          secret_notes: string | null
          strength: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          faction_a_id: string
          faction_b_id: string
          id?: string
          public?: boolean | null
          relationship_type?: string | null
          secret_notes?: string | null
          strength?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          faction_a_id?: string
          faction_b_id?: string
          id?: string
          public?: boolean | null
          relationship_type?: string | null
          secret_notes?: string | null
          strength?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faction_relationships_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_relationships_faction_a_id_fkey"
            columns: ["faction_a_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_relationships_faction_b_id_fkey"
            columns: ["faction_b_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
        ]
      }
      factions: {
        Row: {
          alignment: string | null
          campaign_id: string
          created_at: string | null
          description: string | null
          emblem_sigil_url: string | null
          goals: string[] | null
          headquarters_location_id: string | null
          id: string
          influence_level: string | null
          leader_name: string | null
          leader_npc_id: string | null
          motto_creed: string | null
          name: string
          public_agenda: string | null
          resources: string[] | null
          secret_agenda: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          alignment?: string | null
          campaign_id: string
          created_at?: string | null
          description?: string | null
          emblem_sigil_url?: string | null
          goals?: string[] | null
          headquarters_location_id?: string | null
          id?: string
          influence_level?: string | null
          leader_name?: string | null
          leader_npc_id?: string | null
          motto_creed?: string | null
          name: string
          public_agenda?: string | null
          resources?: string[] | null
          secret_agenda?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          alignment?: string | null
          campaign_id?: string
          created_at?: string | null
          description?: string | null
          emblem_sigil_url?: string | null
          goals?: string[] | null
          headquarters_location_id?: string | null
          id?: string
          influence_level?: string | null
          leader_name?: string | null
          leader_npc_id?: string | null
          motto_creed?: string | null
          name?: string
          public_agenda?: string | null
          resources?: string[] | null
          secret_agenda?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factions_headquarters_location_id_fkey"
            columns: ["headquarters_location_id"]
            isOneToOne: false
            referencedRelation: "world_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factions_leader_npc_id_fkey"
            columns: ["leader_npc_id"]
            isOneToOne: false
            referencedRelation: "npcs"
            referencedColumns: ["id"]
          },
        ]
      }
      homebrew_class_proficiencies_training: {
        Row: {
          class_id: string
          proficiency_index: string
          proficiency_source: string
        }
        Insert: {
          class_id: string
          proficiency_index: string
          proficiency_source: string
        }
        Update: {
          class_id?: string
          proficiency_index?: string
          proficiency_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "homebrew_class_proficiencies_training_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "homebrew_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      homebrew_classes: {
        Row: {
          based_on_srd: string | null
          campaign_id: string | null
          class_levels: Json | null
          created_at: string | null
          created_by: string
          hit_die: number
          id: string
          name: string
          proficiencies: Json | null
          proficiency_choices: Json | null
          saving_throws: string[] | null
          spellcasting: Json | null
          starting_equipment: Json | null
        }
        Insert: {
          based_on_srd?: string | null
          campaign_id?: string | null
          class_levels?: Json | null
          created_at?: string | null
          created_by: string
          hit_die: number
          id?: string
          name: string
          proficiencies?: Json | null
          proficiency_choices?: Json | null
          saving_throws?: string[] | null
          spellcasting?: Json | null
          starting_equipment?: Json | null
        }
        Update: {
          based_on_srd?: string | null
          campaign_id?: string | null
          class_levels?: Json | null
          created_at?: string | null
          created_by?: string
          hit_die?: number
          id?: string
          name?: string
          proficiencies?: Json | null
          proficiency_choices?: Json | null
          saving_throws?: string[] | null
          spellcasting?: Json | null
          starting_equipment?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "homebrew_classes_based_on_srd_fkey"
            columns: ["based_on_srd"]
            isOneToOne: false
            referencedRelation: "srd_classes"
            referencedColumns: ["index"]
          },
          {
            foreignKeyName: "homebrew_classes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      homebrew_equipment: {
        Row: {
          armor_category: string | null
          armor_class: Json | null
          based_on_srd: string | null
          campaign_id: string | null
          category_range: string | null
          cost: Json | null
          created_at: string | null
          created_by: string
          damage: Json | null
          description: string | null
          equipment_category: string | null
          gear_category: string | null
          id: string
          name: string
          properties: Json | null
          range: Json | null
          stealth_disadvantage: boolean | null
          str_minimum: number | null
          two_handed_damage: Json | null
          weapon_category: string | null
          weapon_range: string | null
          weight: number | null
        }
        Insert: {
          armor_category?: string | null
          armor_class?: Json | null
          based_on_srd?: string | null
          campaign_id?: string | null
          category_range?: string | null
          cost?: Json | null
          created_at?: string | null
          created_by: string
          damage?: Json | null
          description?: string | null
          equipment_category?: string | null
          gear_category?: string | null
          id?: string
          name: string
          properties?: Json | null
          range?: Json | null
          stealth_disadvantage?: boolean | null
          str_minimum?: number | null
          two_handed_damage?: Json | null
          weapon_category?: string | null
          weapon_range?: string | null
          weight?: number | null
        }
        Update: {
          armor_category?: string | null
          armor_class?: Json | null
          based_on_srd?: string | null
          campaign_id?: string | null
          category_range?: string | null
          cost?: Json | null
          created_at?: string | null
          created_by?: string
          damage?: Json | null
          description?: string | null
          equipment_category?: string | null
          gear_category?: string | null
          id?: string
          name?: string
          properties?: Json | null
          range?: Json | null
          stealth_disadvantage?: boolean | null
          str_minimum?: number | null
          two_handed_damage?: Json | null
          weapon_category?: string | null
          weapon_range?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "homebrew_equipment_based_on_srd_fkey"
            columns: ["based_on_srd"]
            isOneToOne: false
            referencedRelation: "srd_equipment"
            referencedColumns: ["index"]
          },
          {
            foreignKeyName: "homebrew_equipment_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      homebrew_magic_items: {
        Row: {
          based_on_srd: string | null
          campaign_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          equipment_category: string | null
          id: string
          name: string
          rarity: string | null
          requires_attunement: boolean | null
        }
        Insert: {
          based_on_srd?: string | null
          campaign_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          equipment_category?: string | null
          id?: string
          name: string
          rarity?: string | null
          requires_attunement?: boolean | null
        }
        Update: {
          based_on_srd?: string | null
          campaign_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          equipment_category?: string | null
          id?: string
          name?: string
          rarity?: string | null
          requires_attunement?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "homebrew_magic_items_based_on_srd_fkey"
            columns: ["based_on_srd"]
            isOneToOne: false
            referencedRelation: "srd_magic_items"
            referencedColumns: ["index"]
          },
          {
            foreignKeyName: "homebrew_magic_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      homebrew_monsters: {
        Row: {
          actions: Json | null
          alignment: string | null
          armor_class: number | null
          based_on_srd: string | null
          campaign_id: string | null
          challenge_rating: number | null
          charisma: number | null
          condition_immunities: string[] | null
          constitution: number | null
          created_at: string | null
          created_by: string
          damage_immunities: string[] | null
          damage_resistances: string[] | null
          damage_vulnerabilities: string[] | null
          dexterity: number | null
          hit_dice: string | null
          hit_points: number | null
          id: string
          intelligence: number | null
          languages: string | null
          legendary_actions: Json | null
          name: string
          proficiencies: Json | null
          reactions: Json | null
          senses: Json | null
          size: string | null
          special_abilities: Json | null
          speed: Json | null
          strength: number | null
          subtype: string | null
          type: string | null
          wisdom: number | null
          xp: number | null
        }
        Insert: {
          actions?: Json | null
          alignment?: string | null
          armor_class?: number | null
          based_on_srd?: string | null
          campaign_id?: string | null
          challenge_rating?: number | null
          charisma?: number | null
          condition_immunities?: string[] | null
          constitution?: number | null
          created_at?: string | null
          created_by: string
          damage_immunities?: string[] | null
          damage_resistances?: string[] | null
          damage_vulnerabilities?: string[] | null
          dexterity?: number | null
          hit_dice?: string | null
          hit_points?: number | null
          id?: string
          intelligence?: number | null
          languages?: string | null
          legendary_actions?: Json | null
          name: string
          proficiencies?: Json | null
          reactions?: Json | null
          senses?: Json | null
          size?: string | null
          special_abilities?: Json | null
          speed?: Json | null
          strength?: number | null
          subtype?: string | null
          type?: string | null
          wisdom?: number | null
          xp?: number | null
        }
        Update: {
          actions?: Json | null
          alignment?: string | null
          armor_class?: number | null
          based_on_srd?: string | null
          campaign_id?: string | null
          challenge_rating?: number | null
          charisma?: number | null
          condition_immunities?: string[] | null
          constitution?: number | null
          created_at?: string | null
          created_by?: string
          damage_immunities?: string[] | null
          damage_resistances?: string[] | null
          damage_vulnerabilities?: string[] | null
          dexterity?: number | null
          hit_dice?: string | null
          hit_points?: number | null
          id?: string
          intelligence?: number | null
          languages?: string | null
          legendary_actions?: Json | null
          name?: string
          proficiencies?: Json | null
          reactions?: Json | null
          senses?: Json | null
          size?: string | null
          special_abilities?: Json | null
          speed?: Json | null
          strength?: number | null
          subtype?: string | null
          type?: string | null
          wisdom?: number | null
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "homebrew_monsters_based_on_srd_fkey"
            columns: ["based_on_srd"]
            isOneToOne: false
            referencedRelation: "srd_monsters"
            referencedColumns: ["index"]
          },
          {
            foreignKeyName: "homebrew_monsters_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      homebrew_proficiencies_training: {
        Row: {
          based_on_srd: string | null
          campaign_id: string
          category: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          index: string
          name: string
          type: string
        }
        Insert: {
          based_on_srd?: string | null
          campaign_id: string
          category?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          index: string
          name: string
          type: string
        }
        Update: {
          based_on_srd?: string | null
          campaign_id?: string
          category?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          index?: string
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "homebrew_proficiencies_training_based_on_srd_fkey"
            columns: ["based_on_srd"]
            isOneToOne: false
            referencedRelation: "srd_proficiencies_training"
            referencedColumns: ["index"]
          },
          {
            foreignKeyName: "homebrew_proficiencies_training_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      homebrew_race_proficiencies_training: {
        Row: {
          proficiency_index: string
          proficiency_source: string
          race_id: string
        }
        Insert: {
          proficiency_index: string
          proficiency_source: string
          race_id: string
        }
        Update: {
          proficiency_index?: string
          proficiency_source?: string
          race_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homebrew_race_proficiencies_training_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "homebrew_races"
            referencedColumns: ["id"]
          },
        ]
      }
      homebrew_race_traits: {
        Row: {
          race_id: string
          trait_index: string
          trait_source: string
        }
        Insert: {
          race_id: string
          trait_index: string
          trait_source: string
        }
        Update: {
          race_id?: string
          trait_index?: string
          trait_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "homebrew_race_traits_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "homebrew_races"
            referencedColumns: ["id"]
          },
        ]
      }
      homebrew_races: {
        Row: {
          ability_bonuses: Json | null
          based_on_srd: string | null
          campaign_id: string | null
          created_at: string | null
          created_by: string
          id: string
          language_desc: string | null
          languages: Json | null
          name: string
          size: string | null
          size_description: string | null
          speed: number | null
          traits: Json | null
        }
        Insert: {
          ability_bonuses?: Json | null
          based_on_srd?: string | null
          campaign_id?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          language_desc?: string | null
          languages?: Json | null
          name: string
          size?: string | null
          size_description?: string | null
          speed?: number | null
          traits?: Json | null
        }
        Update: {
          ability_bonuses?: Json | null
          based_on_srd?: string | null
          campaign_id?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          language_desc?: string | null
          languages?: Json | null
          name?: string
          size?: string | null
          size_description?: string | null
          speed?: number | null
          traits?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "homebrew_races_based_on_srd_fkey"
            columns: ["based_on_srd"]
            isOneToOne: false
            referencedRelation: "srd_races"
            referencedColumns: ["index"]
          },
          {
            foreignKeyName: "homebrew_races_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      homebrew_racial_traits: {
        Row: {
          based_on_srd: string | null
          campaign_id: string
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          index: string
          name: string
        }
        Insert: {
          based_on_srd?: string | null
          campaign_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          index: string
          name: string
        }
        Update: {
          based_on_srd?: string | null
          campaign_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          index?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "homebrew_racial_traits_based_on_srd_fkey"
            columns: ["based_on_srd"]
            isOneToOne: false
            referencedRelation: "srd_racial_traits"
            referencedColumns: ["index"]
          },
          {
            foreignKeyName: "homebrew_racial_traits_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      homebrew_spells: {
        Row: {
          based_on_srd: string | null
          campaign_id: string | null
          casting_time: string | null
          classes: string[] | null
          components: string[] | null
          concentration: boolean | null
          created_at: string | null
          created_by: string
          description: string | null
          duration: string | null
          higher_level: string | null
          id: string
          level: number
          material: string | null
          name: string
          range: string | null
          ritual: boolean | null
          school: string
        }
        Insert: {
          based_on_srd?: string | null
          campaign_id?: string | null
          casting_time?: string | null
          classes?: string[] | null
          components?: string[] | null
          concentration?: boolean | null
          created_at?: string | null
          created_by: string
          description?: string | null
          duration?: string | null
          higher_level?: string | null
          id?: string
          level: number
          material?: string | null
          name: string
          range?: string | null
          ritual?: boolean | null
          school: string
        }
        Update: {
          based_on_srd?: string | null
          campaign_id?: string | null
          casting_time?: string | null
          classes?: string[] | null
          components?: string[] | null
          concentration?: boolean | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration?: string | null
          higher_level?: string | null
          id?: string
          level?: number
          material?: string | null
          name?: string
          range?: string | null
          ritual?: boolean | null
          school?: string
        }
        Relationships: [
          {
            foreignKeyName: "homebrew_spells_based_on_srd_fkey"
            columns: ["based_on_srd"]
            isOneToOne: false
            referencedRelation: "srd_spells"
            referencedColumns: ["index"]
          },
          {
            foreignKeyName: "homebrew_spells_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      homebrew_subclasses: {
        Row: {
          based_on_srd: string | null
          campaign_id: string | null
          class_name: string
          created_at: string | null
          created_by: string
          description: string | null
          features: Json | null
          id: string
          name: string
          subclass_flavor: string | null
        }
        Insert: {
          based_on_srd?: string | null
          campaign_id?: string | null
          class_name: string
          created_at?: string | null
          created_by: string
          description?: string | null
          features?: Json | null
          id?: string
          name: string
          subclass_flavor?: string | null
        }
        Update: {
          based_on_srd?: string | null
          campaign_id?: string | null
          class_name?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          features?: Json | null
          id?: string
          name?: string
          subclass_flavor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homebrew_subclasses_based_on_srd_fkey"
            columns: ["based_on_srd"]
            isOneToOne: false
            referencedRelation: "srd_subclasses"
            referencedColumns: ["index"]
          },
          {
            foreignKeyName: "homebrew_subclasses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      location_markers: {
        Row: {
          campaign_id: string
          color: string | null
          created_at: string | null
          description: string | null
          icon_type: string | null
          id: string
          location_id: string | null
          map_id: string | null
          name: string | null
          scene_id: string | null
          size: string | null
          status_icon: string | null
          visible: boolean | null
          x: number
          y: number
        }
        Insert: {
          campaign_id: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon_type?: string | null
          id?: string
          location_id?: string | null
          map_id?: string | null
          name?: string | null
          scene_id?: string | null
          size?: string | null
          status_icon?: string | null
          visible?: boolean | null
          x: number
          y: number
        }
        Update: {
          campaign_id?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon_type?: string | null
          id?: string
          location_id?: string | null
          map_id?: string | null
          name?: string | null
          scene_id?: string | null
          size?: string | null
          status_icon?: string | null
          visible?: boolean | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "location_markers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_markers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "world_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_markers_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_markers_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      location_relationships: {
        Row: {
          affection_score: number | null
          campaign_id: string
          control_status: string | null
          controlling_location_id: string | null
          created_at: string | null
          id: string
          location_a_id: string
          location_b_id: string
          notes: string | null
          relationship_type: string | null
        }
        Insert: {
          affection_score?: number | null
          campaign_id: string
          control_status?: string | null
          controlling_location_id?: string | null
          created_at?: string | null
          id?: string
          location_a_id: string
          location_b_id: string
          notes?: string | null
          relationship_type?: string | null
        }
        Update: {
          affection_score?: number | null
          campaign_id?: string
          control_status?: string | null
          controlling_location_id?: string | null
          created_at?: string | null
          id?: string
          location_a_id?: string
          location_b_id?: string
          notes?: string | null
          relationship_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_relationships_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_relationships_controlling_location_id_fkey"
            columns: ["controlling_location_id"]
            isOneToOne: false
            referencedRelation: "world_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_relationships_location_a_id_fkey"
            columns: ["location_a_id"]
            isOneToOne: false
            referencedRelation: "world_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_relationships_location_b_id_fkey"
            columns: ["location_b_id"]
            isOneToOne: false
            referencedRelation: "world_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      media_items: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          fog_data: Json | null
          grid_config: Json | null
          id: string
          image_url: string | null
          name: string
          type: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          fog_data?: Json | null
          grid_config?: Json | null
          id?: string
          image_url?: string | null
          name: string
          type?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          fog_data?: Json | null
          grid_config?: Json | null
          id?: string
          image_url?: string | null
          name?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      npcs: {
        Row: {
          appearance: string | null
          background: string | null
          campaign_id: string
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          location: string | null
          name: string
          notes: string | null
          personality: string | null
          updated_at: string | null
        }
        Insert: {
          appearance?: string | null
          background?: string | null
          campaign_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          name: string
          notes?: string | null
          personality?: string | null
          updated_at?: string | null
        }
        Update: {
          appearance?: string | null
          background?: string | null
          campaign_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          personality?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "npcs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          campaign_id: string | null
          completed: boolean | null
          created_at: string | null
          description: string
          id: string
          order: number | null
        }
        Insert: {
          campaign_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          description: string
          id?: string
          order?: number | null
        }
        Update: {
          campaign_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string
          id?: string
          order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "objectives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      pantheon_deities: {
        Row: {
          alignment: string | null
          campaign_id: string
          created_at: string | null
          description: string | null
          domain: string[] | null
          holy_days: string[] | null
          id: string
          image_url: string | null
          name: string
          symbol: string | null
          title: string | null
          updated_at: string | null
          worshipers_location_ids: string[] | null
        }
        Insert: {
          alignment?: string | null
          campaign_id: string
          created_at?: string | null
          description?: string | null
          domain?: string[] | null
          holy_days?: string[] | null
          id?: string
          image_url?: string | null
          name: string
          symbol?: string | null
          title?: string | null
          updated_at?: string | null
          worshipers_location_ids?: string[] | null
        }
        Update: {
          alignment?: string | null
          campaign_id?: string
          created_at?: string | null
          description?: string | null
          domain?: string[] | null
          holy_days?: string[] | null
          id?: string
          image_url?: string | null
          name?: string
          symbol?: string | null
          title?: string | null
          updated_at?: string | null
          worshipers_location_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "pantheon_deities_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string
          is_global: boolean | null
          name: string
          tracks: Json | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          is_global?: boolean | null
          name: string
          tracks?: Json | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          is_global?: boolean | null
          name?: string
          tracks?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "playlists_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          campaign_id: string
          content: string
          created_at: string | null
          created_by: string
          id: string
          location: string | null
          source: string | null
          title: string
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          campaign_id: string
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          location?: string | null
          source?: string | null
          title: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          campaign_id?: string
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          location?: string | null
          source?: string | null
          title?: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "rumors_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_strength_overrides: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          relationship_key: string
          source_id: string
          source_type: string
          strength: number
          target_id: string
          target_type: string
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          relationship_key: string
          source_id: string
          source_type: string
          strength: number
          target_id: string
          target_type: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          relationship_key?: string
          source_id?: string
          source_type?: string
          strength?: number
          target_id?: string
          target_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relationship_strength_overrides_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          campaign_id: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      srd_background_proficiencies_training: {
        Row: {
          background_index: string
          proficiency_index: string
        }
        Insert: {
          background_index: string
          proficiency_index: string
        }
        Update: {
          background_index?: string
          proficiency_index?: string
        }
        Relationships: [
          {
            foreignKeyName: "srd_background_proficiencies_training_background_index_fkey"
            columns: ["background_index"]
            isOneToOne: false
            referencedRelation: "srd_backgrounds"
            referencedColumns: ["index"]
          },
          {
            foreignKeyName: "srd_background_proficiencies_training_proficiency_index_fkey"
            columns: ["proficiency_index"]
            isOneToOne: false
            referencedRelation: "srd_proficiencies_training"
            referencedColumns: ["index"]
          },
        ]
      }
      srd_backgrounds: {
        Row: {
          ability_score_increase: string | null
          created_at: string | null
          description: string | null
          equipment: string | null
          feature: string | null
          id: string
          index: string
          languages: string | null
          name: string
          skill_proficiencies: string | null
          tool_proficiencies: string | null
        }
        Insert: {
          ability_score_increase?: string | null
          created_at?: string | null
          description?: string | null
          equipment?: string | null
          feature?: string | null
          id?: string
          index: string
          languages?: string | null
          name: string
          skill_proficiencies?: string | null
          tool_proficiencies?: string | null
        }
        Update: {
          ability_score_increase?: string | null
          created_at?: string | null
          description?: string | null
          equipment?: string | null
          feature?: string | null
          id?: string
          index?: string
          languages?: string | null
          name?: string
          skill_proficiencies?: string | null
          tool_proficiencies?: string | null
        }
        Relationships: []
      }
      srd_class_proficiencies_training: {
        Row: {
          class_index: string
          proficiency_index: string
        }
        Insert: {
          class_index: string
          proficiency_index: string
        }
        Update: {
          class_index?: string
          proficiency_index?: string
        }
        Relationships: [
          {
            foreignKeyName: "srd_class_proficiencies_training_class_index_fkey"
            columns: ["class_index"]
            isOneToOne: false
            referencedRelation: "srd_classes"
            referencedColumns: ["index"]
          },
          {
            foreignKeyName: "srd_class_proficiencies_training_proficiency_index_fkey"
            columns: ["proficiency_index"]
            isOneToOne: false
            referencedRelation: "srd_proficiencies_training"
            referencedColumns: ["index"]
          },
        ]
      }
      srd_classes: {
        Row: {
          class_levels: Json | null
          created_at: string | null
          hit_die: number
          id: string
          index: string
          name: string
          proficiencies: Json | null
          proficiency_choices: Json | null
          saving_throws: string[] | null
          spellcasting: Json | null
          starting_equipment: Json | null
          subclasses: string[] | null
        }
        Insert: {
          class_levels?: Json | null
          created_at?: string | null
          hit_die: number
          id?: string
          index: string
          name: string
          proficiencies?: Json | null
          proficiency_choices?: Json | null
          saving_throws?: string[] | null
          spellcasting?: Json | null
          starting_equipment?: Json | null
          subclasses?: string[] | null
        }
        Update: {
          class_levels?: Json | null
          created_at?: string | null
          hit_die?: number
          id?: string
          index?: string
          name?: string
          proficiencies?: Json | null
          proficiency_choices?: Json | null
          saving_throws?: string[] | null
          spellcasting?: Json | null
          starting_equipment?: Json | null
          subclasses?: string[] | null
        }
        Relationships: []
      }
      srd_equipment: {
        Row: {
          armor_category: string | null
          armor_class: Json | null
          category_range: string | null
          cost: Json | null
          created_at: string | null
          damage: Json | null
          description: string | null
          equipment_category: string | null
          gear_category: string | null
          id: string
          index: string
          name: string
          properties: Json | null
          range: Json | null
          stealth_disadvantage: boolean | null
          str_minimum: number | null
          two_handed_damage: Json | null
          weapon_category: string | null
          weapon_range: string | null
          weight: number | null
        }
        Insert: {
          armor_category?: string | null
          armor_class?: Json | null
          category_range?: string | null
          cost?: Json | null
          created_at?: string | null
          damage?: Json | null
          description?: string | null
          equipment_category?: string | null
          gear_category?: string | null
          id?: string
          index: string
          name: string
          properties?: Json | null
          range?: Json | null
          stealth_disadvantage?: boolean | null
          str_minimum?: number | null
          two_handed_damage?: Json | null
          weapon_category?: string | null
          weapon_range?: string | null
          weight?: number | null
        }
        Update: {
          armor_category?: string | null
          armor_class?: Json | null
          category_range?: string | null
          cost?: Json | null
          created_at?: string | null
          damage?: Json | null
          description?: string | null
          equipment_category?: string | null
          gear_category?: string | null
          id?: string
          index?: string
          name?: string
          properties?: Json | null
          range?: Json | null
          stealth_disadvantage?: boolean | null
          str_minimum?: number | null
          two_handed_damage?: Json | null
          weapon_category?: string | null
          weapon_range?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      srd_features: {
        Row: {
          class_index: string | null
          created_at: string | null
          description: string | null
          feature_specific: Json | null
          id: string
          index: string
          level: number | null
          name: string
          subclass_index: string | null
        }
        Insert: {
          class_index?: string | null
          created_at?: string | null
          description?: string | null
          feature_specific?: Json | null
          id?: string
          index: string
          level?: number | null
          name: string
          subclass_index?: string | null
        }
        Update: {
          class_index?: string | null
          created_at?: string | null
          description?: string | null
          feature_specific?: Json | null
          id?: string
          index?: string
          level?: number | null
          name?: string
          subclass_index?: string | null
        }
        Relationships: []
      }
      srd_magic_items: {
        Row: {
          created_at: string | null
          description: string | null
          equipment_category: string | null
          id: string
          index: string
          name: string
          rarity: string | null
          requires_attunement: boolean | null
          variant_of: string | null
          variants: string[] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          equipment_category?: string | null
          id?: string
          index: string
          name: string
          rarity?: string | null
          requires_attunement?: boolean | null
          variant_of?: string | null
          variants?: string[] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          equipment_category?: string | null
          id?: string
          index?: string
          name?: string
          rarity?: string | null
          requires_attunement?: boolean | null
          variant_of?: string | null
          variants?: string[] | null
        }
        Relationships: []
      }
      srd_monsters: {
        Row: {
          actions: Json | null
          alignment: string | null
          armor_class: number | null
          challenge_rating: number | null
          charisma: number | null
          condition_immunities: string[] | null
          constitution: number | null
          created_at: string | null
          damage_immunities: string[] | null
          damage_resistances: string[] | null
          damage_vulnerabilities: string[] | null
          dexterity: number | null
          hit_dice: string | null
          hit_points: number | null
          id: string
          index: string
          intelligence: number | null
          languages: string | null
          legendary_actions: Json | null
          name: string
          proficiencies: Json | null
          reactions: Json | null
          senses: Json | null
          size: string | null
          special_abilities: Json | null
          speed: Json | null
          strength: number | null
          subtype: string | null
          type: string | null
          wisdom: number | null
          xp: number | null
        }
        Insert: {
          actions?: Json | null
          alignment?: string | null
          armor_class?: number | null
          challenge_rating?: number | null
          charisma?: number | null
          condition_immunities?: string[] | null
          constitution?: number | null
          created_at?: string | null
          damage_immunities?: string[] | null
          damage_resistances?: string[] | null
          damage_vulnerabilities?: string[] | null
          dexterity?: number | null
          hit_dice?: string | null
          hit_points?: number | null
          id?: string
          index: string
          intelligence?: number | null
          languages?: string | null
          legendary_actions?: Json | null
          name: string
          proficiencies?: Json | null
          reactions?: Json | null
          senses?: Json | null
          size?: string | null
          special_abilities?: Json | null
          speed?: Json | null
          strength?: number | null
          subtype?: string | null
          type?: string | null
          wisdom?: number | null
          xp?: number | null
        }
        Update: {
          actions?: Json | null
          alignment?: string | null
          armor_class?: number | null
          challenge_rating?: number | null
          charisma?: number | null
          condition_immunities?: string[] | null
          constitution?: number | null
          created_at?: string | null
          damage_immunities?: string[] | null
          damage_resistances?: string[] | null
          damage_vulnerabilities?: string[] | null
          dexterity?: number | null
          hit_dice?: string | null
          hit_points?: number | null
          id?: string
          index: string
          intelligence?: number | null
          languages?: string | null
          legendary_actions?: Json | null
          name: string
          proficiencies?: Json | null
          reactions?: Json | null
          senses?: Json | null
          size?: string | null
          special_abilities?: Json | null
          speed?: Json | null
          strength?: number | null
          subtype?: string | null
          type?: string | null
          wisdom?: number | null
          xp?: number | null
        }
        Relationships: []
      }
      srd_proficiencies_training: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          index: string
          name: string
          type: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          index: string
          name: string
          type: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          index?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      srd_race_proficiencies_training: {
        Row: {
          proficiency_index: string
          race_index: string
        }
        Insert: {
          proficiency_index: string
          race_index: string
        }
        Update: {
          proficiency_index?: string
          race_index?: string
        }
        Relationships: [
          {
            foreignKeyName: "srd_race_proficiencies_training_proficiency_index_fkey"
            columns: ["proficiency_index"]
            isOneToOne: false
            referencedRelation: "srd_proficiencies_training"
            referencedColumns: ["index"]
          },
          {
            foreignKeyName: "srd_race_proficiencies_training_race_index_fkey"
            columns: ["race_index"]
            isOneToOne: false
            referencedRelation: "srd_races"
            referencedColumns: ["index"]
          },
        ]
      }
      srd_race_traits: {
        Row: {
          race_index: string
          trait_index: string
        }
        Insert: {
          race_index: string
          trait_index: string
        }
        Update: {
          race_index?: string
          trait_index?: string
        }
        Relationships: [
          {
            foreignKeyName: "srd_race_traits_race_index_fkey"
            columns: ["race_index"]
            isOneToOne: false
            referencedRelation: "srd_races"
            referencedColumns: ["index"]
          },
          {
            foreignKeyName: "srd_race_traits_trait_index_fkey"
            columns: ["trait_index"]
            isOneToOne: false
            referencedRelation: "srd_racial_traits"
            referencedColumns: ["index"]
          },
        ]
      }
      srd_races: {
        Row: {
          ability_bonuses: Json | null
          created_at: string | null
          id: string
          index: string
          language_desc: string | null
          languages: Json | null
          name: string
          size: string | null
          size_description: string | null
          speed: number | null
          subraces: string[] | null
          traits: Json | null
        }
        Insert: {
          ability_bonuses?: Json | null
          created_at?: string | null
          id?: string
          index: string
          language_desc?: string | null
          languages?: Json | null
          name: string
          size?: string | null
          size_description?: string | null
          speed?: number | null
          subraces?: string[] | null
          traits?: Json | null
        }
        Update: {
          ability_bonuses?: Json | null
          created_at?: string | null
          id?: string
          index?: string
          language_desc?: string | null
          languages?: Json | null
          name?: string
          size?: string | null
          size_description?: string | null
          speed?: number | null
          subraces?: string[] | null
          traits?: Json | null
        }
        Relationships: []
      }
      srd_racial_traits: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          index: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          index: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          index?: string
          name?: string
        }
        Relationships: []
      }
      srd_spells: {
        Row: {
          casting_time: string | null
          classes: string[] | null
          components: string[] | null
          concentration: boolean | null
          created_at: string | null
          description: string | null
          duration: string | null
          higher_level: string | null
          id: string
          index: string
          level: number
          material: string | null
          name: string
          range: string | null
          ritual: boolean | null
          school: string
        }
        Insert: {
          casting_time?: string | null
          classes?: string[] | null
          components?: string[] | null
          concentration?: boolean | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          higher_level?: string | null
          id?: string
          index: string
          level: number
          material?: string | null
          name: string
          range?: string | null
          ritual?: boolean | null
          school: string
        }
        Update: {
          casting_time?: string | null
          classes?: string[] | null
          components?: string[] | null
          concentration?: boolean | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          higher_level?: string | null
          id?: string
          index?: string
          level?: number
          material?: string | null
          name?: string
          range?: string | null
          ritual?: boolean | null
          school?: string
        }
        Relationships: []
      }
      srd_subclasses: {
        Row: {
          class_index: string | null
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          index: string
          name: string
          subclass_flavor: string | null
        }
        Insert: {
          class_index?: string | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          index: string
          name: string
          subclass_flavor?: string | null
        }
        Update: {
          class_index?: string | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          index?: string
          name?: string
          subclass_flavor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "srd_subclasses_class_index_fkey"
            columns: ["class_index"]
            isOneToOne: false
            referencedRelation: "srd_classes"
            referencedColumns: ["index"]
          },
        ]
      }
      srd2024_ability_scores: {
        Row: {
          created_at: string | null
          description: string | null
          full_name: string | null
          id: string
          index: string
          name: string
          skills: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          id?: string
          index: string
          name: string
          skills?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          id?: string
          index?: string
          name?: string
          skills?: Json | null
        }
        Relationships: []
      }
      srd2024_alignments: {
        Row: {
          abbreviation: string | null
          created_at: string | null
          description: string | null
          id: string
          index: string
          name: string
        }
        Insert: {
          abbreviation?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          index: string
          name: string
        }
        Update: {
          abbreviation?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          index?: string
          name?: string
        }
        Relationships: []
      }
      srd2024_backgrounds: {
        Row: {
          ability_scores: Json | null
          created_at: string | null
          equipment_options: Json | null
          feat: Json | null
          id: string
          index: string
          name: string
          proficiencies: Json | null
          proficiency_choices: Json | null
        }
        Insert: {
          ability_scores?: Json | null
          created_at?: string | null
          equipment_options?: Json | null
          feat?: Json | null
          id?: string
          index: string
          name: string
          proficiencies?: Json | null
          proficiency_choices?: Json | null
        }
        Update: {
          ability_scores?: Json | null
          created_at?: string | null
          equipment_options?: Json | null
          feat?: Json | null
          id?: string
          index?: string
          name?: string
          proficiencies?: Json | null
          proficiency_choices?: Json | null
        }
        Relationships: []
      }
      srd2024_classes: {
        Row: {
          class_levels: Json | null
          created_at: string | null
          hit_die: number | null
          id: string
          index: string
          name: string
          proficiencies: Json | null
          proficiency_choices: Json | null
          saving_throws: string[] | null
          spellcasting: Json | null
          starting_equipment: Json | null
          subclasses: string[] | null
        }
        Insert: {
          class_levels?: Json | null
          created_at?: string | null
          hit_die?: number | null
          id?: string
          index: string
          name: string
          proficiencies?: Json | null
          proficiency_choices?: Json | null
          saving_throws?: string[] | null
          spellcasting?: Json | null
          starting_equipment?: Json | null
          subclasses?: string[] | null
        }
        Update: {
          class_levels?: Json | null
          created_at?: string | null
          hit_die?: number | null
          id?: string
          index?: string
          name?: string
          proficiencies?: Json | null
          proficiency_choices?: Json | null
          saving_throws?: string[] | null
          spellcasting?: Json | null
          starting_equipment?: Json | null
          subclasses?: string[] | null
        }
        Relationships: []
      }
      srd2024_conditions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          index: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          index: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          index?: string
          name?: string
        }
        Relationships: []
      }
      srd2024_damage_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          index: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          index: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          index?: string
          name?: string
        }
        Relationships: []
      }
      srd2024_equipment: {
        Row: {
          ability: Json | null
          armor_category: string | null
          armor_class: Json | null
          cost: Json | null
          craft: Json | null
          created_at: string | null
          damage: Json | null
          description: string | null
          equipment_categories: Json | null
          id: string
          index: string
          mastery: Json | null
          name: string
          properties: Json | null
          range: Json | null
          stealth_disadvantage: boolean | null
          str_minimum: number | null
          throw_range: Json | null
          two_handed_damage: Json | null
          utilize: Json | null
          weapon_category: string | null
          weapon_range: string | null
          weight: number | null
        }
        Insert: {
          ability?: Json | null
          armor_category?: string | null
          armor_class?: Json | null
          cost?: Json | null
          craft?: Json | null
          created_at?: string | null
          damage?: Json | null
          description?: string | null
          equipment_categories?: Json | null
          id?: string
          index: string
          mastery?: Json | null
          name: string
          properties?: Json | null
          range?: Json | null
          stealth_disadvantage?: boolean | null
          str_minimum?: number | null
          throw_range?: Json | null
          two_handed_damage?: Json | null
          utilize?: Json | null
          weapon_category?: string | null
          weapon_range?: string | null
          weight?: number | null
        }
        Update: {
          ability?: Json | null
          armor_category?: string | null
          armor_class?: Json | null
          cost?: Json | null
          craft?: Json | null
          created_at?: string | null
          damage?: Json | null
          description?: string | null
          equipment_categories?: Json | null
          id?: string
          index?: string
          mastery?: Json | null
          name?: string
          properties?: Json | null
          range?: Json | null
          stealth_disadvantage?: boolean | null
          str_minimum?: number | null
          throw_range?: Json | null
          two_handed_damage?: Json | null
          utilize?: Json | null
          weapon_category?: string | null
          weapon_range?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      srd2024_equipment_categories: {
        Row: {
          created_at: string | null
          equipment: Json | null
          id: string
          index: string
          name: string
        }
        Insert: {
          created_at?: string | null
          equipment?: Json | null
          id?: string
          index: string
          name: string
        }
        Update: {
          created_at?: string | null
          equipment?: Json | null
          id?: string
          index?: string
          name?: string
        }
        Relationships: []
      }
      srd2024_feats: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          index: string
          name: string
          repeatable: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          index: string
          name: string
          repeatable?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          index?: string
          name?: string
          repeatable?: string | null
          type?: string | null
        }
        Relationships: []
      }
      srd2024_languages: {
        Row: {
          created_at: string | null
          id: string
          index: string
          is_rare: boolean | null
          name: string
          note: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          index: string
          is_rare?: boolean | null
          name: string
          note?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          index?: string
          is_rare?: boolean | null
          name?: string
          note?: string | null
        }
        Relationships: []
      }
      srd2024_magic_schools: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          index: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          index: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          index?: string
          name?: string
        }
        Relationships: []
      }
      srd2024_proficiencies: {
        Row: {
          backgrounds: Json | null
          classes: Json | null
          created_at: string | null
          id: string
          index: string
          name: string
          reference: Json | null
          species: Json | null
          type: string | null
        }
        Insert: {
          backgrounds?: Json | null
          classes?: Json | null
          created_at?: string | null
          id?: string
          index: string
          name: string
          reference?: Json | null
          species?: Json | null
          type?: string | null
        }
        Update: {
          backgrounds?: Json | null
          classes?: Json | null
          created_at?: string | null
          id?: string
          index?: string
          name?: string
          reference?: Json | null
          species?: Json | null
          type?: string | null
        }
        Relationships: []
      }
      srd2024_races: {
        Row: {
          ability_bonuses: Json | null
          created_at: string | null
          id: string
          index: string
          language_desc: string | null
          languages: Json | null
          name: string
          size: string | null
          size_description: string | null
          speed: number | null
          subraces: string[] | null
          traits: Json | null
        }
        Insert: {
          ability_bonuses?: Json | null
          created_at?: string | null
          id?: string
          index: string
          language_desc?: string | null
          languages?: Json | null
          name: string
          size?: string | null
          size_description?: string | null
          speed?: number | null
          subraces?: string[] | null
          traits?: Json | null
        }
        Update: {
          ability_bonuses?: Json | null
          created_at?: string | null
          id?: string
          index?: string
          language_desc?: string | null
          languages?: Json | null
          name?: string
          size?: string | null
          size_description?: string | null
          speed?: number | null
          subraces?: string[] | null
          traits?: Json | null
        }
        Relationships: []
      }
      srd2024_skills: {
        Row: {
          ability_score: Json | null
          created_at: string | null
          description: string | null
          id: string
          index: string
          name: string
        }
        Insert: {
          ability_score?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          index: string
          name: string
        }
        Update: {
          ability_score?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          index?: string
          name?: string
        }
        Relationships: []
      }
      srd2024_spells: {
        Row: {
          casting_time: string | null
          classes: string[] | null
          components: string[] | null
          concentration: boolean | null
          created_at: string | null
          description: string | null
          duration: string | null
          higher_level: string | null
          id: string
          index: string
          level: number | null
          material: string | null
          name: string
          range: string | null
          ritual: boolean | null
          school: string | null
        }
        Insert: {
          casting_time?: string | null
          classes?: string[] | null
          components?: string[] | null
          concentration?: boolean | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          higher_level?: string | null
          id?: string
          index: string
          level?: number | null
          material?: string | null
          name: string
          range?: string | null
          ritual?: boolean | null
          school?: string | null
        }
        Update: {
          casting_time?: string | null
          classes?: string[] | null
          components?: string[] | null
          concentration?: boolean | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          higher_level?: string | null
          id?: string
          index?: string
          level?: number | null
          material?: string | null
          name?: string
          range?: string | null
          ritual?: boolean | null
          school?: string | null
        }
        Relationships: []
      }
      srd2024_subclasses: {
        Row: {
          class_index: string | null
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          index: string
          name: string
          subclass_flavor: string | null
        }
        Insert: {
          class_index?: string | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          index: string
          name: string
          subclass_flavor?: string | null
        }
        Update: {
          class_index?: string | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          index?: string
          name?: string
          subclass_flavor?: string | null
        }
        Relationships: []
      }
      srd2024_weapon_mastery: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          index: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          index: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          index?: string
          name?: string
        }
        Relationships: []
      }
      srd2024_weapon_properties: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          index: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          index: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          index?: string
          name?: string
        }
        Relationships: []
      }
      tokens: {
        Row: {
          character_id: string | null
          color: string | null
          conditions: string[] | null
          created_at: string | null
          hp_current: number | null
          hp_max: number | null
          id: string
          map_id: string | null
          monster_index: string | null
          monster_source: string | null
          name: string | null
          rotation: number | null
          scale: number | null
          size: string | null
          visible_to: string[] | null
          x: number
          y: number
        }
        Insert: {
          character_id?: string | null
          color?: string | null
          conditions?: string[] | null
          created_at?: string | null
          hp_current?: number | null
          hp_max?: number | null
          id?: string
          map_id?: string | null
          monster_index?: string | null
          monster_source?: string | null
          name?: string | null
          rotation?: number | null
          scale?: number | null
          size?: string | null
          visible_to?: string[] | null
          x: number
          y: number
        }
        Update: {
          character_id?: string | null
          color?: string | null
          conditions?: string[] | null
          created_at?: string | null
          hp_current?: number | null
          hp_max?: number | null
          id?: string
          map_id?: string | null
          monster_index?: string | null
          monster_source?: string | null
          name?: string | null
          rotation?: number | null
          scale?: number | null
          size?: string | null
          visible_to?: string[] | null
          x: number
          y: number
        }
        Relationships: [
          {
            foreignKeyName: "tokens_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tokens_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_states: {
        Row: {
          campaign_id: string | null
          config: Json | null
          created_at: string | null
          id: string
          intensity: number | null
          name: string
          type: string
        }
        Insert: {
          campaign_id?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          intensity?: number | null
          name: string
          type: string
        }
        Update: {
          campaign_id?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          intensity?: number | null
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_states_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      world_locations: {
        Row: {
          campaign_id: string
          created_at: string | null
          description: string | null
          dm_notes: string | null
          hidden_from_players: boolean
          id: string
          image_url: string | null
          map_level: number | null
          marker_color: string | null
          metadata: Json | null
          name: string
          parent_location_id: string | null
          status: string | null
          type: string
          updated_at: string | null
          x_coordinate: number | null
          y_coordinate: number | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          description?: string | null
          dm_notes?: string | null
          hidden_from_players?: boolean
          id?: string
          image_url?: string | null
          map_level?: number | null
          marker_color?: string | null
          metadata?: Json | null
          name: string
          parent_location_id?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          x_coordinate?: number | null
          y_coordinate?: number | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          description?: string | null
          dm_notes?: string | null
          hidden_from_players?: boolean
          id?: string
          image_url?: string | null
          map_level?: number | null
          marker_color?: string | null
          metadata?: Json | null
          name?: string
          parent_location_id?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          x_coordinate?: number | null
          y_coordinate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "world_locations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "world_locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_campaign_dm: { Args: { campaign_uuid: string }; Returns: boolean }
      is_campaign_member: { Args: { campaign_uuid: string }; Returns: boolean }
      is_user_dm_of_campaign: {
        Args: { campaign_uuid: string }
        Returns: boolean
      }
      is_user_member_of_campaign: {
        Args: { campaign_uuid: string }
        Returns: boolean
      }
      user_campaigns: { Args: never; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
