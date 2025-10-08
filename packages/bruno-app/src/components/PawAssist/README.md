# Paw Assist - AI Scripting Assistant

Paw Assist is an AI-powered scripting assistant integrated into Bruno's script editors. It helps users generate, convert, and improve JavaScript code for pre-request scripts, post-response scripts, and tests.

## Features

- **AI Code Generation**: Generate Bruno-compatible JavaScript code from natural language descriptions
- **Postman Conversion**: Convert Postman scripts to Bruno syntax
- **Multiple AI Providers**: Support for DeepSeek, OpenAI, and other providers
- **Secure API Key Storage**: Encrypted local storage of API keys
- **Context-Aware**: Understands different script types (pre-request, post-response, tests)
- **Real-time Integration**: Seamlessly integrated into Bruno's script editors

## Architecture

### Main Process (Electron)
- `PawAssistSettingsStore`: Manages settings and encrypted API key storage
- `AiProviderRegistry`: Registry for different AI providers
- `DeepSeekProvider`: DeepSeek API implementation
- IPC handlers for communication with renderer process

### Renderer Process (React)
- `PawAssist`: Main component with feature flag support
- `PawAssistButton`: Toggle button for the assistant panel
- `PawAssistPanel`: Main UI with generation and conversion tabs
- `PawAssistSettings`: Settings modal for configuration
- `useEditorGateway`: Hook for CodeMirror editor integration

## Usage

### Enabling Paw Assist
1. Go to Preferences → Beta Features
2. Enable "Paw Assist" feature
3. Restart Bruno

### Configuration
1. Click the Paw Assist button in any script editor
2. Click "Settings" to configure:
   - AI Provider (DeepSeek, OpenAI, etc.)
   - API Key (encrypted and stored locally)
   - Model selection
   - Temperature and timeout settings

### Generating Code
1. Click the Paw Assist button in a script editor
2. Enter a description of what you want the script to do
3. Click "Generate" to get AI-generated code
4. Review the code and click "Insert" to add it to the editor

### Converting Postman Scripts
1. Switch to the "Convert Postman" tab
2. Paste your Postman script
3. Click "Convert" to get Bruno-compatible code
4. Review and insert the converted code

## API Reference

### Bruno Scripting APIs
Paw Assist generates code using Bruno's scripting APIs:

```javascript
// Variables
bru.setVar("name", value);
bru.getVar("name");

// Request manipulation (pre-request)
req.setHeader("Authorization", "Bearer " + token);
req.setBody(JSON.stringify(data));

// Response handling (post-response/tests)
const status = res.getStatus();
const body = res.json();
const headers = res.getHeaders();

// Assertions (tests)
bru.assert(condition, "Error message");
bru.assert(status === 200, "Expected 200 status");
bru.assert(body.user, "User data missing");
```

### Postman to Bruno Conversion
Common conversions:

| Postman | Bruno |
|---------|-------|
| `pm.environment.set()` | `bru.setVar()` |
| `pm.environment.get()` | `bru.getVar()` |
| `pm.response.json()` | `res.json()` |
| `pm.response.status` | `res.getStatus()` |
| `pm.test()` | `bru.assert()` |

## Security & Privacy

- API keys are encrypted using Bruno's encryption utilities
- No data is sent to Bruno servers
- All AI provider communication is direct from the client
- User prompts and code are sent only to the configured AI provider

## Development

### Adding New AI Providers
1. Create a new provider class extending `AiProvider`
2. Implement the `chat` method
3. Register the provider in `AiProviderRegistry`
4. Add provider-specific validation in `validateApiKey`

### Testing
```bash
# Run unit tests
npm test -- --testPathPattern="paw-assist"

# Run specific test files
npm test -- packages/bruno-electron/src/utils/__tests__/paw-assist-utils.test.js
```

## Troubleshooting

### Common Issues
1. **"No API key configured"**: Set up your API key in settings
2. **"Connection failed"**: Check your API key and internet connection
3. **"Feature not available"**: Enable Paw Assist in Beta Features
4. **Code not inserting**: Ensure the script editor is focused

### Debug Mode
Enable debug logging by setting `DEBUG=paw-assist` in your environment.

## Future Enhancements

- Inline autocomplete suggestions
- Local LLM support (Ollama, etc.)
- Code improvement suggestions
- Template library
- Multi-language support
- Advanced prompt customization
