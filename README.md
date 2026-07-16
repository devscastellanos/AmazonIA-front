# AmazonIA

AmazonIA es una plataforma web construida con Next.js para el monitoreo ambiental de la Amazonia colombiana. El proyecto centraliza indicadores, mapas, predicciones y simuladores para apoyar el analisis de la deforestacion y la toma de decisiones.

## Dataset utilizado
Puntos de calor históricos en la amazonía y orinoquía colombiana. Brinda información de los posibles incendios o quemas en la Amazonia colombiana para contribuir a la activación temprana de medidas de prevención y control.

Datos extraídos desde el 1/1/2017 hasta la fecha de hoy.

Link: https://www.datos.gov.co/dataset/Puntos-de-calor-por-regi-n-Hist-rico-Escala-1-100-/4dyk-z4e2/about_data

Entidad: SIATAC

Variables utilizadas: 8

Scripts utilizados: `AmazonIA-front/analytics/limpiar_datos.py`, `AmazonIA-front/analytics/prediccion_datos.py`

---

## Modelo de predicción de focos de calor

Se entrena un **`RandomForestRegressor` independiente por departamento** usando la librería `scikit-learn`. El flujo completo es:

1. **Descarga y limpieza** — `limpiar_datos.py` descarga los registros de SIATAC y los consolida en un CSV mensual por municipio.
2. **Feature engineering** — `prediccion_datos.py` construye rezagos temporales (`lag_1`, `lag_2`, `lag_3`, `lag_6`, `lag_12`), medias móviles (3, 6 y 12 meses) y componentes de estacionalidad cíclica (`mes_sin`, `mes_cos`).
3. **Entrenamiento** — Un `RandomForestRegressor(n_estimators=300, max_depth=10)` por departamento. El target es `log1p(total_focos)` para comprimir la escala.
4. **Evaluación** — Los últimos 12 meses de cada departamento se reservan como set de prueba. Se reportan MAE, R² y accuracy de la clasificación de riesgo (bajo / medio / alto).
5. **Pronóstico recursivo** — Se generan 6 meses hacia adelante mes a mes; cada predicción alimenta el rezago del siguiente paso.
6. **Incertidumbre** — Se estima como la desviación estándar entre las predicciones de cada árbol del ensemble.

**Librerías Python:**

| Librería | Versión mínima | Uso |
|---|---|---|
| `pandas` | 2.x | Carga, agregación y feature engineering |
| `numpy` | 1.x | Operaciones vectoriales y estadísticas |
| `scikit-learn` | 1.x | `RandomForestRegressor`, métricas, `LabelEncoder` |
| `requests` | 2.x | Descarga incremental del CSV desde datos.gov.co |

---

## Chatbot AmazonIA (RAG + Gemini)

El chatbot responde preguntas sobre focos de calor históricos y predicciones usando una arquitectura **RAG** (Retrieval-Augmented Generation):

1. **Retriever** (`lib/chatbot/retriever.ts`) — Parsea la pregunta con keyword matching para extraer departamento, municipio, año y mes. Consulta los datos locales (histórico o predicciones) y devuelve los registros más relevantes.
2. **Generator** (`lib/chatbot/generator.ts`) — Construye un prompt con los datos recuperados y lo envía a **Gemini** para generar la respuesta en lenguaje natural. Si Gemini falla, activa un fallback determinístico basado en los mismos datos.

**Modelo LLM utilizado:** `gemini-1.5-flash-latest` vía la API de Google Generative AI.

**Librerías JavaScript/TypeScript:**

| Librería | Uso |
|---|---|
| `@google/generative-ai` | Cliente oficial de Gemini para Node.js / Edge runtime |
| `next` (API Routes) | Endpoint `/api/chat` que orquesta retriever + generator |

**Variable de entorno requerida:**
```
GEMINI_API_KEY=tu_api_key_de_google_ai_studio
```

---

## Requisitos

- Node.js 18 o superior
- `pnpm` instalado globalmente

## Instalacion

```bash
pnpm install
```

Este comando descarga todas las dependencias definidas en `package.json`.

## Desarrollo

```bash
pnpm dev
```

Luego abre [http://localhost:3000](http://localhost:3000) para ver la aplicacion.

## Produccion

```bash
pnpm build
pnpm start
```

`pnpm build` genera la version optimizada y `pnpm start` levanta el servidor de produccion.

## Estructura del proyecto

- `app/`: rutas y paginas principales de la aplicacion
- `components/`: componentes reutilizables de dashboard, layout, simulador y predicciones
- `analytics/`: scripts Python de descarga, limpieza y predicción de datos
- `lib/`: utilidades compartidas, chatbot (retriever + generator) y lógica del juego
- `types/`: tipos de TypeScript

## Secciones disponibles

- `/`: dashboard principal con KPIs, mapa, histórico y panel de predicción
- `/predicciones`: vista del modelo predictivo con mapa de riesgo y métricas
- `/historico`: mapa interactivo de todos los focos históricos (2017–hoy)
- `/como-se-hizo`: explicación del proceso de modelado
- `/juego`: juego educativo sobre gestión ambiental de la Amazonia
- `/acerca`: información general del proyecto

## Notas

El proyecto usa el App Router de Next.js, TypeScript y Tailwind CSS. Los datos se sirven desde API routes internas que leen los archivos generados por los scripts de analytics.
