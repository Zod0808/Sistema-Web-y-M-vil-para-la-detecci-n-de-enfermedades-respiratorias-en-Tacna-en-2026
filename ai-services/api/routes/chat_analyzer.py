"""
Chat Analyzer API - Endpoint for conversational symptom analysis
Processes natural language conversations to extract symptoms, assess urgency, and provide medical guidance
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import structlog

# from core.database import get_database
# from core.cache import get_cache
# from services.conversational_ai_service import ConversationalAIService
from services.enhanced_chatbot_service import EnhancedChatbotService

logger = structlog.get_logger()
router = APIRouter()

# Test endpoint to verify router is registered
@router.get("/v1/test")
async def test_route():
    """Test endpoint to verify chat_analyzer router is working"""
    return {
        "status": "success",
        "message": "Chat analyzer router is working",
        "service": "enhanced_chatbot"
    }


class ChatMessageInput(BaseModel):
    """Input model for chat message analysis"""
    message: str = Field(..., description="User's message/query", min_length=1)
    conversation_history: Optional[List[Dict[str, Any]]] = Field(
        default=None, 
        description="Previous messages in the conversation"
    )
    context: Optional[Dict[str, Any]] = Field(
        default=None, 
        description="Additional context (patient info, location, etc.)"
    )
    session_id: Optional[str] = Field(default=None, description="Chat session identifier")


class ChatMessageOutput(BaseModel):
    """Output model for chat message analysis"""
    success: bool = Field(..., description="Whether the analysis was successful")
    message: str = Field(..., description="AI's natural language response")
    urgency_level: str = Field(..., description="Detected urgency level (critical/high/medium/low)")
    symptom_count: int = Field(default=0, description="Number of symptoms detected")
    symptom_categories: List[str] = Field(default=[], description="Categories of detected symptoms")
    needs_medical_attention: bool = Field(default=False, description="Whether medical attention is recommended")
    analysis: Optional[Dict[str, Any]] = Field(default=None, description="Detailed analysis data")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Analysis timestamp")


@router.post("/v1/analyze", response_model=ChatMessageOutput)
async def analyze_message(
    input_data: ChatMessageInput
) -> ChatMessageOutput:
    """
    Analyze user message for symptom detection, urgency assessment, and generate natural response
    """
    start_time = datetime.utcnow()
    
    try:
        logger.info("Processing chat message",
                   message_length=len(input_data.message),
                   has_history=input_data.conversation_history is not None)
        
        # Use enhanced chatbot service with complete workflow
        try:
            enhanced_service = EnhancedChatbotService()
            logger.info("Enhanced chatbot service initialized")
        except Exception as service_init_error:
            logger.error("Failed to initialize EnhancedChatbotService", error=str(service_init_error))
            # No fallback - fail gracefully
            raise HTTPException(
                status_code=500,
                detail=f"Service initialization error: {str(service_init_error)}"
            )
        
        # Analyze the message (Tokenize → Classify → OpenAI → Respond)
        analysis_result = await enhanced_service.process_user_message(
            user_message=input_data.message,
            conversation_history=input_data.conversation_history,
            context=input_data.context
        )
        
        logger.info("Analysis result structure", 
                   has_message='message' in analysis_result,
                   has_analysis='analysis' in analysis_result,
                   has_disease_class='disease_classification' in analysis_result)
        
        # Extract data from analysis
        analysis = analysis_result.get('analysis', {})
        disease_classification = analysis_result.get('disease_classification', {})
        
        # Get the response message
        ai_message = analysis_result.get('message', 
            'He recibido tu mensaje. ¿En qué puedo ayudarte específicamente?')
        
        # Extract urgency from disease classification or analysis
        urgency_level = disease_classification.get('urgency', analysis.get('urgency_level', 'low'))
        
        # Extract symptom count
        symptom_extraction = analysis_result.get('symptom_extraction', {})
        symptom_count = symptom_extraction.get('count', len(symptom_extraction.get('symptoms', [])))
        
        # Get symptom categories
        symptom_categories = disease_classification.get('top_3_diseases', [])[:2]  # Get category from diseases
        
        # Check if medical attention needed
        needs_medical_attention = urgency_level in ['critica', 'alta', 'media']
        
        # Generate response
        result = ChatMessageOutput(
            success=True,
            message=ai_message,
            urgency_level=urgency_level,
            symptom_count=symptom_count,
            symptom_categories=[d.get('name', '') for d in symptom_categories] if isinstance(symptom_categories, list) else [],
            needs_medical_attention=needs_medical_attention,
            analysis=analysis_result
        )
        
        # Optional: Store in database for analytics (commented out to avoid dependency issues)
        # if input_data.session_id:
        #     await _store_message_analysis(
        #         db=db,
        #         session_id=input_data.session_id,
        #         user_message=input_data.message,
        #         ai_response=result.message,
        #         analysis=analysis
        #     )
        
        processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        logger.info("Chat message analyzed successfully",
                   urgency=result.urgency_level,
                   symptoms_detected=result.symptom_count,
                   processing_time_ms=processing_time)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error analyzing chat message", error=str(e))
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing message: {str(e)}"
        )


# async def _store_message_analysis(
#     db,
#     session_id: str,
#     user_message: str,
#     ai_response: str,
#     analysis: Dict[str, Any]
# ):
#     """Store chat message analysis in database for analytics and trends"""
#     try:
#         collection = db.chat_analyses
#         
#         document = {
#             "session_id": session_id,
#             "user_message": user_message,
#             "ai_response": ai_response,
#             "analysis": analysis,
#             "created_at": datetime.utcnow(),
#             "urgency_level": analysis.get('urgency_level'),
#             "symptom_categories": analysis.get('categories', []),
#             "needs_medical_attention": analysis.get('needs_medical_attention', False)
#         }
#         
#         await collection.insert_one(document)
#         logger.info("Chat analysis stored", session_id=session_id)
#         
#     except Exception as e:
#         logger.error("Error storing chat analysis", error=str(e))
#         # Don't raise exception as this is not critical

