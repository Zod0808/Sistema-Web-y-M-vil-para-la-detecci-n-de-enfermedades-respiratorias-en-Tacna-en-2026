"""
RL Reminder Optimizer
Reinforcement Learning para optimizar recordatorios de medicamentos

Caso de uso: Optimizar el timing y frecuencia de recordatorios de medicamentos
para maximizar la adherencia del paciente mientras minimiza la molestia.
"""

from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from collections import deque
import json
import os
from datetime import datetime, timedelta

try:
    from sklearn.ensemble import RandomForestRegressor
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("Warning: sklearn not available, using simplified RL")


class ReminderEnvironment:
    """Entorno simulado para optimización de recordatorios"""
    
    def __init__(self, patient_profile: Dict[str, Any]):
        self.patient_profile = patient_profile
        self.current_time = datetime.now()
        self.medication_schedule = patient_profile.get('medication_schedule', [])
        self.adherence_history = deque(maxlen=30)  # Últimos 30 días
        self.reminder_history = deque(maxlen=30)
        self.fatigue_level = 0.0  # Nivel de fatiga por recordatorios excesivos
        self.reset()
    
    def reset(self) -> Dict[str, Any]:
        """Resetear el entorno"""
        self.current_time = datetime.now()
        self.adherence_history.clear()
        self.reminder_history.clear()
        self.fatigue_level = 0.0
        return self.get_state()
    
    def get_state(self) -> Dict[str, Any]:
        """Obtener estado actual del entorno"""
        # Calcular adherencia promedio
        adherence_rate = np.mean(list(self.adherence_history)) if self.adherence_history else 0.5
        
        # Calcular frecuencia de recordatorios recientes
        recent_reminders = len([r for r in self.reminder_history 
                               if (self.current_time - r).total_seconds() < 3600 * 24])  # Últimas 24h
        
        # Calcular hora del día (normalizada)
        hour_of_day = self.current_time.hour / 24.0
        
        # Calcular día de la semana (normalizado)
        day_of_week = self.current_time.weekday() / 7.0
        
        # Próxima dosis programada
        next_dose_time = self._get_next_dose_time()
        time_to_next_dose = (next_dose_time - self.current_time).total_seconds() / 3600.0 if next_dose_time else 24.0
        time_to_next_dose = max(0, min(24, time_to_next_dose)) / 24.0  # Normalizar
        
        return {
            'adherence_rate': float(adherence_rate),
            'recent_reminders': float(recent_reminders) / 10.0,  # Normalizar
            'fatigue_level': float(self.fatigue_level),
            'hour_of_day': hour_of_day,
            'day_of_week': day_of_week,
            'time_to_next_dose': time_to_next_dose,
            'medication_count': len(self.medication_schedule) / 10.0  # Normalizar
        }
    
    def _get_next_dose_time(self) -> Optional[datetime]:
        """Obtener próxima hora de dosis programada"""
        if not self.medication_schedule:
            return None
        
        current_hour = self.current_time.hour
        scheduled_hours = sorted([int(h) for h in self.medication_schedule])
        
        for hour in scheduled_hours:
            if hour > current_hour:
                next_time = self.current_time.replace(hour=hour, minute=0, second=0, microsecond=0)
                return next_time
        
        # Si no hay más horas hoy, usar la primera de mañana
        if scheduled_hours:
            next_time = (self.current_time + timedelta(days=1)).replace(
                hour=scheduled_hours[0], minute=0, second=0, microsecond=0
            )
            return next_time
        
        return None
    
    def step(self, action: str) -> Tuple[Dict[str, Any], float, bool]:
        """
        Ejecutar acción y obtener recompensa
        
        Actions:
        - 'send_reminder': Enviar recordatorio ahora
        - 'delay_reminder': Retrasar recordatorio
        - 'skip_reminder': Omitir recordatorio
        - 'custom_timing': Recordatorio con timing personalizado
        """
        reward = 0.0
        done = False
        
        if action == 'send_reminder':
            # Recompensa positiva si el recordatorio es oportuno
            time_to_dose = self.get_state()['time_to_next_dose']
            if 0.1 <= time_to_dose <= 0.3:  # 2-7 horas antes
                reward += 0.5
            elif time_to_dose < 0.1:  # Muy cerca
                reward += 0.2
            else:  # Muy lejos
                reward -= 0.1
            
            # Penalizar si hay demasiados recordatorios recientes
            if self.get_state()['recent_reminders'] > 0.5:
                reward -= 0.3
                self.fatigue_level += 0.1
            
            self.reminder_history.append(self.current_time)
            
            # Simular adherencia (probabilidad de tomar medicamento aumenta con recordatorio oportuno)
            adherence_prob = 0.7 + (reward * 0.2)
            took_medication = np.random.random() < adherence_prob
            self.adherence_history.append(1.0 if took_medication else 0.0)
            
            if took_medication:
                reward += 0.3  # Recompensa por adherencia
        
        elif action == 'delay_reminder':
            # Pequeña penalización por retraso, pero puede ser mejor que recordatorio prematuro
            reward -= 0.1
            # Si el timing mejora después del retraso, recompensa
            if self.get_state()['time_to_next_dose'] < 0.1:
                reward += 0.2
        
        elif action == 'skip_reminder':
            # Penalización moderada, pero puede evitar fatiga
            reward -= 0.2
            if self.fatigue_level > 0.5:
                reward += 0.3  # Recompensa por reducir fatiga
        
        elif action == 'custom_timing':
            # Recompensa por personalización inteligente
            state = self.get_state()
            if state['adherence_rate'] < 0.6:  # Paciente con baja adherencia
                reward += 0.4  # Recordatorios personalizados son más importantes
            else:
                reward += 0.1
        
        # Actualizar fatiga (decrece con el tiempo)
        self.fatigue_level = max(0, self.fatigue_level - 0.05)
        
        # Avanzar tiempo (simular paso de tiempo)
        self.current_time += timedelta(hours=1)
        
        # Terminar si hemos simulado suficiente tiempo
        if len(self.adherence_history) >= 30:
            done = True
        
        next_state = self.get_state()
        return next_state, reward, done


class QLearningAgent:
    """Agente Q-Learning para optimización de recordatorios"""
    
    def __init__(self, state_size: int = 7, action_size: int = 4, learning_rate: float = 0.1, 
                 discount_factor: float = 0.95, epsilon: float = 0.1):
        self.state_size = state_size
        self.action_size = action_size
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.epsilon = epsilon
        
        # Tabla Q (simplificada - en producción usar función de aproximación)
        self.q_table: Dict[str, List[float]] = {}
        
        # Acciones disponibles
        self.actions = ['send_reminder', 'delay_reminder', 'skip_reminder', 'custom_timing']
    
    def _state_to_key(self, state: Dict[str, Any]) -> str:
        """Convertir estado a clave para Q-table (discretización)"""
        # Discretizar valores continuos
        adherence = int(state['adherence_rate'] * 10) / 10.0
        reminders = int(state['recent_reminders'] * 10) / 10.0
        hour = int(state['hour_of_day'] * 24) // 4  # 6 buckets de horas
        time_to_dose = int(state['time_to_next_dose'] * 10) / 10.0
        
        return f"{adherence:.1f}_{reminders:.1f}_{hour}_{time_to_dose:.1f}"
    
    def get_action(self, state: Dict[str, Any], training: bool = True) -> str:
        """Obtener acción usando política epsilon-greedy"""
        state_key = self._state_to_key(state)
        
        # Inicializar Q-values si es primera vez
        if state_key not in self.q_table:
            self.q_table[state_key] = [0.0] * self.action_size
        
        # Epsilon-greedy
        if training and np.random.random() < self.epsilon:
            return np.random.choice(self.actions)
        
        # Elegir mejor acción
        q_values = self.q_table[state_key]
        best_action_idx = np.argmax(q_values)
        return self.actions[best_action_idx]
    
    def update(self, state: Dict[str, Any], action: str, reward: float, 
               next_state: Dict[str, Any], done: bool):
        """Actualizar Q-table usando Q-learning"""
        state_key = self._state_to_key(state)
        next_state_key = self._state_to_key(next_state)
        action_idx = self.actions.index(action)
        
        # Inicializar si es necesario
        if state_key not in self.q_table:
            self.q_table[state_key] = [0.0] * self.action_size
        if next_state_key not in self.q_table:
            self.q_table[next_state_key] = [0.0] * self.action_size
        
        # Q-learning update
        current_q = self.q_table[state_key][action_idx]
        next_max_q = max(self.q_table[next_state_key]) if not done else 0.0
        
        new_q = current_q + self.learning_rate * (
            reward + self.discount_factor * next_max_q - current_q
        )
        
        self.q_table[state_key][action_idx] = new_q
    
    def save_policy(self, filepath: str):
        """Guardar política aprendida"""
        with open(filepath, 'w') as f:
            json.dump(self.q_table, f)
    
    def load_policy(self, filepath: str):
        """Cargar política aprendida"""
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                self.q_table = json.load(f)


class ReinforcementLearningAgent:
    """Agente de Reinforcement Learning para optimización de recordatorios"""
    
    def __init__(self, env_name: str = "clinical-optimizer"):
        self.env_name = env_name
        self.agent: Optional[QLearningAgent] = None
        self.environment: Optional[ReminderEnvironment] = None
        self.trained = False
        self.training_history: List[Dict[str, Any]] = []
    
    def configure(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Configurar agente y entorno"""
        patient_profile = config.get('patient_profile', {
            'medication_schedule': ['08:00', '14:00', '20:00']
        })
        
        self.environment = ReminderEnvironment(patient_profile)
        
        agent_config = {
            'learning_rate': config.get('learning_rate', 0.1),
            'discount_factor': config.get('discount_factor', 0.95),
            'epsilon': config.get('epsilon', 0.1)
        }
        
        self.agent = QLearningAgent(**agent_config)
        
        return {
            "status": "ok",
            "config": {
                "env_name": self.env_name,
                "agent_config": agent_config,
                "patient_profile": patient_profile
            }
        }
    
    def train(self, episodes: int = 10) -> Dict[str, Any]:
        """Entrenar agente RL"""
        if not self.agent or not self.environment:
            raise ValueError("Agent and environment must be configured first")
        
        episode_rewards = []
        
        for episode in range(episodes):
            state = self.environment.reset()
            total_reward = 0.0
            steps = 0
            
            while True:
                action = self.agent.get_action(state, training=True)
                next_state, reward, done = self.environment.step(action)
                
                self.agent.update(state, action, reward, next_state, done)
                
                total_reward += reward
                steps += 1
                state = next_state
                
                if done:
                    break
            
            episode_rewards.append(total_reward)
            self.training_history.append({
                'episode': episode + 1,
                'reward': total_reward,
                'steps': steps
            })
        
        self.trained = True
        avg_reward = np.mean(episode_rewards)
        
        return {
            "status": "ok",
            "episodes": episodes,
            "avg_reward": float(avg_reward),
            "min_reward": float(np.min(episode_rewards)),
            "max_reward": float(np.max(episode_rewards)),
            "training_history": self.training_history[-10:]  # Últimos 10 episodios
        }
    
    def act(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Obtener acción del agente entrenado"""
        if not self.agent:
            raise ValueError("Agent must be configured first")
        
        if not self.trained:
            # Si no está entrenado, usar política aleatoria
            action = np.random.choice(['send_reminder', 'delay_reminder', 'skip_reminder', 'custom_timing'])
        else:
            action = self.agent.get_action(state, training=False)
        
        # Calcular confianza basada en Q-values
        if self.agent and hasattr(self.agent, 'q_table'):
            state_key = self.agent._state_to_key(state)
            if state_key in self.agent.q_table:
                q_values = self.agent.q_table[state_key]
                confidence = float(np.max(q_values)) / 10.0  # Normalizar
            else:
                confidence = 0.5
        else:
            confidence = 0.5
        
        return {
            "status": "ok",
            "action": action,
            "confidence": confidence,
            "state_summary": {
                "adherence_rate": state.get('adherence_rate', 0.0),
                "recent_reminders": state.get('recent_reminders', 0.0),
                "time_to_next_dose": state.get('time_to_next_dose', 0.0)
            },
            "recommendation": self._get_recommendation(action, state)
        }
    
    def _get_recommendation(self, action: str, state: Dict[str, Any]) -> str:
        """Generar recomendación basada en la acción"""
        recommendations = {
            'send_reminder': 'Enviar recordatorio ahora. El timing es óptimo para maximizar adherencia.',
            'delay_reminder': 'Retrasar recordatorio. Esperar un momento más oportuno.',
            'skip_reminder': 'Omitir recordatorio. El paciente puede estar experimentando fatiga de notificaciones.',
            'custom_timing': 'Usar timing personalizado basado en el perfil del paciente.'
        }
        return recommendations.get(action, 'Acción recomendada por el agente RL.')

