"""
LIATE Python SDK — Open Source OOP Framework for AI Agents
Where Classes Are AI Agents · From India, For India, Beyond India 🇮🇳 🌍
"""
from .om import liate
from .client import LiateApiClient, AgentRunResult

Liate = liate
__version__ = "0.2.5"
__all__ = ["liate", "Liate", "LiateApiClient", "AgentRunResult"]

