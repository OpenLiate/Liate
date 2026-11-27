"""
Core Engine: OM (Orchestration Module)
Matches AUM (Agent Unified Module) specification across 5 sovereign layers:
L[LM] · I[ntegration] · A[gent] · T[ools] · E[nvironment]
"""
from typing import Any, Dict, Iterator, List, Optional, Union
import os
from .client import LiateApiClient, AgentRunResult

class liate:
    """
    OM (Orchestration Module) — Python OOP Base Class for AI Agents.
    Supports pure LIATE authoring across 3 styles:
    1. Shorthand: L · I · A · T · E
    2. Full Name: LLM · Integration · Agent · Tools · Environment
    3. Lowercase: llm · integration · agent · tools · environment

    Example:
    ```python
    from openliate import liate

    class HelloAgent(liate):
        LLM = "sarvam/sarvam-105b"
        Integration = {"memory": "sessions/hello-agent"}
        Agent = {"name": "hello_agent"}
        Tools = {
            "fetch": {"command": "uvx", "args": ["mcp-server-fetch"], "tools": ["*"]}
        }
        Environment = {"SARVAM_API_KEY": "$SARVAM_API_KEY"}

    agent = HelloAgent()
    result = agent.run("Namaste world!")
    print(result)
    ```
    """
    # 1. Shorthand
    L: Optional[Union[str, Dict[str, Any]]] = None
    I: Optional[Dict[str, Any]] = None
    A: Optional[Union[str, Dict[str, Any]]] = None
    T: Optional[Union[List[Any], Dict[str, Any]]] = None
    E: Optional[Dict[str, str]] = None

    # 2. Full Name
    LLM: Optional[Union[str, Dict[str, Any]]] = None
    Integration: Optional[Dict[str, Any]] = None
    Agent: Optional[Union[str, Dict[str, Any]]] = None
    Tools: Optional[Union[List[Any], Dict[str, Any]]] = None
    Environment: Optional[Dict[str, str]] = None

    # 3. Lowercase
    llm: Optional[Union[str, Dict[str, Any]]] = None
    integration: Optional[Dict[str, Any]] = None
    agent: Optional[Union[str, Dict[str, Any]]] = None
    tools: Optional[Union[List[Any], Dict[str, Any]]] = None
    environment: Optional[Dict[str, str]] = None

    def __init__(self, endpoint: Optional[str] = None):
        self._endpoint = endpoint or os.environ.get("OPENLIATE_ENDPOINT", "http://localhost:7071")
        self._client = LiateApiClient(endpoint=self._endpoint)

    def to_module(self) -> Dict[str, Any]:
        """
        Exports the declarative AUM (Agent Unified Module) dictionary.
        """
        l_val = self.L if self.L is not None else (self.LLM if self.LLM is not None else self.llm)
        i_val = self.I if self.I is not None else (self.Integration if self.Integration is not None else self.integration)
        a_val = self.A if self.A is not None else (self.Agent if self.Agent is not None else self.agent)
        t_val = self.T if self.T is not None else (self.Tools if self.Tools is not None else self.tools)
        e_val = self.E if self.E is not None else (self.Environment if self.Environment is not None else self.environment)

        if not l_val:
            raise ValueError(
                f"[OpenLiate Error]: Missing required Layer [L] (LLM) in class '{self.__class__.__name__}'. "
                f"Declare 'L', 'LLM', or 'llm' on your class. "
                f"OpenLiate never hardcodes silent model defaults."
            )

        name = self.__class__.__name__
        agent_a = a_val or {"name": name}
        if isinstance(agent_a, str):
            agent_a = {"name": agent_a}

        return {
            "L": l_val,
            "I": i_val or {},
            "A": agent_a,
            "T": t_val if t_val is not None else [],
            "E": e_val or {}
        }

    def run(
        self,
        prompt: str,
        session_id: Optional[str] = None,
        output_schema: Optional[Any] = None,
    ) -> AgentRunResult:
        """
        Executes the agent via OpenLiate Liate API.
        Supports optional output_schema (dict JSON Schema or Pydantic model class) for typed parity.
        """
        import json as _json

        module = self.to_module()
        effective_prompt = prompt
        if output_schema is not None:
            if hasattr(output_schema, "model_json_schema"):
                schema_dict = output_schema.model_json_schema()
            elif isinstance(output_schema, dict):
                schema_dict = output_schema
            else:
                schema_dict = {"type": "object"}
            module["A"]["outputSchema"] = schema_dict
            effective_prompt = (
                f"{prompt}\n\n[STRUCTURED OUTPUT CONTRACT]: Respond ONLY with raw valid JSON matching:\n"
                f"{_json.dumps(schema_dict)}"
            )

        res = self._client.run(module=module, prompt=effective_prompt, session_id=session_id)
        if output_schema is not None and hasattr(output_schema, "model_validate_json"):
            cleaned = res.text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            res.data = output_schema.model_validate_json(cleaned)  # type: ignore[attr-defined]
        return res

    def stream(self, prompt: str, session_id: Optional[str] = None) -> Iterator[Dict[str, Any]]:
        """
        Streams live SSE token and step events via OpenLiate /stream API.
        """
        module = self.to_module()
        return self._client.stream(module=module, prompt=prompt, session_id=session_id)

    async def arun(self, prompt: str, session_id: Optional[str] = None) -> AgentRunResult:
        """
        Asynchronously executes the agent via OpenLiate Liate API.
        """
        module = self.to_module()
        return await self._client.arun(module=module, prompt=prompt, session_id=session_id)


