/**
 * FHIR Routes - JavaScript version for development
 * Simple implementation for HL7/FHIR interoperability
 */

const express = require('express');
const router = express.Router();
const { parseStringPromise } = require('xml2js');

/**
 * Parse HL7 v2 message
 */
function parseHl7Message(message) {
  const segments = message
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [name, ...fields] = line.split('|');
      return { name, fields };
    });

  const header = segments.find((segment) => segment.name === 'MSH') || null;

  return {
    header,
    segments,
  };
}

/**
 * Format HL7 datetime to ISO format
 */
function formatHl7DateTime(value) {
  if (!value) {
    return value;
  }

  const normalized = value.replace(/[^0-9]/g, '');

  if (normalized.length < 8) {
    return value;
  }

  const year = normalized.substring(0, 4);
  const month = normalized.substring(4, 6) || '01';
  const day = normalized.substring(6, 8) || '01';
  const hour = normalized.substring(8, 10) || '00';
  const minute = normalized.substring(10, 12) || '00';
  const second = normalized.substring(12, 14) || '00';

  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

/**
 * Map HL7 v2 message to FHIR Observation
 */
function mapHl7ToFhirObservation(message) {
  const { segments } = parseHl7Message(message);

  const obr = segments.find((segment) => segment.name === 'OBR');
  const obx = segments.find((segment) => segment.name === 'OBX');
  const pid = segments.find((segment) => segment.name === 'PID');

  if (!obr || !obx) {
    return null;
  }

  const observationDateTime =
    obr.fields[6] || obr.fields[5] || obr.fields[4];

  const observation = {
    resourceType: 'Observation',
    status: 'final',
    code: {
      text: obx.fields[2] || 'Observación clínica',
    },
    valueString: obx.fields[4] || undefined,
    effectiveDateTime: observationDateTime ? formatHl7DateTime(observationDateTime) : undefined,
  };

  if (pid && pid.fields[2]) {
    observation.subject = { reference: `Patient/${pid.fields[2]}` };
  }

  return observation;
}

/**
 * Simple authentication middleware
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticación requerido',
    });
  }

  // En desarrollo, solo verificamos que el token exista
  // En producción debería validarse con JWT
  req.user = { _id: 'dev-user' };
  next();
}

/**
 * POST /api/v1/fhir/hl7/parse
 * Convertir mensaje HL7 v2/v3 a recurso FHIR Observation
 */
router.post('/hl7/parse', authenticate, async (req, res) => {
  try {
    const { message, format } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Mensaje HL7 es requerido',
      });
    }

    let observation = null;

    if (format === 'v3' || format === 'xml') {
      // Parsear HL7 v3 XML
      try {
        const parsed = await parseStringPromise(message);
        // Convertir a Observation (implementación simplificada)
        observation = {
          resourceType: 'Observation',
          status: 'final',
          code: {
            text: 'Observación desde HL7 v3',
          },
          effectiveDateTime: new Date().toISOString(),
        };
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Error al parsear mensaje HL7 v3 XML: ' + error.message,
        });
      }
    } else {
      // Parsear HL7 v2
      observation = mapHl7ToFhirObservation(message);
    }

    if (!observation) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo convertir el mensaje HL7 a Observation',
      });
    }

    console.log('✅ Mensaje HL7 parseado a FHIR', {
      format: format || 'v2',
    });

    res.status(200).json({
      success: true,
      data: observation,
    });
  } catch (error) {
    console.error('❌ Error al parsear HL7:', error);
    res.status(500).json({
      success: false,
      message: 'Error al parsear mensaje HL7: ' + error.message,
    });
  }
});

module.exports = router;

