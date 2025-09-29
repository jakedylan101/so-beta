export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      music_genres: {
        Row: {
          id: string
          name: string
          created_at: string
          popularity_score: number | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          popularity_score?: number | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          popularity_score?: number | null
        }
      }
      user_preferences: {
        Row: {
          id: number
          user_id: string
          genre_id: number
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          genre_id: number
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          genre_id?: number
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          onboarded: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          onboarded?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          onboarded?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 