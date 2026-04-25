"""
Test script for enhanced chatbot service
"""

import asyncio
import sys
from services.enhanced_chatbot_service import EnhancedChatbotService

async def test_symptoms():
    """Test with multiple symptoms"""
    
    service = EnhancedChatbotService()
    
    # Test case: Influenza B symptoms
    user_message = "Actualmente estoy con Fiebre, repetidos dolores musculares, un poco de tos, dolor de garganta al levantarme, fatiga por las mañanas, síntomas gastrointestinales ocasionales después de comer"
    
    print(f"\n{'='*60}")
    print("Testing Enhanced Chatbot Service")
    print(f"{'='*60}\n")
    print(f"User Input: {user_message}")
    print(f"\n{'-'*60}\n")
    
    try:
        result = await service.process_user_message(
            user_message=user_message,
            conversation_history=None,
            context={"location": "Tacna, Perú"}
        )
        
        print("RESULT:")
        print(f"Success: {result.get('success')}")
        print(f"\nMessage:\n{result.get('message')}")
        
        print(f"\n{'-'*60}")
        print("ANALYSIS:")
        print(f"{'-'*60}")
        
        analysis = result.get('analysis', {})
        print(f"Detected Symptoms: {analysis.get('detected_symptoms', [])}")
        print(f"Possible Disease: {analysis.get('possible_disease', 'None')}")
        print(f"Urgency Level: {analysis.get('urgency_level', 'None')}")
        print(f"Confidence: {analysis.get('confidence', 0)}")
        
        disease_classification = result.get('disease_classification', {})
        print(f"\nDisease: {disease_classification.get('disease_name', 'None')}")
        print(f"Category: {disease_classification.get('category', 'None')}")
        print(f"Matched Symptoms: {disease_classification.get('matched_symptoms', [])}")
        print(f"Top 3 Diseases: {disease_classification.get('top_3_diseases', [])}")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_symptoms())

