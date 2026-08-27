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

  // -----------------------------------------------------------------------
  // ¿La asignatura es "práctica" (requiere resolver problemas con números,
  // fórmulas y procedimientos paso a paso: Matemática, Física, Química,
  // Biología con cálculos, Estadística) o "teórica/comunicativa" (Español,
  // Estudios Sociales, Historia, Cívica, etc., donde NO tiene sentido
  // inventar fórmulas ni "problemas numéricos")?
  // -----------------------------------------------------------------------
  function esAsignaturaPractica(asignatura) {
    const a = normalizar(asignatura);
    const clavesPracticas = [
      "matemat", "fisica", "quimic", "biolog", "ciencias naturales", "estadistic"
    ];
    return clavesPracticas.some((k) => a.includes(k));
  }

  const practica = esAsignaturaPractica(data.asignatura);

  // -----------------------------------------------------------------------
  // Verificación de que el contenido "práctico" realmente resuelve un
  // problema paso a paso (y no se queda solo en la explicación teórica).
  // Se usa para invalidar y forzar un reintento cuando la IA "se relaja"
  // y no cumple con lo pedido, que era justamente la queja reportada.
  // -----------------------------------------------------------------------
  function tieneResolucionPasoAPaso(texto) {
    if (typeof texto !== "string") return false;
    const t = normalizar(texto);
    const tienePaso = /paso\s*1/.test(t) || /procedimiento paso a paso/.test(t) || /resolucion paso a paso/.test(t);
    const tieneProblema = /problema modelo/.test(t);
    const tieneRespuesta = /respuesta \(r\)/.test(t) || /respuesta:/.test(t);
    return tienePaso && tieneProblema && tieneRespuesta;
  }

  let systemPrompt = "";
  let userMessage = "";
  let validate = () => true;

  if (taskType === "plan_semanal") {

    const bloqueEstructuraPractica = `
ESTRUCUTRA DE CADA SESIÓN (INICIO, DESARROLLO Y CIERRE):
En el arreglo de "sesiones", cada objeto representa una sesión diaria:
1. INICIO: Recuperar conocimientos previos del tema específico, presentar situación introductoria motivadora relacionada directamente con el contenido. NO introducir temas ajenos.
2. DESARROLLO: Explicación del contenido, presentación de la regla/propiedad, fórmula (si aplica), desglose de variables (si la fórmula lo requiere), Problema Modelo contextualizado con resolución paso a paso (operando explícitamente con las variables declaradas), práctica guiada y práctica individual/en parejas.
3. CIERRE: Síntesis del aprendizaje de la sesión, comprobación de comprensión (pregunta de salida o ejercicio breve) y retroalimentación final.

ERES UN EXPERTO EN LA ENSEÑANZA DE ${String(data.asignatura || "esta asignatura").toUpperCase()}. Esta es una asignatura PRÁCTICA: la sesión NO puede quedarse en pura teoría.
FORMATO Y SINTAXIS EN EL DESARROLLO DE CADA SESIÓN (OBLIGATORIO, EN LA PRIMERA POSICIÓN DEL ARREGLO "actividades" DEL BLOQUE "desarrollo", LÍNEA POR LÍNEA usando saltos de línea \\n):

Concepto / Propiedad: [Nombre preciso del tema de la sesión]
Fórmula / Ecuación: [Fórmula explícita alineada al tema, si aplica]
Desglose de Variables: (INCLUIR SOLO SI LA FÓRMULA O ECUACIÓN LO REQUIERE)
  • [Variable 1] = [Significado]
Problema Modelo: [Enunciado contextualizado auténtico al tema, CON NÚMEROS REALES, no genérico]
Procedimiento paso a paso:
  • Paso 1: [Sustitución explícita en las variables o planteamiento inicial, con los números del problema]
  • Paso 2: [Operación o desarrollo matemático con las variables, mostrando el cálculo]
  • Paso 3: [Cálculo final]
Respuesta (R): [Resultado final explícito con sus unidades correspondientes]

PROHIBIDO ABSOLUTAMENTE:
- Quedarte solo en la definición teórica del concepto sin resolver el Problema Modelo con números reales.
- Escribir "Fórmula / Ecuación" y dejar el Problema Modelo sin resolver o con pasos vagos como "se aplica la fórmula" sin mostrar la sustitución y el cálculo real.
- Omitir cualquiera de los rótulos anteriores (Concepto, Problema Modelo, Procedimiento paso a paso con al menos Paso 1, Respuesta (R)).

PROHIBIDO USAR SINTAXIS LATEX DE $ O \\frac. Usa símbolos limpios y legibles en Word (×, ÷, =, ±, ², √, etc.).`;

    const bloqueEstructuraTeorica = `
ESTRUCUTRA DE CADA SESIÓN (INICIO, DESARROLLO Y CIERRE):
En el arreglo de "sesiones", cada objeto representa una sesión diaria:
1. INICIO: Recuperar conocimientos previos del tema específico, presentar una situación comunicativa o social introductoria motivadora relacionada directamente con el contenido. NO introducir temas ajenos.
2. DESARROLLO: Explicación del contenido, presentación de un texto o situación modelo auténtica, guía de análisis o comprensión, práctica guiada y actividad de producción oral/escrita individual o en parejas.
3. CIERRE: Síntesis del aprendizaje de la sesión, comprobación de comprensión (pregunta de salida o actividad breve) y retroalimentación final.

ERES UN EXPERTO EN LA ENSEÑANZA DE ${String(data.asignatura || "esta asignatura").toUpperCase()}. Esta es una asignatura de naturaleza TEÓRICA / COMUNICATIVA (NO matemática): está TERMINANTEMENTE PROHIBIDO inventar fórmulas, ecuaciones o "problemas numéricos" que no tienen sentido para este contenido.
FORMATO Y SINTAXIS EN EL DESARROLLO DE CADA SESIÓN (OBLIGATORIO, EN LA PRIMERA POSICIÓN DEL ARREGLO "actividades" DEL BLOQUE "desarrollo", LÍNEA POR LÍNEA usando saltos de línea \\n):

Concepto o Contenido: [Nombre preciso del contenido de la sesión]
Texto o Situación Modelo: [Fragmento de texto, ejemplo auténtico o situación comunicativa/social real relacionada al contenido]
Guía de Análisis:
  • Pregunta 1: [pregunta de comprensión, análisis o reflexión sobre el texto/situación]
  • Pregunta 2: [pregunta de comprensión, análisis o reflexión sobre el texto/situación]
Actividad de Producción (oral o escrita): [Consigna clara de lo que el estudiante debe producir, redactar o exponer]
Retroalimentación: [Criterio breve de cómo se corrige o retroalimenta la actividad]

PROHIBIDO ABSOLUTAMENTE inventar "Fórmula / Ecuación", "Desglose de Variables" o resolver "problemas" numéricos: no aplica a este contenido.`;

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
- Adáptate al nivel cognitivo exacto del Grado (${data.grado}). Para I Ciclo (1° a 3°), usa contenidos concretos y representativos; para II Ciclo (4° a 6°), nivel intermedio; para III Ciclo (7° a 9°), rigor formal.

CAMPO OBLIGATORIO DE VERIFICACIÓN "temaConfirmado":
- El primer campo del JSON de respuesta DEBE llamarse "temaConfirmado" y debe contener EXACTAMENTE, sin traducir, resumir, acortar ni modificar ni una sola letra, el siguiente texto: "${data.unidadNombre}".
- Este campo se usa para verificar automáticamente que no cambiaste de tema. Si no coincide EXACTAMENTE, tu respuesta será rechazada y se te pedirá que la corrijas.
${practica ? bloqueEstructuraPractica : bloqueEstructuraTeorica}

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
          "${practica
            ? "Concepto / Propiedad: ...\\nFórmula: ...\\nProblema Modelo: ...\\nProcedimiento paso a paso:\\n  • Paso 1: ...\\n  • Paso 2: ...\\nRespuesta (R): ..."
            : "Concepto o Contenido: ...\\nTexto o Situación Modelo: ...\\nGuía de Análisis:\\n  • Pregunta 1: ...\\n  • Pregunta 2: ...\\nActividad de Producción (oral o escrita): ...\\nRetroalimentación: ..."
          }",
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

Recuerda: el campo "temaConfirmado" debe ser EXACTAMENTE igual, letra por letra, a: "${data.unidadNombre}"
${practica ? 'Recuerda también: DEBES resolver el "Problema Modelo" con números reales, paso a paso (Paso 1, Paso 2, ...) hasta llegar a la "Respuesta (R)". No basta con explicar la teoría.' : 'Recuerda también: NO inventes fórmulas ni problemas numéricos, esta asignatura es teórica/comunicativa.'}`;

    validate = (parsed) => {
      if (!parsed || typeof parsed.temaConfirmado !== "string") return false;
      if (normalizar(parsed.temaConfirmado) !== normalizar(data.unidadNombre)) return false;

      if (practica) {
        const sesiones = Array.isArray(parsed.sesiones) ? parsed.sesiones : [];
        if (sesiones.length === 0) return false;
        const todasResuelven = sesiones.every((s) =>
          tieneResolucionPasoAPaso(s?.desarrollo?.actividades?.[0])
        );
        if (!todasResuelven) return false;
      }

      return true;
    };

  } else {

    const bloqueMatrizPractica = `
ERES UN EXPERTO EN LA ENSEÑANZA DE ${String(data.asignatura || "esta asignatura").toUpperCase()}. Esta es una asignatura PRÁCTICA: cada fila de la matriz DEBE resolver un problema con números reales, paso a paso, no solo explicar la teoría.

ESTRUCTURA LÍNEA POR LÍNEA EN LA CASILLA "acciones" (OBLIGATORIA, con saltos de línea \\n estrictos):

Concepto o Regla: [Nombre exacto del tema]
Fórmula o Propiedad: [Fórmula o definición precisa alineada al tema]
Desglose de Variables: (INCLUIR ÚNICAMENTE SI LA FÓRMULA O ECUACIÓN LO REQUIERE)
  • [Variable 1] = [Significado]
Problema Modelo: [Enunciado del ejercicio auténtico alineado al tema, CON NÚMEROS REALES]
Resolución Paso a Paso:
  • Paso 1: [Sustitución explícita en las variables declaradas o planteamiento inicial, con los números del problema]
  • Paso 2: [Operación o desarrollo matemático usando las variables, mostrando el cálculo]
  • Paso 3: [Cálculo final]
Respuesta (R): [Resultado explícito con sus unidades]
Actividad de Ejercitación:
  • [Instrucciones del taller o guía de reforzamiento donde el estudiante aplique lo aprendido]

PROHIBIDO ABSOLUTAMENTE:
- Dejar el Problema Modelo sin resolver, o resolverlo de forma vaga ("se sustituye y se calcula") sin mostrar los números y operaciones reales.
- Omitir el Problema Modelo, la Resolución Paso a Paso (con al menos Paso 1) o la Respuesta (R).
- Usar ejercicios genéricos o incoherentes con el tema de la fila (ver regla de correspondencia arriba).

PROHIBIDO USAR CÓDIGO LATEX ($ o \\frac). Usa símbolos matemáticos estándar (×, ÷, =, ±, ², √, etc.).`;

    const bloqueMatrizTeorica = `
ERES UN EXPERTO EN LA ENSEÑANZA DE ${String(data.asignatura || "esta asignatura").toUpperCase()}. Esta es una asignatura de naturaleza TEÓRICA / COMUNICATIVA (NO matemática): está TERMINANTEMENTE PROHIBIDO inventar fórmulas, ecuaciones o "problemas numéricos" que no tienen sentido para este contenido.

ESTRUCTURA LÍNEA POR LÍNEA EN LA CASILLA "acciones" (OBLIGATORIA, con saltos de línea \\n estrictos):

Concepto o Contenido: [Nombre exacto del tema]
Texto o Situación Modelo: [Fragmento de texto, ejemplo auténtico o situación comunicativa/social real alineada al tema]
Guía de Análisis / Preguntas Orientadoras:
  • Pregunta 1: [pregunta de comprensión, análisis o reflexión]
  • Pregunta 2: [pregunta de comprensión, análisis o reflexión]
Actividad de Producción (oral o escrita): [Consigna clara de lo que el estudiante debe producir, redactar o exponer sobre el tema]
Retroalimentación: [Criterio breve de cómo se corrige o retroalimenta la actividad]

PROHIBIDO ABSOLUTAMENTE inventar "Fórmula o Propiedad", "Desglose de Variables" o resolver "problemas" numéricos: no aplica a este contenido.`;

    systemPrompt = `Eres un Asesor Técnico-Pedagógico Senior especialista en Didáctica y Recuperación Académica de la Secretaría de Educación de Honduras, experto en la asignatura de ${data.asignatura || "la asignatura indicada"}.
Tu función es redactar un PLAN DE MEJORA Y NIVELACIÓN ACADÉMICA remedial especializado.

PRINCIPIO PEDAGÓGICO DEL PLAN DE MEJORA:
El Plan de Mejora es un documento independiente del Plan Semanal. Parte de aprendizajes no alcanzados o contenidos reprobados por los estudiantes:
DIFICULTAD / REZAGO → OBJETIVO DE MEJORA → CONTENIDO ESPECÍFICO → ACCIÓN DIDÁCTICA → ESTRATEGIA DE ATENCIÓN → PRODUCTO O EVIDENCIA → SEGUIMIENTO.

REGLA CRÍTICA Y MANDATORIA DE CORRESPONDENCIA POR FILA EN LA MATRIZ:
Cada fila de la matriz representa UN TEMA REPROBADO específico de la lista, EN ESTE ORDEN EXACTO: ${JSON.stringify(data.temasLista)}.
- El campo "tema" de cada fila DEBE copiarse EXACTAMENTE, sin modificar ni una letra, del elemento correspondiente de esa lista, en el mismo orden.
- El arreglo "matriz" DEBE tener EXACTAMENTE ${(data.temasLista || []).length} filas, ni una más ni una menos.
- Las Acciones Didácticas, ejemplos y ejercicios de CADA FILA deben responder ÚNICA Y EXCLUSIVAMENTE al tema de esa fila.
- CONTROL DE REPETICIÓN: Cada fila debe tener su propio contenido, ejemplo, estrategia y producto. PROHIBIDO repetir la misma Acción Didáctica en diferentes temas.

CAMPO OBLIGATORIO DE VERIFICACIÓN "temasConfirmados":
- El primer campo del JSON de respuesta DEBE llamarse "temasConfirmados" y debe ser un arreglo con EXACTAMENTE los mismos textos y el mismo orden que: ${JSON.stringify(data.temasLista)}.
- Este campo se usa para verificar automáticamente que no cambiaste ni el orden ni el contenido de los temas. Si no coincide EXACTAMENTE, tu respuesta será rechazada y se te pedirá que la corrijas.
${practica ? bloqueMatrizPractica : bloqueMatrizTeorica}

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
      "acciones": "string con saltos de línea \\n estrictos, siguiendo EXACTAMENTE la estructura obligatoria indicada arriba para esta asignatura",
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

Recuerda: "temasConfirmados" debe ser exactamente ${JSON.stringify(data.temasLista || [])}
${practica ? 'Recuerda también: en CADA fila DEBES resolver el "Problema Modelo" con números reales, paso a paso (Paso 1, Paso 2, ...) hasta llegar a la "Respuesta (R)". No basta con explicar la teoría.' : 'Recuerda también: NO inventes fórmulas ni problemas numéricos, esta asignatura es teórica/comunicativa.'}`;

    validate = (parsed) => {
      if (!parsed || !Array.isArray(parsed.temasConfirmados)) return false;
      const esperado = data.temasLista || [];
      if (parsed.temasConfirmados.length !== esperado.length) return false;
      const temasOk = parsed.temasConfirmados.every(
        (t, i) => normalizar(t) === normalizar(esperado[i])
      );
      if (!temasOk) return false;

      if (practica) {
        const matriz = Array.isArray(parsed.matriz) ? parsed.matriz : [];
        if (matriz.length !== esperado.length) return false;
        const todasResuelven = matriz.every((f) => tieneResolucionPasoAPaso(f?.acciones));
        if (!todasResuelven) return false;
      }

      return true;
    };
  }

  async function llamarGemini(sysPrompt, userMsg) {
    const payload = {
      contents: [{ parts: [{ text: userMsg }] }],
      systemInstruction: { parts: [{ text: sysPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        // Temperatura y topP bajos: reduce la probabilidad de que el modelo
        // "improvise" o mezcle temas distintos, u omita pasos pedidos.
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

    // Si el modelo no respetó el tema solicitado, o (siendo una asignatura
    // práctica) no resolvió el problema paso a paso, se hace UN reintento
    // con una advertencia explícita antes de rendirse.
    if (!validate(parsed)) {
      console.warn('La respuesta de Gemini no cumplió la validación (tema y/o resolución paso a paso). Reintentando una vez...');

      const advertenciaEstructura = practica
        ? 'Además, revisa que CADA fila/sesión resuelva realmente el "Problema Modelo" con números concretos, mostrando Paso 1, Paso 2, etc. hasta la "Respuesta (R)". No te quedes en la teoría ni dejes el problema sin resolver.'
        : 'Recuerda que esta asignatura es teórica/comunicativa: no inventes fórmulas ni "problemas" numéricos.';

      const mensajeReforzado = userMessage + `

ADVERTENCIA IMPORTANTE: tu respuesta anterior NO cumplió con lo solicitado (el tema no coincidió exactamente, o faltó la resolución paso a paso donde correspondía).
Corrige tu respuesta ahora: revisa cuidadosamente el tema exacto indicado arriba y asegúrate de que absolutamente TODO el contenido trate ÚNICAMENTE sobre ese tema, copiado sin alterar ni una letra en el campo de verificación. ${advertenciaEstructura}`;

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
      // lugar, en vez de descargar un documento incompleto o con el tema
      // incorrecto.
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
