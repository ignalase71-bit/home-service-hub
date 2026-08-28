# Home Service Hub

Contexto y Rol

Actúa como arquitecto de software, desarrollador senior full-stack y diseñador UX/UI especializado en plataformas de servicios a domicilio, con experiencia en sistemas de reservas, calendarios multi-profesional, gestión de instaladores, cálculo dinámico de precios y marketplaces de servicios.

Estamos construyendo una plataforma profesional de instalación, montaje y servicios a domicilio, inicialmente para Jerez de la Frontera y un radio de hasta 35 km, pero diseñada desde el principio para poder crecer a otras localidades.

La arquitectura debe ser 100 % modular, tanto a nivel de categorías como de servicios, precios, instaladores y calendario.

Consulta o tarea

Modifica la aplicación que se está construyendo en Lovable para incorporar una gestión avanzada de calendario y disponibilidad de instaladores.

El calendario privado del administrador debe funcionar teniendo en cuenta que la disponibilidad no depende únicamente del horario, sino también del instalador asignado.

Debe ser posible que existan dos o más trabajos simultáneamente en el mismo horario si están asignados a diferentes instaladores.

También debe ser posible que un mismo instalador realice varios trabajos durante una única visita al mismo domicilio, sin crear conflictos artificiales de agenda.

Ejemplo:

Cliente: Juan García
Dirección: Calle X, Jerez
10:00–12:00
Instalador: Manuel

Trabajos:

 Instalación termo eléctrico

 Instalación grifo lavabo

Estos dos trabajos deben poder formar parte de una única visita, con un único desplazamiento y una única franja de trabajo.

Especificaciones

1. El calendario debe estar basado en instaladores, no únicamente en horarios

El sistema NO debe considerar un horario como "ocupado" simplemente porque exista una reserva.

La regla correcta es:

Un hueco horario está ocupado únicamente para el instalador que tenga asignado ese trabajo.

Por tanto:

Ejemplo

Instalador A:

10:00–12:00 → Aire acondicionado

Instalador B:

10:00–12:00 → Termo eléctrico

Esto es perfectamente válido.

El calendario debe mostrar ambos trabajos simultáneamente.

No debe aparecer un error de "horario ocupado".

2. Cada instalador tendrá su propia agenda

Crear una estructura de disponibilidad individual para cada instalador.

Cada instalador debe poder tener:

 horario habitual;

 días laborables;

 vacaciones;

 días bloqueados;

 franjas no disponibles;

 trabajos asignados;

 especialidades;

 zonas;

 duración máxima de trabajo;

 disponibilidad Express.

La disponibilidad general del negocio será la suma de las disponibilidades de los instaladores.

3. Calendario global del administrador

El administrador debe tener una vista global donde pueda ver:

Todos los instaladores

y simultáneamente:

 sus trabajos;

 horarios;

 desplazamientos;

 trabajos Express;

 visitas agrupadas.

La vista debe permitir cambiar entre:

Calendario global

Muestra todos los instaladores.

Vista por instalador

Muestra únicamente los trabajos de un instalador.

Vista por módulo

Climatización, IKEA, electricidad, etc.

Vista por día

Vista semanal

Vista mensual

Vista lista

4. Mismo horario, diferentes instaladores

Implementar explícitamente esta regla:

SI

trabajo_A.instalador_id != trabajo_B.instalador_id

ENTONCES

pueden compartir fecha y horario

Siempre que cada instalador tenga disponibilidad.

Ejemplo:

HoraInstaladorTrabajoEstado10:00–12:00ManuelAire acondicionadoConfirmado10:00–11:30AntonioTermoConfirmado10:00–12:00JoséIKEA PAXConfirmado

Todos pueden coexistir.

5. Conflicto real

El sistema debe detectar conflicto únicamente cuando:

mismo instalador

+

misma fecha

+

solapamiento horario

Ejemplo:

Manuel:

10:00–12:00 → Aire acondicionado

Intento de reservar:

11:00–13:00 → Termo

Debe aparecer:

⚠️ Manuel ya tiene un trabajo asignado entre las 10:00 y las 12:00.

Pero si se asigna el segundo trabajo a Antonio:

✅ Disponible.

6. IMPORTANTE: varias instalaciones en una misma visita

Crear una entidad específica:

VISITA

Una visita representa el desplazamiento de un instalador a una dirección concreta.

Una visita puede contener:

Uno o varios trabajos.

Ejemplo:

VISITA #000245

Cliente:

Juan García

Dirección:

Jerez de la Frontera

Fecha:

21/08/2026

Horario:

10:00–12:00

Instalador:

Manuel

Trabajos incluidos

 Instalación termo eléctrico — 179 €

 Instalación grifo lavabo — 69 €

Total servicios:

248 €

Desplazamiento:

0 €

Porque forman parte de la misma visita.

7. Una visita puede contener múltiples servicios

No crear necesariamente una reserva/calendario independiente para cada servicio.

Crear esta relación:

CLIENTE

   ↓

VISITA

   ↓

TRABAJOS

   ├── Servicio 1

   ├── Servicio 2

   ├── Servicio 3

   └── Servicio N

Esto permitirá posteriormente añadir más trabajos a una visita existente.

8. Ejemplo completo

El cliente contrata:

Termo eléctrico

179 €

y añade:

Grifo de lavabo

69 €

El sistema debe detectar que:

 mismo cliente;

 misma dirección;

 misma fecha;

 misma franja;

 mismo instalador.

Por tanto, debe ofrecer:

¿Quieres realizar ambos trabajos en una misma visita?

Si la respuesta es sí:

Una única visita

10:00–12:00

Manuel

Trabajos:

 Termo

 Grifo

9. Duración de una visita

Cada servicio debe tener una:

duración estimada

Ejemplo:

Termo:

90 minutos

Grifo:

45 minutos

El sistema debe calcular:

90 + 45 = 135 minutos

Pero debe permitir configurar si determinados trabajos pueden realizarse parcialmente de forma simultánea o si necesitan tiempo adicional.

No asumir que siempre se debe sumar de forma rígida.

Crear un campo:

duración estimada

y otro:

duración adicional cuando se añade a una visita existente

Ejemplo:

Termo:

90 min

Grifo como trabajo independiente:

45 min

Grifo añadido a visita del termo:

+30 min

Resultado:

120 minutos

Esto debe ser configurable desde administración.

10. Agrupación automática

Cuando el cliente añade varios servicios, el sistema debe intentar agruparlos.

Condiciones iniciales:

 mismo cliente;

 misma dirección;

 misma fecha;

 franja compatible;

 mismo instalador;

 especialidades compatibles.

Mostrar:

Podemos realizar estos trabajos en una única visita.

Y mostrar el ahorro correspondiente si existe.

11. Desplazamiento

El suplemento de desplazamiento de +50 € hasta 35 km debe aplicarse por visita, no por cada trabajo.

Ejemplo:

Cliente a 25 km.

Contrata:

 Termo → 179 €

 Grifo → 69 €

Debe calcular:

179 + 69 + 50 € desplazamiento

Total:

298 €

NO:

179 + 50 + 69 + 50.

12. Express

La instalación Express de +100 € debe aplicarse al servicio que corresponda.

Ejemplo:

Termo:

179 €

Express:

+100 €

Grifo:

69 €

Desplazamiento:

+50 €

Total:

398 €

Pero si dos servicios forman una visita Express, debe existir una regla configurable para decidir si:

 se cobra Express por cada servicio;

 o se cobra una única tarifa Express por visita.

Inicialmente utilizar:

+100 € por servicio que tenga activada la modalidad Express.

Dejar esta regla editable posteriormente.

13. Agrupación de trabajos ya contratados

El administrador debe poder agrupar manualmente trabajos existentes.

Ejemplo:

Trabajo A:

Termo

10:00–11:30

Manuel

Trabajo B:

Grifo

11:30–12:15

Manuel

Mismo cliente y dirección.

El administrador debe poder seleccionar:

"Agrupar en una visita"

Y convertirlos en:

VISITA #000245

10:00–12:15

Manuel

Trabajos:

 Termo

 Grifo

14. También debe poder dividir una visita

El administrador debe poder hacer:

"Separar trabajos"

Por ejemplo:

Termo + grifo

se convierten en:

Visita 1:

Termo

10:00–11:30

Manuel

Visita 2:

Grifo

12:00–12:45

Antonio

Esto debe liberar correctamente la agenda de Manuel.

15. Cambio de instalador

El administrador debe poder cambiar el instalador de una visita.

Al seleccionar otro instalador:

el sistema debe comprobar automáticamente:

 disponibilidad;

 horario;

 especialidades;

 zona;

 posibles conflictos.

Si todo está correcto:

✅ Instalador disponible

Si existe conflicto:

⚠️ Conflicto de agenda

No permitir el cambio automáticamente salvo que el administrador confirme explícitamente una acción de sobrescritura.

16. Especialidades

Cada instalador debe tener especialidades.

Ejemplo:

Manuel

✓ Aire acondicionado
✓ Termos
✓ Fontanería

Antonio

✓ IKEA
✓ Muebles
✓ Cocina

José

✓ Electricidad
✓ Wallbox
✓ Solar

Cuando se crea una visita, el sistema debe mostrar primero los instaladores compatibles.

17. Asignación manual inicialmente

No crear todavía un sistema completamente automático de asignación.

El administrador podrá seleccionar:

Instalador

y el sistema mostrará:

🟢 Disponible

🟡 Disponible con otra visita cercana

🔴 Ocupado

El sistema debe dejar preparada la arquitectura para automatizar posteriormente la asignación.

18. Vista del calendario

En la vista semanal del administrador, mostrar algo similar a:

              LUNES 24

08:00

────────────────────────────────────

MANUEL

10:00 ┌─────────────────────────┐

      │ ❄️ AIRE ACONDICIONADO   │

12:00 └─────────────────────────┘

ANTONIO

10:00 ┌─────────────────────────┐

      │ 🪑 IKEA PAX              │

12:30 └─────────────────────────┘

JOSÉ

10:00 ┌─────────────────────────┐

      │ ⚡ WALLBOX               │

12:00 └─────────────────────────┘

Los tres trabajos pueden coexistir.

19. Visualización de visitas agrupadas

Si Manuel tiene:

Termo + grifo

mostrar un único bloque:

🔧 VISITA #245

10:00–12:00

👤 Manuel

🚿 Termo eléctrico
🚰 Grifo lavabo

248 €

El bloque debe poder expandirse para ver cada servicio.

20. Cliente

El cliente NO debe ver:

 otros instaladores;

 otros trabajos;

 calendario interno;

 nombres de otros clientes;

 disponibilidad interna.

El cliente únicamente verá:

Fechas y horarios disponibles para su solicitud.

La disponibilidad debe calcularse internamente según los instaladores compatibles.

21. Selección de horario por el cliente

Cuando el cliente seleccione un servicio:

 determinar especialidad;

 determinar duración;

 determinar zona;

 consultar instaladores compatibles;

 consultar disponibilidad;

 generar huecos disponibles;

 mostrar únicamente huecos reales.

Ejemplo:

Mañana, 10:00–12:00

El sistema puede ofrecerlo aunque exista otro trabajo a esa hora si hay otro instalador disponible.

22. Express 24 horas

Para Express:

El sistema debe buscar únicamente huecos compatibles dentro de las siguientes 24 horas.

Ejemplo:

Cliente solicita Express a las 14:00.

Buscar:

14:00 → 14:00 día siguiente.

Si existe instalador compatible:

🚀 Express disponible

Si no:

Express no disponible actualmente

No permitir contratarlo simplemente porque el servicio tenga activado Express.

23. Arquitectura de datos

Modificar la arquitectura para distinguir claramente:

customers

    ↓

visits

    ↓

visit_services

    ↓

services

Y:

installers

    ↓

installer_availability

    ↓

visits

La entidad visit debe contener como mínimo:

id

customer_id

installer_id

date

start_time

end_time

address

latitude

longitude

status

express

distance_fee

total

notes

Y visit_services:

id

visit_id

service_id

quantity

base_price

extras

duration

express_fee

subtotal

notes

Esto permite que una visita tenga uno o múltiples servicios.

24. Historial y precios

Si posteriormente se modifica un precio:

NO modificar las reservas históricas.

Cada servicio contratado debe almacenar el precio que tenía en el momento de contratación.

Por ejemplo:

Hoy:

Termo = 179 €

Mañana administrador cambia:

Termo = 189 €

Las reservas antiguas seguirán mostrando:

179 €

Las nuevas:

189 €

25. Calendario y facturación

El calendario debe mostrar:

 total de la visita;

 total por servicios;

 extras;

 Express;

 desplazamiento;

 estado del pago.

Pero distinguir:

Facturación al cliente

de:

Coste del instalador

Preparar la estructura para que posteriormente pueda calcularse:

Precio cliente

−

Pago instalador

=

Margen de la plataforma

Esto será especialmente importante cuando se empiece a trabajar con varios instaladores.

Criterios de Calidad

Nunca bloquear un horario globalmente cuando el instalador disponible sea otro.

 El conflicto debe comprobarse por instalador + fecha + intervalo horario.

 Un mismo instalador no puede tener dos trabajos solapados salvo que el administrador realice una acción explícita de excepción.

 Una visita puede contener uno o múltiples servicios.

 Varios servicios para el mismo cliente y domicilio deben poder agruparse en una única visita.

 El desplazamiento de +50 € debe cobrarse por visita, no por servicio.

 Los precios históricos deben permanecer intactos.

 Express debe depender de disponibilidad real.

 Los instaladores deben tener especialidades.

 El administrador debe poder agrupar y dividir visitas.

 Cambiar de instalador debe provocar una comprobación automática de disponibilidad.

 El calendario debe mostrar claramente qué instalador realiza cada visita.

 Los trabajos simultáneos de diferentes instaladores deben visualizarse correctamente.

 El cliente nunca debe acceder al calendario interno.

 La arquitectura debe permitir posteriormente automatizar la asignación de instaladores.

 El sistema debe poder incorporar nuevos tipos de profesionales y especialidades sin rehacer el calendario.

 Las visitas agrupadas deben conservar el detalle económico de cada servicio.

 La interfaz debe ser clara tanto en escritorio como en móvil.

 El sistema debe impedir reservas duplicadas accidentales.

 No introducir datos ficticios como disponibilidad real.

Cómo debe ser la respuesta

No reconstruyas la aplicación desde cero si ya existe una implementación anterior.

Analiza la aplicación actual y modifica la arquitectura existente para incorporar estas reglas.

Conserva:

 diseño;

 branding;

 navegación;

 módulos;

 precios;

 calculadora;

 sistema de zonas;

 Express;

 panel de administración;

salvo que sea necesario modificarlos para implementar correctamente el nuevo sistema de visitas y disponibilidad.

La prioridad ahora es que el calendario y el sistema de reservas sean robustos y escalables.

Implementa especialmente:

 calendario multi-instalador;

 disponibilidad individual;

 detección de conflictos por instalador;

 entidad visita;

 múltiples servicios dentro de una visita;

 agrupación de servicios;

 división de visitas;

 asignación/cambio de instalador;

 cálculo de duración;

 cálculo de desplazamiento por visita;

 Express condicionado a disponibilidad;

 preparación para cálculo de margen por instalador.

Verificación

Antes de dar por terminada la modificación, comprueba estos casos:

Caso A — dos instaladores

Manuel:

10:00–12:00 → Aire acondicionado

Antonio:

10:00–12:00 → IKEA

Resultado: ambas reservas permitidas.

Caso B — conflicto

Manuel:

10:00–12:00 → Aire acondicionado

Intentar asignar a Manuel:

11:00–13:00 → Termo

Resultado: conflicto.

Caso C — misma visita

Juan:

10:00–12:00

Manuel:

 Termo eléctrico

 Grifo lavabo

Resultado: una única visita con dos servicios.

Caso D — desplazamiento

Termo:

179 €

Grifo:

69 €

Zona hasta 35 km:

+50 €

Total: 298 €.

Caso E — Express

Termo:

179 €

Express:

+100 €

Zona:

+50 €

Total: 329 €.

Caso F — varios servicios + Express

Termo:

179 €

Express:

+100 €

Grifo:

69 €

Zona:

+50 €

Total: 398 €.

Caso G — dos visitas simultáneas

Manuel:

10:00–12:00 → Termo

Antonio:

10:00–12:00 → Aire acondicionado

Resultado: permitido.

Caso H — cambio de instalador

Cambiar Manuel por Antonio.

Si Antonio está libre y tiene la especialidad:

Cambio permitido.

Si Antonio está ocupado:

Cambio bloqueado con aviso de conflicto.

Caso I — agrupación

Dos reservas independientes del mismo cliente, misma dirección y horario compatible:

Termo + grifo

El administrador selecciona:

"Agrupar en visita"

Resultado:

una única visita con dos servicios.

Caso J — separación

Visita:

Termo + grifo

Administrador selecciona:

"Separar visita"

Resultado:

dos trabajos independientes, con sus respectivos horarios/instaladores.

Caso K — histórico

Termo contratado a 179 €.

Administrador cambia posteriormente el precio a 189 €.

La reserva anterior:

continúa mostrando 179 €.

La siguiente:

189 €.

Caso L — Express sin disponibilidad

No existe ningún instalador compatible disponible durante las siguientes 24 horas.

La opción Express no puede contratarse.

Resultado esperado

La aplicación debe terminar funcionando como un sistema real de gestión de servicios a domicilio, donde la unidad operativa principal sea la VISITA, y no simplemente la reserva individual.

La lógica fundamental debe ser:

Un instalador puede hacer muchas visitas a lo largo del día. Una visita puede contener uno o varios trabajos. Varios instaladores pueden trabajar simultáneamente.

Esta estructura debe quedar implementada desde ahora porque será la base para escalar posteriormente el negocio.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cf4f3c44-9149-4f1c-9516-249a5e43f7dd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
