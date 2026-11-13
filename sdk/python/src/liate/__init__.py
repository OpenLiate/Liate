"""
OpenLiate Python SDK — Open Source Backend Layer for AI Agents
Where a Class is an Agent · From India, For India, Beyond India 🇮🇳 🌍
"""
from .om import liate
from .client import LiateApiClient, AgentRunResult

__version__ = "0.1.3"
__all__ = ["liate", "LiateApiClient", "AgentRunResult"]

