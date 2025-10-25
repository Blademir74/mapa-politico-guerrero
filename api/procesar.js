// --- ARCHIVO DE FUNCIÓN SERVERLESS DE VERCEL ---
// Ruta: /api/procesar.js
// Este código se ejecuta en el servidor de Vercel.

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { createCanvas, loadImage } from 'canvas'; // No es necesario 'registerFont' a menos que uses fuentes personalizadas
import path from 'path'; // 'path' es un módulo nativo de Node.js

// --- 1. CONFIGURACIÓN DE SERVICIOS EXTERNOS ---
// Vercel tomará estas variables de entorno desde la configuración del proyecto.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

let supabase;
let resend;

// Inicializar clientes solo si las variables de entorno están presentes
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

if (resendApiKey) {
    resend = new Resend(resendApiKey);
}

// --- 2. FUNCIÓN PRINCIPAL QUE MANEJA LAS SOLICITUDES ---
export default async function handler(request) {
    // Solo permitir solicitudes POST
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ success: false, message: 'Método no permitido' }), {
            status: 405, headers: { 'Content-Type': 'application/json' },
        });
    }

    // Verificar que los clientes de servicio se inicializaron
    if (!supabase || !resend) {
        console.error("Error: Faltan variables de entorno (SUPABASE_URL, SUPABASE_ANON_KEY, o RESEND_API_KEY)");
        return new Response(JSON.stringify({ success: false, message: 'Error de configuración del servidor.' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // Obtenemos los datos que envía el frontend
        const { userAnswers, contactInfo } = await request.json();

        // --- PASO A: CALCULAR EL PERFIL POLÍTICO ---
        const perfil = calcularPerfilPolitico(userAnswers);
        perfil.nombre = contactInfo.nombre || 'Tu Perfil'; // Añadir nombre al perfil

        // --- PASO B: GUARDAR LOS DATOS EN LA BASE DE DATOS ---
        const { error: dbError } = await supabase
            .from('participaciones') // Nombre de la tabla
            .insert([{ 
                respuestas: userAnswers, 
                perfil_calculado: perfil,
                municipio: perfil.municipio,
                contacto: contactInfo
            }]);

        if (dbError) {
            console.error('Error de Supabase:', dbError);
            throw new Error(`Error al guardar en la base de datos: ${dbError.message}`);
        }

        // --- PASO C: GENERAR LA IMAGEN PERSONALIZADA ---
        const imagenBuffer = await generarImagenCompartible(perfil);
        
        // --- PASO D: ENVIAR EL EMAIL CON LA IMAGEN (SI APLICA) ---
        if (contactInfo && contactInfo.email && contactInfo.email.includes('@')) { // simple validación de email
            try {
                await resend.emails.send({
                    from: 'Resultados <resultados@miperfilguerrero.com>', // Necesitas un dominio verificado
                    to: contactInfo.email,
                    subject: '🗺️ Tu Perfil Político de Guerrero está listo',
                    html: `<p>¡Hola ${contactInfo.nombre || 'participante'}!</p><p>Tu perfil político es: <strong>${perfil.etiqueta}</strong>.</p><p>Adjuntamos tu infografía personalizada para que la compartas donde quieras. ¡Gracias por participar e iniciar la conversación!</p>`,
                    attachments: [{
                        filename: 'mi-perfil-politico.png',
                        content: imagenBuffer, // adjuntar el buffer de la imagen
                    }],
                });
            } catch (emailError) {
                console.error("Error al enviar email:", emailError);
                // No detenemos la ejecución si el email falla, solo lo reportamos.
            }
        }
        
        // --- PASO E: RESPONDER AL FRONTEND ---
        // Enviamos una respuesta exitosa junto con el perfil calculado para que el frontend lo muestre.
        return new Response(JSON.stringify({ success: true, perfil }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (e) {
        console.error('Error en la función handler:', e);
        return new Response(JSON.stringify({ success: false, message: e.message || 'Error interno del servidor' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}


// --- 3. LÓGICA DE CÁLCULO ---

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

    // Asegurarse de que el contador no sea 0 para evitar división por cero
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


// --- 4. GENERACIÓN DE IMAGEN CON CANVAS ---

async function generarImagenCompartible(perfil) {
    // 1. Determinar qué plantilla usar según el perfil.
    let imageUrl;
    if (perfil.etiqueta.includes('Conservador')) {
        imageUrl = 'https://i.ibb.co/j9dqbKwk/Conservador.png'; // Tu imagen Conservador
    } else if (perfil.etiqueta.includes('Progresista')) {
        imageUrl = 'https://i.ibb.co/bRztmjss/Progresista.png'; // Tu imagen Progresista
    } else { // Centrista o Independiente
        imageUrl = 'https://i.ibb.co/35XZc4P9/Centrista.png'; // Tu imagen Centrista
    }

    // 2. Cargar la imagen de fondo desde el link.
    const background = await loadImage(imageUrl);
    const canvas = createCanvas(background.width, background.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(background, 0, 0);

    // 3. Escribir el texto dinámico sobre la imagen
    // ¡IMPORTANTE! Vercel no tiene las fuentes 'Montserrat' o 'Poppins' por defecto.
    // Usaremos fuentes genéricas (sans-serif).
    
    // Función para dibujar texto con sombra (para legibilidad)
    function drawTextWithShadow(text, x, y, font, color, shadowColor = 'rgba(0,0,0,0.7)') {
        ctx.font = font;
        ctx.fillStyle = shadowColor;
        ctx.fillText(text, x + 2, y + 2); // Sombra
        ctx.fillStyle = color;
        ctx.fillText(text, x, y); // Texto principal
    }

    // Nombre del Usuario (si lo dio)
    if (perfil.nombre && perfil.nombre !== 'Tu Perfil' && perfil.nombre.trim() !== '') {
        ctx.textAlign = 'center';
        drawTextWithShadow(perfil.nombre.toUpperCase(), canvas.width / 2, 180, 'bold 30px sans-serif', '#FFFFFF');
    }
    
    // Estadísticas
    ctx.textAlign = 'left';
    drawTextWithShadow(`📊 Tema Prioritario: ${perfil.tema_principal}`, 100, canvas.height - 200, '28px sans-serif', '#FFFFFF');
    drawTextWithShadow(`👤 Liderazgo: ${perfil.liderazgo_preferido}`, 100, canvas.height - 160, '28px sans-serif', '#FFFFFF');
    drawTextWithShadow(`📍 Municipio: ${perfil.municipio}`, 100, canvas.height - 120, '28px sans-serif', '#FFFFFF');
    
    // CTA
    ctx.textAlign = 'center';
    drawTextWithShadow('Descubre tu perfil en:', canvas.width / 2, canvas.height - 60, 'bold 24px sans-serif', '#FDE047'); // Amarillo

    // 4. Convertir el canvas a un buffer de imagen PNG.
    const buffer = canvas.toBuffer('image/png');
    return buffer;
}

