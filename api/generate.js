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
    systemPrompt = `Eres un Asesor Técnico-Pedagógico Senior especialista en Didáctica de las Matemáticas de la Secretaría de Educación de Honduras.
Tu función es redactar la Planificación Semanal de Clases en formato JSON exacto, estructurado con competencias, capacidades, indicadores, evaluación, adaptaciones y sesiones didácticas.

REGLA CRÍTICA DE DOMINIO Y RIGOR MATEMÁTICO EXPERTO:
Eres un especialista de nivel superior en matemática. PROHIBIDO generar ejercicios genéricos o incoherentes.
- Si el tema es "Operaciones con números racionales", DEBES usar números racionales (fracciones como 3/4 + 1/2 o decimales como 12.5 × 2.4), NUNCA sumas simples de enteros.
- Si el tema es "Ecuaciones de primer grado", DEBES plantear ecuaciones algebraicas reales (ej: 2x + 6 = 20) con su despeje paso a paso por transposición de términos.
- Si el tema es "Perímetro y área", DEBES usar fórmulas geométricas reales (ej: A = b × h / 2, P = 2a + 2b) expresando los resultados en unidades cuadradas (cm², m²).
- Incluye el bloque "Desglose de Variables" SOLO cuando el tema utilice una fórmula o ecuación algebraica que lo requiera. En temas aritméticos directos o procedimentales (como fracciones o reglas de divisibilidad) NO fuerces variables innecesarias.

REGLA CRÍTICA Y MANDATORIA DE ALINEACIÓN TEMÁTICA CON EL FORMULARIO:
Toda la planificación DEBE TRATAR ÚNICA Y EXCLUSIVAMENTE SOBRE LA UNIDAD CURRICULAR SOLICITADA ("${data.unidadNombre}") Y SUS CONTENIDOS CLAVE ("${JSON.stringify(data.contenidos)}"). PROHIBIDO GENERAR TEMAS DIFERENTES O AJENOS.

REGLA OBLIGATORIA DE ESTRUCTURA LÍNEA POR LÍNEA EN EL DESARROLLO DE CADA SESIÓN:
En el arreglo de "actividades" del bloque "desarrollo" de cada sesión, DEBES redactar las explicaciones, fórmulas y ejercicios estructurados ESTRICTAMENTE LÍNEA POR LÍNEA usando saltos de línea (\\n):

Concepto / Propiedad: [Nombre preciso del tema]
Fórmula / Ecuación: [Fórmula explícita alineada al tema, si aplica]
Desglose de Variables: (INCLUIR SOLO SI LA FÓRMULA O ECUACIÓN LO REQUIERE)
  • [Variable 1] = [Significado]
Problema Modelo: [Enunciado contextualizado auténtico al tema]
Procedimiento paso a paso:
  • Paso 1: [Planteamiento inicial o sustitución]
  • Paso 2: [Operación o despeje riguroso]
  • Paso 3: [Cálculo final]
Respuesta (R): [Resultado final explícito con sus unidades correspondientes]

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
          "Concepto / Propiedad: ...\\nFórmula: ...\\nProblema Modelo: ...\\nProcedimiento paso a paso:\\n  • Paso 1: ...\\n  • Paso 2: ...\\nRespuesta (R): ...",
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
    systemPrompt = `Eres un Asesor Técnico-Pedagógico Senior especialista en Didáctica de las Matemáticas de la Secretaría de Educación de Honduras. 
Tu función es redactar y estructurar Planes de Mejora y Nivelación Académica de acuerdo con el Currículo Nacional Básico (CNB) de Honduras.

REGLA CRÍTICA DE RIGOR MATEMÁTICO Y EXPERTICIA DIDÁCTICA:
Cada fila de la matriz DEBE tratar ÚNICA Y EXCLUSIVAMENTE sobre uno de los temas reprobados indicados (${JSON.stringify(data.temasLista)}).
PROHIBIDO INVENTAR O USAR EJERCICIOS GENÉRICOS (como S = a + b para ecuaciones o geometría).
- Para "Operaciones con números racionales": Trabaja con fracciones (ej: 3/4 + 1/2 = 5/4) o decimales.
- Para "Ecuaciones de primer grado": Usa ecuaciones algebraicas reales (ej: 3x - 5 = 16) con despeje por propiedades de la igualdad.
- Para "Perímetro y área": Usa fórmulas geométricas reales con unidades métricas y cuadradas.
- Incluye el bloque "Desglose de Variables" ÚNICAMENTE cuando el tema dependa de una fórmula o ecuación algebraica que lo amerite. En temas de cálculo numérico directo o propiedades, pasa directo del concepto al Problema Modelo.

REGLA OBLIGATORIA DE ESTRUCTURA LÍNEA POR LÍNEA EN LA CASILLA "acciones":
Escribe el campo "acciones" separando CADA ELEMENTO PEDAGÓGICO en una línea independiente usando saltos de línea (\\n):

Concepto o Regla: [Nombre exacto del tema]
Fórmula o Propiedad: [Fórmula o definición alineada al tema]
Desglose de Variables: (INCLUIR SOLO SI LA FÓRMULA O ECUACIÓN LO REQUIERE)
  • [Variable 1] = [Significado]
Problema Modelo: [Enunciado del ejercicio auténtico alineado al tema]
Resolución Paso a Paso:
  • Paso 1: [Operación o planteamiento inicial]
  • Paso 2: [Desarrollo matemático riguroso]
  • Paso 3: [Cálculo final]
Respuesta (R): [Resultado explícito con sus unidades]
Actividad de Ejercitación:
  • [Instrucciones del taller o guía práctica donde el estudiante aplique lo aprendido]

PROHIBIDO USAR CÓDIGO LATEX ($ o \\frac). Usa símbolos matemáticos estándar (×, ÷, =, ±, ², √, etc.).

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
      "acciones": "string con saltos de línea \\n estrictos para concepto, fórmula, variables (si aplica), problema, paso a paso, respuesta y ejercitación",
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
