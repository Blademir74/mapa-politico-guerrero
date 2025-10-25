// --- ARCHIVO DE FUNCIÓN SERVERLESS DE VERCEL ---
// Ruta: /api/procesar.js
// VERSIÓN CON LOGS PARA DEPURAR

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// --- 1. CONFIGURACIÓN DE SERVICIOS EXTERNOS ---
console.log("Iniciando función..."); // LOG 1

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

let supabase;
let resend;

// --- INICIO DE CAMBIOS: Verificación de variables ---
if (supabaseUrl && supabaseKey) {
    console.log("Supabase URL y Key Encontradas. Creando cliente..."); // LOG 2
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.error("ERROR: SUPABASE_URL o SUPABASE_ANON_KEY no encontradas."); // LOG DE ERROR
}

if (resendApiKey) {
    console.log("Resend API Key Encontrada. Creando cliente..."); // LOG 3
    resend = new Resend(resendApiKey);
} else {
    console.error("ERROR: RESEND_API_KEY no encontrada."); // LOG DE ERROR
}
// --- FIN DE CAMBIOS ---


// --- 2. FUNCIÓN PRINCIPAL QUE MANEJA LAS SOLICITUDES ---
export default async function handler(request) {
    console.log("Handler invocado. Método:", request.method); // LOG 4

    if (request.method !== 'POST') {
// ... (existing code) ...
    }

    // Verificar que las variables de entorno están cargadas
    if (!supabase || !resend) {
        console.error("Error Crítico: Faltan variables de entorno (SUPABASE o RESEND no inicializados)."); // LOG 5
        return new Response(JSON.stringify({ success: false, message: 'Error de configuración del servidor. Revisa las variables de entorno en Vercel.' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        console.log("Procesando request..."); // LOG 6
        // Obtenemos los datos que envía el frontend
// ... (existing code) ...

        // --- PASO A: CALCULAR EL PERFIL POLÍTICO ---
        console.log("Calculando perfil..."); // LOG 7
        const perfil = calcularPerfilPolitico(userAnswers);
// ... (existing code) ...
        console.log("Perfil calculado:", perfil.etiqueta); // LOG 8

        // --- PASO B: GUARDAR LOS DATOS EN LA BASE DE DATOS ---
        console.log("Guardando en Supabase..."); // LOG 9
        const { error: dbError } = await supabase
            .from('participaciones') // Asegúrate que tu tabla se llame "participaciones"
// ... (existing code) ...
// ... (existing code) ...
// ... (existing code)
            }]);

        if (dbError) {
            console.error('Error de Supabase:', dbError); // LOG DE ERROR
            throw new Error(`Error al guardar en la base de datos: ${dbError.message}`);
        }
        console.log("Guardado en Supabase exitoso."); // LOG 10
        
        // --- PASO C: ENVIAR EMAIL (SOLO TEXTO) ---
        if (contactInfo && contactInfo.email && contactInfo.email.includes('@')) {
            console.log("Enviando email a:", contactInfo.email); // LOG 11
            try {
                await resend.emails.send({
// ... (existing code) ...
                    to: contactInfo.email,
// ... (existing code) ...
                    html: `<p>¡Hola ${contactInfo.nombre || 'participante'}!</p><p>Tu perfil político es: <strong>${perfil.etiqueta}</strong>.</p><p>¡Gracias por participar e iniciar la conversación!</p>`,
                });
                console.log("Email enviado exitosamente."); // LOG 12
            } catch (emailError) {
                console.error("Error al enviar email:", emailError); // LOG DE ERROR
            }
        }
        
        // --- PASO D: RESPONDER AL FRONTEND (ÉXITO) ---
        console.log("Respondiendo al frontend con éxito."); // LOG 13
        return new Response(JSON.stringify({ success: true, perfil }), {
// ... (existing code) ...
        });

    } catch (e) {
        console.error('Error en la función handler:', e); // LOG DE ERROR
        return new Response(JSON.stringify({ success: false, message: e.message || 'Error interno del servidor' }), {
// ... (existing code) ...
        });
    }
}


// --- 3. LÓGICA DE CÁLCULO (MIS 9 PERFILES ORIGINALES) ---
function calcularPerfilPolitico(respuestas) {
// ... (existing code) ...
// ... (existing code) ...
// ... (existing code)
// ... (existing code) ...
    const divisor = contador > 0 ? contador : 1;
// ... (existing code) ...
// ... (existing code) ...
    
    const etiqueta = determinarEtiqueta(posicion_x, posicion_y);
// ... (existing code) ...
// ... (existing code) ...

    return { 
// ... (existing code) ...
// ... (existing code) ...
// ... (existing code) ...
    };
}

function determinarEtiqueta(x, y) {
// ... (existing code) ...
// ... (existing code) ...
// ... (existing code) ...
// ... (existing code) ...
// ... (existing code) ...
// ... (existing code) ...
// ... (existing code)
    }
}

"// Backend script" 
