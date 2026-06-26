# Tienda de Perritos - AWS ECS & GitHub Actions (DevOps EP3)

Este proyecto consiste en una aplicación web de tienda de mascotas ("Tienda de Perritos") diseñada bajo prácticas DevOps para cumplir al 100% con la pauta de la **Evaluación Parcial N°3** de **Introducción a Herramientas DevOps (ISY1101)**.

La arquitectura se compone de:
*   **Frontend:** Servidor Nginx que entrega archivos estáticos (HTML/CSS/JS) y actúa como reverse proxy redirigiendo el tráfico `/api/` internamente hacia el backend.
*   **Backend:** API REST en Node.js/Express que sirve el catálogo de productos y procesa simulaciones de pago.

---

## 1. Ejecución Local (Docker Compose)

Puedes probar todo el flujo de la aplicación de manera local utilizando Docker Compose:

### Requisitos previos:
*   Tener instalado [Docker Desktop](https://www.docker.com/products/docker-desktop/).

### Instrucciones:
1. Abre una terminal en la raíz del proyecto.
2. Ejecuta el comando:
   ```bash
   docker-compose up --build
   ```
3. Una vez finalizada la construcción, accede a:
   *   **Frontend (Aplicación):** [http://localhost](http://localhost)
   *   **Backend (API Health):** [http://localhost:3000/api/health](http://localhost:3000/api/health)
4. Para detener los contenedores:
   ```bash
   docker-compose down
   ```

---

## 2. Guía de Despliegue en AWS ECS (Fargate)

Sigue estos pasos en la consola de AWS para desplegar la arquitectura completa:

### Paso 1: Crear repositorios en Amazon ECR
1. Ve al servicio **Amazon ECR** (Elastic Container Registry).
2. Crea dos repositorios privados:
   *   `tiendaperritos-backend`
   *   `tiendaperritos-frontend`
3. Copia las URLs de los repositorios (las necesitarás para el pipeline de GitHub Actions).

### Paso 2: Crear el Clúster de ECS
1. Ve a **Amazon ECS** (Elastic Container Service).
2. Haz clic en **Create Cluster**.
3. Elige un nombre para el clúster: `tiendaperritos-cluster`.
4. En **Infrastructure**, selecciona **AWS Fargate** (Serverless).
5. Haz clic en **Create**.

### Paso 3: Configurar la Red (VPC) y Security Groups
Para cumplir con las pautas de seguridad de la rúbrica (IE1):
1. **Security Group para el ALB:** Permitir entrada HTTP (puerto 80) desde cualquier origen (`0.0.0.0/0`).
2. **Security Group para el Frontend:** Permitir entrada en puerto 80 solo desde el Security Group del ALB.
3. **Security Group para el Backend:** Permitir entrada en puerto 3000 solo desde el Security Group del Frontend.

### Paso 4: Crear las Task Definitions (Definición de Tareas)
Puedes crear una Task Definition para cada servicio o una sola conjunta. Recomendamos crearlas por separado:

#### A. Task Definition para el Backend (`tiendaperritos-backend`):
1. Elige **Fargate** como tipo de lanzamiento.
2. Asigna la CPU y memoria mínima (`0.25 vCPU` y `0.5 GB`).
3. Define el rol de ejecución de tarea: `LabRole` (en AWS Academy) o `ecsTaskExecutionRole`.
4. Agrega un contenedor con el nombre `backend`:
   *   **Image:** URL de tu repositorio ECR `tiendaperritos-backend:latest`
   *   **Port mappings:** Puerto `3000` (TCP).
5. Habilita los logs de CloudWatch.

#### B. Task Definition para el Frontend (`tiendaperritos-frontend`):
1. Repite los pasos anteriores.
2. Agrega un contenedor con el nombre `frontend`:
   *   **Image:** URL de tu repositorio ECR `tiendaperritos-frontend:latest`
   *   **Port mappings:** Puerto `80` (TCP).
3. Habilita los logs de CloudWatch.

### Paso 5: Configurar Service Connect (Comunicación Interna)
Para que el Frontend Nginx pueda enviar consultas a `http://backend:3000/api/` de manera privada:
1. Al crear los servicios en ECS, activa **Service Connect**.
2. Define un namespace (ej. `tiendaperritos.local`).
3. Para el servicio de Backend: configúralo como **Client/Server**, puerto `3000`, y nombre de descubrimiento `backend`.
4. Para el servicio de Frontend: configúralo como **Client** (o Client/Server si requiere ser expuesto por ALB), conectándolo al mismo namespace.

### Paso 6: Configurar el Balanceador de Carga (ALB) y Crear Servicios
1. Crea un **Application Load Balancer (ALB)** público.
2. Crea un Target Group para el Frontend (Puerto 80, Health Check en `/health`).
3. En ECS, crea el **Servicio del Backend** (sin IP pública, privado dentro de las subredes).
4. Crea el **Servicio del Frontend** (asociado al ALB público, expuesto a internet).

### Paso 7: Configurar Autoscaling (IE3)
1. En la pestaña de configuración del servicio de ECS, ve a **Service Auto Scaling**.
2. Configura una política de escalado de tipo **Target Tracking**.
3. Métrica: **CPU Utilization** al **50%** (o Memory al 50%).
4. Justificación para la defensa: Un umbral de 50% garantiza que ante ráfagas de visitas simultáneas (como simulación de carga con ApacheBench o Locust), el servicio levante nuevas tareas para evitar la degradación de la latencia antes de que los contenedores actuales se saturen.

---

## 3. Configuración de GitHub Actions (CI/CD)

El archivo de workflow ya se encuentra en `.github/workflows/deploy.yml`. Para habilitarlo, debes configurar los secrets en tu repositorio de GitHub:

### Agregar Secrets en GitHub:
1. Ve a tu repositorio en GitHub $\rightarrow$ **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
2. Haz clic en **New repository secret** y agrega:
   *   `AWS_ACCESS_KEY_ID`: Tu llave de acceso de AWS.
   *   `AWS_SECRET_ACCESS_KEY`: Tu clave secreta de AWS.
   *   `AWS_SESSION_TOKEN`: Tu token de sesión temporal (necesario si estás usando la plataforma de AWS Academy Learner Lab).
3. Cada vez que hagas `git push` a la rama `main`, el pipeline construirá automáticamente las imágenes de Docker, las subirá a Amazon ECR y gatillará la actualización de los servicios en ECS.

---

## 4. Endpoints y Monitoreo (Logs)

*   **Logs del Backend:** Puedes monitorear la salida estándar de Node.js a través de **AWS CloudWatch logs** en el grupo `/ecs/tiendaperritos-backend`. Cada petición, error y simulación de pago imprimirá logs con formato combinado estructurado.
*   **Logs de Nginx (Frontend):** Monitorea accesos en `/ecs/tiendaperritos-frontend` para ver los requests HTTP de los usuarios y las redirecciones de proxy al backend.
*   **Validación de Salud:**
    *   Frontend: `http://<ALB-DNS>/health` (debe responder `healthy`).
    *   Backend: `http://<ALB-DNS>/api/health` (debe responder JSON con timestamp de salud).
