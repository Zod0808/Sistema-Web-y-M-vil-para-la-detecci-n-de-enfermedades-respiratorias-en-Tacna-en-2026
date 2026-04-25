import { FhirResource } from './fhirService';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

/**
 * Servicio de validación de recursos FHIR según estándares médicos
 * Implementa validación básica y extensible según perfiles FHIR
 */

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}

/**
 * Validadores por tipo de recurso
 */
const validators: Record<string, (resource: FhirResource) => ValidationResult> = {
  Patient: validatePatient,
  Observation: validateObservation,
  Condition: validateCondition,
  Medication: validateMedication,
  MedicationStatement: validateMedicationStatement,
  Procedure: validateProcedure,
  DiagnosticReport: validateDiagnosticReport,
  Encounter: validateEncounter,
  AllergyIntolerance: validateAllergyIntolerance,
  Immunization: validateImmunization,
};

/**
 * Validar un recurso FHIR
 */
export function validateFhirResource(resource: FhirResource): ValidationResult {
  if (!resource.resourceType) {
    return {
      valid: false,
      errors: [
        {
          path: 'resourceType',
          message: 'resourceType es requerido',
          code: 'required',
        },
      ],
      warnings: [],
    };
  }

  const validator = validators[resource.resourceType];
  if (!validator) {
    logger.warn(`No hay validador para resourceType: ${resource.resourceType}`);
    return {
      valid: true,
      errors: [],
      warnings: [
        {
          path: 'resourceType',
          message: `Tipo de recurso ${resource.resourceType} no tiene validador específico`,
          code: 'no-validator',
        },
      ],
    };
  }

  return validator(resource);
}

/**
 * Validar múltiples recursos
 */
export function validateFhirResources(resources: FhirResource[]): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  resources.forEach((resource, index) => {
    const resourceResult = validateFhirResource(resource);
    if (!resourceResult.valid) {
      result.valid = false;
    }

    // Prefijar path con índice del recurso
    result.errors.push(
      ...resourceResult.errors.map((error) => ({
        ...error,
        path: `[${index}].${error.path}`,
      })),
    );

    result.warnings.push(
      ...resourceResult.warnings.map((warning) => ({
        ...warning,
        path: `[${index}].${warning.path}`,
      })),
    );
  });

  return result;
}

/**
 * Validar Patient
 */
function validatePatient(resource: FhirResource): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validar campos requeridos
  if (!resource.name || !Array.isArray(resource.name) || (resource.name as unknown[]).length === 0) {
    errors.push({
      path: 'name',
      message: 'name es requerido y debe ser un array no vacío',
      code: 'required',
    });
  }

  // Validar formato de fecha de nacimiento
  if (resource.birthDate) {
    const birthDate = resource.birthDate as string;
    if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(birthDate)) {
      errors.push({
        path: 'birthDate',
        message: 'birthDate debe estar en formato YYYY-MM-DD',
        code: 'invalid-format',
      });
    }
  }

  // Validar género
  if (resource.gender && !['male', 'female', 'other', 'unknown'].includes(resource.gender as string)) {
    errors.push({
      path: 'gender',
      message: 'gender debe ser uno de: male, female, other, unknown',
      code: 'invalid-value',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validar Observation
 */
function validateObservation(resource: FhirResource): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validar status
  const validStatuses = ['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error', 'unknown'];
  if (!resource.status) {
    errors.push({
      path: 'status',
      message: 'status es requerido',
      code: 'required',
    });
  } else if (!validStatuses.includes(resource.status as string)) {
    errors.push({
      path: 'status',
      message: `status debe ser uno de: ${validStatuses.join(', ')}`,
      code: 'invalid-value',
    });
  }

  // Validar code
  if (!resource.code) {
    errors.push({
      path: 'code',
      message: 'code es requerido',
      code: 'required',
    });
  }

  // Validar subject
  if (!resource.subject) {
    errors.push({
      path: 'subject',
      message: 'subject es requerido',
      code: 'required',
    });
  }

  // Validar effectiveDateTime o effectivePeriod
  if (!resource.effectiveDateTime && !resource.effectivePeriod) {
    warnings.push({
      path: 'effectiveDateTime',
      message: 'Se recomienda incluir effectiveDateTime o effectivePeriod',
      code: 'recommended',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validar Condition
 */
function validateCondition(resource: FhirResource): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validar status
  const validStatuses = ['active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved'];
  if (!resource.clinicalStatus) {
    errors.push({
      path: 'clinicalStatus',
      message: 'clinicalStatus es requerido',
      code: 'required',
    });
  }

  // Validar code
  if (!resource.code) {
    errors.push({
      path: 'code',
      message: 'code es requerido',
      code: 'required',
    });
  }

  // Validar subject
  if (!resource.subject) {
    errors.push({
      path: 'subject',
      message: 'subject es requerido',
      code: 'required',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validar Medication
 */
function validateMedication(resource: FhirResource): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validar code
  if (!resource.code) {
    errors.push({
      path: 'code',
      message: 'code es requerido',
      code: 'required',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validar MedicationStatement
 */
function validateMedicationStatement(resource: FhirResource): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validar status
  const validStatuses = ['active', 'completed', 'entered-in-error', 'intended', 'stopped', 'on-hold', 'unknown', 'not-taken'];
  if (!resource.status) {
    errors.push({
      path: 'status',
      message: 'status es requerido',
      code: 'required',
    });
  } else if (!validStatuses.includes(resource.status as string)) {
    errors.push({
      path: 'status',
      message: `status debe ser uno de: ${validStatuses.join(', ')}`,
      code: 'invalid-value',
    });
  }

  // Validar medication
  if (!resource.medicationReference && !resource.medicationCodeableConcept) {
    errors.push({
      path: 'medication',
      message: 'medicationReference o medicationCodeableConcept es requerido',
      code: 'required',
    });
  }

  // Validar subject
  if (!resource.subject) {
    errors.push({
      path: 'subject',
      message: 'subject es requerido',
      code: 'required',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validar Procedure
 */
function validateProcedure(resource: FhirResource): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validar status
  const validStatuses = ['preparation', 'in-progress', 'not-done', 'on-hold', 'stopped', 'completed', 'entered-in-error', 'unknown'];
  if (!resource.status) {
    errors.push({
      path: 'status',
      message: 'status es requerido',
      code: 'required',
    });
  } else if (!validStatuses.includes(resource.status as string)) {
    errors.push({
      path: 'status',
      message: `status debe ser uno de: ${validStatuses.join(', ')}`,
      code: 'invalid-value',
    });
  }

  // Validar code
  if (!resource.code) {
    errors.push({
      path: 'code',
      message: 'code es requerido',
      code: 'required',
    });
  }

  // Validar subject
  if (!resource.subject) {
    errors.push({
      path: 'subject',
      message: 'subject es requerido',
      code: 'required',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validar DiagnosticReport
 */
function validateDiagnosticReport(resource: FhirResource): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validar status
  const validStatuses = ['registered', 'partial', 'preliminary', 'final', 'amended', 'corrected', 'appended', 'cancelled', 'entered-in-error', 'unknown'];
  if (!resource.status) {
    errors.push({
      path: 'status',
      message: 'status es requerido',
      code: 'required',
    });
  } else if (!validStatuses.includes(resource.status as string)) {
    errors.push({
      path: 'status',
      message: `status debe ser uno de: ${validStatuses.join(', ')}`,
      code: 'invalid-value',
    });
  }

  // Validar code
  if (!resource.code) {
    errors.push({
      path: 'code',
      message: 'code es requerido',
      code: 'required',
    });
  }

  // Validar subject
  if (!resource.subject) {
    errors.push({
      path: 'subject',
      message: 'subject es requerido',
      code: 'required',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validar Encounter
 */
function validateEncounter(resource: FhirResource): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validar status
  const validStatuses = ['planned', 'arrived', 'triaged', 'in-progress', 'onleave', 'finished', 'cancelled'];
  if (!resource.status) {
    errors.push({
      path: 'status',
      message: 'status es requerido',
      code: 'required',
    });
  } else if (!validStatuses.includes(resource.status as string)) {
    errors.push({
      path: 'status',
      message: `status debe ser uno de: ${validStatuses.join(', ')}`,
      code: 'invalid-value',
    });
  }

  // Validar class
  if (!resource.class) {
    errors.push({
      path: 'class',
      message: 'class es requerido',
      code: 'required',
    });
  }

  // Validar subject
  if (!resource.subject) {
    errors.push({
      path: 'subject',
      message: 'subject es requerido',
      code: 'required',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validar AllergyIntolerance
 */
function validateAllergyIntolerance(resource: FhirResource): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validar clinicalStatus
  if (!resource.clinicalStatus) {
    errors.push({
      path: 'clinicalStatus',
      message: 'clinicalStatus es requerido',
      code: 'required',
    });
  }

  // Validar verificationStatus
  if (!resource.verificationStatus) {
    errors.push({
      path: 'verificationStatus',
      message: 'verificationStatus es requerido',
      code: 'required',
    });
  }

  // Validar code
  if (!resource.code) {
    errors.push({
      path: 'code',
      message: 'code es requerido',
      code: 'required',
    });
  }

  // Validar patient
  if (!resource.patient) {
    errors.push({
      path: 'patient',
      message: 'patient es requerido',
      code: 'required',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validar Immunization
 */
function validateImmunization(resource: FhirResource): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validar status
  const validStatuses = ['completed', 'entered-in-error', 'not-done'];
  if (!resource.status) {
    errors.push({
      path: 'status',
      message: 'status es requerido',
      code: 'required',
    });
  } else if (!validStatuses.includes(resource.status as string)) {
    errors.push({
      path: 'status',
      message: `status debe ser uno de: ${validStatuses.join(', ')}`,
      code: 'invalid-value',
    });
  }

  // Validar vaccineCode
  if (!resource.vaccineCode) {
    errors.push({
      path: 'vaccineCode',
      message: 'vaccineCode es requerido',
      code: 'required',
    });
  }

  // Validar patient
  if (!resource.patient) {
    errors.push({
      path: 'patient',
      message: 'patient es requerido',
      code: 'required',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

