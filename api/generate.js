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

REGLA OBLIGATORIA DE ESTRUCTURA Y FORMATO LÍNEA POR LÍNEA EN MATEMÁTICA Y MATERIAS PRÁCTICAS:
En el arreglo de "actividades" del bloque "desarrollo" de cada sesión, DEBES redactar las explicaciones, fórmulas y ejercicios estructurados ESTRICTAMENTE LÍNEA POR LÍNEA usando saltos de línea (\\n). PROHIBIDO juntar conceptos, fórmulas y pasos en un mismo párrafo o texto corrido.

Cada explicación matemática debe seguir este ordenDidáctico línea por línea:

Concepto / Propiedad: [Nombre de la regla, propiedad o tema]
Fórmula / Ecuación: [Fórmula con símbolos limpios sin signos $ ni código LaTeX]
Variables:
  • [Variable 1] = [Nombre/Significado]
  • [Variable 2] = [Nombre/Significado]
Problema Modelo: [Enunciado del ejercicio o situación cotidiana]
Procedimiento paso a paso:
  • Paso 1: [Sustitución de valores en la fórmula]
  • Paso 2: [Despeje o desarrollo de la operación]
  • Paso 3: [Cálculo final / simplificación]
Respuesta (R): [Resultado final con sus unidades correspondientes]

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
          "Práctica guiada en parejas de ejercicios similares..."
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

    userMessage = `Genera la Planificación Semanal de Clases oficial para:
Centro Educativo: ${data.centro}
Docente: ${data.docente}
Ciclo: ${data.ciclo}
Grado: ${data.grado}
Asignatura: ${data.asignatura}
Semana / Fechas: ${data.semana}
Duración: ${data.duracion}
Jornada: ${data.jornada}
Unidad Curricular CNB: ${data.unidadNombre}
Expectativas de Logro Oficiales: ${JSON.stringify(data.expectativas)}
Contenidos Clave del CNB: ${JSON.stringify(data.contenidos)}`;

  } else {
    // Task Type: plan_mejora
    systemPrompt = `Eres un Asesor Técnico-Pedagógico Senior de la Secretaría de Educación de Honduras. 
Tu función es redactar y estructurar Planes de Mejora y Nivelación Académica de acuerdo con el Currículo Nacional Básico (CNB) de Honduras.

REGLA OBLIGATORIA DE ESTRUCTURA Y FORMATO LÍNEA POR LÍNEA EN LA CASILLA "acciones":
Escribe el campo "acciones" separando CADA ELEMENTO PEDAGÓGICO en una línea independiente usando saltos de línea (\\n). PROHIBIDO escribir párrafos amontonados o continuos.

Usa la siguiente estructura estricta LÍNEA POR LÍNEA:

Concepto o Regla: [Nombre del concepto o propiedad]
Fórmula: [Fórmula o ecuación limpia]
Desglose de Variables:
  • [Variable 1] = [Significado]
  • [Variable 2] = [Significado]
Problema Modelo: [Enunciado del ejercicio]
Resolución Paso a Paso:
  • Paso 1: [Sustitución de datos]
  • Paso 2: [Operación o desarrollo]
  • Paso 3: [Simplificación]
Respuesta (R): [Resultado final con unidades]
Actividad de Ejercitación:
  • [Instrucciones del taller o guía práctica]

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

    userMessage = `Genera un Plan de Mejora Académica para:
Centro Educativo: ${data.centro}
Ubicación: ${data.ubicacion}
Docente: ${data.docente}
Asignatura: ${data.asignatura}
Grado y Sección: ${data.gradoSeccion}
Nivel Educativo: ${data.nivel}
Temas reprobados / críticos con rezago:
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
