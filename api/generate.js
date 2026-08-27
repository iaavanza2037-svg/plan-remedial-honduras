export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Error de servidor: La API Key de Gemini no está configurada en las variables de entorno.' 
    });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const taskType = req.body.type || "plan_mejora";
  const data = req.body.data || {};

  let systemPrompt = "";
  let userMessage = "";

  if (taskType === "plan_semanal") {
    systemPrompt = `Eres un Asesor Técnico-Pedagógico Senior de la Secretaría de Educación de Honduras.
Tu función es redactar la Planificación Semanal de Clases en formato JSON exacto, estructurado con competencias, capacidades, indicadores, evaluación, adaptaciones y sesiones didácticas.

REGLA CRÍTICA Y MANDATORIA DE ALINEACIÓN TEMÁTICA CON EL FORMULARIO:
Toda la planificación (competencias, capacidades, desempeños, evaluación y especialmente las actividades de Inicio, Desarrollo y Cierre de CADA sesión) DEBE TRATAR ÚNICA Y EXCLUSIVAMENTE SOBRE LA UNIDAD CURRICULAR SOLICITADA ("${data.unidadNombre}") Y SUS CONTENIDOS CLAVE ("${JSON.stringify(data.contenidos)}").
PROHIBIDO GENERAR TEMAS DIFERENTES O AJENOS. Por ejemplo, si la unidad seleccionada es "Conjunto de Puntos" (Geometría), los conceptos, fórmulas, variables y ejercicios DEBEN SER sobre Puntos, Rectas, Planos, Rayos, Segmentos y Distancias (ej: $d = |x_2 - x_1|$ o Punto Medio $M = \\frac{x_1 + x_2}{2}$). NUNCA generes temas de divisibilidad, ecuaciones o números racionales si la unidad es de geometría o un tema distinto.

REGLA OBLIGATORIA DE ESTRUCTURA Y FORMATO LÍNEA POR LÍNEA EN EL DESARROLLO DE CADA SESIÓN:
En el arreglo de "actividades" del bloque "desarrollo" de cada sesión, DEBES redactar las explicaciones, fórmulas y ejercicios estructurados ESTRICTAMENTE LÍNEA POR LÍNEA usando saltos de línea (\\n). PROHIBIDO juntar conceptos, fórmulas y pasos en un mismo párrafo.

Cada explicación o ejercicio debe seguir este orden didáctico línea por línea:

Concepto / Propiedad: [Nombre explícito de la regla, propiedad o tema de la unidad]
Fórmula / Ecuación: [Fórmula o ecuación explícita adaptada al tema sin símbolos LaTeX]
Variables:
  • [Variable 1] = [Significado/Nombre preciso]
  • [Variable 2] = [Significado/Nombre preciso]
Problema Modelo: [Enunciado del ejercicio o situación cotidiana alineada al tema]
Procedimiento paso a paso:
  • Paso 1: [Sustitución de valores usando OBLIGATORIAMENTE las variables declaradas arriba]
  • Paso 2: [Operación o despeje usando explícitamente las variables declaradas]
  • Paso 3: [Cálculo final usando la variable]
Respuesta (R): [Resultado final indicando explícitamente el valor de la variable con sus unidades]

REGLA CRÍTICA DE COHERENCIA EN EL USO DE VARIABLES:
Toda variable que declares en "Variables" DEBE usarse de forma explícita en las ecuaciones de cada paso numérico. PROHIBIDO declarar variables y luego omitirlas en los pasos.

PROHIBIDO USAR SINTAXIS LATEX DE $ O \\frac. Usa símbolos limpios y legibles en Word (×, ÷, =, ±, ², √, etc.).

Debes responder obligatoriamente en formato JSON exacto respetando el siguiente esquema:
{
  "competencia": "string",
  "capacidades": ["string", "string", "string", "string"],
  "desempenos": ["string", "string", "string", "string"],
  "evaluacion": {
    "tecnica": "string",
    "instrumento": "string",
    "evidencia": "string"
  },
  "adaptaciones": {
    "dificultades": ["string", "string"],
    "avanzado": ["string"]
  },
  "referenciasDocente": ["string", "string"],
  "referenciasEstudiante": ["string", "string"],
  "sesiones": [
    {
      "numero": 1,
      "titulo": "string",
      "inicio": {
        "actividades": ["string", "string"],
        "recursos": ["string", "string"],
        "tiempo": "8 min"
      },
      "desarrollo": {
        "actividades": [
          "Concepto / Propiedad: ...\\nFórmula: ...\\nVariables:\\n  • ...\\n  • ...",
          "Problema Modelo: ...\\nProcedimiento paso a paso:\\n  • Paso 1: ...\\n  • Paso 2: ...\\n  • Paso 3: ...\\nRespuesta (R): ...",
          "Práctica guiada en parejas..."
        ],
        "recursos": ["string", "string"],
        "tiempo": "28 min"
      },
      "cierre": {
        "actividades": ["string", "string"],
        "recursos": ["string"],
        "tiempo": "9 min"
      }
    }
  ]
}`;

    userMessage = `Genera la Planificación Semanal de Clases oficial alineada al tema seleccionado:
Centro Educativo: ${data.centro}
Docente: ${data.docente}
Ciclo: ${data.ciclo}
Grado: ${data.grado}
Asignatura: ${data.asignatura}
Semana / Fechas: ${data.semana}
Duración: ${data.duracion}
Jornada: ${data.jornada}
Unidad Curricular CNB Obligatoria: ${data.unidadNombre}
Expectativas de Logro Oficiales: ${JSON.stringify(data.expectativas)}
Contenidos Clave del CNB a Desarrollar: ${JSON.stringify(data.contenidos)}`;

  } else {
    // Task Type: plan_mejora
    systemPrompt = `Eres un Asesor Técnico-Pedagógico Senior de la Secretaría de Educación de Honduras. 
Tu función es redactar y estructurar Planes de Mejora y Nivelación Académica de acuerdo con el Currículo Nacional Básico (CNB) de Honduras.

REGLA CRÍTICA Y MANDATORIA DE ALINEACIÓN TEMÁTICA:
Toda la matriz de mejora DEBE TRATAR ÚNICA Y EXCLUSIVAMENTE SOBRE LOS TEMAS REPROBADOS INDICADOS POR EL USUARIO (${JSON.stringify(data.temasLista)}). PROHIBIDO INVENTAR O CAMBIAR DE TEMA. Cada fila de la matriz debe corresponder exactamente a uno de los temas de la lista.

REGLA OBLIGATORIA DE ESTRUCTURA Y FORMATO LÍNEA POR LÍNEA EN LA CASILLA "acciones":
Escribe el campo "acciones" separando CADA ELEMENTO PEDAGÓGICO en una línea independiente usando saltos de línea (\\n). PROHIBIDO escribir párrafos continuos.

Estructura estricta LÍNEA POR LÍNEA:

Concepto o Regla: [Nombre exacto del tema seleccionado]
Fórmula: [Fórmula o definición con simbología explícita alineada al tema]
Desglose de Variables:
  • [Variable 1] = [Significado]
  • [Variable 2] = [Significado]
Problema Modelo: [Enunciado del ejercicio alineado al tema]
Resolución Paso a Paso:
  • Paso 1: [Sustitución de valores usando OBLIGATORIAMENTE las variables declaradas arriba]
  • Paso 2: [Desarrollo o cálculo matemático usando las variables]
  • Paso 3: [Cálculo final con la variable]
Respuesta (R): [Resultado explícito especificando la variable y sus unidades]
Actividad de Ejercitación:
  • [Instrucciones del taller o guía práctica donde el estudiante aplique las mismas variables]

REGLA CRÍTICA DE COHERENCIA EN EL USO DE VARIABLES:
Toda variable que declares en "Desglose de Variables" DEBE usarse de forma explícita en la "Resolución Paso a Paso".

PROHIBIDO USAR CÓDIGO LATEX ($ o \\frac). Usa símbolos matemáticos estándar (×, ÷, =, ±, ², √).

Debes responder obligatoriamente en formato JSON exacto respetando el siguiente esquema:
{
  "objetivoGeneral": "string",
  "objetivosEspecificos": ["string", "string", "string"],
  "justificacion": "string",
  "metodologia": [
    {"titulo": "Fase 1: Diagnóstico y Retroalimentación", "texto": "string"},
    {"titulo": "Fase 2: Modelado Directo y Talleres Prácticos", "texto": "string"},
    {"titulo": "Fase 3: Tutorías Individualizadas y Círculos de Estudio", "texto": "string"},
    {"titulo": "Fase 4: Evaluación Formativa mediante Rúbricas y Compromisos", "texto": "string"}
  ],
  "matriz": [
    {
      "tema": "string",
      "objetivos": "string",
      "acciones": "string con saltos de línea \\n estrictos para concepto, fórmula, variables, problema, paso a paso, respuesta y ejercitación",
      "estrategias": "string",
      "producto": "string",
      "recursos": "string",
      "observaciones": "string"
    }
  ]
}`;

    userMessage = `Genera un Plan de Mejora Académica estrictamente para los siguientes temas seleccionados:
Centro Educativo: ${data.centro}
Ubicación: ${data.ubicacion}
Docente: ${data.docente}
Asignatura: ${data.asignatura}
Grado y Sección: ${data.gradoSeccion}
Nivel Educativo: ${data.nivel}
Temas reprobados / críticos con rezago a desarrollar en la matriz:
${(data.temasLista || []).map(t => "- " + t).join("\n")}`;
  }

  const payload = {
    contents: [{ parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: 'Error devuelto por la API de Gemini', 
        details: errorText 
      });
    }

    const resData = await response.json();
    return res.status(200).json(resData);

  } catch (error) {
    console.error('Error en el servidor proxy:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor al comunicarse con la IA.' 
    });
  }
}
