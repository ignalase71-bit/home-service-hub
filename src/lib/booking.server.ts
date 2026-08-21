import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Cliente privilegiado usado únicamente para cálculos internos de
 * disponibilidad y para registrar solicitudes de visita. El cliente final
 * nunca recibe datos de agenda: solo huecos horarios.
 */
export const internalDb = () => supabaseAdmin;
