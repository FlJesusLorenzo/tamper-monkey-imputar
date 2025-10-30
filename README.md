# Script Tampermonkey - Imputación de Horas en Odoo desde GitLab

## Descripción

Este script de Tampermonkey permite imputar horas de trabajo directamente en Odoo desde las tareas de GitLab, automatizando el proceso de registro de tiempo dedicado a cada proyecto y cada tarea.

## Características

- ✅ Integración automática con tareas de GitLab
- ✅ Extracción automática del nombre del proyecto y número de tarea
- ✅ Interfaz de usuario intuitiva con popup
- ✅ Soporte para formatos de tiempo decimal y HH:MM
- ✅ Configuración de fecha personalizable
- ✅ Conexión directa con Odoo para crear imputaciones
- ✅ Opcion de crear descripcion por medio de Google AI

## Requisitos Previos

1. **Tampermonkey** instalado y configurado en tu navegador
2. Acceso a una instancia de **Odoo**
3. Permisos para crear imputaciones de tiempo en Odoo
4. Acceso a **GitLab**

## Instalación

1. Instala la extensión [Tampermonkey](https://www.tampermonkey.net/) en tu navegador
2. Utiliza este enlace para instalar el script - [script.user](https://github.com/FlJesusLorenzo/tamper-monkey-imputar/raw/refs/heads/main/main/script.user.js)
3. Cada vez que se realicen mejoras, para actualizar(por defecto se realiza una actualización al día), deberás pulsar en:
<img width="336" height="342" alt="image" src="https://github.com/user-attachments/assets/570281f0-45eb-4bbd-a218-01abeb19001f" />


## Configuración
1. Especifica la URL completa de tu instancia de Odoo
   - ⚠️ **Importante**: La URL debe comenzar con `http://` o `https://`
2. Establecer la base de datos sobre la que vamos a crear nuestras imputaciones

> [!IMPORTANT]
> Estas credenciales deberán pedirese a algún administrador del entorno al que nos queramos conectar

3. Durante la primera imputación que hagas se te pedirá permisos de redirección, elige sabiamente la opción que quieres permitir

4. (Nuevo) Ahora podemos agregar una clave api de gemini para poder generar las descripciones por medio de IA, para conseguir la clave seguir el tutorial: https://aistudio.google.com/api-keys
   - Al igual que en el caso de la primera imputación, la primera vez que pulsemos en Generar con IA, 
<img width="406" height="392" alt="Captura de pantalla 2025-10-28 213653" src="https://github.com/user-attachments/assets/cd304ed3-0f65-42a6-b5fe-597175440cba" />


## Uso

### Funcionamiento Automático

1. Navega a cualquier tarea de GitLab
2. Veremos un botón en la parte superior derecha:
<img width="275" height="80" alt="image" src="https://github.com/user-attachments/assets/930281af-d3b2-4dce-8b0a-960c1008ed2a" />

3. El script detectará automáticamente:
   - **Nombre del proyecto** (extraído del repositorio de la tarea)
   - **Número de tarea** (ID de la issue de GitLab)

### Interfaz de Usuario

<img width="499" height="744" alt="imagen" src="https://github.com/user-attachments/assets/252082b0-6332-4978-b22f-1b5616e806a8" /><img width="446" height="218" alt="imagen" src="https://github.com/user-attachments/assets/e50470cf-f01d-49ae-895a-d57aa6519b73" />

#### 1. Configuración
- Botón de configuración para establecer la base de datos y la url y la clave api de Gemini

#### 2. Información Automática
- **Proyecto**: Nombre del repositorio/proyecto
- **Tarea**: Número de la tarea de GitLab

#### 3. Campos de Entrada
- **Descripción**: Campo de texto para describir el trabajo realizado
- (Nuevo) **🤖 Descripcion por IA**: Genera la descripcion de la tarea por medio de Google AI (solo funciona si se agrega una clave valida)
- **Horas Dedicadas**: Acepta dos formatos:
  - **Formato decimal**: `2.5` (2 horas y 30 minutos)
  - **Formato HH:MM**: `02:30` (2 horas y 30 minutos)
- **Hora inicio - Hora final: se deberá establecer la hora a la que hemos empezado la tarea y la hora en la que hemos terminado
- **Fecha**: Fecha de la imputación (por defecto: fecha actual)

#### 4. Botones de Acción
- **🕐 Generar Imputación**: Crea la imputación en Odoo
- **❌ Cerrar**: Cierra el popup sin realizar acciones
- **📊 Ver Imputaciones**: Redirige a la página de imputaciones de Odoo

## Formatos de Tiempo Soportados en Horas dedicadas

| Formato | Ejemplo | Descripción |
|---------|---------|-------------|
| Decimal | `1.5` | 1 hora y 30 minutos |
| Decimal | `0.25` | 15 minutos |
| HH:MM | `01:30` | 1 hora y 30 minutos |
| HH:MM | `00:15` | 15 minutos |

## Limitaciones

- ⚠️ **Solo funciona en tareas de GitLab**: El script únicamente se activa en páginas de issues/tareas de GitLab
- 🔒 **Requiere autenticación**: Necesitas estar autenticado en Odoo
- 🌐 **Conexión a internet**: Requiere conectividad para comunicarse con Odoo

## Solución de Problemas

### Problemas Comunes

1. **El popup no aparece**
   - Verifica que estés en una página de tarea de GitLab
   - Comprueba que Tampermonkey esté habilitado

2. **Error al generar imputación**
   - Verifica la configuración de la base de datos de Odoo
   - Confirma que la URL de Odoo sea correcta
   - Asegúrate de estar autenticado en Odoo

3. **Formato de tiempo no reconocido**
   - Usa formato decimal (ej: `2.5`) o HH:MM (ej: `02:30`)
   - No uses formatos como `2h 30m`

4. **El botón no aparece**
   - Revisa si tienes bien configurado correctamente la extensión tampermonkey, puedes revisar fallos comunes en: [Tampermonkey FAQ](https://www.tampermonkey.net/faq.php))

## Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una branch para tu feature
3. Commit tus cambios
4. Push a la branch
5. Crea un Pull Request

## Licencia

[Especificar licencia]

## Soporte

Si encuentras problemas o tienes sugerencias, por favor:
- Abre un issue en este repositorio
- Describe el problema detalladamente
- Incluye información sobre tu navegador y versiones

---

**Nota**: Este script está diseñado para uso interno y requiere acceso tanto a GitLab como a Odoo con los permisos apropiados.
