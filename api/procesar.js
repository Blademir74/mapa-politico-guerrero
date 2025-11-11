import { createClient } from '@supabase/supabase-js';

// Variables de entorno ESENCIALES
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// ... (existing code) ...
if (!supabaseUrl || !supabaseAnonKey) {
// ... (existing code) ...
    throw new Error("Configuración de Supabase incompleta");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function calculatePoliticalProfile(respuestas) {
// ... (existing code) ...
    let suma_x = 0, suma_y = 0;
// ... (existing code) ...
    let etiqueta = "";
    let descripcion = "";
    
// ... (existing code) ...
    if (promedio_x <= 2 && promedio_y <= 2) {
// ... (existing code) ...
        descripcion = "Valoras la innovación y el cambio, con una visión social sólida.";
// ... (existing code) ...
    } else {
        posicion = "Derecha-Centralismo";
// ... (existing code) ...
        descripcion = "Valoras la tradición, el orden y la autoridad establecida.";
    }
    
// ... (existing code) ...
    temas = [...new Set(temas)];
    
// ... (existing code) ...
        fecha: new Date().toISOString()
    };
}

async function saveToSupabase(perfil, contactInfo, analytics) {
// ... (existing code) ...
        console.log("💾 Guardando en Supabase...");
        
        const dataToSave = {
// ... (existing code) ...
            utm_campaign: analytics?.utm?.campaign || null,
            created_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('participaciones') // <-- CORREGIDO (antes 'participacion_mapa_politico')
            .insert([dataToSave])
            .select();
            
// ... (existing code) ...
        return true;
        
    } catch (error) {
// ... (existing code) ...
        return false;
    }
}

export default async function handler(request, response) {
// ... (existing code) ...
