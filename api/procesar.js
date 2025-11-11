import { createClient } from '@supabase/supabase-js';

// Variables de entorno ESENCIALES
const supabaseUrl = process.env.SUPABASE_URL;
// ... (existing code) ...
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function calculatePoliticalProfile(respuestas) {
// ... (existing code) ...
    let descripcion = "";
    
    if (promedio_x <= 2 && promedio_y <= 2) {
// ... (existing code) ...
    } else {
        posicion = "Derecha-Centralismo";
        etiqueta = "Conservador Tradicional";
        descripcion = "Valoras la tradición, el orden y la autoridad establecida.";
    }
    
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
            .from('participaciones') // <-- ¡CORREGIDO!
            .insert([dataToSave])
            .select();
            
// ... (existing code) ...
        return true;
        
    } catch (error) {
// ... (existing code) ...
    }
}

export default async function handler(request, response) {
// ... (existing code) ...
