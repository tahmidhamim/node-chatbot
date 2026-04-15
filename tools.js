// Define available tools/functions for the chatbot
export const tools = [
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Get the current date and time',
      parameters: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description: 'The timezone to get the time for (e.g., "America/New_York", "Europe/London")',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Perform mathematical calculations. Supports basic arithmetic and common mathematical functions.',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)", "sin(3.14)")',
          },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Search the web for information (simulated)',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get weather information for a location (simulated)',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name or location',
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature unit',
          },
        },
        required: ['location'],
      },
    },
  },
];

// Tool execution functions
export const toolFunctions = {
  get_current_time: (args) => {
    const timezone = args.timezone || 'UTC';
    try {
      const date = new Date();
      const options = {
        timeZone: timezone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      };
      
      return {
        time: date.toLocaleString('en-US', options),
        timestamp: date.getTime(),
        timezone: timezone,
      };
    } catch (error) {
      return { error: `Invalid timezone: ${timezone}` };
    }
  },

  calculate: (args) => {
    try {
      const expression = args.expression;
      
      // Security: sanitize input to prevent code injection
      const sanitized = expression.replace(/[^0-9+\-*/.() sqrt()sin()cos()tan()log()exp()pow(),]/g, '');
      
      // Simple math evaluation (in production, use a proper math library like math.js)
      const result = Function('"use strict"; return (' + sanitized + ')')();
      
      return {
        expression: expression,
        result: result,
      };
    } catch (error) {
      return { error: `Invalid expression: ${error.message}` };
    }
  },

  search_web: (args) => {
    // Simulated web search
    const query = args.query;
    
    return {
      query: query,
      results: [
        {
          title: `Result for "${query}"`,
          snippet: 'This is a simulated search result. In a real implementation, you would integrate with a search API.',
          url: 'https://example.com',
        },
      ],
      note: 'This is a simulated search. Integrate with a real search API for actual results.',
    };
  },

  get_weather: (args) => {
    // Simulated weather data
    const location = args.location;
    const unit = args.unit || 'celsius';
    
    const temp = unit === 'celsius' ? 22 : 72;
    
    return {
      location: location,
      temperature: temp,
      unit: unit,
      condition: 'Partly cloudy',
      humidity: 65,
      note: 'This is simulated weather data. Integrate with a real weather API for actual data.',
    };
  },
};

// Execute a tool call
export function executeTool(toolName, args) {
  if (toolFunctions[toolName]) {
    try {
      const result = toolFunctions[toolName](args);
      return JSON.stringify(result);
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  }
  
  return JSON.stringify({ error: `Unknown tool: ${toolName}` });
}