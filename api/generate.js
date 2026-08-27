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

  // -----------------------------------------------------------------------
  // NORMALIZADOR para comparar textos sin importar tildes/mayúsculas/espacios
  // -----------------------------------------------------------------------
  function normalizar(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  let systemPrompt = "";
  let userMessage = "";
  let validate = () => true;

  if (taskType === "plan_semanal") {
    systemPrompt = `Eres un Asesor Técnico-Pedagógico Senior especialista en Didáctica y Diseño Curricular de la Secretaría de Educación de Honduras.
Tu función es redactar la PLANIFICACIÓN SEMANAL DE CLASES en formato JSON exacto, respetando la estructura, tablas y distribución requeridas.

REGLA PRINCIPAL DE COHERENCIA CURRICULAR (OBLIGATORIA):
Antes de escribir cualquier actividad de enseñanza-aprendizaje, DEBES identificar obligatoriamente:
- Asignatura: ${data.asignatura}
- Grado: ${data.grado}
- Ciclo: ${data.ciclo}
- Unidad Curricular CNB: "${data.unidadNombre}"
- Expectativas / Aprendizajes Esperados: ${JSON.stringify(data.expectativas)}
- Contenidos Clave: ${JSON.stringify(data.contenidos)}

La secuencia lógica obligatoria en la generación pedagógica es:
UNIDAD CURRICULAR → TEMA ESPECÍFICO DE LA SESIÓN → SUBTEMA → APRENDIZAJE ESPERADO → ACTIVIDADES DE ENSEÑANZA-APRENDIZAJE → EVIDENCIA → EVALUACIÓN.

VALIDACIÓN OBLIGATORIA DE LA UNIDAD SELECCIONADA:
- Toda la planificación DEBE TRATAR ÚNICA Y EXCLUSIVAMENTE sobre la unidad solicitada ("${data.unidadNombre}") y sus contenidos oficiales (${JSON.stringify(data.contenidos)}).
- PROHIBIDO ABSOLUTAMENTE generar o insertar temas o ejemplos de otras unidades ajenas.
- Ejemplo: Si la unidad es "Gráficas lineales" o "Geometría", QUEDA RIGUROSA Y ESTRICTAMENTE PROHIBIDO insertar ecuaciones como 3x + 6 = 21 o suma de fracciones heterogéneas salvo si pertenecen explícitamente a dicha unidad.
- Adáptate al nivel cognitivo exacto del Grado (${data.grado}). Para I Ciclo (1° a 3°), usa contenidos concretos y representativos; para II Ciclo (4° a 6°), nivel intermedio; para III Ciclo (7° a 9°), rigor formal.

CAMPO OBLIGATORIO DE VERIFICACIÓN "temaConfirmado":
- El primer campo del JSON de respuesta DEBE llamarse "temaConfirmado" y debe contener EXACTAMENTE, sin traducir, resumir, acortar ni modificar ni una sola letra, el siguiente texto: "${data.unidadNombre}".
- Este campo se usa para verificar automáticamente que no cambiaste de tema. Si no coincide EXACTAMENTE, tu respuesta será rechazada y se te pedirá que la corrijas.

ESTRUCUTRA DE CADA SESIÓN (INICIO, DESARROLLO Y CIERRE):
En el arreglo de "sesiones", cada objeto representa una sesión diaria:
1. INICIO: Recuperar conocimientos previos del tema específico, presentar situación introductoria motivadora relacionada directamente con el contenido. NO introducir temas ajenos.
2. DESARROLLO: Explicación del contenido, presentación de la regla/propiedad, fórmula (si aplica), desglose de variables (si la fórmula lo requiere), Problema Modelo contextualizado con resolución paso a paso (operando explícitamente con las variables declaradas), práctica guiada y práctica individual/en parejas.
3. CIERRE: Síntesis del aprendizaje de la sesión, comprobación de comprensión (pregunta de salida o ejercicio breve) y retroalimentación final.

FORMATO Y SINTAXIS EN EL DESARROLLO DE CADA SESIÓN:
En la primera posición del arreglo "actividades" del bloque "desarrollo", redacta la explicación estructurada ESTRICTAMENTE LÍNEA POR LÍNEA usando saltos de línea (\\n):

Concepto / Propiedad: [Nombre preciso del tema de la sesión]
Fórmula / Ecuación: [Fórmula explícita alineada al tema, si aplica]
Desglose de Variables: (INCLUIR SOLO SI LA FÓRMULA O ECUACIÓN LO REQUIERE)
  • [Variable 1] = [Significado]
Problema Modelo: [Enunciado contextualizado auténtico al tema]
Procedimiento paso a paso:
  • Paso 1: [Sustitución explícita en las variables o planteamiento inicial]
  • Paso 2: [Operación o desarrollo matemático con las variables]
  • Paso 3: [Cálculo final]
Respuesta (R): [Resultado final explícito con sus unidades correspondientes]

PROHIBIDO USAR SINTAXIS LATEX DE $ O \\frac. Usa símbolos limpios y legibles en Word (×, ÷, =, ±, ², √, etc.).

Debes responder obligatoriamente en formato JSON exacto respetando este esquema (el orden de las llaves debe iniciar con "temaConfirmado"):
{
  "temaConfirmado": "${data.unidadNombre}",
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

    userMessage = `Genera el Plan de Clase Semanal para:
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
Contenidos Clave del CNB a Desarrollar: ${JSON.stringify(data.contenidos)}

Recuerda: el campo "temaConfirmado" debe ser EXACTAMENTE igual, letra por letra, a: "${data.unidadNombre}"`;

    // La respuesta se considera válida solo si "temaConfirmado" coincide
    // (de forma normalizada, ignorando tildes/mayúsculas/espacios extra)
    // con la unidad realmente solicitada por el docente.
    validate = (parsed) => {
      if (!parsed || typeof parsed.temaConfirmado !== "string") return false;
      return normalizar(parsed.temaConfirmado) === normalizar(data.unidadNombre);
    };

  } else {
    systemPrompt = `Eres un Asesor Técnico-Pedagógico Senior especialista en Didáctica de las Matemáticas y Recuperación Académica de la Secretaría de Educación de Honduras.
Tu función es redactar un PLAN DE MEJORA Y NIVELACIÓN ACADÉMICA remedial especializado.

PRINCIPIO PEDAGÓGICO DEL PLAN DE MEJORA:
El Plan de Mejora es un documento independiente del Plan Semanal. Parte de aprendizajes no alcanzados o contenidos reprobados por los estudiantes:
DIFICULTAD / REZAGO → OBJETIVO DE MEJORA → CONTENIDO ESPECÍFICO → ACCIÓN DIDÁCTICA → ESTRATEGIA DE ATENCIÓN → PRODUCTO O EVIDENCIA → SEGUIMIENTO.

REGLA CRÍTICA Y MANDATORIA DE CORRESPONDENCIA POR FILA EN LA MATRIZ:
Cada fila de la matriz representa UN TEMA REPROBADO específico de la lista, EN ESTE ORDEN EXACTO: ${JSON.stringify(data.temasLista)}.
- El campo "tema" de cada fila DEBE copiarse EXACTAMENTE, sin modificar ni una letra, del elemento correspondiente de esa lista, en el mismo orden.
- El arreglo "matriz" DEBE tener EXACTAMENTE ${(data.temasLista || []).length} filas, ni una más ni una menos.
- Las Acciones Didácticas, fórmulas, ejemplos y ejercicios de CADA FILA deben responder ÚNICA Y EXCLUSIVAMENTE al tema de esa fila.
- PROHIBIDO ABSOLUTAMENTE usar ejercicios genéricos o incoherentes. Si el tema es "Ecuaciones cuadráticas", la Acción Didáctica DEBE tratar sobre ax² + bx + c = 0, discriminante o fórmula general (PROHIBIDO poner ecuaciones de primer grado ax + b = c). Si el tema es "Operaciones con números racionales", DEBE tratar sobre fracciones o decimales. Si es "Perímetro y área", DEBE tratar sobre fórmulas geométricas con unidades cuadradas.
- CONTROL DE REPETICIÓN: Cada fila debe tener su propio contenido, ejemplo, estrategia y producto. PROHIBIDO repetir la misma Acción Didáctica en diferentes temas.

CAMPO OBLIGATORIO DE VERIFICACIÓN "temasConfirmados":
- El primer campo del JSON de respuesta DEBE llamarse "temasConfirmados" y debe ser un arreglo con EXACTAMENTE los mismos textos y el mismo orden que: ${JSON.stringify(data.temasLista)}.
- Este campo se usa para verificar automáticamente que no cambiaste ni el orden ni el contenido de los temas. Si no coincide EXACTAMENTE, tu respuesta será rechazada y se te pedirá que la corrijas.

ESTRUCTURA LÍNEA POR LÍNEA EN LA CASILLA "acciones":
Escribe la casilla "acciones" separando CADA ELEMENTO PEDAGÓGICO con saltos de línea (\\n) estrictos:

Concepto o Regla: [Nombre exacto del tema]
Fórmula o Propiedad: [Fórmula o definición precisa alineada al tema]
Desglose de Variables: (INCLUIR ÚNICAMENTE SI LA FÓRMULA O ECUACIÓN LO REQUIERE)
  • [Variable 1] = [Significado]
Problema Modelo: [Enunciado del ejercicio auténtico alineado al tema]
Resolución Paso a Paso:
  • Paso 1: [Sustitución explícita en las variables declaradas o planteamiento inicial]
  • Paso 2: [Operación o desarrollo matemático usando las variables]
  • Paso 3: [Cálculo final]
Respuesta (R): [Resultado explícito con sus unidades]
Actividad de Ejercitación:
  • [Instrucciones del taller o guía de reforzamiento donde el estudiante aplique lo aprendido]

PROHIBIDO USAR CÓDIGO LATEX ($ o \\frac). Usa símbolos matemáticos estándar (×, ÷, =, ±, ², √, etc.).

Debes responder obligatoriamente en formato JSON exacto respetando el siguiente esquema (el orden de las llaves debe iniciar con "temasConfirmados"):
{
  "temasConfirmados": ${JSON.stringify(data.temasLista || [])},
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
      "tema": "string (copiado EXACTO del tema correspondiente)",
      "objetivos": "string",
      "acciones": "string con saltos de línea \\n estrictos para concepto, fórmula, variables (si aplica), problema modelo, resolución paso a paso operando con las variables, respuesta y ejercitación",
      "estrategias": "string",
      "producto": "string",
      "recursos": "string",
      "observaciones": "string"
    }
  ]
}`;

    userMessage = `Genera un Plan de Mejora y Nivelación Académica estrictamente para los siguientes temas seleccionados:
Centro Educativo: ${data.centro}
Ubicación: ${data.ubicacion}
Docente: ${data.docente}
Asignatura: ${data.asignatura}
Grado y Sección: ${data.gradoSeccion}
Nivel Educativo: ${data.nivel}
Temas reprobados / críticos a desarrollar en la matriz, EN ESTE ORDEN EXACTO:
${(data.temasLista || []).map((t, i) => (i + 1) + ". " + t).join("\n")}

Recuerda: "temasConfirmados" debe ser exactamente ${JSON.stringify(data.temasLista || [])}`;

    // Válido si el arreglo de temas confirmados coincide 1 a 1 (en el mismo
    // orden) con lo que el docente realmente escribió en el formulario.
    validate = (parsed) => {
      if (!parsed || !Array.isArray(parsed.temasConfirmados)) return false;
      const esperado = data.temasLista || [];
      if (parsed.temasConfirmados.length !== esperado.length) return false;
      return parsed.temasConfirmados.every(
        (t, i) => normalizar(t) === normalizar(esperado[i])
      );
    };
  }

  async function llamarGemini(sysPrompt, userMsg) {
    const payload = {
      contents: [{ parts: [{ text: userMsg }] }],
      systemInstruction: { parts: [{ text: sysPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        // Temperatura y topP bajos: reduce la probabilidad de que el modelo
        // "improvise" o mezcle temas distintos a los solicitados.
        temperature: 0.25,
        topP: 0.85
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error('Error devuelto por la API de Gemini');
      err.status = response.status;
      err.details = errorText;
      throw err;
    }

    return response.json();
  }

  function extraerYParsear(resData) {
    const rawText = resData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    try {
      return { parsed: JSON.parse(rawText), rawText };
    } catch (e) {
      return { parsed: null, rawText };
    }
  }

  try {
    let resData = await llamarGemini(systemPrompt, userMessage);
    let { parsed, rawText } = extraerYParsear(resData);

    // Si el modelo no respetó el tema solicitado (o el JSON vino corrupto),
    // se hace UN reintento con una advertencia explícita antes de rendirse.
    if (!validate(parsed)) {
      console.warn('La respuesta de Gemini no coincidió con el tema solicitado. Reintentando una vez...');

      const mensajeReforzado = userMessage + `

ADVERTENCIA IMPORTANTE: tu respuesta anterior NO respetó exactamente el tema solicitado (el campo de verificación no coincidió).
Corrige tu respuesta ahora: revisa cuidadosamente el tema exacto indicado arriba y asegúrate de que absolutamente TODO el contenido (ejemplos, fórmulas, actividades, y el campo de verificación) trate ÚNICAMENTE sobre ese tema, copiado sin alterar ni una letra.`;

      resData = await llamarGemini(systemPrompt, mensajeReforzado);
      ({ parsed, rawText } = extraerYParsear(resData));
    }

    if (!parsed) {
      return res.status(502).json({
        error: 'La IA no devolvió un JSON válido después de reintentar.',
        details: rawText
      });
    }

    if (!validate(parsed)) {
      // Devolvemos igualmente el contenido (con una bandera de advertencia)
      // para que el frontend pueda decidir usar su plantilla local en su
      // lugar, en vez de descargar un documento con el tema incorrecto.
      return res.status(200).json({
        ...resData,
        _temaNoVerificado: true
      });
    }

    return res.status(200).json(resData);

  } catch (error) {
    console.error('Error en el servidor proxy:', error);
    return res.status(error.status || 500).json({
      error: error.details ? 'Error devuelto por la API de Gemini' : 'Error interno del servidor al comunicarse con la IA.',
      details: error.details || error.message
    });
  }
}
