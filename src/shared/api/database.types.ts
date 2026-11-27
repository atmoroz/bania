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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addons: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_visible: boolean
          name: string
          price: number
          slug: string
          sort_order: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          name: string
          price: number
          slug: string
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          name?: string
          price?: number
          slug?: string
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_previews: {
        Row: {
          payload: Json
          scope: string
          updated_at: string
        }
        Insert: {
          payload: Json
          scope: string
          updated_at?: string
        }
        Update: {
          payload?: Json
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_rooms: {
        Row: {
          booking_id: string
          id: string
          is_active: boolean
          occupied: unknown
          room_id: string
        }
        Insert: {
          booking_id: string
          id?: string
          is_active?: boolean
          occupied: unknown
          room_id: string
        }
        Update: {
          booking_id?: string
          id?: string
          is_active?: boolean
          occupied?: unknown
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_rooms_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_rooms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          buffer_minutes: number
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          ends_at: string
          hold_expires_at: string | null
          id: string
          note: string | null
          offering_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          buffer_minutes?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          ends_at: string
          hold_expires_at?: string | null
          id?: string
          note?: string | null
          offering_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          buffer_minutes?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          ends_at?: string
          hold_expires_at?: string | null
          id?: string
          note?: string | null
          offering_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      closures: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          reason: string | null
          room_id: string | null
          starts_on: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          reason?: string | null
          room_id?: string | null
          starts_on: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          reason?: string | null
          room_id?: string | null
          starts_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "closures_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          is_visible: boolean
          media_id: string
          room_id: string | null
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean
          media_id: string
          room_id?: string | null
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean
          media_id?: string
          room_id?: string | null
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photos_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_photos_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          alt: string
          created_at: string
          height: number | null
          id: string
          storage_path: string
          updated_at: string
          width: number | null
        }
        Insert: {
          alt?: string
          created_at?: string
          height?: number | null
          id?: string
          storage_path: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt?: string
          created_at?: string
          height?: number | null
          id?: string
          storage_path?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: []
      }
      opening_hours: {
        Row: {
          closes_at: string | null
          created_at: string
          id: string
          is_closed: boolean
          opens_at: string | null
          room_id: string | null
          updated_at: string
          weekday: number
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          opens_at?: string | null
          room_id?: string | null
          updated_at?: string
          weekday: number
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          opens_at?: string | null
          room_id?: string | null
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "opening_hours_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      page_block_drafts: {
        Row: {
          block_id: string
          content: Json
          is_visible: boolean
          updated_at: string
        }
        Insert: {
          block_id: string
          content: Json
          is_visible: boolean
          updated_at?: string
        }
        Update: {
          block_id?: string
          content?: Json
          is_visible?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_block_drafts_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: true
            referencedRelation: "page_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      page_blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["block_type"]
          content: Json
          created_at: string
          id: string
          is_visible: boolean
          page_slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          block_type: Database["public"]["Enums"]["block_type"]
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          page_slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          block_type?: Database["public"]["Enums"]["block_type"]
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          page_slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_blocks_page_slug_fkey"
            columns: ["page_slug"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["slug"]
          },
        ]
      }
      pages: {
        Row: {
          created_at: string
          is_visible: boolean
          nav_label: string
          seo_description: string | null
          seo_title: string | null
          show_in_nav: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_visible?: boolean
          nav_label: string
          seo_description?: string | null
          seo_title?: string | null
          show_in_nav?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_visible?: boolean
          nav_label?: string
          seo_description?: string | null
          seo_title?: string | null
          show_in_nav?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string | null
          body: string | null
          context: string | null
          created_at: string
          id: string
          is_approved: boolean
          rating: number
          room_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          body?: string | null
          context?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          rating: number
          room_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          body?: string | null
          context?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          rating?: number
          room_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_components: {
        Row: {
          component_id: string
          room_id: string
        }
        Insert: {
          component_id: string
          room_id: string
        }
        Update: {
          component_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_components_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          media_id: string
          room_id: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          media_id: string
          room_id: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          media_id?: string
          room_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_photos_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_photos_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          accepts_bookings: boolean
          buffer_minutes: number | null
          capacity: number | null
          cover_media_id: string | null
          created_at: string
          cta_label: string | null
          description: string | null
          eyebrow: string | null
          highlights: string[]
          id: string
          is_featured: boolean
          is_visible: boolean
          min_duration_minutes: number | null
          name: string
          price_per_hour: number | null
          short_description: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          accepts_bookings?: boolean
          buffer_minutes?: number | null
          capacity?: number | null
          cover_media_id?: string | null
          created_at?: string
          cta_label?: string | null
          description?: string | null
          eyebrow?: string | null
          highlights?: string[]
          id?: string
          is_featured?: boolean
          is_visible?: boolean
          min_duration_minutes?: number | null
          name: string
          price_per_hour?: number | null
          short_description?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          accepts_bookings?: boolean
          buffer_minutes?: number | null
          capacity?: number | null
          cover_media_id?: string | null
          created_at?: string
          cta_label?: string | null
          description?: string | null
          eyebrow?: string | null
          highlights?: string[]
          id?: string
          is_featured?: boolean
          is_visible?: boolean
          min_duration_minutes?: number | null
          name?: string
          price_per_hour?: number | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_sections: {
        Row: {
          created_at: string
          id: string
          intro: string | null
          is_visible: boolean
          items: Json
          kind: string
          note: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intro?: string | null
          is_visible?: boolean
          items?: Json
          kind?: string
          note?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intro?: string | null
          is_visible?: boolean
          items?: Json
          kind?: string
          note?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          address: string | null
          buffer_minutes: number
          created_at: string
          email: string | null
          extra_phone_display: string | null
          hold_minutes: number
          id: boolean
          map_url: string | null
          min_duration_minutes: number
          opening_hours_note: string
          phone_display: string
          phone_e164: string
          site_title: string
          slot_step_minutes: number
          updated_at: string
          wordmark: string
        }
        Insert: {
          address?: string | null
          buffer_minutes?: number
          created_at?: string
          email?: string | null
          extra_phone_display?: string | null
          hold_minutes?: number
          id?: boolean
          map_url?: string | null
          min_duration_minutes?: number
          opening_hours_note?: string
          phone_display?: string
          phone_e164?: string
          site_title?: string
          slot_step_minutes?: number
          updated_at?: string
          wordmark?: string
        }
        Update: {
          address?: string | null
          buffer_minutes?: number
          created_at?: string
          email?: string | null
          extra_phone_display?: string | null
          hold_minutes?: number
          id?: boolean
          map_url?: string | null
          min_duration_minutes?: number
          opening_hours_note?: string
          phone_display?: string
          phone_e164?: string
          site_title?: string
          slot_step_minutes?: number
          updated_at?: string
          wordmark?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          kind: Database["public"]["Enums"]["social_kind"]
          label: string | null
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          kind: Database["public"]["Enums"]["social_kind"]
          label?: string | null
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          kind?: Database["public"]["Enums"]["social_kind"]
          label?: string | null
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      busy_intervals: {
        Row: {
          hold_expires_at: string | null
          occupied: unknown
          room_id: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_rooms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      delete_media: { Args: { ids: string[] }; Returns: number }
      expire_stale_holds: { Args: never; Returns: number }
      hold_state: {
        Args: { p_ids: string[] }
        Returns: {
          expires_at: string
          state: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      media_usage: {
        Args: never
        Returns: {
          kind: string
          label: string
          media_id: string
        }[]
      }
      minimum_minutes: {
        Args: { r: Database["public"]["Tables"]["rooms"]["Row"] }
        Returns: number
      }
      place_hold: {
        Args: {
          p_room_slug: string
          p_slot_minutes?: number
          p_slot_starts: string[]
        }
        Returns: string[]
      }
      release_hold: { Args: { p_ids: string[] }; Returns: number }
      room_locks: {
        Args: never
        Returns: {
          bookings: number
          part_of: number
          room_id: string
        }[]
      }
      room_minimum_minutes: { Args: { p_room_slug: string }; Returns: number }
      room_minimums: {
        Args: never
        Returns: {
          minimum_minutes: number
          slug: string
        }[]
      }
      room_schedule_for_date: {
        Args: { p_date: string; p_room_id: string }
        Returns: {
          buffer_minutes: number
          closes_at: string
          is_open: boolean
          min_duration_minutes: number
          opens_at: string
        }[]
      }
      room_schedule_for_range: {
        Args: { p_from: string; p_room_id: string; p_to: string }
        Returns: {
          buffer_minutes: number
          closes_at: string
          day: string
          is_open: boolean
          min_duration_minutes: number
          opens_at: string
        }[]
      }
      room_units: { Args: { p_room_id: string }; Returns: string[] }
      save_addons: { Args: { payload: Json }; Returns: undefined }
      save_gallery: { Args: { items: Json }; Returns: undefined }
      save_rooms: { Args: { items: Json }; Returns: undefined }
      save_rules: { Args: { payload: Json }; Returns: undefined }
      save_settings: { Args: { payload: Json }; Returns: undefined }
      submit_review: {
        Args: { p_author?: string; p_body?: string; p_rating: number }
        Returns: undefined
      }
    }
    Enums: {
      block_type:
        | "hero"
        | "feature_grid"
        | "locations"
        | "packages"
        | "addons"
        | "gallery"
        | "reviews"
        | "contacts"
        | "booking_cta"
        | "rich_text"
        | "review_form"
      booking_status: "PENDING" | "CONFIRMED" | "CANCELLED"
      social_kind:
        | "instagram"
        | "telegram"
        | "tiktok"
        | "facebook"
        | "viber"
        | "whatsapp"
        | "youtube"
        | "other"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      block_type: [
        "hero",
        "feature_grid",
        "locations",
        "packages",
        "addons",
        "gallery",
        "reviews",
        "contacts",
        "booking_cta",
        "rich_text",
        "review_form",
      ],
      booking_status: ["PENDING", "CONFIRMED", "CANCELLED"],
      social_kind: [
        "instagram",
        "telegram",
        "tiktok",
        "facebook",
        "viber",
        "whatsapp",
        "youtube",
        "other",
      ],
    },
  },
} as const
