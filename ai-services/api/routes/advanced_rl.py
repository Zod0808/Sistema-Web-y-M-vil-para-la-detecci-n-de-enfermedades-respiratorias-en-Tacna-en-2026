from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

from ml_models.reinforcement_learning import ReinforcementLearningAgent

router = APIRouter(prefix="/v1/rl", tags=["Reinforcement Learning"])


class RLConfigureRequest(BaseModel):
    env_name: Optional[str] = Field("clinical-optimizer")
    config: Dict[str, Any] = Field(default_factory=dict)


@router.post("/configure", summary="RL - Configurar agente")
async def rl_configure(req: RLConfigureRequest) -> Dict[str, Any]:
    try:
        agent = ReinforcementLearningAgent(env_name=req.env_name or "clinical-optimizer")
        return agent.configure(req.config or {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class RLTrainRequest(BaseModel):
    env_name: Optional[str] = Field("clinical-optimizer")
    episodes: Optional[int] = Field(10, ge=1, le=1000)


@router.post("/train", summary="RL - Entrenar agente")
async def rl_train(req: RLTrainRequest) -> Dict[str, Any]:
    try:
        agent = ReinforcementLearningAgent(env_name=req.env_name or "clinical-optimizer")
        return agent.train(episodes=req.episodes or 10)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class RLActRequest(BaseModel):
    env_name: Optional[str] = Field("clinical-optimizer")
    state: Dict[str, Any]


@router.post("/act", summary="RL - Acción del agente")
async def rl_act(req: RLActRequest) -> Dict[str, Any]:
    try:
        agent = ReinforcementLearningAgent(env_name=req.env_name or "clinical-optimizer")
        return agent.act(req.state or {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


