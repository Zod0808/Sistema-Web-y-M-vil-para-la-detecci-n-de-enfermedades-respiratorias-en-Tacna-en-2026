"""
ReinforcementLearningAgent - Agente RL para optimización clínica.

Usa implementación real para optimización de recordatorios cuando env_name es "reminder-optimizer",
o stub genérico para otros casos de uso.
"""
from typing import Dict, Any, Optional
import random
import os

# Intentar importar implementación real
try:
    from ml_models.rl_reminder_optimizer import ReinforcementLearningAgent as RealRLAgent
    RL_REAL_AVAILABLE = True
except ImportError:
    RL_REAL_AVAILABLE = False
    print("Warning: Real RL implementation not available, using stub")


class ReinforcementLearningAgent:
    def __init__(self, env_name: str = "clinical-optimizer") -> None:
        self.env_name = env_name
        self.policy: Dict[str, Any] = {}
        self.trained = False
        self.real_agent: Optional[Any] = None
        
        # Usar implementación real para reminder-optimizer
        if env_name == "reminder-optimizer" and RL_REAL_AVAILABLE:
            self.real_agent = RealRLAgent(env_name=env_name)
            self.use_real = True
        else:
            self.use_real = False

    def configure(self, config: Dict[str, Any]) -> Dict[str, Any]:
        if self.use_real and self.real_agent:
            return self.real_agent.configure(config or {})
        
        self.policy.update(config or {})
        return {"status": "ok", "config": self.policy}

    def train(self, episodes: int = 10) -> Dict[str, Any]:
        if self.use_real and self.real_agent:
            result = self.real_agent.train(episodes)
            self.trained = self.real_agent.trained
            return result
        
        # Stub para otros casos de uso
        rewards = [round(random.uniform(0.0, 1.0), 3) for _ in range(episodes)]
        self.trained = True
        return {"status": "ok", "episodes": episodes, "avg_reward": round(sum(rewards) / episodes, 3)}

    def act(self, state: Dict[str, Any]) -> Dict[str, Any]:
        if self.use_real and self.real_agent:
            return self.real_agent.act(state or {})
        
        # Stub para otros casos de uso
        action = random.choice(["increase_med", "decrease_med", "monitor", "refer_specialist"])
        return {"status": "ok", "action": action, "state_summary": list(state.keys()) if state else []}


