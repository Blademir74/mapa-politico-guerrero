import { createClient } from '@supabase/supabase-js';

// Variables de entorno ESENCIALES
const supabaseUrl = process.env.SUPABASE_URL;
// ... (existing code) ...
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getMockData() {
// ... (existing code) ...
        crecimiento_ultimo_mes: '+23%'
    };
}

export default async function handler(request, response) {
// ... (existing code) ...
    try {
        console.log("📊 GET-DATA: Nueva solicitud -", new Date().toISOString());
        
        // --- 1. AUTENTICACIÓN (NUEVO) ---
        // Solo aceptar POST
// ... (existing code) ...
        if (request.method !== 'POST') {
            console.log("❌ GET-DATA: Método no permitido:", request.method);
// ... (existing code) ...
                message: 'Método no permitido. Use POST.' 
            });
        }
        
// ... (existing code) ...
        const { password } = request.body;
        
        // Validar la contraseña (la misma que en admin.html)
// ... (existing code) ...
        if (password !== 'guerrero2025') {
            console.log("❌ GET-DATA: Contraseña incorrecta.");
// ... (existing code) ...
                message: 'Error de autenticación: Contraseña incorrecta.'
            });
        }
        
// ... (existing code) ...
        
        // --- 2. LÓGICA DE DATOS ---
        // (El resto del código es para obtener los datos)

        // Construir query base
        let query = supabase
            .from('participaciones') // <-- ¡CORREGIDO!
            .select('*');

        // Ejecutar query
// ... (existing code) ...
        const { data, error, count } = await query;

        if (error) {
// ... (existing code) ...
            console.error("❌ GET-DATA: Error en consulta Supabase:", error);
            
            // Si hay error en Supabase, retornar datos de ejemplo
// ... (existing code) ...
            console.log("🔄 GET-DATA: Retornando datos de ejemplo debido a error");
            return response.status(200).json({
// ... (existing code) ...
                source: 'mock_data',
                error: 'Error consultando base de datos: ' + error.message
            });
        }

        console.log("✅ GET-DATA: Datos obtenidos exitosamente");
// ... (existing code) ...
        // (El resto del código procesa los datos...)
        // ...
        
        // Agrupar por mes
// ... (existing code) ...
            const participacionPorMes = {};
            const perfilesCounts = {};
// ... (existing code) ...
                // Contar municipios
                if (row.municipio) {
                    municipiosCounts[row.municipio] = (municipiosCounts[row.municipio] || 0) + 1;
                }
            });

            // Convertir a arrays para el frontend
// ... (existing code) ...
                .map(([mes, cantidad]) => ({ mes, participantes: cantidad }))
                .sort((a, b) => new Date(a.mes) - new Date(b.mes));

            processedData.perfiles_politicos = Object.entries(perfilesCounts)
// ... (existing code) ...
                .sort((a, b) => b.cantidad - a.cantidad);

            processedData.municipios_participacion = Object.entries(municipiosCounts)
// ... (existing code) ...
                .sort((a, b) => b.participantes - a.participantes)
                .slice(0, 10); // Top 10 municipios
        }

        // Si no hay datos, usar datos de ejemplo
// ... (existing code) ...
        if (!data || data.length === 0) {
            console.log("🔄 GET-DATA: No hay datos reales, usando datos de ejemplo");
// ... (existing code) ...
                success: true,
                data: getMockData(),
// ... (existing code) ...
                message: 'No hay datos disponibles con los filtros seleccionados'
            });
        }

        // Retornar datos procesados
// ... (existing code) ...
        return response.status(200).json({
            success: true,
// ... (existing code) ...
            source: 'supabase',
            total_records: count
            // Ya no enviamos los filtros
        });

    } catch (error) {
// ... (existing code) ...
        console.error("💥 GET-DATA: ERROR CRÍTICO:", error.message);
        console.error("Error stack:", error.stack);
// ... (existing code) ...
        // En caso de error crítico, retornar datos de ejemplo
        console.log("🔄 GET-DATA: Retornando datos de ejemplo debido a error crítico");
// ... (existing code) ...
            success: true,
            data: getMockData(),
// ... (existing code) ...
            error: 'Error crítico: ' + error.message
        });
    }
}
