# Bruno AI Integration

This module provides AI-powered features for Bruno, allowing users to generate API collections and test cases using OpenAI and Anthropic AI services.

## Features

### 1. AI-Assisted Collection Generation
- Generate Bruno collections from API documentation (OpenAPI/Swagger, markdown, plain text)
- Support for multiple AI providers (OpenAI, Anthropic)
- Configurable AI models and parameters
- Preview generated collections before importing

### 2. AI-Generated Test Cases
- Generate comprehensive test cases for individual requests
- Support for edge cases and error scenarios
- Generate additional tests based on user prompts
- Apply generated tests directly to request files

### 3. Multi-Provider Support
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo, GPT-3.5 Turbo 16K
- **Anthropic**: Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku, Claude 2.1
- Easy switching between providers and models
- No vendor lock-in

## Architecture

### Core Components

#### `aiService` (index.js)
Main service class that orchestrates AI operations:
- Provider management (OpenAI, Anthropic)
- Collection generation from API specs
- Test generation for requests
- Response parsing and validation

#### Providers
- `openai.js`: OpenAI API integration
- `anthropic.js`: Anthropic API integration

#### Prompt Templates (prompts.js)
Structured prompts for different AI tasks:
- Collection generation from API documentation
- Test generation for requests
- Collection-wide test generation
- Additional test generation based on user prompts

### UI Components

#### Settings
- `AISettings/index.js`: AI configuration panel in Preferences
- API key management
- Model selection
- Advanced parameters (temperature, max tokens)
- Connection testing

#### Collection Generation
- `AIGenerateCollection/index.js`: Modal for generating collections from API docs
- Support for various input formats
- Preview generated endpoints
- Model selection

#### Test Generation
- `AIGenerateTests/index.js`: Modal for generating tests for requests
- Request context analysis
- Focus area specification
- Additional test generation
- Test preview and application

## Usage

### Setting Up AI Integration

1. **Enable AI Features**
   - Go to Preferences > AI
   - Toggle "Enable AI Features"

2. **Configure API Keys**
   - Add OpenAI API key (get from [OpenAI Platform](https://platform.openai.com/api-keys))
   - Add Anthropic API key (get from [Anthropic Console](https://console.anthropic.com/))
   - Test connection to verify keys work

3. **Select Default Models**
   - Choose preferred models for each provider
   - Adjust temperature and max tokens as needed

### Generating Collections

1. **From Import Menu**
   - Click "Import Collection" in sidebar
   - Select "Generate with AI"
   - Paste API documentation (OpenAPI spec, markdown, etc.)
   - Configure collection name and AI model
   - Preview and import generated collection

2. **Supported Input Formats**
   - OpenAPI/Swagger JSON/YAML
   - Markdown documentation
   - Plain text API descriptions
   - Structured API documentation

### Generating Tests

1. **For Individual Requests**
   - Open a request in Bruno
   - Go to the Tests tab
   - Click "Generate Tests" button
   - Configure AI model and options
   - Preview and apply generated tests

2. **Test Features**
   - Status code validation
   - Response body structure checks
   - Required field validation
   - Edge case scenarios
   - Error condition testing

3. **Additional Tests**
   - Specify focus areas (authentication, pagination, etc.)
   - Generate additional tests based on prompts
   - Combine with existing tests

## Configuration

### AI Settings (Preferences > AI)

```javascript
{
  enabled: false,
  openaiKey: '',
  anthropicKey: '',
  defaultOpenaiModel: 'gpt-4',
  defaultAnthropicModel: 'claude-3-sonnet-20240229',
  temperature: 0.7,
  maxTokens: 4000
}
```

### Available Models

#### OpenAI
- `gpt-4`: Most capable, best for complex tasks
- `gpt-4-turbo`: Faster and more cost-effective
- `gpt-3.5-turbo`: Fast and cost-effective for most tasks
- `gpt-3.5-turbo-16k`: Same as 3.5 Turbo but with larger context

#### Anthropic
- `claude-3-opus-20240229`: Most capable model
- `claude-3-sonnet-20240229`: Balanced performance and cost
- `claude-3-haiku-20240307`: Fastest and most cost-effective
- `claude-2.1`: Previous generation, still very capable

## Security & Privacy

### Data Handling
- API keys are stored locally and encrypted
- No data is stored by Bruno
- API documentation and request data sent to AI providers
- Users control what data is sent

### Privacy Notice
When using AI features:
- API documentation and request data sent to third-party AI providers
- Data subject to provider privacy policies
- Bruno does not store or log AI interactions
- Users should review provider terms before use

## Error Handling

### Common Issues
1. **Invalid API Key**: Check key format and permissions
2. **Rate Limits**: Wait and retry, or use different model
3. **Token Limits**: Reduce input size or use model with larger context
4. **Network Errors**: Check internet connection and provider status

### Troubleshooting
- Test connection in AI settings
- Verify API keys have sufficient credits
- Check provider service status
- Review error messages for specific issues

## Development

### Adding New Providers
1. Create provider class implementing standard interface
2. Add to `aiService.providers` object
3. Update UI components to include new provider
4. Add provider-specific settings to preferences

### Extending Prompts
1. Add new prompt template to `prompts.js`
2. Create corresponding service method in `aiService`
3. Add UI component for new feature
4. Update documentation

### Testing
- Unit tests for service methods
- Integration tests for provider APIs
- UI tests for AI components
- Manual testing with real API keys

## Future Enhancements

### Planned Features
- Conversational AI assistant for API exploration
- AI-powered debugging suggestions
- Test maintenance and updates
- Documentation generation from collections
- Smart suggestions in code editor

### Potential Providers
- Google Vertex AI (PaLM models)
- Azure OpenAI Service
- Local LLM integration
- Custom model endpoints

## Contributing

When contributing to AI features:
1. Follow existing code patterns
2. Add comprehensive error handling
3. Include user-friendly error messages
4. Test with multiple AI providers
5. Update documentation
6. Consider privacy and security implications

## Support

For issues with AI integration:
1. Check AI settings configuration
2. Verify API keys and credits
3. Test with different models
4. Review error logs
5. Report bugs with detailed information 