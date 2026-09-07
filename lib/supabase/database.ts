export type CourseStatus = "draft" | "published";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          created_at: string;
        };
        Insert: {
          id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          user_id: string;
          role_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          slug: string;
          title: string;
          status: CourseStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          status?: CourseStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          status?: CourseStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      enrolments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      course_progress: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          current_module: number;
          completed_indexes: number[];
          player_seconds: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          current_module?: number;
          completed_indexes?: number[];
          player_seconds?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          current_module?: number;
          completed_indexes?: number[];
          player_seconds?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_staff: { Args: Record<string, never>; Returns: boolean };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
