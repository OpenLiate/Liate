"""
LIATE Python SDK — Open Source OOP Framework for AI Agents
A Class is an Agent · From India, For India, Beyond India 🇮🇳 🌍
"""
from .om import liate
from .client import LiateApiClient, AgentRunResult

Liate = liate
__version__ = "0.3.0"
__all__ = ["liate", "Liate", "LiateApiClient", "AgentRunResult"]

