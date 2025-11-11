import { createClient } from '@supabase/supabase-js';

// Variables de entorno ESENCIALES
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Verificar variables críticas
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ ERROR: Faltan variables de entorno de Supabase");
    console.log("SUPABASE_URL:", supabaseUrl ? "✅ Configurada" : "❌ Falta");
    console.log("SUPABASE_ANON_KEY:", supabaseAnonKey ? "✅ Configurada" : "❌ Falta");
    throw new Error("Configuración de Supabase incompleta");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function calculatePoliticalProfile(respuestas) {
    console.log("🧠 Calculando perfil con", respuestas.length, "respuestas");
    
    let suma_x = 0, suma_y = 0;
    let temas = [];
    let municipio_info = "No especificado";
    
    respuestas.forEach(r => {
        try {
            // Procesar respuesta normal
            if (r.respuesta) {
                if (r.respuesta.valor_x !== undefined) suma_x += r.respuesta.valor_x;
                if (r.respuesta.valor_y !== undefined) suma_y += r.respuesta.valor_y;
                if (r.respuesta.tema) temas.push(r.respuesta.tema);
                if (r.respuesta.municipio) municipio_info = r.respuesta.municipio;
            }
            
            // Procesar selecciones múltiples
            if (r.seleccionados && Array.isArray(r.seleccionados)) {
                r.seleccionados.forEach(opcion => {
                    if (opcion.tema) temas.push(opcion.tema);
                    if (opcion.boost_y) suma_y += opcion.boost_y;
                });
            }
            
            // Procesar valor específico
            if (r.pregunta_id === 2 && r.valor) {
                suma_y += (r.valor * 7);
            }
            
            // Procesar municipio por geolocalización
            if (r.pregunta_id === 11 && r.municipio) {
                municipio_info = r.municipio;
            }
        } catch (error) {
            console.error("Error procesando respuesta:", r, error);
        }
    });
    
    // Calcular promedio
    const promedio_x = respuestas.length > 0 ? suma_x / respuestas.length : 0;
    const promedio_y = respuestas.length > 0 ? suma_y / respuestas.length : 0;
    
    console.log(`📊 Perfil calculado - X: ${promedio_x.toFixed(2)}, Y: ${promedio_y.toFixed(2)}`);
    
    // Determinar posición política
    let posicion = "";
    let etiqueta = "";
    let descripcion = "";
    
    if (promedio_x <= 2 && promedio_y <= 2) {
        posicion = "Izquierda-Contralismo";
        etiqueta = "Liberal Progresista";
        descripcion = "Valoras la innovación y el cambio, con una visión social sólida.";
    } else if (promedio_x <= 2 && promedio_y > 2) {
        posicion = "Izquierda-Centralismo";
        etiqueta = "Social-Democrata";
        descripcion = "Prefieres un gobierno fuerte con políticas sociales robustas.";
    } else if (promedio_x > 2 && promedio_x <= 3 && promedio_y <= 2) {
        posicion = "Centro-Contralismo";
        etiqueta = "Centrista Liberal";
        descripcion = "Buscas el equilibrio entre libertad individual y orden social.";
    } else if (promedio_x > 2 && promedio_x <= 3 && promedio_y > 2) {
        posicion = "Centro-Centralismo";
        etiqueta = "Centrista Institucional";
        descripcion = "Valoras la estabilidad y el funcionamiento institucional.";
    } else if (promedio_x > 3 && promedio_y <= 2) {
        posicion = "Derecha-Contralismo";
        etiqueta = "Liberal Conservador";
        descripcion = "Prefieres el libre mercado con valores tradicionales.";
    } else {
        posicion = "Derecha-Centralismo";
        etiqueta = "Conservador Tradicional";
        descripcion = "Valoras la tradición, el orden y la autoridad establecida.";
    }
    
    // Eliminar duplicados de temas
    temas = [...new Set(temas)];
    
    return {
        etiqueta: etiqueta,
        descripcion: descripcion,
        posicion: posicion,
        promedio_x: parseFloat(promedio_x.toFixed(2)),
        promedio_y: parseFloat(promedio_y.toFixed(2)),
        temas: temas,
        municipio: municipio_info,
        fecha: new Date().toISOString()
    };
}

async function saveToSupabase(perfil, contactInfo, analytics) {
    try {
        console.log("💾 Guardando en Supabase...");
        
        const dataToSave = {
            perfil_etiqueta: perfil.etiqueta,
            perfil_descripcion: perfil.descripcion,
            perfil_posicion: perfil.posicion,
            promedio_x: perfil.promedio_x,
            promedio_y: perfil.promedio_y,
            temas_interes: JSON.stringify(perfil.temas),
            municipio: perfil.municipio,
            email: contactInfo?.email || null,
            nombre: contactInfo?.nombre || null,
            telefono: contactInfo?.telefono || null,
            ip_address: analytics?.ip || null,
            user_agent: analytics?.userAgent || null,
            referrer: analytics?.referrer || null,
            utm_source: analytics?.utm?.source || null,
            utm_medium: analytics?.utm?.medium || null,
            utm_campaign: analytics?.utm?.campaign || null,
            created_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('participacion_mapa_politico')
            .insert([dataToSave])
            .select();
            
        if (error) {
            console.error("❌ Error en Supabase:", error);
            return false;
        }
        
        console.log("✅ Guardado en Supabase exitosamente");
        return true;
        
    } catch (error) {
        console.error("❌ Error guardando en Supabase:", error);
        return false;
    }
}

export default async function handler(request, response) {
    const startTime = Date.now();
    
    try {
        console.log("🚀 PROCESAR: Nueva solicitud iniciada -", new Date().toISOString());
        
        // Solo aceptar POST
        if (request.method !== 'POST') {
            console.log("❌ PROCESAR: Método no permitido:", request.method);
            return response.status(405).json({ 
                success: false, 
                message: 'Método no permitido. Use POST.' 
            });
        }

        // Extraer datos del request
        const { userAnswers, contactInfo, userAgent, timestamp, municipality, referrer, utm } = request.body;
        
        console.log("📥 PROCESAR: Datos recibidos");
        console.log("  - Respuestas:", userAnswers?.length || 0);
        console.log("  - Contacto:", contactInfo?.email ? "Sí" : "No");
        console.log("  - Municipio:", municipality);
        console.log("  - UTM:", utm);

        // Validación básica
        if (!userAnswers || !Array.isArray(userAnswers) || userAnswers.length === 0) {
            console.log("❌ PROCESAR: No se recibieron respuestas válidas");
            return response.status(400).json({ 
                success: false, 
                message: 'No se recibieron respuestas válidas del cuestionario.' 
            });
        }

        // Calcular perfil
        console.log("🧠 PROCESAR: Calculando perfil político...");
        const perfil = calculatePoliticalProfile(userAnswers);
        console.log("✅ PROCESAR: Perfil calculado:", perfil.etiqueta);

        // Guardar en Supabase (independiente de la respuesta)
        console.log("💾 PROCESAR: Guardando en base de datos...");
        const supabaseSuccess = await saveToSupabase(perfil, contactInfo, {
            userAgent,
            referrer,
            utm,
            timestamp
        });

        // Enviar email si tenemos clave (opcional)
        if (process.env.RESEND_API_KEY && contactInfo?.email) {
            try {
                console.log("📧 PROCESAR: Enviando email...");
                const { Resend } = await import('resend');
                const resend = new Resend(process.env.RESEND_API_KEY);
                
                await resend.emails.send({
                    from: 'Mapa Político Guerrero <noreply@mapapoliticoguerero.com>',
                    to: [contactInfo.email],
                    subject: `Tu Perfil Político: ${perfil.etiqueta}`,
                    html: `
                        <h2>¡Gracias por participar en el Mapa Político de Guerrero!</h2>
                        <p>Hola ${contactInfo.nombre || 'Participante'},</p>
                        <p>Tu perfil político es: <strong>${perfil.etiqueta}</strong></p>
                        <p>${perfil.descripcion}</p>
                        <p>Posición: ${perfil.posicion}</p>
                        <p>Comparte tu resultado con tus amigos y conoce el perfil de tu familia.</p>
                        <br>
                        <p>¡Gracias por participar en esta iniciativa ciudadana!</p>
                    `
                });
                console.log("✅ PROCESAR: Email enviado exitosamente");
            } catch (emailError) {
                console.error("⚠️ PROCESAR: Error enviando email (no crítico):", emailError.message);
            }
        }

        // Calcular tiempo de procesamiento
        const processingTime = Date.now() - startTime;
        console.log(`⚡ PROCESAR: Completado en ${processingTime}ms`);

        // Responder siempre con éxito
        const result = {
            success: true,
            perfil: {
                etiqueta: perfil.etiqueta,
                descripcion: perfil.descripcion,
                posicion: perfil.posicion,
                promedio_x: perfil.promedio_x,
                promedio_y: perfil.promedio_y,
                temas: perfil.temas,
                municipio: perfil.municipio,
                fecha: perfil.fecha,
                nombre: contactInfo?.nombre || ''
            },
            analytics: {
                processed_at: new Date().toISOString(),
                processing_time_ms: processingTime,
                supabase_saved: supabaseSuccess,
                answers_count: userAnswers.length
            }
        };

        console.log("🎉 PROCESAR: Enviando respuesta exitosa al frontend");
        return response.status(200).json(result);

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error("💥 PROCESAR: ERROR CRÍTICO después de", processingTime, "ms");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        
        return response.status(500).json({ 
            success: false, 
            message: 'Error procesando tu solicitud. Por favor intenta nuevamente.',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}