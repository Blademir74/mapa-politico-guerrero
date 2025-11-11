import { createClient } from '@supabase/supabase-js';

// Variables de entorno ESENCIALES
// ... (existing code) ...
if (!supabaseUrl || !supabaseAnonKey) {
// ... (existing code) ...
    throw new Error("Configuración de Supabase incompleta");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getMockData() {
// ... (existing code) ...
        crecimiento_ultimo_mes: '+23%'
    };
}

export default async function handler(request, response) {
// ... (existing code) ...
        console.log("  - Municipio:", municipio || 'Todos');

        // Construir query base
        let query = supabase
            .from('participaciones') // <-- CORREGIDO (antes 'participacion_mapa_politico')
            .select('*');

        // Aplicar filtros de fecha
// ... (existing code) ...
        console.log("Error stack:", error.stack);
        
        // En caso de error crítico, retornar datos de ejemplo
// ... (existing code) ...
        return response.status(200).json({
            success: true,
// ... (existing code) ...
            error: 'Error crítico: ' + error.message
        });
    }
}
