export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string;
          file_name: string;
          file_url: string;
          id: string;
          message_id: string | null;
          size_bytes: number;
          ticket_id: string;
          uploaded_by: string | null;
        };
        Insert: {
          created_at?: string;
          file_name: string;
          file_url: string;
          id?: string;
          message_id?: string | null;
          size_bytes: number;
          ticket_id: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          file_url?: string;
          id?: string;
          message_id?: string | null;
          size_bytes?: number;
          ticket_id?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'attachments_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attachments_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attachments_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      canned_responses: {
        Row: {
          body: string;
          created_at: string;
          created_by: string | null;
          id: string;
          title: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          title: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'canned_responses_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          code: string;
          description: string | null;
          id: string;
        };
        Insert: {
          code: string;
          description?: string | null;
          id?: string;
        };
        Update: {
          code?: string;
          description?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          permission_id: string;
          role_id: string;
        };
        Insert: {
          permission_id: string;
          role_id: string;
        };
        Update: {
          permission_id?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'role_permissions_permission_id_fkey';
            columns: ['permission_id'];
            isOneToOne: false;
            referencedRelation: 'permissions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'role_permissions_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
      roles: {
        Row: {
          description: string | null;
          id: string;
          is_system: boolean;
          name: string;
        };
        Insert: {
          description?: string | null;
          id?: string;
          is_system?: boolean;
          name: string;
        };
        Update: {
          description?: string | null;
          id?: string;
          is_system?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      saved_views: {
        Row: {
          created_at: string;
          id: string;
          is_shared: boolean;
          name: string;
          search: Json;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_shared?: boolean;
          name: string;
          search: Json;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_shared?: boolean;
          name?: string;
          search?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'saved_views_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      sla_policies: {
        Row: {
          first_response_mins: number;
          id: string;
          name: string;
          priority: Database['public']['Enums']['ticket_priority'];
          resolution_mins: number;
        };
        Insert: {
          first_response_mins: number;
          id?: string;
          name: string;
          priority: Database['public']['Enums']['ticket_priority'];
          resolution_mins: number;
        };
        Update: {
          first_response_mins?: number;
          id?: string;
          name?: string;
          priority?: Database['public']['Enums']['ticket_priority'];
          resolution_mins?: number;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          color: string;
          id: string;
          name: string;
        };
        Insert: {
          color?: string;
          id?: string;
          name: string;
        };
        Update: {
          color?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          team_id: string;
          user_id: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
        };
        Update: {
          team_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'team_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      teams: {
        Row: {
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      ticket_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          event_type: Database['public']['Enums']['ticket_event_type'];
          id: string;
          meta: Json;
          ticket_id: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          event_type: Database['public']['Enums']['ticket_event_type'];
          id?: string;
          meta?: Json;
          ticket_id: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          event_type?: Database['public']['Enums']['ticket_event_type'];
          id?: string;
          meta?: Json;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_events_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_messages: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          id: string;
          ticket_id: string;
          type: Database['public']['Enums']['message_type'];
        };
        Insert: {
          author_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          ticket_id: string;
          type?: Database['public']['Enums']['message_type'];
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          ticket_id?: string;
          type?: Database['public']['Enums']['message_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_messages_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_messages_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_tags: {
        Row: {
          tag_id: string;
          ticket_id: string;
        };
        Insert: {
          tag_id: string;
          ticket_id: string;
        };
        Update: {
          tag_id?: string;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_tags_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      tickets: {
        Row: {
          assignee_id: string | null;
          category_id: string | null;
          channel: Database['public']['Enums']['ticket_channel'];
          created_at: string;
          description: string;
          due_at: string | null;
          embedding: string | null;
          first_response_at: string | null;
          id: string;
          priority: Database['public']['Enums']['ticket_priority'];
          requester_id: string;
          resolved_at: string | null;
          search_vector: unknown;
          sla_policy_id: string | null;
          status: Database['public']['Enums']['ticket_status'];
          subject: string;
          team_id: string | null;
          updated_at: string;
        };
        Insert: {
          assignee_id?: string | null;
          category_id?: string | null;
          channel?: Database['public']['Enums']['ticket_channel'];
          created_at?: string;
          description?: string;
          due_at?: string | null;
          embedding?: string | null;
          first_response_at?: string | null;
          id?: string;
          priority?: Database['public']['Enums']['ticket_priority'];
          requester_id: string;
          resolved_at?: string | null;
          search_vector?: unknown;
          sla_policy_id?: string | null;
          status?: Database['public']['Enums']['ticket_status'];
          subject: string;
          team_id?: string | null;
          updated_at?: string;
        };
        Update: {
          assignee_id?: string | null;
          category_id?: string | null;
          channel?: Database['public']['Enums']['ticket_channel'];
          created_at?: string;
          description?: string;
          due_at?: string | null;
          embedding?: string | null;
          first_response_at?: string | null;
          id?: string;
          priority?: Database['public']['Enums']['ticket_priority'];
          requester_id?: string;
          resolved_at?: string | null;
          search_vector?: unknown;
          sla_policy_id?: string | null;
          status?: Database['public']['Enums']['ticket_status'];
          subject?: string;
          team_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tickets_assignee_id_fkey';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_sla_policy_id_fkey';
            columns: ['sla_policy_id'];
            isOneToOne: false;
            referencedRelation: 'sla_policies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      user_roles: {
        Row: {
          role_id: string;
          user_id: string;
        };
        Insert: {
          role_id: string;
          user_id: string;
        };
        Update: {
          role_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_roles_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_roles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      assignable_agents: {
        Args: never;
        Returns: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      bulk_update_tickets: {
        Args: { p_filters: Json; p_patch: Json };
        Returns: number;
      };
      match_tickets: {
        Args: {
          query_embedding: string;
          match_count?: number;
          similarity_threshold?: number;
        };
        Returns: {
          id: string;
          subject: string;
          description: string;
          status: Database['public']['Enums']['ticket_status'];
          priority: Database['public']['Enums']['ticket_priority'];
          channel: Database['public']['Enums']['ticket_channel'];
          requester_id: string;
          assignee_id: string | null;
          team_id: string | null;
          category_id: string | null;
          sla_policy_id: string | null;
          first_response_at: string | null;
          resolved_at: string | null;
          due_at: string | null;
          created_at: string;
          updated_at: string;
          similarity: number;
        }[];
      };
      similar_tickets: {
        Args: { p_ticket_id: string; match_count?: number };
        Returns: {
          id: string;
          subject: string;
          description: string;
          status: Database['public']['Enums']['ticket_status'];
          priority: Database['public']['Enums']['ticket_priority'];
          channel: Database['public']['Enums']['ticket_channel'];
          requester_id: string;
          assignee_id: string | null;
          team_id: string | null;
          category_id: string | null;
          sla_policy_id: string | null;
          first_response_at: string | null;
          resolved_at: string | null;
          due_at: string | null;
          created_at: string;
          updated_at: string;
          similarity: number;
        }[];
      };
      can_access_ticket: {
        Args: {
          ticket_assignee_id: string;
          ticket_requester_id: string;
          ticket_team_id: string;
          uid: string;
        };
        Returns: boolean;
      };
      has_permission: {
        Args: { permission_code: string; uid: string };
        Returns: boolean;
      };
      is_team_member: {
        Args: { target_team_id: string; uid: string };
        Returns: boolean;
      };
    };
    Enums: {
      message_type: 'public_reply' | 'internal_note';
      ticket_channel: 'web' | 'email' | 'chat';
      ticket_event_type:
        'created' | 'assigned' | 'status_changed' | 'priority_changed' | 'commented' | 'tagged';
      ticket_priority: 'low' | 'normal' | 'high' | 'urgent';
      ticket_status: 'open' | 'pending' | 'on_hold' | 'solved' | 'closed';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      message_type: ['public_reply', 'internal_note'],
      ticket_channel: ['web', 'email', 'chat'],
      ticket_event_type: [
        'created',
        'assigned',
        'status_changed',
        'priority_changed',
        'commented',
        'tagged',
      ],
      ticket_priority: ['low', 'normal', 'high', 'urgent'],
      ticket_status: ['open', 'pending', 'on_hold', 'solved', 'closed'],
    },
  },
} as const;
