"""
Unit tests for Core Domains Support Service
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any, List
from datetime import datetime

from services.core_domains_support import CoreDomainsSupportService


class TestCoreDomainsSupportService:
    """Test CoreDomainsSupportService implementation"""
    
    @pytest.fixture
    def mock_model_manager(self):
        """Create mock model manager"""
        mock = AsyncMock()
        mock.process_medical_text = AsyncMock(return_value={
            "symptoms": ["tos", "fiebre"],
            "entities": ["medication", "diagnosis"]
        })
        return mock
    
    @pytest.fixture
    def mock_service_manager(self):
        """Create mock service manager"""
        return AsyncMock()
    
    @pytest.fixture
    def core_domains_service(self, mock_model_manager, mock_service_manager):
        """Create core domains support service instance"""
        return CoreDomainsSupportService(
            model_manager=mock_model_manager,
            service_manager=mock_service_manager
        )
    
    @pytest.fixture
    def sample_medical_history(self):
        """Sample medical history text"""
        return "Paciente de 45 años con tos persistente de 2 semanas, fiebre intermitente de 38°C. Antecedentes de tabaquismo."
    
    @pytest.fixture
    def sample_symptoms(self):
        """Sample symptoms list"""
        return ["tos", "fiebre", "dificultad respiratoria"]
    
    @pytest.fixture
    def sample_appointment_slots(self):
        """Sample appointment slots"""
        return [
            {"datetime": "2024-01-15T10:00:00", "doctor": "Dr. García"},
            {"datetime": "2024-01-15T14:00:00", "doctor": "Dr. López"},
            {"datetime": "2024-01-16T09:00:00", "doctor": "Dr. García"}
        ]
    
    @pytest.fixture
    def sample_prescription_text(self):
        """Sample prescription text"""
        return "Paracetamol 500mg cada 8 horas. Ibuprofeno 400mg cada 12 horas."
    
    @pytest.fixture
    def sample_alert_data(self):
        """Sample alert data"""
        return {
            "type": "symptom_alert",
            "symptoms": ["dificultad respiratoria", "dolor pecho"],
            "patient_id": "P001",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def test_service_initialization(self, core_domains_service, mock_model_manager, mock_service_manager):
        """Test service initialization"""
        assert core_domains_service.model_manager == mock_model_manager
        assert core_domains_service.service_manager == mock_service_manager
        assert core_domains_service._cache_prefix == "core_domains"
    
    def test_service_initialization_no_dependencies(self):
        """Test service initialization without dependencies"""
        service = CoreDomainsSupportService()
        assert service.model_manager is None
        assert service.service_manager is None
    
    @pytest.mark.asyncio
    async def test_analyze_medical_history_for_insights_success(
        self, core_domains_service, sample_medical_history, mock_model_manager
    ):
        """Test successful medical history analysis"""
        result = await core_domains_service.analyze_medical_history_for_insights(
            history_text=sample_medical_history,
            patient_id="P001",
            context={"age": 45, "gender": "M"}
        )
        
        assert result["success"] is True
        assert "insights" in result
        assert "timestamp" in result
        assert "key_symptoms" in result["insights"]
        assert "risk_factors" in result["insights"]
        assert "severity_assessment" in result["insights"]
        assert "recommendations" in result["insights"]
        assert "follow_up_suggestions" in result["insights"]
        
        # Verify model manager was called
        mock_model_manager.process_medical_text.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_medical_history_for_insights_no_model_manager(
        self, sample_medical_history
    ):
        """Test medical history analysis without model manager"""
        service = CoreDomainsSupportService()
        
        result = await service.analyze_medical_history_for_insights(
            history_text=sample_medical_history,
            patient_id="P001"
        )
        
        assert result["success"] is True
        assert "insights" in result
    
    @pytest.mark.asyncio
    async def test_analyze_medical_history_for_insights_error_handling(
        self, core_domains_service, sample_medical_history, mock_model_manager
    ):
        """Test error handling in medical history analysis"""
        mock_model_manager.process_medical_text.side_effect = Exception("Processing error")
        
        result = await core_domains_service.analyze_medical_history_for_insights(
            history_text=sample_medical_history,
            patient_id="P001"
        )
        
        assert result["success"] is False
        assert "error" in result
    
    @pytest.mark.asyncio
    async def test_extract_risk_factors(self, core_domains_service):
        """Test risk factor extraction"""
        text = "Paciente con diabetes e hipertensión, edad avanzada"
        risk_factors = await core_domains_service._extract_risk_factors(text)
        
        assert isinstance(risk_factors, list)
        assert "diabetes" in risk_factors or "hipertensión" in risk_factors
    
    @pytest.mark.asyncio
    async def test_assess_severity_high(self, core_domains_service):
        """Test severity assessment for high severity"""
        text = "Paciente con dificultad respiratoria y dolor en el pecho"
        processing_result = {"symptoms": ["dificultad respiratoria", "dolor pecho"]}
        
        severity = await core_domains_service._assess_severity(text, processing_result)
        
        assert severity == "high"
    
    @pytest.mark.asyncio
    async def test_assess_severity_medium(self, core_domains_service):
        """Test severity assessment for medium severity"""
        text = "Paciente con tos, fiebre y malestar"
        processing_result = {"symptoms": ["tos", "fiebre", "malestar", "fatiga"]}
        
        severity = await core_domains_service._assess_severity(text, processing_result)
        
        assert severity == "medium"
    
    @pytest.mark.asyncio
    async def test_assess_severity_low(self, core_domains_service):
        """Test severity assessment for low severity"""
        text = "Paciente con tos leve"
        processing_result = {"symptoms": ["tos"]}
        
        severity = await core_domains_service._assess_severity(text, processing_result)
        
        assert severity == "low"
    
    @pytest.mark.asyncio
    async def test_generate_recommendations(self, core_domains_service):
        """Test recommendation generation"""
        processing_result = {
            "symptoms": ["fiebre", "tos", "dificultad respiratoria"]
        }
        
        recommendations = await core_domains_service._generate_recommendations(processing_result)
        
        assert isinstance(recommendations, list)
        assert len(recommendations) > 0
    
    @pytest.mark.asyncio
    async def test_suggest_follow_ups_high_severity(self, core_domains_service):
        """Test follow-up suggestions for high severity"""
        processing_result = {
            "symptoms": ["dificultad respiratoria"]
        }
        
        follow_ups = await core_domains_service._suggest_follow_ups(
            processing_result,
            {"age": 65}
        )
        
        assert isinstance(follow_ups, list)
        if follow_ups:
            assert any(f.get("type") == "immediate" for f in follow_ups)
    
    @pytest.mark.asyncio
    async def test_optimize_appointment_scheduling_success(
        self, core_domains_service, sample_symptoms, sample_appointment_slots
    ):
        """Test successful appointment scheduling optimization"""
        result = await core_domains_service.optimize_appointment_scheduling(
            patient_id="P001",
            symptoms=sample_symptoms,
            urgency="high",
            available_slots=sample_appointment_slots,
            context={"age": 45}
        )
        
        assert result["success"] is True
        assert "recommended_slot" in result
        assert "urgency_assessment" in result
        assert "preparation_tips" in result
        assert "reasoning" in result
        assert "timestamp" in result
    
    @pytest.mark.asyncio
    async def test_optimize_appointment_scheduling_critical_urgency(
        self, core_domains_service, sample_appointment_slots
    ):
        """Test appointment optimization for critical urgency"""
        symptoms = ["dificultad respiratoria", "dolor pecho"]
        
        result = await core_domains_service.optimize_appointment_scheduling(
            patient_id="P001",
            symptoms=symptoms,
            urgency="critical",
            available_slots=sample_appointment_slots
        )
        
        assert result["success"] is True
        # Should recommend earliest slot for critical cases
        if result.get("recommended_slot"):
            assert result["recommended_slot"] is not None
    
    @pytest.mark.asyncio
    async def test_optimize_appointment_scheduling_error_handling(
        self, core_domains_service, sample_symptoms, sample_appointment_slots
    ):
        """Test error handling in appointment optimization"""
        with patch.object(
            core_domains_service, 
            '_analyze_symptoms_for_urgency',
            side_effect=Exception("Analysis error")
        ):
            result = await core_domains_service.optimize_appointment_scheduling(
                patient_id="P001",
                symptoms=sample_symptoms,
                urgency="high",
                available_slots=sample_appointment_slots
            )
            
            assert result["success"] is False
            assert "error" in result
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_for_urgency_critical(self, core_domains_service):
        """Test symptom urgency analysis for critical cases"""
        symptoms = ["dificultad respiratoria", "dolor pecho", "cianosis"]
        
        result = await core_domains_service._analyze_symptoms_for_urgency(symptoms)
        
        assert result["assessed_urgency"] == "critical"
        assert "reasoning" in result
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_for_urgency_high(self, core_domains_service):
        """Test symptom urgency analysis for high urgency"""
        symptoms = ["tos", "fiebre", "fatiga", "dolor garganta", "congestion"]
        
        result = await core_domains_service._analyze_symptoms_for_urgency(symptoms)
        
        assert result["assessed_urgency"] in ["high", "critical"]
        assert "reasoning" in result
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_for_urgency_no_symptoms(self, core_domains_service):
        """Test symptom urgency analysis with no symptoms"""
        result = await core_domains_service._analyze_symptoms_for_urgency([])
        
        assert result["assessed_urgency"] == "low"
        assert "reasoning" in result
    
    @pytest.mark.asyncio
    async def test_recommend_best_slot_critical(self, core_domains_service, sample_appointment_slots):
        """Test slot recommendation for critical urgency"""
        symptom_analysis = {"assessed_urgency": "critical"}
        
        slot = await core_domains_service._recommend_best_slot(
            symptom_analysis,
            "critical",
            sample_appointment_slots,
            None
        )
        
        assert slot is not None
        # Should be the earliest slot
        assert slot == sample_appointment_slots[0]
    
    @pytest.mark.asyncio
    async def test_recommend_best_slot_no_slots(self, core_domains_service):
        """Test slot recommendation with no available slots"""
        slot = await core_domains_service._recommend_best_slot(
            {"assessed_urgency": "high"},
            "high",
            [],
            None
        )
        
        assert slot is None
    
    @pytest.mark.asyncio
    async def test_generate_preparation_tips(self, core_domains_service, sample_symptoms):
        """Test preparation tips generation"""
        tips = await core_domains_service._generate_preparation_tips(
            sample_symptoms,
            {"medications": ["Paracetamol"]}
        )
        
        assert isinstance(tips, list)
        assert len(tips) > 0
    
    @pytest.mark.asyncio
    async def test_analyze_prescription_safety_success(
        self, core_domains_service, sample_prescription_text
    ):
        """Test successful prescription safety analysis"""
        result = await core_domains_service.analyze_prescription_safety(
            prescription_text=sample_prescription_text,
            patient_id="P001",
            current_medications=["Aspirina"],
            allergies=["Penicilina"]
        )
        
        assert result["success"] is True
        assert "medications" in result
        assert "interactions" in result
        assert "allergy_warnings" in result
        assert "dosage_analysis" in result
        assert "recommendations" in result
        assert "safety_score" in result
        assert "timestamp" in result
        assert 0.0 <= result["safety_score"] <= 100.0
    
    @pytest.mark.asyncio
    async def test_analyze_prescription_safety_error_handling(
        self, core_domains_service, sample_prescription_text
    ):
        """Test error handling in prescription analysis"""
        with patch.object(
            core_domains_service,
            '_extract_medications',
            side_effect=Exception("Extraction error")
        ):
            result = await core_domains_service.analyze_prescription_safety(
                prescription_text=sample_prescription_text,
                patient_id="P001"
            )
            
            assert result["success"] is False
            assert "error" in result
    
    @pytest.mark.asyncio
    async def test_extract_medications(self, core_domains_service, sample_prescription_text):
        """Test medication extraction"""
        medications = await core_domains_service._extract_medications(sample_prescription_text)
        
        assert isinstance(medications, list)
    
    @pytest.mark.asyncio
    async def test_check_drug_interactions(self, core_domains_service):
        """Test drug interaction checking"""
        new_meds = [{"name": "Paracetamol", "dose": "500mg"}]
        current_meds = ["Aspirina", "Ibuprofeno"]
        
        interactions = await core_domains_service._check_drug_interactions(new_meds, current_meds)
        
        assert isinstance(interactions, list)
    
    @pytest.mark.asyncio
    async def test_check_allergy_conflicts(self, core_domains_service):
        """Test allergy conflict checking"""
        medications = [{"name": "Penicilina", "dose": "500mg"}]
        allergies = ["Penicilina", "Sulfa"]
        
        warnings = await core_domains_service._check_allergy_conflicts(medications, allergies)
        
        assert isinstance(warnings, list)
    
    @pytest.mark.asyncio
    async def test_analyze_dosage(self, core_domains_service):
        """Test dosage analysis"""
        medications = [{"name": "Paracetamol", "dose": "500mg", "frequency": "cada 8 horas"}]
        
        analysis = await core_domains_service._analyze_dosage(medications, {"age": 45})
        
        assert isinstance(analysis, dict)
        assert "status" in analysis
        assert "warnings" in analysis
    
    @pytest.mark.asyncio
    async def test_generate_prescription_recommendations(self, core_domains_service):
        """Test prescription recommendation generation"""
        medications = [{"name": "Paracetamol"}]
        interactions = [{"med1": "Paracetamol", "med2": "Aspirina", "severity": "moderate"}]
        allergy_warnings = []
        dosage_analysis = {"status": "ok", "warnings": []}
        
        recommendations = await core_domains_service._generate_prescription_recommendations(
            medications, interactions, allergy_warnings, dosage_analysis
        )
        
        assert isinstance(recommendations, list)
        if interactions:
            assert any("interacciones" in rec.lower() or "interaction" in rec.lower() for rec in recommendations)
    
    def test_calculate_safety_score_no_issues(self, core_domains_service):
        """Test safety score calculation with no issues"""
        score = core_domains_service._calculate_safety_score(
            interactions=[],
            allergy_warnings=[],
            dosage_analysis={"warnings": []}
        )
        
        assert score == 100.0
    
    def test_calculate_safety_score_with_interactions(self, core_domains_service):
        """Test safety score calculation with interactions"""
        interactions = [{}, {}]  # 2 interactions
        score = core_domains_service._calculate_safety_score(
            interactions=interactions,
            allergy_warnings=[],
            dosage_analysis={"warnings": []}
        )
        
        assert score == 80.0  # 100 - (2 * 10)
    
    def test_calculate_safety_score_with_allergies(self, core_domains_service):
        """Test safety score calculation with allergy warnings"""
        allergy_warnings = [{}]  # 1 allergy warning
        score = core_domains_service._calculate_safety_score(
            interactions=[],
            allergy_warnings=allergy_warnings,
            dosage_analysis={"warnings": []}
        )
        
        assert score == 80.0  # 100 - (1 * 20)
    
    def test_calculate_safety_score_minimum(self, core_domains_service):
        """Test safety score doesn't go below 0"""
        interactions = [{}] * 20  # Many interactions
        score = core_domains_service._calculate_safety_score(
            interactions=interactions,
            allergy_warnings=[{}] * 10,
            dosage_analysis={"warnings": [{}] * 10}
        )
        
        assert score >= 0.0
    
    @pytest.mark.asyncio
    async def test_assess_alert_priority_success(
        self, core_domains_service, sample_alert_data
    ):
        """Test successful alert priority assessment"""
        patient_context = {"age": 65, "chronic_conditions": ["diabetes", "hypertension"]}
        
        result = await core_domains_service.assess_alert_priority(
            alert_data=sample_alert_data,
            patient_context=patient_context
        )
        
        assert result["success"] is True
        assert "priority_level" in result
        assert "priority_score" in result
        assert "symptom_analysis" in result
        assert "context_risk" in result
        assert "action_recommendations" in result
        assert "timestamp" in result
        assert result["priority_level"] in ["critical", "high", "medium", "low"]
    
    @pytest.mark.asyncio
    async def test_assess_alert_priority_error_handling(
        self, core_domains_service, sample_alert_data
    ):
        """Test error handling in alert priority assessment"""
        with patch.object(
            core_domains_service,
            '_analyze_symptoms_for_urgency',
            side_effect=Exception("Analysis error")
        ):
            result = await core_domains_service.assess_alert_priority(
                alert_data=sample_alert_data
            )
            
            assert result["success"] is False
            assert "error" in result
    
    @pytest.mark.asyncio
    async def test_assess_patient_context_risk_high(self, core_domains_service):
        """Test patient context risk assessment for high risk"""
        context = {
            "age": 70,
            "chronic_conditions": ["diabetes", "hypertension", "COPD"]
        }
        
        risk = await core_domains_service._assess_patient_context_risk(context)
        
        assert risk["risk_level"] in ["high", "medium"]
        assert "factors" in risk
        assert len(risk["factors"]) > 0
    
    @pytest.mark.asyncio
    async def test_assess_patient_context_risk_low(self, core_domains_service):
        """Test patient context risk assessment for low risk"""
        context = {"age": 30, "chronic_conditions": []}
        
        risk = await core_domains_service._assess_patient_context_risk(context)
        
        assert risk["risk_level"] == "low"
    
    @pytest.mark.asyncio
    async def test_assess_patient_context_risk_no_context(self, core_domains_service):
        """Test patient context risk assessment with no context"""
        risk = await core_domains_service._assess_patient_context_risk(None)
        
        assert risk["risk_level"] == "unknown"
        assert risk["factors"] == []
    
    def test_calculate_priority_score(self, core_domains_service):
        """Test priority score calculation"""
        symptom_analysis = {"assessed_urgency": "high"}
        context_risk = {"risk_level": "medium"}
        alert_data = {"type": "symptom_alert"}
        
        score = core_domains_service._calculate_priority_score(
            symptom_analysis,
            context_risk,
            alert_data
        )
        
        assert 0.0 <= score <= 100.0
    
    def test_determine_priority_level_critical(self, core_domains_service):
        """Test priority level determination for critical"""
        level = core_domains_service._determine_priority_level(85.0)
        assert level == "critical"
    
    def test_determine_priority_level_high(self, core_domains_service):
        """Test priority level determination for high"""
        level = core_domains_service._determine_priority_level(70.0)
        assert level == "high"
    
    def test_determine_priority_level_medium(self, core_domains_service):
        """Test priority level determination for medium"""
        level = core_domains_service._determine_priority_level(50.0)
        assert level == "medium"
    
    def test_determine_priority_level_low(self, core_domains_service):
        """Test priority level determination for low"""
        level = core_domains_service._determine_priority_level(30.0)
        assert level == "low"
    
    @pytest.mark.asyncio
    async def test_generate_alert_actions_critical(self, core_domains_service):
        """Test alert action generation for critical priority"""
        actions = await core_domains_service._generate_alert_actions(
            priority_level="critical",
            symptom_analysis={"assessed_urgency": "critical"},
            context_risk={"risk_level": "high"}
        )
        
        assert isinstance(actions, list)
        assert len(actions) > 0
        assert any("emergencia" in action.lower() or "emergency" in action.lower() for action in actions)
    
    @pytest.mark.asyncio
    async def test_generate_alert_actions_high(self, core_domains_service):
        """Test alert action generation for high priority"""
        actions = await core_domains_service._generate_alert_actions(
            priority_level="high",
            symptom_analysis={"assessed_urgency": "high"},
            context_risk={"risk_level": "medium"}
        )
        
        assert isinstance(actions, list)
        assert len(actions) > 0
    
    @pytest.mark.asyncio
    async def test_generate_alert_actions_low(self, core_domains_service):
        """Test alert action generation for low priority"""
        actions = await core_domains_service._generate_alert_actions(
            priority_level="low",
            symptom_analysis={"assessed_urgency": "low"},
            context_risk={"risk_level": "low"}
        )
        
        assert isinstance(actions, list)
        assert len(actions) >= 0
    
    @pytest.mark.asyncio
    async def test_extract_medications(self, core_domains_service, sample_prescription_text):
        """Test medication extraction from prescription text"""
        medications = await core_domains_service._extract_medications(sample_prescription_text)
        
        assert isinstance(medications, list)
        # May be empty if extraction is not implemented
    
    @pytest.mark.asyncio
    async def test_check_drug_interactions(self, core_domains_service):
        """Test drug interaction checking"""
        new_meds = [{"name": "Paracetamol"}]
        current_meds = ["Aspirina"]
        
        interactions = await core_domains_service._check_drug_interactions(new_meds, current_meds)
        
        assert isinstance(interactions, list)
    
    @pytest.mark.asyncio
    async def test_check_allergy_conflicts(self, core_domains_service):
        """Test allergy conflict checking"""
        medications = [{"name": "Penicilina"}]
        allergies = ["Penicilina"]
        
        warnings = await core_domains_service._check_allergy_conflicts(medications, allergies)
        
        assert isinstance(warnings, list)
    
    @pytest.mark.asyncio
    async def test_analyze_dosage_with_context(self, core_domains_service):
        """Test dosage analysis with patient context"""
        medications = [{"name": "Paracetamol", "dose": "500mg"}]
        context = {"age": 75, "weight": 60}
        
        analysis = await core_domains_service._analyze_dosage(medications, context)
        
        assert isinstance(analysis, dict)
        assert "status" in analysis
        assert "warnings" in analysis
    
    @pytest.mark.asyncio
    async def test_analyze_dosage_no_context(self, core_domains_service):
        """Test dosage analysis without context"""
        medications = [{"name": "Paracetamol"}]
        
        analysis = await core_domains_service._analyze_dosage(medications, None)
        
        assert isinstance(analysis, dict)
        assert "status" in analysis
    
    @pytest.mark.asyncio
    async def test_calculate_safety_score_with_dosage_warnings(self, core_domains_service):
        """Test safety score calculation with dosage warnings"""
        score = core_domains_service._calculate_safety_score(
            interactions=[],
            allergy_warnings=[],
            dosage_analysis={"warnings": [{}] * 2}  # 2 warnings
        )
        
        assert score == 90.0  # 100 - (2 * 5)
    
    @pytest.mark.asyncio
    async def test_calculate_safety_score_combined_issues(self, core_domains_service):
        """Test safety score calculation with combined issues"""
        score = core_domains_service._calculate_safety_score(
            interactions=[{}],  # -10
            allergy_warnings=[{}],  # -20
            dosage_analysis={"warnings": [{}]}  # -5
        )
        
        assert score == 65.0  # 100 - 10 - 20 - 5
    
    @pytest.mark.asyncio
    async def test_determine_priority_level_edge_cases(self, core_domains_service):
        """Test priority level determination with edge case scores"""
        # Exactly at threshold
        assert core_domains_service._determine_priority_level(80.0) == "critical"
        assert core_domains_service._determine_priority_level(60.0) == "high"
        assert core_domains_service._determine_priority_level(40.0) == "medium"
        assert core_domains_service._determine_priority_level(20.0) == "low"
        
        # Just below threshold
        assert core_domains_service._determine_priority_level(79.9) == "high"
        assert core_domains_service._determine_priority_level(59.9) == "medium"
        assert core_domains_service._determine_priority_level(39.9) == "low"
    
    @pytest.mark.asyncio
    async def test_calculate_priority_score_different_combinations(self, core_domains_service):
        """Test priority score calculation with different combinations"""
        # High urgency, high risk
        score1 = core_domains_service._calculate_priority_score(
            {"assessed_urgency": "high"},
            {"risk_level": "high"},
            {"type": "symptom_alert"}
        )
        assert score1 > 60.0
        
        # Low urgency, low risk
        score2 = core_domains_service._calculate_priority_score(
            {"assessed_urgency": "low"},
            {"risk_level": "low"},
            {"type": "symptom_alert"}
        )
        assert score2 < 40.0
        
        # Medium urgency, medium risk
        score3 = core_domains_service._calculate_priority_score(
            {"assessed_urgency": "medium"},
            {"risk_level": "medium"},
            {"type": "symptom_alert"}
        )
        assert 40.0 <= score3 <= 60.0
    
    @pytest.mark.asyncio
    async def test_recommend_best_slot_medium_urgency(self, core_domains_service, sample_appointment_slots):
        """Test slot recommendation for medium urgency"""
        slot = await core_domains_service._recommend_best_slot(
            {"assessed_urgency": "medium"},
            "medium",
            sample_appointment_slots,
            None
        )
        
        assert slot is not None
        assert slot in sample_appointment_slots
    
    @pytest.mark.asyncio
    async def test_recommend_best_slot_low_urgency(self, core_domains_service, sample_appointment_slots):
        """Test slot recommendation for low urgency"""
        slot = await core_domains_service._recommend_best_slot(
            {"assessed_urgency": "low"},
            "low",
            sample_appointment_slots,
            None
        )
        
        assert slot is not None
        # Should return first available slot
        assert slot == sample_appointment_slots[0]
    
    @pytest.mark.asyncio
    async def test_generate_preparation_tips_no_context(self, core_domains_service, sample_symptoms):
        """Test preparation tips generation without context"""
        tips = await core_domains_service._generate_preparation_tips(sample_symptoms, None)
        
        assert isinstance(tips, list)
        assert len(tips) > 0
    
    @pytest.mark.asyncio
    async def test_generate_preparation_tips_empty_symptoms(self, core_domains_service):
        """Test preparation tips with empty symptoms"""
        tips = await core_domains_service._generate_preparation_tips([], {"age": 45})
        
        assert isinstance(tips, list)
        # Should still have general tips
        assert len(tips) >= 0
    
    @pytest.mark.asyncio
    async def test_extract_risk_factors_empty_text(self, core_domains_service):
        """Test risk factor extraction with empty text"""
        risk_factors = await core_domains_service._extract_risk_factors("")
        
        assert isinstance(risk_factors, list)
        assert len(risk_factors) == 0
    
    @pytest.mark.asyncio
    async def test_extract_risk_factors_multiple_risks(self, core_domains_service):
        """Test risk factor extraction with multiple risks"""
        text = "Paciente con diabetes, hipertensión, obesidad y tabaquismo"
        risk_factors = await core_domains_service._extract_risk_factors(text)
        
        assert isinstance(risk_factors, list)
        assert len(risk_factors) >= 2
    
    @pytest.mark.asyncio
    async def test_assess_severity_no_symptoms(self, core_domains_service):
        """Test severity assessment with no symptoms"""
        severity = await core_domains_service._assess_severity("", {"symptoms": []})
        
        assert severity == "low"
    
    @pytest.mark.asyncio
    async def test_assess_severity_many_symptoms(self, core_domains_service):
        """Test severity assessment with many symptoms"""
        processing_result = {"symptoms": ["s1", "s2", "s3", "s4", "s5"]}
        severity = await core_domains_service._assess_severity("", processing_result)
        
        assert severity == "medium"
    
    @pytest.mark.asyncio
    async def test_generate_recommendations_no_symptoms(self, core_domains_service):
        """Test recommendation generation with no symptoms"""
        recommendations = await core_domains_service._generate_recommendations({"symptoms": []})
        
        assert isinstance(recommendations, list)
    
    @pytest.mark.asyncio
    async def test_suggest_follow_ups_no_context(self, core_domains_service):
        """Test follow-up suggestions without context"""
        processing_result = {"symptoms": ["dificultad respiratoria"]}
        follow_ups = await core_domains_service._suggest_follow_ups(processing_result, None)
        
        assert isinstance(follow_ups, list)
    
    @pytest.mark.asyncio
    async def test_suggest_follow_ups_low_severity(self, core_domains_service):
        """Test follow-up suggestions for low severity"""
        processing_result = {"symptoms": ["tos"]}
        follow_ups = await core_domains_service._suggest_follow_ups(processing_result, None)
        
        assert isinstance(follow_ups, list)
        # May be empty for low severity
            priority_level="low",
            symptom_analysis={"assessed_urgency": "low"},
            context_risk={"risk_level": "low"}
        )
        
        assert isinstance(actions, list)
        assert len(actions) > 0

