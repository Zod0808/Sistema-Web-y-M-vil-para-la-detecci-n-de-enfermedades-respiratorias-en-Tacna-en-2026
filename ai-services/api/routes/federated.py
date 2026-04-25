from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

from ml_models.federated_learning import FederatedLearningCoordinator

router = APIRouter(prefix="/v1/federated", tags=["Federated Learning"])


class FLRegisterRequest(BaseModel):
    clients: List[str] = Field(..., min_items=1)


@router.post("/register_clients", summary="FL - Registrar clientes")
async def fl_register(req: FLRegisterRequest) -> Dict[str, Any]:
    try:
        fl = FederatedLearningCoordinator()
        return fl.register_clients(req.clients)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class FLRoundRequest(BaseModel):
    client_updates: List[Dict[str, Any]] = Field(default_factory=list, description="Lista de updates locales (ej., métricas)")
    aggregation_method: Optional[str] = Field("fedavg", description="Método de agregación: fedavg, fedprox, scaffold")
    use_dp: Optional[bool] = Field(False, description="Usar privacidad diferencial")
    dp_epsilon: Optional[float] = Field(1.0, description="Épsilon para privacidad diferencial")


@router.post("/run_round", summary="FL - Ejecutar ronda de agregación")
async def fl_round(req: FLRoundRequest) -> Dict[str, Any]:
    try:
        fl = FederatedLearningCoordinator()
        return fl.run_round(
            req.client_updates or [],
            aggregation_method=req.aggregation_method or 'fedavg',
            use_dp=req.use_dp or False,
            dp_epsilon=req.dp_epsilon or 1.0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/global_model", summary="FL - Obtener modelo global")
async def fl_global_model() -> Dict[str, Any]:
    try:
        fl = FederatedLearningCoordinator()
        return {"status": "success", "model": fl.get_global_model()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


