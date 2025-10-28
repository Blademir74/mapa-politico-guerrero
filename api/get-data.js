// Importamos el cliente de Supabase
import { createClient } from '@supabase/supabase-js';

// Contraseña (debe ser la misma que en admin.html)
const ADMIN_PASSWORD = 'guerrero2025';

export default async function handler(request, response) {
    // 1. Verificamos que sea un método POST
    if (request.method !== 'POST') {
        return response.status(405).json({ success: false, message: 'Metodo no permitido' });
    }

    try {
        // 2. Obtenemos la contraseña que nos envía el admin.html
        const { password } = request.body;

        // 3. Verificamos la contraseña
        if (password !== ADMIN_PASSWORD) {
            return response.status(401).json({ success: false, message: 'Contraseña incorrecta' });
        }

        // 4. Verificamos las variables de entorno (¡CRUCIAL!)
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('ERROR en get-data: Faltan variables de entorno de Supabase en Vercel.');
            return response.status(500).json({ success: false, message: 'Error de configuración del servidor.' });
        }
        
        // 5. Nos conectamos a Supabase (desde el servidor)
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // 6. Pedimos los datos
        const { data, error } = await supabase
            .from('participaciones')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('ERROR en get-data al consultar Supabase:', error.message);
            throw new Error(error.message);
        }

        // 7. ¡ÉXITO! Enviamos los datos al admin.html
        return response.status(200).json({ success: true, data: data });

    } catch (error) {
        console.error('ERROR en get-data handler:', error.message);
        return response.status(500).json({ success: false, message: error.message || 'Error interno del servidor.' });
    }
}
