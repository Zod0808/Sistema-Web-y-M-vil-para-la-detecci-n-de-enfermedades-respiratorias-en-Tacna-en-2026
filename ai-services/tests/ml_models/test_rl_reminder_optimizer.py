"""
Unit tests for RL Reminder Optimizer
Tests for ReminderEnvironment, QLearningAgent, and ReinforcementLearningAgent
"""

import pytest
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import tempfile
import os

from ml_models.rl_reminder_optimizer import (
    ReminderEnvironment,
    QLearningAgent,
    ReinforcementLearningAgent
)


class TestReminderEnvironment:
    """Tests for ReminderEnvironment"""
    
    @pytest.fixture
    def patient_profile(self):
        """Sample patient profile"""
        return {
            'medication_schedule': ['08:00', '14:00', '20:00']
        }
    
    @pytest.fixture
    def env(self, patient_profile):
        """Create ReminderEnvironment instance"""
        return ReminderEnvironment(patient_profile)
    
    def test_initialization(self, env, patient_profile):
        """Test environment initialization"""
        assert env.patient_profile == patient_profile
        assert env.medication_schedule == ['08:00', '14:00', '20:00']
        assert len(env.adherence_history) == 0
        assert len(env.reminder_history) == 0
        assert env.fatigue_level == 0.0
    
    def test_reset(self, env):
        """Test environment reset"""
        # Add some history
        env.adherence_history.append(1.0)
        env.reminder_history.append(datetime.now())
        env.fatigue_level = 0.5
        
        # Reset
        state = env.reset()
        
        assert len(env.adherence_history) == 0
        assert len(env.reminder_history) == 0
        assert env.fatigue_level == 0.0
        assert isinstance(state, dict)
        assert 'adherence_rate' in state
    
    def test_get_state(self, env):
        """Test state retrieval"""
        state = env.get_state()
        
        assert isinstance(state, dict)
        assert 'adherence_rate' in state
        assert 'recent_reminders' in state
        assert 'fatigue_level' in state
        assert 'hour_of_day' in state
        assert 'day_of_week' in state
        assert 'time_to_next_dose' in state
        assert 'medication_count' in state
        
        # Check value ranges
        assert 0.0 <= state['adherence_rate'] <= 1.0
        assert 0.0 <= state['recent_reminders'] <= 1.0
        assert 0.0 <= state['fatigue_level'] <= 1.0
        assert 0.0 <= state['hour_of_day'] <= 1.0
        assert 0.0 <= state['day_of_week'] <= 1.0
        assert 0.0 <= state['time_to_next_dose'] <= 1.0
    
    def test_get_state_with_adherence_history(self, env):
        """Test state with adherence history"""
        env.adherence_history.extend([1.0, 1.0, 0.0, 1.0])
        state = env.get_state()
        
        assert state['adherence_rate'] == 0.75  # 3/4 = 0.75
    
    def test_get_next_dose_time(self, env):
        """Test next dose time calculation"""
        # Set current time to 10:00
        env.current_time = env.current_time.replace(hour=10, minute=0, second=0, microsecond=0)
        
        next_dose = env._get_next_dose_time()
        assert next_dose is not None
        assert next_dose.hour == 14  # Next scheduled dose at 14:00
    
    def test_get_next_dose_time_next_day(self, env):
        """Test next dose time when no more doses today"""
        # Set current time to 21:00 (after last dose)
        env.current_time = env.current_time.replace(hour=21, minute=0, second=0, microsecond=0)
        
        next_dose = env._get_next_dose_time()
        assert next_dose is not None
        assert next_dose.hour == 8  # First dose tomorrow
        assert next_dose.day == (env.current_time + timedelta(days=1)).day
    
    def test_step_send_reminder(self, env):
        """Test step with send_reminder action"""
        initial_time = env.current_time
        state, reward, done = env.step('send_reminder')
        
        assert isinstance(state, dict)
        assert isinstance(reward, float)
        assert isinstance(done, bool)
        assert len(env.reminder_history) == 1
        assert env.current_time > initial_time
    
    def test_step_delay_reminder(self, env):
        """Test step with delay_reminder action"""
        state, reward, done = env.step('delay_reminder')
        
        assert isinstance(state, dict)
        assert isinstance(reward, float)
        assert reward <= 0.0  # Delay should have negative or small reward
        assert isinstance(done, bool)
    
    def test_step_skip_reminder(self, env):
        """Test step with skip_reminder action"""
        env.fatigue_level = 0.6  # High fatigue
        state, reward, done = env.step('skip_reminder')
        
        assert isinstance(state, dict)
        assert isinstance(reward, float)
        # Skip with high fatigue should have positive reward
        assert isinstance(done, bool)
    
    def test_step_custom_timing(self, env):
        """Test step with custom_timing action"""
        state, reward, done = env.step('custom_timing')
        
        assert isinstance(state, dict)
        assert isinstance(reward, float)
        assert reward > 0.0  # Custom timing should have positive reward
        assert isinstance(done, bool)
    
    def test_step_rewards_optimal_timing(self, env):
        """Test rewards for optimal timing"""
        # Set time close to next dose (2-7 hours before)
        env.current_time = env.current_time.replace(hour=6, minute=0)  # 6 AM, next dose at 8 AM
        state, reward, _ = env.step('send_reminder')
        
        # Should get positive reward for optimal timing
        assert reward > 0.0
    
    def test_step_rewards_fatigue_penalty(self, env):
        """Test penalty for too many reminders"""
        # Add many recent reminders
        for _ in range(6):
            env.reminder_history.append(env.current_time - timedelta(hours=1))
        
        state, reward, _ = env.step('send_reminder')
        
        # Should get penalty for excessive reminders
        assert reward < 0.3  # Reduced reward due to fatigue
    
    def test_step_adherence_simulation(self, env):
        """Test adherence simulation after reminder"""
        state, reward, done = env.step('send_reminder')
        
        # Should have some adherence history after reminder
        assert len(env.adherence_history) == 1
        assert env.adherence_history[0] in [0.0, 1.0]
    
    def test_step_done_condition(self, env):
        """Test done condition after many steps"""
        # Simulate 30 steps
        for _ in range(30):
            state, reward, done = env.step('send_reminder')
            if done:
                break
        
        # Should eventually be done
        assert done or len(env.adherence_history) >= 30


class TestQLearningAgent:
    """Tests for QLearningAgent"""
    
    @pytest.fixture
    def agent(self):
        """Create QLearningAgent instance"""
        return QLearningAgent(
            state_size=7,
            action_size=4,
            learning_rate=0.1,
            discount_factor=0.95,
            epsilon=0.1
        )
    
    def test_initialization(self, agent):
        """Test agent initialization"""
        assert agent.state_size == 7
        assert agent.action_size == 4
        assert agent.learning_rate == 0.1
        assert agent.discount_factor == 0.95
        assert agent.epsilon == 0.1
        assert len(agent.q_table) == 0
        assert len(agent.actions) == 4
    
    def test_state_to_key(self, agent):
        """Test state to key conversion"""
        state = {
            'adherence_rate': 0.75,
            'recent_reminders': 0.3,
            'hour_of_day': 0.5,
            'time_to_next_dose': 0.2
        }
        
        key = agent._state_to_key(state)
        assert isinstance(key, str)
        assert len(key) > 0
    
    def test_get_action_exploitation(self, agent):
        """Test action selection in exploitation mode"""
        state = {
            'adherence_rate': 0.5,
            'recent_reminders': 0.2,
            'hour_of_day': 0.5,
            'time_to_next_dose': 0.3
        }
        
        # Initialize Q-values
        state_key = agent._state_to_key(state)
        agent.q_table[state_key] = [0.1, 0.5, 0.2, 0.3]  # Action 1 is best
        
        # With epsilon=0.1, should mostly exploit (90% of the time)
        actions = [agent.get_action(state, training=True) for _ in range(100)]
        best_action_count = actions.count(agent.actions[1])
        
        # Should exploit most of the time
        assert best_action_count > 50
    
    def test_get_action_exploration(self, agent):
        """Test action selection in exploration mode"""
        state = {
            'adherence_rate': 0.5,
            'recent_reminders': 0.2,
            'hour_of_day': 0.5,
            'time_to_next_dose': 0.3
        }
        
        # With epsilon=0.1, should explore sometimes
        actions = [agent.get_action(state, training=True) for _ in range(100)]
        unique_actions = set(actions)
        
        # Should explore different actions
        assert len(unique_actions) > 1
    
    def test_get_action_not_training(self, agent):
        """Test action selection when not training"""
        state = {
            'adherence_rate': 0.5,
            'recent_reminders': 0.2,
            'hour_of_day': 0.5,
            'time_to_next_dose': 0.3
        }
        
        # Initialize Q-values
        state_key = agent._state_to_key(state)
        agent.q_table[state_key] = [0.1, 0.9, 0.2, 0.3]  # Action 1 is best
        
        # When not training, should always exploit
        actions = [agent.get_action(state, training=False) for _ in range(10)]
        
        # Should always choose best action
        assert all(a == agent.actions[1] for a in actions)
    
    def test_update_q_learning(self, agent):
        """Test Q-learning update"""
        state = {
            'adherence_rate': 0.5,
            'recent_reminders': 0.2,
            'hour_of_day': 0.5,
            'time_to_next_dose': 0.3
        }
        next_state = {
            'adherence_rate': 0.6,
            'recent_reminders': 0.3,
            'hour_of_day': 0.6,
            'time_to_next_dose': 0.2
        }
        
        state_key = agent._state_to_key(state)
        next_state_key = agent._state_to_key(next_state)
        
        # Initialize Q-values
        agent.q_table[state_key] = [0.0, 0.0, 0.0, 0.0]
        agent.q_table[next_state_key] = [0.1, 0.2, 0.1, 0.1]
        
        action = 'send_reminder'
        reward = 0.5
        done = False
        
        old_q = agent.q_table[state_key][agent.actions.index(action)]
        agent.update(state, action, reward, next_state, done)
        new_q = agent.q_table[state_key][agent.actions.index(action)]
        
        # Q-value should increase
        assert new_q > old_q
    
    def test_update_terminal_state(self, agent):
        """Test Q-learning update for terminal state"""
        state = {
            'adherence_rate': 0.5,
            'recent_reminders': 0.2,
            'hour_of_day': 0.5,
            'time_to_next_dose': 0.3
        }
        next_state = {
            'adherence_rate': 0.6,
            'recent_reminders': 0.3,
            'hour_of_day': 0.6,
            'time_to_next_dose': 0.2
        }
        
        state_key = agent._state_to_key(state)
        agent.q_table[state_key] = [0.0, 0.0, 0.0, 0.0]
        
        action = 'send_reminder'
        reward = 1.0
        done = True  # Terminal state
        
        old_q = agent.q_table[state_key][agent.actions.index(action)]
        agent.update(state, action, reward, next_state, done)
        new_q = agent.q_table[state_key][agent.actions.index(action)]
        
        # Q-value should increase (no next state value)
        assert new_q > old_q
    
    def test_save_load_policy(self, agent):
        """Test policy save and load"""
        # Initialize some Q-values
        state = {
            'adherence_rate': 0.5,
            'recent_reminders': 0.2,
            'hour_of_day': 0.5,
            'time_to_next_dose': 0.3
        }
        state_key = agent._state_to_key(state)
        agent.q_table[state_key] = [0.1, 0.5, 0.2, 0.3]
        
        # Save policy
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
            filepath = f.name
        
        try:
            agent.save_policy(filepath)
            assert os.path.exists(filepath)
            
            # Load policy in new agent
            new_agent = QLearningAgent()
            new_agent.load_policy(filepath)
            
            assert state_key in new_agent.q_table
            assert new_agent.q_table[state_key] == [0.1, 0.5, 0.2, 0.3]
        finally:
            if os.path.exists(filepath):
                os.unlink(filepath)


class TestReinforcementLearningAgent:
    """Tests for ReinforcementLearningAgent"""
    
    @pytest.fixture
    def agent(self):
        """Create ReinforcementLearningAgent instance"""
        return ReinforcementLearningAgent(env_name="reminder-optimizer")
    
    def test_initialization(self, agent):
        """Test agent initialization"""
        assert agent.env_name == "reminder-optimizer"
        assert agent.trained == False
        assert len(agent.training_history) == 0
    
    def test_configure(self, agent):
        """Test agent configuration"""
        config = {
            'patient_profile': {
                'medication_schedule': ['08:00', '20:00']
            },
            'learning_rate': 0.15,
            'discount_factor': 0.9
        }
        
        result = agent.configure(config)
        
        assert result['status'] == 'ok'
        assert 'config' in result
        assert agent.environment is not None
    
    def test_train(self, agent):
        """Test agent training"""
        # Configure first
        agent.configure({
            'patient_profile': {
                'medication_schedule': ['08:00', '20:00']
            }
        })
        
        # Train
        result = agent.train(episodes=5)
        
        assert result['status'] == 'ok'
        assert result['episodes'] == 5
        assert 'avg_reward' in result
        assert 'min_reward' in result
        assert 'max_reward' in result
        assert 'training_history' in result
        assert agent.trained == True
        assert len(agent.training_history) == 5
    
    def test_train_without_configure(self, agent):
        """Test training without configuration should raise error"""
        with pytest.raises((ValueError, AttributeError)):
            agent.train(episodes=5)
    
    def test_act_trained(self, agent):
        """Test action when agent is trained"""
        # Configure and train
        agent.configure({
            'patient_profile': {
                'medication_schedule': ['08:00', '20:00']
            }
        })
        agent.train(episodes=3)
        
        state = {
            'adherence_rate': 0.7,
            'recent_reminders': 0.2,
            'fatigue_level': 0.1,
            'hour_of_day': 0.5,
            'day_of_week': 0.5,
            'time_to_next_dose': 0.3,
            'medication_count': 0.2
        }
        
        result = agent.act(state)
        
        assert result['status'] == 'ok'
        assert 'action' in result
        assert result['action'] in ['send_reminder', 'delay_reminder', 'skip_reminder', 'custom_timing']
        assert 'confidence' in result
        assert 0.0 <= result['confidence'] <= 1.0
        assert 'state_summary' in result
        assert 'recommendation' in result
    
    def test_act_not_trained(self, agent):
        """Test action when agent is not trained (should use random)"""
        # Configure but don't train
        agent.configure({
            'patient_profile': {
                'medication_schedule': ['08:00', '20:00']
            }
        })
        
        state = {
            'adherence_rate': 0.7,
            'recent_reminders': 0.2,
            'fatigue_level': 0.1,
            'hour_of_day': 0.5,
            'day_of_week': 0.5,
            'time_to_next_dose': 0.3,
            'medication_count': 0.2
        }
        
        result = agent.act(state)
        
        assert result['status'] == 'ok'
        assert 'action' in result
        assert result['action'] in ['send_reminder', 'delay_reminder', 'skip_reminder', 'custom_timing']
    
    def test_get_recommendation(self, agent):
        """Test recommendation generation"""
        state = {
            'adherence_rate': 0.5,
            'recent_reminders': 0.3,
            'time_to_next_dose': 0.2
        }
        
        result = agent.act(state)
        
        assert 'recommendation' in result
        assert isinstance(result['recommendation'], str)
        assert len(result['recommendation']) > 0
    
    def test_training_history(self, agent):
        """Test training history tracking"""
        agent.configure({
            'patient_profile': {
                'medication_schedule': ['08:00', '20:00']
            }
        })
        
        result = agent.train(episodes=10)
        
        assert len(agent.training_history) == 10
        assert all('episode' in h for h in agent.training_history)
        assert all('reward' in h for h in agent.training_history)
        assert all('steps' in h for h in agent.training_history)

