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

  const systemPrompt = `Eres un Asesor Técnico-Pedagógico Senior de la Secretaría de Educación de Honduras. 
Tu función es redactar y estructurar Planes de Recuperación y Nivelación Académica de acuerdo con el Currículo Nacional Básico (CNB) de Honduras.
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
      "acciones": "string",
      "estrategias": "string",
      "producto": "string",
      "recursos": "string",
      "observaciones": "string"
    }
  ]
}`;

  const payload = {
    contents: req.body.contents,
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

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Error en el servidor proxy:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor al comunicarse con la IA.' 
    });
  }
}