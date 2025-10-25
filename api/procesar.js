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
        return new Response(JSON.stringify({ success: false, message: 'Método no permitido' }), {
            status: 405, headers: { 'Content-Type': 'application/json' },
        });
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
        const { userAnswers, contactInfo } = await request.json();

        // --- PASO A: CALCULAR EL PERFIL POLÍTICO ---
        console.log("Calculando perfil..."); // LOG 7
        const perfil = calcularPerfilPolitico(userAnswers);
        perfil.nombre = contactInfo.nombre || 'Tu Perfil';
        console.log("Perfil calculado:", perfil.etiqueta); // LOG 8

        // --- PASO B: GUARDAR LOS DATOS EN LA BASE DE DATOS ---
        console.log("Guardando en Supabase..."); // LOG 9
        const { error: dbError } = await supabase
            .from('participaciones') // Asegúrate que tu tabla se llame "participaciones"
            .insert([{ 
                respuestas: userAnswers, 
                perfil_calculado: perfil,
                municipio: perfil.municipio,
                contacto: contactInfo
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
                    from: 'Resultados <resultados@miperfilguerrero.com>', // Necesitas un dominio verificado
                    to: contactInfo.email,
                    subject: '🗺️ Tu Perfil Político de Guerrero está listo',
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
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (e) {
        console.error('Error en la función handler:', e); // LOG DE ERROR
        return new Response(JSON.stringify({ success: false, message: e.message || 'Error interno del servidor' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}


// --- 3. LÓGICA DE CÁLCULO (MIS 9 PERFILES ORIGINALES) ---
function calcularPerfilPolitico(respuestas) {
    let suma_x = 0, suma_y = 0, contador = 0;
    let temas = [], liderazgo = "No definido", valor_gobierno = "No definido";
    
    respuestas.forEach(r => {
        if (r.respuesta && r.respuesta.valor_x !== undefined) {
            suma_x += r.respuesta.valor_x;
            suma_y += r.respuesta.valor_y;
            contador++;
            if (r.respuesta.tema) temas.push(r.respuesta.tema);
            if (r.respuesta.liderazgo) liderazgo = r.respuesta.liderazgo;
            if (r.respuesta.valor) valor_gobierno = r.respuesta.valor;
        } else if (r.seleccionados) {
            r.seleccionados.forEach(opcion => {
                temas.push(opcion.tema);
                suma_y += opcion.boost_y;
            });
        } else if (r.pregunta_id === 2) { suma_y += (r.valor * 7); contador++; } 
          else if (r.pregunta_id === 6) { suma_x += (r.valor * 8); contador++; }
    });

    const divisor = contador > 0 ? contador : 1;
    const posicion_x = Math.max(0, Math.min(100, (suma_x / divisor) || 50));
    const posicion_y = Math.max(0, Math.min(100, (suma_y / divisor) || 50));
    
    const etiqueta = determinarEtiqueta(posicion_x, posicion_y);
    const tema_principal = temas.length > 0 ? Object.entries(temas.reduce((acc, v) => (acc[v] = (acc[v] || 0) + 1, acc), {})).reduce((a, b) => a[1] > b[1] ? a : b)[0] : "Equilibrado";
    const municipio = respuestas.find(r => r.pregunta_id === 11)?.valor || "No especificado";

    return { 
        posicion_x: Math.round(posicion_x),
        posicion_y: Math.round(posicion_y),
        etiqueta, 
        tema_principal, 
        liderazgo_preferido: liderazgo, 
        valor_gobierno, 
        municipio 
    };
}

function determinarEtiqueta(x, y) {
    if (x < 40) {
        if (y < 40) return "Conservador Liberal";
        if (y < 70) return "Conservador Moderado";
        return "Conservador Autoritario";
    } else if (x < 60) {
        if (y < 40) return "Centrista Pragmático";
        if (y < 70) return "Centrista Equilibrado";
        return "Centrista con Énfasis Social";
    } else {
        if (y < 40) return "Progresista Libertario";
        if (y < 70) return "Progresista Social";
        return "Progresista Radical";
    }
}

