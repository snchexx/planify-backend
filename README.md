<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Autenticación

La aplicación requiere las variables de conexión MySQL ya configuradas y `JWT_SECRET`, una clave aleatoria de al menos 32 caracteres. En PowerShell puedes generar una con:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Guarda el resultado en `.env` como `JWT_SECRET=...`; no reutilices ni publiques esta clave. La duración del token se configura con `JWT_EXPIRES_IN`, expresada en segundos. El valor predeterminado es `3600` (una hora); por ejemplo, `JWT_EXPIRES_IN=7200` configura dos horas.

La tabla `users` se crea mediante `synchronize` en desarrollo. Para producción, usa migraciones en lugar de `synchronize`.

| Método | Ruta                    | Acceso                                       |
| ------ | ----------------------- | -------------------------------------------- |
| POST   | `/auth/register`        | Público; crea usuarios con rol `usuario`     |
| POST   | `/auth/login`           | Público                                      |
| POST   | `/auth/password/forgot` | Público; solicita código de recuperación     |
| POST   | `/auth/password/reset`  | Público; cambia contraseña con código válido |
| GET    | `/users/me`             | JWT válido                                   |
| GET    | `/users`                | JWT válido y rol `admin`                     |
| POST   | `/users`                | JWT válido y rol `admin`; crea usuarios      |
| GET    | `/users/:id`            | JWT válido y rol `admin`                     |
| PATCH  | `/users/:id`            | JWT válido y rol `admin`                     |
| DELETE | `/users/:id`            | JWT válido y rol `admin`                     |

El registro recibe `identificacion`, `nombres`, `apellidos`, `email` y `password`; el inicio de sesión recibe `email` y `password`. Envía el token devuelto como `Authorization: Bearer YOUR_JWT`. Para asignar un administrador, cambia el campo `role` del usuario a `admin` directamente en la base de datos; el registro público no permite elegir roles.

Las rutas de administración aceptan `identificacion`, `nombres`, `apellidos`, `email`, `password`, `role` (`admin` o `usuario`) y `estado` (`activo` o `bloqueado`); todos son opcionales al actualizar. La identificación es única. El estado predeterminado es `activo`; un usuario bloqueado no puede iniciar sesión ni usar un JWT existente. Los campos del perfil son nullable en la base de datos para preservar usuarios preexistentes; el registro nuevo exige esos campos. Las contraseñas requieren al menos 8 caracteres y no pueden superar 72 bytes. Las solicitudes se validan con DTOs; campos no permitidos o inválidos reciben `400`. Las respuestas de usuario nunca incluyen la contraseña ni su hash.

### Recuperación de contraseña

Configura `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_APP_PASSWORD` y `SMTP_FROM` en `.env`. Para Gmail se usa
`smtp.gmail.com`, puerto `587` y `SMTP_SECURE=false`; `SMTP_APP_PASSWORD` debe
ser una contraseña de aplicación, no la contraseña normal de Google. No
publiques ni compartas estas credenciales.

`POST /auth/password/forgot` recibe `{ "email": "usuario@ejemplo.com" }` y
responde de forma genérica para no revelar si la cuenta existe. Si la cuenta
está registrada, envía un código de 6 dígitos válido por 10 minutos. Se limita
el reenvío a una solicitud por minuto y el código se consume tras un máximo de
5 intentos.

`POST /auth/password/reset` recibe `email`, `code` y `password`. El código se
guarda hasheado en `password_reset_codes`, se elimina al vencer o usarse y la
nueva contraseña debe cumplir las mismas reglas que en el registro. En
desarrollo TypeORM crea la tabla al iniciar; en producción, crea una migración.

### Notificaciones push

Configura `FIREBASE_PROJECT_ID` y `GOOGLE_APPLICATION_CREDENTIALS` en `.env`.
La segunda variable debe apuntar al JSON de Firebase Admin SDK guardado fuera
del repositorio. No incluyas esa clave privada en Git ni en la aplicación móvil.
La app Android requiere su propio `google-services.json` en
`android/app/google-services.json`.

Después de iniciar sesión, la app solicita permiso de notificaciones y registra
el token FCM del dispositivo en `POST /notifications/devices` usando el JWT.
Para comprobar el envío, toca el icono de notificaciones en la app de depuración
o llama `POST /notifications/test` con el mismo JWT. La respuesta indica cuántos
dispositivos recibieron el envío y cuántos fallaron. El endpoint de prueba solo
envía al usuario autenticado.

El backend consulta recordatorios pendientes cada 15 segundos, los reclama de
forma atómica en MySQL y reintenta fallos transitorios hasta cinco veces. Los
recordatorios vencidos por más de 15 minutos se omiten. Las fechas y horas de
las actividades se interpretan en `America/Bogota`; puedes sobrescribir esta
zona con `ACTIVITY_TIME_ZONE` usando un identificador IANA válido. En desarrollo,
TypeORM actualiza el esquema automáticamente; en producción debe generarse una
migración para las nuevas columnas de `recordatorios`.

## Actividades

Cada actividad pertenece a un usuario mediante `id_usuario` (relación muchos-a-uno desde actividad a usuario; un usuario puede tener muchas actividades). El CRUD protegido está disponible en `/activities`: `POST`, `GET`, `GET /:id`, `PATCH /:id` y `DELETE /:id`. Los usuarios solo pueden consultar y modificar sus propias actividades; los administradores pueden gestionar todas y asignarlas a un usuario existente usando `idUsuario`.

Los campos son `nombreActividad`, `descripcion`, `fechaActividad` (`YYYY-MM-DD`) y `horaActividad` (`HH:mm`). El usuario dueño se toma del JWT al crear, salvo cuando un administrador especifica `idUsuario`. La fecha y hora se almacenan en columnas MySQL `DATE` y `TIME`.

Al crear una actividad también se crea automáticamente un registro en `recordatorios`, con la misma fecha y hora y asociado mediante `id_actividad`. Una actividad puede tener varios recordatorios; al eliminarla, sus recordatorios también se eliminan.

## Solicitudes de IA

La entidad `solicitud_ia` almacena `id_solicitud`, `pregunta`, `fecha_hora` (establecida automáticamente al crear el registro) e `id_usuario`, que referencia a `users.id`.

La entidad `respuesta_ia` almacena `id_respuesta`, `respuesta`, `fechayhora_respuesta` (establecida automáticamente) e `id_solicitud`. Cada solicitud puede tener una respuesta asociada.

## Swagger

La documentación interactiva de la API está disponible en `http://localhost:8000/api` al iniciar la aplicación. Para probar rutas protegidas, selecciona **Authorize** e ingresa el JWT obtenido desde `/auth/login` o `/auth/register`.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project:

```bash
$ npm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/overview) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
