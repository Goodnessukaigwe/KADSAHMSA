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
      consents: {
        Row: {
          id: string;
          user_id: string;
          policy_key: string;
          policy_version: string;
          accepted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          policy_key: string;
          policy_version: string;
          accepted_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          policy_key?: string;
          policy_version?: string;
          accepted_at?: string;
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
          summary: string;
          duration_label: string;
          cover_path: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          status?: CourseStatus;
          summary?: string;
          duration_label?: string;
          cover_path?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          status?: CourseStatus;
          summary?: string;
          duration_label?: string;
          cover_path?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_lessons: {
        Row: {
          id: string;
          course_id: string;
          position: number;
          slug: string;
          title: string;
          status: "draft" | "live";
          duration_label: string;
          introduction: string;
          main: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          position: number;
          slug: string;
          title: string;
          status?: "draft" | "live";
          duration_label?: string;
          introduction?: string;
          main?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          position?: number;
          slug?: string;
          title?: string;
          status?: "draft" | "live";
          duration_label?: string;
          introduction?: string;
          main?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lesson_assets: {
        Row: {
          id: string;
          lesson_id: string;
          position: number;
          kind: "pdf" | "pptx" | "video" | "youtube" | "vimeo" | "image" | "audio";
          title: string;
          storage_path: string | null;
          external_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          position: number;
          kind: "pdf" | "pptx" | "video" | "youtube" | "vimeo" | "image" | "audio";
          title?: string;
          storage_path?: string | null;
          external_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          position?: number;
          kind?: "pdf" | "pptx" | "video" | "youtube" | "vimeo" | "image" | "audio";
          title?: string;
          storage_path?: string | null;
          external_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      enrolment_requests: {
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
      quizzes: {
        Row: {
          id: string;
          course_id: string;
          slug: string;
          kind: "module" | "final";
          pass_mark_percent: number;
          max_attempts: number;
          time_limit_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          slug: string;
          kind: "module" | "final";
          pass_mark_percent?: number;
          max_attempts?: number;
          time_limit_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          slug?: string;
          kind?: "module" | "final";
          pass_mark_percent?: number;
          max_attempts?: number;
          time_limit_seconds?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      quiz_questions: {
        Row: {
          id: string;
          quiz_id: string;
          position: number;
          prompt: string;
          options: string[];
          correct_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          position: number;
          prompt: string;
          options: string[];
          correct_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          position?: number;
          prompt?: string;
          options?: string[];
          correct_index?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          quiz_id: string;
          enrolment_id: string;
          attempt_no: number;
          answers: number[] | null;
          score_percent: number | null;
          passed: boolean | null;
          submitted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          quiz_id: string;
          enrolment_id: string;
          attempt_no: number;
          answers?: number[] | null;
          score_percent?: number | null;
          passed?: boolean | null;
          submitted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          quiz_id?: string;
          enrolment_id?: string;
          attempt_no?: number;
          answers?: number[] | null;
          score_percent?: number | null;
          passed?: boolean | null;
          submitted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      certificates: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          enrolment_id: string;
          verification_id: string;
          score_percent: number;
          issued_at: string;
          status: "valid" | "revoked";
          storage_path: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          enrolment_id: string;
          verification_id: string;
          score_percent: number;
          issued_at?: string;
          status?: "valid" | "revoked";
          storage_path: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          enrolment_id?: string;
          verification_id?: string;
          score_percent?: number;
          issued_at?: string;
          status?: "valid" | "revoked";
          storage_path?: string;
        };
        Relationships: [];
      };
      certificate_revocations: {
        Row: {
          id: string;
          certificate_id: string;
          reason: string;
          revoked_by: string;
          revoked_at: string;
        };
        Insert: {
          id?: string;
          certificate_id: string;
          reason: string;
          revoked_by: string;
          revoked_at?: string;
        };
        Update: {
          id?: string;
          certificate_id?: string;
          reason?: string;
          revoked_by?: string;
          revoked_at?: string;
        };
        Relationships: [];
      };
      organisations: {
        Row: {
          id: string;
          name: string;
          status: "pending" | "approved" | "rejected";
          seat_limit: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          status?: "pending" | "approved" | "rejected";
          seat_limit?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          status?: "pending" | "approved" | "rejected";
          seat_limit?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      organisation_memberships: {
        Row: {
          id: string;
          organisation_id: string;
          user_id: string;
          role: "member" | "admin";
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          user_id: string;
          role?: "member" | "admin";
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          user_id?: string;
          role?: "member" | "admin";
          created_at?: string;
        };
        Relationships: [];
      };
      organisation_invites: {
        Row: {
          id: string;
          organisation_id: string;
          code: string;
          course_id: string | null;
          expires_at: string | null;
          created_by: string;
          uses: number;
          max_uses: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          code: string;
          course_id?: string | null;
          expires_at?: string | null;
          created_by: string;
          uses?: number;
          max_uses?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          code?: string;
          course_id?: string | null;
          expires_at?: string | null;
          created_by?: string;
          uses?: number;
          max_uses?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_staff: { Args: Record<string, never>; Returns: boolean };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      is_org_admin: { Args: Record<string, never>; Returns: boolean };
      is_org_admin_of: { Args: { p_org_id: string }; Returns: boolean };
      is_org_member: { Args: { p_org_id: string }; Returns: boolean };
      is_org_admin_for_user: { Args: { p_user_id: string }; Returns: boolean };
      verify_certificate: {
        Args: { p_id: string };
        Returns: {
          status: string;
          learner_name: string;
          course_title: string;
          issued_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
