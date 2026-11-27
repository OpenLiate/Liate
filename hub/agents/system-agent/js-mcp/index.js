import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";

// Initialize the Node.js MCP server
const server = new Server(
  {
    name: "js-system-controller",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register the tool with its schema
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "js_make_laptop_sleep",
        description: "Puts the laptop/PC into Sleep Mode after a specified delay.",
        inputSchema: {
          type: "object",
          properties: {
            delay_seconds: {
              type: "number",
              description: "Delay in seconds before triggering sleep (default 5).",
            },
          },
          required: ["delay_seconds"],
        },
      },
    ],
  };
});

// Handle incoming tool calls from LIATE
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "js_make_laptop_sleep") {
    const delay = request.params.arguments?.delay_seconds || 5;

    // Trigger 1: CMD timeout + native rundll32.exe suspend call
    const cmdRundll = `start /min cmd.exe /c "timeout /t ${delay} & rundll32.exe powrprof.dll,SetSuspendState 0,1,0"`;
    
    // Trigger 2: PowerShell bypass + .NET SetSuspendState
    const cmdPs = `powershell -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Start-Sleep -Seconds ${delay}; Add-Type -AssemblyReference System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState('Suspend', $false, $false)"`;

    // Execute both in background
    exec(cmdRundll, (err) => {
      if (err) console.error("Rundll command failed:", err);
    });
    exec(cmdPs, (err) => {
      if (err) console.error("PowerShell command failed:", err);
    });

    return {
      content: [
        {
          type: "text",
          text: `😴 [Node.js MCP] System Suspend Triggered! The laptop will enter Sleep Mode in ${delay} seconds.`,
        },
      ],
    };
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});

// Connect to transport
const transport = new StdioServerTransport();
await server.connect(transport);
