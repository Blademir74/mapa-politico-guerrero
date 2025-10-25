Mapa Político de Guerrero - Guía de PublicaciónEsta es la guía para la versión simplificada y funcional del proyecto.Paso 1: Sube los archivos a GitHubAsegúrate de que tu repositorio en GitHub tenga esta estructura exacta:/
├── api/
│   └── procesar.js   (El script del backend)
│
├── index.html        (El script del frontend)
├── package.json      (El archivo de configuración)
└── README.md         (Esta guía)

Paso 2: Configura VercelCrea un proyecto en Vercel e impórtalo desde tu repositorio de GitHub.Ve a Settings > Environment Variables.Añade las siguientes 3 variables de entorno. (Obtén los valores de tus cuentas de Supabase y Resend).| Nombre de la Variable | Valor || SUPABASE_URL | https://[tu-id-de-proyecto].supabase.co || SUPABASE_ANON_KEY | ey...[tu-llave-anónima]... || RESEND_API_KEY | re_...[tu-llave-de-api]... |Paso 3: Configura SupabaseVe a tu proyecto de Supabase.Haz clic en SQL Editor > New query.Pega y ejecuta el siguiente comando para crear tu tabla. DEBE llamarse participaciones.CREATE TABLE participaciones (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ DEFAULT now(),
  respuestas JSONB,
  perfil_calculado JSONB,
  municipio TEXT,
  contacto JSONB
);

¡Eso es todo!Una vez que completes estos 3 pasos y Vercel termine de desplegar, tu proyecto funcionará. La aplicación calculará el perfil, lo mostrará en pantalla y guardará los datos en Supabase.
