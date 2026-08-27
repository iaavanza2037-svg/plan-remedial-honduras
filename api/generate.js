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

REGLA OBLIGATORIA PARA MATEMÁTICA, FÍSICA, QUÍMICA Y ASIGNATURAS PRÁCTICAS:
- En las actividades de desarrollo de las sesiones debes incluir OBLIGATORIAMENTE:
  1. Fórmulas y ecuaciones necesarias con desglose explícito de sus variables (ejemplo: A = (b × h) / 2, donde A = Área, b = Base, h = Altura). PROHIBIDO usar código o sintaxis bruta de LaTeX como signos de dólar ($), \\frac, \\cdot o \\approx, ya que el archivo final es un documento de Word (.docx). Usa símbolos matemáticos limpios y legibles (×, ÷, =, ±, ², √, etc.).
  2. Ejercicios modelo resueltos paso a paso con desarrollo numérico claro, ordenado y alineado línea por línea.
  3. Problemas prácticos aplicados a situaciones cotidianas con Planteamiento Operativo (PO), desarrollo algebraico y respuesta (R).

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
          "Explicación de fórmula/ecuación y variables...",
          "Ejercicio modelo resuelto paso a paso con simbología matemática formal...",
          "Práctica guiada de resolución de problemas..."
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

REGLA OBLIGATORIA PARA MATEMÁTICA Y ASIGNATURAS PRÁCTICAS:
- En las acciones, estrategias y productos de la Matriz Operativa debes incluir OBLIGATORIAMENTE:
  1. Fórmulas y ecuaciones clave con sus variables definidas (ejemplo: A = (b × h) / 2, sin usar código LaTeX como $ o \\frac).
  2. Ejercicios tipo resueltos paso a paso con simbología matemática limpia, clara y profesional, alineados línea por línea.

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
      "acciones": "string con fórmulas, variables y ejercicios resueltos paso a paso",
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
