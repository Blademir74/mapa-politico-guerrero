// --- IMPORTANTE: ESTA ES UNA VERSIÓN DE PRUEBA ---
// --- NO GUARDA EN BASE DE DATOS NI ENVÍA EMAIL ---
// --- SOLO CALCULA Y DEVUELVE EL PERFIL ---

export default async function handler(request, response) {
    console.log("LOG 1: Iniciando función... (MODO DE PRUEBA)");

    try {
        if (request.method !== 'POST') {
            console.log("LOG 2: Método no permitido");
            return response.status(405).json({ message: 'Método no permitido' });
        }

        console.log("LOG 3: Procesando request...");
        const { userAnswers, contactInfo } = request.body;

        if (!userAnswers) {
            console.log("LOG 4: No se encontraron respuestas");
            return response.status(400).json({ message: 'No se encontraron respuestas' });
        }

        console.log("LOG 5: Calculando perfil...");
        const perfil = calcularPerfilPolitico(userAnswers);
        
        console.log(`LOG 6: Perfil calculado: ${perfil.etiqueta}`);

        // --- SECCIÓN DE SUPABASE (DESACTIVADA PARA PRUEBA) ---
        /*
        console.log("LOG 7: Guardando en Supabase...");
        const { data, error } = await supabase
            .from('participaciones')
            .insert([{ 
                respuestas: userAnswers, 
                perfil_calculado: perfil,
                municipio: perfil.municipio,
                contacto: contactInfo
            }]);
        
        if (error) {
            throw new Error(`Error al guardar en la base de datos: ${error.message}`);
        }
        console.log("LOG 8: Guardado en Supabase exitoso.");
        */
        // --- FIN DE SECCIÓN SUPABASE ---


        // --- SECCIÓN DE RESEND (DESACTIVADA PARA PRUEBA) ---
        /*
        if (contactInfo && contactInfo.email) {
            console.log("LOG 9: Enviando email...");
            await resend.emails.send({
                from: 'Resultados <noreply@miperfilguerrero.com>',
                to: contactInfo.email,
                subject: 'Tu Perfil Político de Guerrero',
                html: `<h1>Tu perfil es: ${perfil.etiqueta}</h1><p>Gracias por participar.</p>`
            });
            console.log("LOG 10: Email enviado.");
        }
        */
        // --- FIN DE SECCIÓN RESEND ---
        
        console.log("LOG 11: Enviando respuesta exitosa al frontend.");
        
        // Devolvemos el perfil calculado
        return response.status(200).json({ 
            success: true, 
            perfil: {
                ...perfil,
                nombre: contactInfo?.nombre || ''
            }
        });

    } catch (error) {
        console.error("ERROR CRÍTICO:", error.message);
        return response.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
}


// --- FUNCIÓN DE CÁLCULO DE PERFIL ---
// (Esta función no necesita conexión a internet)
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
        } else if (r.pregunta_id === 2 && r.valor) {
            suma_y += (r.valor * 7);
            contador++;
        } else if (r.pregunta_id === 6 && r.valor) {
            suma_x += (r.valor * 8);
            contador++;
        }
    });

    // Evitar división por cero
    if (contador === 0) contador = 1;

    const posicion_x = Math.max(0, Math.min(100, (suma_x / contador) || 50));
    const posicion_y = Math.max(0, Math.min(100, (suma_y / contador) || 50));
    const etiqueta = determinarEtiqueta(posicion_x, posicion_y);
    
    const tema_principal = temas.length > 0 
        ? Object.entries(temas.reduce((acc, v) => (acc[v] = (acc[v] || 0) + 1, acc), {}))
                .reduce((a, b) => a[1] > b[1] ? a : b)[0] 
        : "Equilibrado";
    
    const municipio = respuestas.find(r => r.pregunta_id === 11)?.valor || "No especificado";

    return {
        posicion_x: Math.round(posicion_x),
        posicion_y: Math.round(posicion_y),
        etiqueta,
        tema_principal,
        liderazgo_preferido: liderazgo,
        valor_gobierno,
        municipio,
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

