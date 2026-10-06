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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      catalogo_capacidades: {
        Row: {
          categoria: string
          codigo: string
          id: string
          nombre: string
        }
        Insert: {
          categoria: string
          codigo: string
          id?: string
          nombre: string
        }
        Update: {
          categoria?: string
          codigo?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      certificaciones: {
        Row: {
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_certificacion"]
          id: string
          norma: string
          vence_el: string | null
        }
        Insert: {
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_certificacion"]
          id?: string
          norma: string
          vence_el?: string | null
        }
        Update: {
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_certificacion"]
          id?: string
          norma?: string
          vence_el?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_capacidades: {
        Row: {
          capacidad_id: string
          empresa_id: string
          nivel: number
        }
        Insert: {
          capacidad_id: string
          empresa_id: string
          nivel: number
        }
        Update: {
          capacidad_id?: string
          empresa_id?: string
          nivel?: number
        }
        Relationships: [
          {
            foreignKeyName: "empresa_capacidades_capacidad_id_fkey"
            columns: ["capacidad_id"]
            isOneToOne: false
            referencedRelation: "catalogo_capacidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_capacidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          acepta_ute: boolean
          creada_en: string
          cuit: string | null
          departamento: string | null
          descripcion: string | null
          extras: Json
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_empresa"]
        }
        Insert: {
          acepta_ute?: boolean
          creada_en?: string
          cuit?: string | null
          departamento?: string | null
          descripcion?: string | null
          extras?: Json
          id?: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_empresa"]
        }
        Update: {
          acepta_ute?: boolean
          creada_en?: string
          cuit?: string | null
          departamento?: string | null
          descripcion?: string | null
          extras?: Json
          id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["tipo_empresa"]
        }
        Relationships: []
      }
      licitaciones: {
        Row: {
          cierre_el: string | null
          creada_en: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_licitacion"]
          id: string
          minera_id: string
          titulo: string
        }
        Insert: {
          cierre_el?: string | null
          creada_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_licitacion"]
          id?: string
          minera_id: string
          titulo: string
        }
        Update: {
          cierre_el?: string | null
          creada_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_licitacion"]
          id?: string
          minera_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "licitaciones_minera_id_fkey"
            columns: ["minera_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      lote_requisitos: {
        Row: {
          capacidad_id: string | null
          id: string
          lote_id: string
          nivel_minimo: number
          norma: string | null
          obligatorio: boolean
          peso: number
          tipo: Database["public"]["Enums"]["tipo_requisito"]
        }
        Insert: {
          capacidad_id?: string | null
          id?: string
          lote_id: string
          nivel_minimo?: number
          norma?: string | null
          obligatorio?: boolean
          peso?: number
          tipo: Database["public"]["Enums"]["tipo_requisito"]
        }
        Update: {
          capacidad_id?: string | null
          id?: string
          lote_id?: string
          nivel_minimo?: number
          norma?: string | null
          obligatorio?: boolean
          peso?: number
          tipo?: Database["public"]["Enums"]["tipo_requisito"]
        }
        Relationships: [
          {
            foreignKeyName: "lote_requisitos_capacidad_id_fkey"
            columns: ["capacidad_id"]
            isOneToOne: false
            referencedRelation: "catalogo_capacidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_requisitos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          id: string
          licitacion_id: string
          monto_estimado: number | null
          titulo: string
        }
        Insert: {
          id?: string
          licitacion_id: string
          monto_estimado?: number | null
          titulo: string
        }
        Update: {
          id?: string
          licitacion_id?: string
          monto_estimado?: number | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_licitacion_id_fkey"
            columns: ["licitacion_id"]
            isOneToOne: false
            referencedRelation: "licitaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          brecha: Json
          calculado_en: string
          cubiertos: Json
          cumple_obligatorios: boolean
          empresa_id: string
          lote_id: string
          score: number
        }
        Insert: {
          brecha?: Json
          calculado_en?: string
          cubiertos?: Json
          cumple_obligatorios: boolean
          empresa_id: string
          lote_id: string
          score: number
        }
        Update: {
          brecha?: Json
          calculado_en?: string
          cubiertos?: Json
          cumple_obligatorios?: boolean
          empresa_id?: string
          lote_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "matches_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          creado_en: string
          empresa_id: string | null
          id: string
          rol: Database["public"]["Enums"]["rol_usuario"]
        }
        Insert: {
          creado_en?: string
          empresa_id?: string | null
          id: string
          rol: Database["public"]["Enums"]["rol_usuario"]
        }
        Update: {
          creado_en?: string
          empresa_id?: string | null
          id?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ute_miembros: {
        Row: {
          aporte: Json
          empresa_id: string
          ute_id: string
        }
        Insert: {
          aporte?: Json
          empresa_id: string
          ute_id: string
        }
        Update: {
          aporte?: Json
          empresa_id?: string
          ute_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ute_miembros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ute_miembros_ute_id_fkey"
            columns: ["ute_id"]
            isOneToOne: false
            referencedRelation: "utes_sugeridas"
            referencedColumns: ["id"]
          },
        ]
      }
      utes_sugeridas: {
        Row: {
          cobertura: number
          creada_en: string
          estado: Database["public"]["Enums"]["estado_ute"]
          id: string
          lote_id: string
          score_total: number
        }
        Insert: {
          cobertura: number
          creada_en?: string
          estado?: Database["public"]["Enums"]["estado_ute"]
          id?: string
          lote_id: string
          score_total: number
        }
        Update: {
          cobertura?: number
          creada_en?: string
          estado?: Database["public"]["Enums"]["estado_ute"]
          id?: string
          lote_id?: string
          score_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "utes_sugeridas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _cobertura_conjunto: {
        Args: { p_empresa_ids: string[]; p_lote_id: string }
        Returns: {
          cobertura: number
          cumple_obligatorios: boolean
        }[]
      }
      _cumplimiento_lote_empresa: {
        Args: { p_empresa_id: string; p_lote_id: string }
        Returns: {
          cumple: number
          nombre: string
          obligatorio: boolean
          peso: number
          requisito_id: string
          tipo: Database["public"]["Enums"]["tipo_requisito"]
        }[]
      }
      _cumplimiento_requisito: {
        Args: {
          p_capacidad_id: string
          p_empresa_id: string
          p_nivel_minimo: number
          p_norma: string
          p_tipo: Database["public"]["Enums"]["tipo_requisito"]
        }
        Returns: number
      }
      calcular_match: {
        Args: { p_empresa_id: string; p_lote_id: string }
        Returns: {
          brecha: Json
          cubiertos: Json
          cumple_obligatorios: boolean
          score: number
        }[]
      }
      empresa_en_mis_lotes: { Args: { p_empresa_id: string }; Returns: boolean }
      generar_utes: {
        Args: { p_lote_id: string; p_max_miembros?: number }
        Returns: {
          cobertura: number
          creada_en: string
          estado: Database["public"]["Enums"]["estado_ute"]
          id: string
          lote_id: string
          score_total: number
        }[]
        SetofOptions: {
          from: "*"
          to: "utes_sugeridas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      licitacion_es_mia: { Args: { p_licitacion_id: string }; Returns: boolean }
      licitaciones_compatibles: {
        Args: { p_empresa_id: string }
        Returns: {
          cumple_obligatorios: boolean
          licitacion_id: string
          lote_id: string
          score: number
          titulo_licitacion: string
          titulo_lote: string
        }[]
      }
      lote_es_mio: { Args: { p_lote_id: string }; Returns: boolean }
      mi_empresa_id: { Args: never; Returns: string }
      mi_rol: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      miembros_de_mis_utes: { Args: never; Returns: string[] }
      mis_utes: { Args: never; Returns: string[] }
      ranking_lote: {
        Args: { p_lote_id: string }
        Returns: {
          cumple_obligatorios: boolean
          departamento: string
          empresa_id: string
          nombre: string
          score: number
        }[]
      }
      ute_es_de_mi_lote: { Args: { p_ute_id: string }; Returns: boolean }
    }
    Enums: {
      estado_certificacion: "declarada" | "verificada" | "vencida"
      estado_licitacion: "borrador" | "abierta" | "cerrada"
      estado_ute: "sugerida" | "aceptada" | "rechazada"
      rol_usuario: "minera" | "pyme"
      tipo_empresa: "MINERA" | "PYME"
      tipo_requisito: "capacidad" | "norma"
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
  public: {
    Enums: {
      estado_certificacion: ["declarada", "verificada", "vencida"],
      estado_licitacion: ["borrador", "abierta", "cerrada"],
      estado_ute: ["sugerida", "aceptada", "rechazada"],
      rol_usuario: ["minera", "pyme"],
      tipo_empresa: ["MINERA", "PYME"],
      tipo_requisito: ["capacidad", "norma"],
    },
  },
} as const
